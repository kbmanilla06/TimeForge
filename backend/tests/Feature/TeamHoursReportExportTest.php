<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class TeamHoursReportExportTest extends TestCase
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
            'reviewed_by' => User::factory(),
            'reviewed_at' => now(),
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

    public function test_supervisor_can_export_their_own_departments_hours(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id, 'name' => 'Jane Employee']);
        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');

        $pdfResponse = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->get('/api/team-hours-report/export/pdf?date=2026-01-10');
        $pdfResponse->assertOk();
        $this->assertStringContainsString('application/pdf', $pdfResponse->headers->get('Content-Type'));

        $excelResponse = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->get('/api/team-hours-report/export/excel?date=2026-01-10');
        $excelResponse->assertOk();

        $rows = $this->readXlsxRows($excelResponse->streamedContent());
        $employeeRow = collect($rows)->firstWhere(0, 'Jane Employee');
        $this->assertNotNull($employeeRow);
        $this->assertEquals(8, $employeeRow[2]);
    }

    public function test_supervisor_cannot_export_another_departments_hours(): void
    {
        $ownDepartment = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $ownDepartment->id]);
        User::factory()->create(['department_id' => $otherDepartment->id, 'name' => 'Other Employee']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->get('/api/team-hours-report/export/excel');
        $response->assertOk();

        $rows = $this->readXlsxRows($response->streamedContent());
        $this->assertNull(collect($rows)->firstWhere(0, 'Other Employee'));
    }

    public function test_admin_and_hr_finance_can_export_any_department(): void
    {
        $admin = User::factory()->admin()->create();
        $hr = User::factory()->hrFinance()->create();

        foreach ([$admin, $hr] as $user) {
            $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
                ->get('/api/team-hours-report/export/pdf')
                ->assertOk();

            $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
                ->get('/api/team-hours-report/export/excel')
                ->assertOk();
        }
    }

    public function test_employee_cannot_export_team_hours(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->get('/api/team-hours-report/export/pdf')
            ->assertStatus(403);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->get('/api/team-hours-report/export/excel')
            ->assertStatus(403);
    }

    public function test_excel_headings_never_include_a_rate_or_payroll_column(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['hourly_rate' => 999]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->get('/api/team-hours-report/export/excel');

        $rows = $this->readXlsxRows($response->streamedContent());
        $headings = $rows[0];

        $this->assertSame(
            ['Employee', 'Department', 'Approved Hrs', 'Overtime Hrs', 'Pending Hrs', 'Rejected Hrs', 'Attendance'],
            $headings,
        );

        foreach ($rows as $row) {
            $this->assertNotContains(999, $row, 'Team Hours Report must never include an hourly rate figure.');
            $this->assertNotContains('999', $row, 'Team Hours Report must never include an hourly rate figure.');
        }
    }
}
