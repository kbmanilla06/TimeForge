<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\CompanySetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompanySettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_any_authenticated_user_can_read_company_settings(): void
    {
        $employee = User::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/company-settings');

        $response->assertOk()->assertJsonStructure([
            'company_name', 'contact_email', 'default_timezone', 'has_logo',
            'overtime_multiplier', 'payroll_period_label',
        ]);
    }

    public function test_company_name_falls_back_to_app_name_when_unset(): void
    {
        $employee = User::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/company-settings');

        $response->assertOk()->assertJsonPath('company_name', config('app.name'));
        $response->assertJsonPath('has_logo', false);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/company-settings', ['Accept' => 'application/json'])->assertStatus(401);
    }

    public function test_non_admin_cannot_update_company_settings(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->patchJson('/api/admin/company-settings', ['company_name' => 'Acme'])
            ->assertStatus(403);
    }

    public function test_admin_can_update_company_settings(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', [
                'company_name' => 'Acme Corp',
                'contact_email' => 'hello@acme.test',
                'default_timezone' => 'Asia/Manila',
            ]);

        $response->assertOk()
            ->assertJsonPath('company_name', 'Acme Corp')
            ->assertJsonPath('contact_email', 'hello@acme.test')
            ->assertJsonPath('default_timezone', 'Asia/Manila');

        $this->assertDatabaseHas('company_settings', [
            'company_name' => 'Acme Corp',
            'contact_email' => 'hello@acme.test',
            'default_timezone' => 'Asia/Manila',
        ]);
    }

    public function test_updating_settings_reuses_the_same_singleton_row(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', ['company_name' => 'First'])
            ->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', ['company_name' => 'Second'])
            ->assertOk();

        $this->assertSame(1, CompanySetting::count());
        $this->assertSame('Second', CompanySetting::current()->company_name);
    }

    public function test_invalid_timezone_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', ['default_timezone' => 'Not/A_Real_Zone'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['default_timezone']);
    }

    public function test_overtime_multiplier_and_payroll_period_are_read_only_and_ignore_request_input(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', [
                'overtime_multiplier' => 9.99,
                'payroll_period_label' => 'Weekly',
            ])
            ->assertOk();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/company-settings');

        $response->assertJsonPath('overtime_multiplier', (float) config('payroll.overtime_multiplier'));
        $response->assertJsonPath('payroll_period_label', 'Semi-monthly: 1st–15th, 16th–end of month');
    }

    public function test_updating_settings_is_audit_logged_with_only_the_changed_fields(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', ['company_name' => 'Acme Corp'])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'company_settings.updated']);
        $entry = AuditLog::where('action', 'company_settings.updated')->sole();
        $this->assertSame(['company_name' => 'Acme Corp'], $entry->metadata);
        $this->assertArrayNotHasKey('updated_at', $entry->metadata);
    }

    public function test_a_no_op_update_does_not_create_a_spurious_audit_entry(): void
    {
        $admin = User::factory()->admin()->create();
        CompanySetting::factory()->create(['company_name' => 'Acme Corp']);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson('/api/admin/company-settings', ['company_name' => 'Acme Corp'])
            ->assertOk();

        $this->assertDatabaseMissing('audit_logs', ['action' => 'company_settings.updated']);
    }

    public function test_admin_can_upload_a_company_logo_and_any_authenticated_user_can_view_it(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $file = UploadedFile::fake()->create('logo.png', 100, 'image/png');

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->post('/api/admin/company-settings/logo', ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk();

        $settings = CompanySetting::current();
        $this->assertNotNull($settings->logo_path);
        Storage::disk('local')->assertExists($settings->logo_path);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/company-settings')
            ->assertJsonPath('has_logo', true);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->get('/api/company-logo')
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'company_settings.logo_uploaded']);
    }

    public function test_reuploading_a_logo_deletes_the_previous_file(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->post('/api/admin/company-settings/logo', [
                'file' => UploadedFile::fake()->create('first.png', 100, 'image/png'),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $firstPath = CompanySetting::current()->logo_path;

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->post('/api/admin/company-settings/logo', [
                'file' => UploadedFile::fake()->create('second.png', 100, 'image/png'),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        Storage::disk('local')->assertMissing($firstPath);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company_settings.logo_uploaded', 'metadata' => json_encode(['replaced' => true])]);
    }

    public function test_non_admin_cannot_upload_a_company_logo(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->post('/api/admin/company-settings/logo', [
                'file' => UploadedFile::fake()->create('logo.png', 100, 'image/png'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(403);
    }

    public function test_company_logo_endpoint_returns_404_when_none_is_set(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/company-logo')
            ->assertStatus(404);
    }
}
