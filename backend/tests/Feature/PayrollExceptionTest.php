<?php

namespace Tests\Feature;

use App\Models\AttendanceSession;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class PayrollExceptionTest extends TestCase
{
    use RefreshDatabase;

    // Period resolves to 2026-01-01 .. 2026-01-15 (PayrollPeriod::resolve).
    private const PERIOD_DATE = '2026-01-10';

    private const IN_PERIOD_DAY = '2026-01-05';

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function getAs(User $user, string $path)
    {
        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))->getJson($path);
    }

    /**
     * A viewer (admin/HR) with an hourly rate set, so they never show up
     * as their own "missing hourly rate" exception and don't pollute
     * assertions about which single employee is expected to be flagged.
     */
    private function viewer(string $role = 'admin'): User
    {
        $factory = $role === 'hr_finance' ? User::factory()->hrFinance() : User::factory()->admin();

        return $factory->create(['hourly_rate' => 999]);
    }

    public function test_non_admin_hr_finance_roles_cannot_view_the_report(): void
    {
        foreach (['employee', 'supervisor'] as $role) {
            $user = User::factory()->role(\App\Enums\UserRole::from($role))->create();
            $this->getAs($user, '/api/payroll/exceptions?date='.self::PERIOD_DATE)->assertStatus(403);
        }
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/payroll/exceptions', ['Accept' => 'application/json'])->assertStatus(401);
    }

    public function test_employee_with_no_problems_is_omitted_entirely(): void
    {
        $admin = $this->viewer();
        User::factory()->create(['hourly_rate' => 20]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(0);
    }

    public function test_missing_hourly_rate_is_flagged(): void
    {
        $admin = $this->viewer();
        User::factory()->create(['hourly_rate' => null, 'name' => 'No Rate']);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(1);
        $response->assertJsonPath('0.name', 'No Rate');
        $response->assertJsonPath('0.missing_hourly_rate', true);
    }

    public function test_a_submitted_but_unreviewed_timesheet_is_flagged(): void
    {
        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        Timesheet::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'status' => 'submitted',
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(1);
        $response->assertJsonPath('0.unapproved_submitted_count', 1);
        $response->assertJsonPath('0.rejected_or_revision_count', 0);
    }

    public function test_rejected_and_revision_requested_timesheets_are_flagged_together(): void
    {
        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        Timesheet::factory()->rejected()->create(['user_id' => $employee->id, 'date' => '2026-01-03', 'reviewed_by' => $admin->id]);
        Timesheet::factory()->revisionRequested()->create(['user_id' => $employee->id, 'date' => '2026-01-07', 'reviewed_by' => $admin->id]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(1);
        $response->assertJsonPath('0.rejected_or_revision_count', 2);
        $response->assertJsonPath('0.unapproved_submitted_count', 0);
    }

    public function test_attendance_with_no_matching_time_entry_is_flagged(): void
    {
        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        AttendanceSession::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'time_in' => Carbon::parse(self::IN_PERIOD_DAY)->setTime(9, 0),
            'time_out' => Carbon::parse(self::IN_PERIOD_DAY)->setTime(17, 0),
        ]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(1);
        $response->assertJsonPath('0.attendance_without_entries_days', 1);
    }

    public function test_attendance_with_a_matching_time_entry_is_not_flagged(): void
    {
        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        AttendanceSession::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'time_in' => Carbon::parse(self::IN_PERIOD_DAY)->setTime(9, 0),
            'time_out' => Carbon::parse(self::IN_PERIOD_DAY)->setTime(17, 0),
        ]);
        $timesheet = Timesheet::factory()->approved()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'reviewed_by' => $admin->id,
        ]);
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'timesheet_id' => $timesheet->id,
        ]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(0);
    }

    public function test_an_unsubmitted_time_entry_is_flagged(): void
    {
        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'timesheet_id' => null,
        ]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(1);
        $response->assertJsonPath('0.entries_without_submission_days', 1);
    }

    public function test_overtime_over_the_configured_threshold_is_flagged(): void
    {
        config(['payroll.overtime_exception_threshold_hours' => 1]);

        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        $timesheet = Timesheet::factory()->approved()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'reviewed_by' => $admin->id,
        ]);
        $start = Carbon::parse(self::IN_PERIOD_DAY)->setTime(8, 0);
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(11), // 3 hours over the 8hr/day regular threshold
            'timesheet_id' => $timesheet->id,
        ]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(1);
        $response->assertJsonPath('0.overtime_over_threshold', true);
        $response->assertJsonPath('0.overtime_hours', 3);
    }

    public function test_overtime_under_the_threshold_is_not_flagged(): void
    {
        $admin = $this->viewer();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        $timesheet = Timesheet::factory()->approved()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'reviewed_by' => $admin->id,
        ]);
        $start = Carbon::parse(self::IN_PERIOD_DAY)->setTime(8, 0);
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => self::IN_PERIOD_DAY,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(9), // 1 hour of overtime, well under the default 20hr threshold
            'timesheet_id' => $timesheet->id,
        ]);

        $response = $this->getAs($admin, '/api/payroll/exceptions?date='.self::PERIOD_DATE);

        $response->assertOk()->assertJsonCount(0);
    }

    public function test_hr_finance_can_view_the_report(): void
    {
        $hr = $this->viewer('hr_finance');
        User::factory()->create(['hourly_rate' => null]);

        $this->getAs($hr, '/api/payroll/exceptions?date='.self::PERIOD_DATE)->assertOk()->assertJsonCount(1);
    }

    public function test_pdf_and_excel_export_succeed_and_are_audit_logged(): void
    {
        $admin = $this->viewer();
        User::factory()->create(['hourly_rate' => null]);

        $pdfResponse = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->get('/api/payroll/exceptions/export/pdf?date='.self::PERIOD_DATE);
        $pdfResponse->assertOk();
        $this->assertStringContainsString('application/pdf', $pdfResponse->headers->get('Content-Type'));

        $excelResponse = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->get('/api/payroll/exceptions/export/excel?date='.self::PERIOD_DATE);
        $excelResponse->assertOk();

        $rows = $this->readXlsxRows($excelResponse->streamedContent());
        $this->assertSame('Employee', $rows[0][0]);
        $this->assertSame('Yes', $rows[1][2]);

        $this->assertDatabaseCount('audit_logs', 2);
        $this->assertDatabaseHas('audit_logs', ['action' => 'payroll_exceptions.exported']);
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    private function readXlsxRows(string $binaryContent): array
    {
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $binaryContent);
        $spreadsheet = IOFactory::load($path);
        $rows = $spreadsheet->getActiveSheet()->toArray();
        unlink($path);

        return $rows;
    }
}
