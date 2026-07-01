<?php

use App\Http\Controllers\Admin\ClientController as AdminClientController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\KpiController as AdminKpiController;
use App\Http\Controllers\Admin\ProjectController as AdminProjectController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DailyScrumController;
use App\Http\Controllers\KpiAssignmentController;
use App\Http\Controllers\KpiController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\TimeEntryController;
use App\Http\Controllers\TimesheetController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::patch('users/{user}', [UserController::class, 'update']);
        Route::patch('users/{user}/activate', [UserController::class, 'activate']);
        Route::patch('users/{user}/deactivate', [UserController::class, 'deactivate']);

        Route::get('departments', [DepartmentController::class, 'index']);
        Route::post('departments', [DepartmentController::class, 'store']);
        Route::patch('departments/{department}', [DepartmentController::class, 'update']);
        Route::delete('departments/{department}', [DepartmentController::class, 'destroy']);

        Route::get('clients', [AdminClientController::class, 'index']);
        Route::post('clients', [AdminClientController::class, 'store']);
        Route::patch('clients/{client}', [AdminClientController::class, 'update']);
        Route::delete('clients/{client}', [AdminClientController::class, 'destroy']);

        Route::get('projects', [AdminProjectController::class, 'index']);
        Route::post('projects', [AdminProjectController::class, 'store']);
        Route::patch('projects/{project}', [AdminProjectController::class, 'update']);
        Route::delete('projects/{project}', [AdminProjectController::class, 'destroy']);

        Route::post('kpis', [AdminKpiController::class, 'store']);
    });

    Route::get('projects', [ProjectController::class, 'index']);
    Route::get('clients', [ClientController::class, 'index']);
    Route::get('kpis', [KpiController::class, 'index']);

    Route::get('time-entries', [TimeEntryController::class, 'index']);
    Route::get('time-entries/summary', [TimeEntryController::class, 'summary']);
    Route::post('time-entries', [TimeEntryController::class, 'store']);
    Route::post('time-entries/start', [TimeEntryController::class, 'startTimer']);
    Route::get('time-entries/{timeEntry}', [TimeEntryController::class, 'show']);
    Route::patch('time-entries/{timeEntry}', [TimeEntryController::class, 'update']);
    Route::patch('time-entries/{timeEntry}/stop', [TimeEntryController::class, 'stopTimer']);
    Route::delete('time-entries/{timeEntry}', [TimeEntryController::class, 'destroy']);

    Route::get('timesheets', [TimesheetController::class, 'index']);
    Route::get('timesheets/team', [TimesheetController::class, 'teamIndex']);
    Route::post('timesheets', [TimesheetController::class, 'store']);
    Route::get('timesheets/{timesheet}', [TimesheetController::class, 'show']);
    Route::patch('timesheets/{timesheet}/approve', [TimesheetController::class, 'approve']);
    Route::patch('timesheets/{timesheet}/reject', [TimesheetController::class, 'reject']);
    Route::patch('timesheets/{timesheet}/request-revision', [TimesheetController::class, 'requestRevision']);
    Route::patch('timesheets/{timesheet}/reopen', [TimesheetController::class, 'reopen']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::get('kpi-assignments/mine', [KpiAssignmentController::class, 'mine']);
    Route::get('kpi-assignments/team', [KpiAssignmentController::class, 'team']);
    Route::post('kpi-assignments', [KpiAssignmentController::class, 'store']);
    Route::delete('kpi-assignments/{kpiAssignment}', [KpiAssignmentController::class, 'destroy']);

    Route::get('team-members', [TeamMemberController::class, 'index']);

    Route::get('daily-scrums', [DailyScrumController::class, 'index']);
    Route::get('daily-scrums/team', [DailyScrumController::class, 'teamIndex']);
    Route::post('daily-scrums', [DailyScrumController::class, 'store']);
    Route::get('daily-scrums/{dailyScrum}', [DailyScrumController::class, 'show']);
    Route::post('daily-scrums/{dailyScrum}/comments', [DailyScrumController::class, 'comment']);
});
