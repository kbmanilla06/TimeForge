<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\DailyScrum;
use App\Models\Department;
use App\Models\Kpi;
use App\Models\KpiAssignment;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use App\Support\PayrollPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * DEV/DEMO ONLY — never run against production data (Sprint 14 decision).
 *
 * Populates every module with a coherent demo dataset: two departments,
 * one user per role (plus one unrated employee for payroll validation),
 * clients/projects, KPIs with progress, two payroll periods of time
 * entries covering every timesheet state (including an overtime day),
 * and daily scrums with a deliberately recurring blocker.
 *
 * Deliberately NOT part of DatabaseSeeder: run it explicitly with
 *   php artisan db:seed --class=DemoDataSeeder
 * on a freshly migrated+seeded database. Demo credentials are listed in
 * docs/DEMO.md (all passwords: "password").
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $engineering = Department::firstOrCreate(['name' => 'Engineering']);
        $marketing = Department::firstOrCreate(['name' => 'Marketing']);

        $admin = $this->ensureUser('admin@timeforge.test', 'TimeForge Admin', UserRole::Admin, null, null);
        $supervisor = $this->ensureUser('supervisor@timeforge.test', 'Sam Supervisor', UserRole::Supervisor, $engineering->id, null);
        $eve = $this->ensureUser('employee@timeforge.test', 'Eve Employee', UserRole::Employee, $engineering->id, 20);
        $iris = $this->ensureUser('intern@timeforge.test', 'Iris Intern', UserRole::Employee, $engineering->id, null);
        $mark = $this->ensureUser('marketer@timeforge.test', 'Mark Marketer', UserRole::Employee, $marketing->id, 18);
        $this->ensureUser('hr@timeforge.test', 'Hana Finance', UserRole::HrFinance, null, null);

        if (Timesheet::where('user_id', $eve->id)->exists()) {
            $this->command?->warn('Demo time data already present — skipping. Run against a fresh database for a clean demo set.');

            return;
        }

        $acme = Client::firstOrCreate(['name' => 'Acme Corp']);
        $globex = Client::firstOrCreate(['name' => 'Globex']);
        $website = Project::firstOrCreate(['name' => 'Website Redesign'], ['client_id' => $acme->id]);
        $mobile = Project::firstOrCreate(['name' => 'Mobile App'], ['client_id' => $globex->id]);

        $bugs = Kpi::firstOrCreate(['name' => 'Bugs Resolved'], ['target_value' => 10, 'unit' => 'bugs', 'created_by' => $admin->id]);
        $docs = Kpi::firstOrCreate(['name' => 'Docs Written'], ['target_value' => 10, 'unit' => 'docs', 'created_by' => $admin->id]);
        $calls = Kpi::firstOrCreate(['name' => 'Sales Calls'], ['target_value' => null, 'unit' => 'calls', 'created_by' => $admin->id]);

        $bugsForEve = KpiAssignment::firstOrCreate(['kpi_id' => $bugs->id, 'user_id' => $eve->id], ['progress_value' => 6]);
        KpiAssignment::firstOrCreate(['kpi_id' => $docs->id, 'department_id' => $engineering->id], ['progress_value' => 0]);
        KpiAssignment::firstOrCreate(['kpi_id' => $calls->id, 'user_id' => $mark->id], ['progress_value' => 4]);

        [$currentStart] = PayrollPeriod::resolve(Carbon::today());
        [$previousStart] = PayrollPeriod::resolve($currentStart->copy()->subDay());

        // ---- Previous payroll period: fully scripted review history. ----
        $creditedEntry = $this->loggedDay($eve, $previousStart->copy(), 480, 'approved', $website, $supervisor, 'Fix login flow', 'Development');
        $creditedEntry->update(['kpi_assignment_id' => $bugsForEve->id, 'kpi_progress_value' => 3]);
        $creditedEntry->forceFill(['kpi_progress_applied_at' => now()])->save();

        // 10h day => 8h regular + 2h overtime once approved.
        $this->loggedDay($eve, $previousStart->copy()->addDay(), 600, 'approved', $mobile, $supervisor, 'Release crunch', 'Development');
        $this->loggedDay($eve, $previousStart->copy()->addDays(2), 240, 'rejected', null, $supervisor, 'Untracked admin work', 'Operations');
        $this->loggedDay($eve, $previousStart->copy()->addDays(3), 240, 'revision_requested', $website, $supervisor, 'Design review notes', 'Design');

        // Unrated employee with approved hours => payroll validation flag.
        $this->loggedDay($iris, $previousStart->copy(), 240, 'approved', null, $supervisor, 'Onboarding tasks', 'Training');
        $this->loggedDay($mark, $previousStart->copy()->addDay(), 300, 'approved', $mobile, $supervisor, 'Campaign brief', 'Marketing');

        // Recurring blocker across two distinct days (three occurrences),
        // plus a one-off that must NOT be reported as recurring.
        DailyScrum::create(['user_id' => $eve->id, 'date' => $previousStart->toDateString(), 'previous_work' => 'Shipped exports', 'planned_work' => 'Fix login flow', 'blockers' => 'VPN keeps dropping', 'notes' => null]);
        DailyScrum::create(['user_id' => $iris->id, 'date' => $previousStart->toDateString(), 'previous_work' => 'Environment setup', 'planned_work' => 'Onboarding tasks', 'blockers' => 'vpn keeps dropping', 'notes' => 'Needs a laptop dock']);
        DailyScrum::create(['user_id' => $eve->id, 'date' => $previousStart->copy()->addDays(2)->toDateString(), 'previous_work' => 'Release crunch', 'planned_work' => 'Admin catch-up', 'blockers' => 'VPN keeps dropping', 'notes' => null]);
        DailyScrum::create(['user_id' => $mark->id, 'date' => $previousStart->copy()->addDay()->toDateString(), 'previous_work' => 'Research', 'planned_work' => 'Campaign brief', 'blockers' => 'Waiting on brand assets', 'notes' => null]);

        // ---- Current payroll period: clamped to today so nothing is ----
        // ---- future-dated, whatever day of the period the demo runs. ----
        $currentDays = collect([$currentStart->copy(), $currentStart->copy()->addDay(), Carbon::today()])
            ->filter(fn (Carbon $day) => $day->lte(Carbon::today()))
            ->unique(fn (Carbon $day) => $day->toDateString())
            ->values();

        if ($currentDays->count() >= 1) {
            $this->loggedDay($eve, $currentDays[0], 480, 'approved', $website, $supervisor, 'Checkout bugfixes', 'Development');
        }
        if ($currentDays->count() >= 2) {
            $this->loggedDay($eve, $currentDays[1], 300, 'submitted', $mobile, $supervisor, 'Push notifications', 'Development');
        }
        if ($currentDays->count() >= 3) {
            // Logged but never submitted — shows the "not submitted" state
            // and feeds the AI payroll validation's unsubmitted-days check.
            $this->loggedDay($eve, $currentDays[2], 120, null, null, $supervisor, 'Sprint planning', 'Meeting');
            DailyScrum::create(['user_id' => $eve->id, 'date' => $currentDays[2]->toDateString(), 'previous_work' => 'Push notifications', 'planned_work' => 'Sprint planning', 'blockers' => null, 'notes' => null]);
        }
    }

    private function ensureUser(string $email, string $name, UserRole $role, ?int $departmentId, ?float $hourlyRate): User
    {
        return User::firstOrCreate(['email' => $email], [
            'name' => $name,
            'password' => 'password',
            'role' => $role,
            'department_id' => $departmentId,
            'hourly_rate' => $hourlyRate,
        ]);
    }

    /**
     * One workday: a single time entry starting 09:00 plus (unless $status
     * is null) its reviewed timesheet.
     */
    private function loggedDay(
        User $user,
        Carbon $date,
        int $minutes,
        ?string $status,
        ?Project $project,
        User $reviewer,
        string $task,
        string $category
    ): TimeEntry {
        $timesheetId = null;

        if ($status !== null) {
            $timesheetId = Timesheet::create([
                'user_id' => $user->id,
                'date' => $date->toDateString(),
                'status' => $status,
                'submitted_at' => $date->copy()->setTime(17, 0),
                'reviewed_by' => $status === 'submitted' ? null : $reviewer->id,
                'reviewed_at' => $status === 'submitted' ? null : $date->copy()->setTime(18, 0),
            ])->id;
        }

        $start = $date->copy()->setTime(9, 0);

        return TimeEntry::create([
            'user_id' => $user->id,
            'project_id' => $project?->id,
            'department_id' => $user->department_id,
            'timesheet_id' => $timesheetId,
            'date' => $date->toDateString(),
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'task' => $task,
            'work_category' => $category,
            'description' => $task.' — demo data.',
        ]);
    }
}
