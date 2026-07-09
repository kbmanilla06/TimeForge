<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Department;
use App\Enums\UserStatus;
use App\Support\ExcelExporter;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollFigures;
use App\Support\PayrollExceptionReport;
use App\Notifications\ExportCompleted;
use App\Models\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class GenerateExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $userId;
    public string $type;
    public ?string $date;

    /**
     * Create a new job instance.
     */
    public function __construct(int $userId, string $type, ?string $date = null)
    {
        $this->userId = $userId;
        $this->type = $type;
        $this->date = $date;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $user = User::findOrFail($this->userId);

        $referenceDate = $this->date ? Carbon::parse($this->date) : Carbon::today();
        [$periodStart, $periodEnd] = \App\Support\PayrollPeriod::resolve($referenceDate);

        $uuid = Str::uuid()->toString();
        $ext = Str::endsWith($this->type, 'pdf') ? 'pdf' : 'xlsx';
        $filename = "export-{$uuid}.{$ext}";
        $storagePath = "exports/{$filename}";

        if ($this->type === 'payroll_pdf') {
            $rows = $this->buildPayrollSummary($periodStart, $periodEnd);
            $pdf = Pdf::loadView('reports.payroll', [
                'rows' => $rows,
                'periodStart' => $periodStart->toDateString(),
                'periodEnd' => $periodEnd->toDateString(),
                'generatedAt' => now()->toDateTimeString(),
            ]);
            Storage::disk('local')->put($storagePath, $pdf->output());
            $displayFilename = 'payroll-report.pdf';

        } elseif ($this->type === 'payroll_excel') {
            $rows = $this->buildPayrollSummary($periodStart, $periodEnd)
                ->map(fn (array $row) => [
                    $row['name'],
                    $row['department'] ?? '',
                    $row['hourly_rate'],
                    round($row['approved_minutes'] / 60, 2),
                    round($row['overtime_minutes'] / 60, 2),
                    round($row['pending_minutes'] / 60, 2),
                    round($row['rejected_minutes'] / 60, 2),
                    $row['attendance_days'],
                    $row['estimated_payroll'],
                ])
                ->all();

            $tempPath = tempnam(sys_get_temp_dir(), 'export');
            ExcelExporter::save(
                'Payroll Report',
                ['Employee', 'Department', 'Hourly Rate', 'Approved Hrs', 'Overtime Hrs', 'Pending Hrs', 'Rejected Hrs', 'Attendance', 'Estimated Payroll'],
                $rows,
                $tempPath
            );
            Storage::disk('local')->put($storagePath, fopen($tempPath, 'r'));
            unlink($tempPath);
            $displayFilename = 'payroll-report.xlsx';

        } elseif ($this->type === 'payroll_exceptions_pdf') {
            $rows = PayrollExceptionReport::build(
                User::where('status', UserStatus::Active)->with('department')->get(),
                $periodStart,
                $periodEnd
            );
            $pdf = Pdf::loadView('reports.payroll-exceptions', [
                'rows' => $rows,
                'periodStart' => $periodStart->toDateString(),
                'periodEnd' => $periodEnd->toDateString(),
                'generatedAt' => now()->toDateTimeString(),
            ]);
            Storage::disk('local')->put($storagePath, $pdf->output());
            $displayFilename = 'payroll-exceptions-report.pdf';

        } elseif ($this->type === 'payroll_exceptions_excel') {
            $rows = PayrollExceptionReport::build(
                User::where('status', UserStatus::Active)->with('department')->get(),
                $periodStart,
                $periodEnd
            )
            ->map(fn (array $row) => [
                $row['name'],
                $row['department'] ?? '',
                $row['missing_hourly_rate'] ? 'Yes' : '',
                $row['unapproved_submitted_count'],
                $row['rejected_or_revision_count'],
                $row['attendance_without_entries_days'],
                $row['entries_without_submission_days'],
                $row['overtime_over_threshold'] ? $row['overtime_hours'] : '',
            ])
            ->all();

            $tempPath = tempnam(sys_get_temp_dir(), 'export');
            ExcelExporter::save(
                'Payroll Exceptions',
                ['Employee', 'Department', 'Missing Rate', 'Unapproved Submitted', 'Rejected/Revision', 'Attendance w/o Entries', 'Entries w/o Submission', 'Overtime Over Threshold (Hrs)'],
                $rows,
                $tempPath
            );
            Storage::disk('local')->put($storagePath, fopen($tempPath, 'r'));
            unlink($tempPath);
            $displayFilename = 'payroll-exceptions-report.xlsx';

        } elseif ($this->type === 'team_hours_pdf') {
            $employees = $this->scopedEmployees($user);
            $rows = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
            $pdf = Pdf::loadView('reports.team-hours', [
                'rows' => $rows,
                'periodStart' => $periodStart->toDateString(),
                'periodEnd' => $periodEnd->toDateString(),
                'generatedAt' => now()->toDateTimeString(),
            ]);
            Storage::disk('local')->put($storagePath, $pdf->output());
            $displayFilename = 'team-hours-report.pdf';

        } elseif ($this->type === 'team_hours_excel') {
            $employees = $this->scopedEmployees($user);
            $rows = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd)
                ->map(fn (array $row) => [
                    $row['name'],
                    $row['department'] ?? '',
                    round($row['approved_minutes'] / 60, 2),
                    round($row['overtime_minutes'] / 60, 2),
                    round($row['pending_minutes'] / 60, 2),
                    round($row['rejected_minutes'] / 60, 2),
                    $row['attendance_days'],
                ])
                ->all();

            $tempPath = tempnam(sys_get_temp_dir(), 'export');
            ExcelExporter::save(
                'Team Hours Report',
                ['Employee', 'Department', 'Approved Hrs', 'Overtime Hrs', 'Pending Hrs', 'Rejected Hrs', 'Attendance'],
                $rows,
                $tempPath
            );
            Storage::disk('local')->put($storagePath, fopen($tempPath, 'r'));
            unlink($tempPath);
            $displayFilename = 'team-hours-report.xlsx';
        } else {
            return;
        }

        // Generate temporary signed URL (frontend URL + signed endpoint)
        $downloadUrl = URL::temporarySignedRoute(
            'exports.download',
            now()->addHours(24),
            ['filename' => $filename]
        );

        // Record AuditLog
        AuditLog::record('async_export.completed', $user, [
            'type' => $this->type,
            'filename' => $displayFilename,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ], actor: $user);

        // Notify user
        $user->notify(new ExportCompleted($displayFilename, $downloadUrl));
    }

    private function buildPayrollSummary(Carbon $periodStart, Carbon $periodEnd): Collection
    {
        $overtimeMultiplier = (float) config('payroll.overtime_multiplier');
        $employees = User::where('status', UserStatus::Active)->with('department')->get();

        return HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd)
            ->map(function (array $summary) use ($employees, $overtimeMultiplier) {
                $employee = $employees->firstWhere('id', $summary['user_id']);
                return PayrollFigures::withPayrollFigures($summary, $employee, $overtimeMultiplier);
            });
    }

    private function scopedEmployees(User $requester): Collection
    {
        if ($requester->isAdmin() || $requester->isHrFinance()) {
            return User::where('status', UserStatus::Active)->get();
        }

        if ($requester->isSupervisor() && $requester->department_id) {
            return User::where('status', UserStatus::Active)
                ->where('department_id', $requester->department_id)
                ->get();
        }

        return collect();
    }
}
