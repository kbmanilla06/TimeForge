<?php

namespace Tests\Feature;

use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class PayrollExportTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function dayOfMinutes(User $user, string $date, int $minutes, string $status = 'approved'): void
    {
        $start = Carbon::parse($date)->setTime(9, 0);

        $timesheet = Timesheet::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'status' => $status,
            'reviewed_by' => $status === 'submitted' ? null : User::factory(),
            'reviewed_at' => $status === 'submitted' ? null : now(),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'timesheet_id' => $timesheet->id,
        ]);
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

    public function test_admin_and_hr_finance_can_export_pdf_and_excel(): void
    {
        $admin = User::factory()->admin()->create();
        $hr = User::factory()->hrFinance()->create();

        foreach ([$admin, $hr] as $user) {
            $pdfResponse = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
                ->get('/api/payroll/export/pdf');
            $pdfResponse->assertOk();
            $this->assertStringContainsString('application/pdf', $pdfResponse->headers->get('Content-Type'));
            $this->assertStringContainsString('attachment', $pdfResponse->headers->get('Content-Disposition'));

            $excelResponse = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
                ->get('/api/payroll/export/excel');
            $excelResponse->assertOk();
            $this->assertStringContainsString(
                'spreadsheetml.sheet',
                $excelResponse->headers->get('Content-Type'),
            );
        }

        $this->assertDatabaseCount('audit_logs', 4); // 2 users x (pdf + excel)
        $this->assertDatabaseHas('audit_logs', ['action' => 'payroll.exported']);
    }

    public function test_supervisor_and_employee_cannot_export_payroll(): void
    {
        $supervisor = User::factory()->supervisor()->create();
        $employee = User::factory()->create();

        foreach ([$supervisor, $employee] as $user) {
            $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
                ->get('/api/payroll/export/pdf')
                ->assertStatus(403);

            $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
                ->get('/api/payroll/export/excel')
                ->assertStatus(403);
        }
    }

    public function test_excel_export_contains_the_correct_computed_numbers(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['name' => 'Jane Employee', 'hourly_rate' => 20]);

        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');
        $this->dayOfMinutes($employee, '2026-01-06', 600, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->get('/api/payroll/export/excel?date=2026-01-10');

        $response->assertOk();
        $rows = $this->readXlsxRows($response->streamedContent());

        $this->assertSame(
            ['Employee', 'Department', 'Hourly Rate', 'Approved Hrs', 'Overtime Hrs', 'Pending Hrs', 'Rejected Hrs', 'Attendance', 'Estimated Payroll'],
            $rows[0],
        );

        $employeeRow = collect($rows)->firstWhere(0, 'Jane Employee');
        $this->assertNotNull($employeeRow);
        $this->assertEquals(20, $employeeRow[2]);
        $this->assertEquals(18, $employeeRow[3]);
        $this->assertEquals(2, $employeeRow[4]);
        $this->assertEquals(2, $employeeRow[7]);
        $this->assertEquals(370, $employeeRow[8]);
    }
}
