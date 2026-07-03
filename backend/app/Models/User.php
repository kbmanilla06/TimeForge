<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name', 'email', 'password', 'role', 'status', 'department_id', 'hourly_rate',
    'employee_id', 'position', 'contact_number', 'profile_picture_path',
])]
// hourly_rate is payroll data (Admin/HR-Finance only per Sprint 8): hidden
// from every serialization by default; only the Admin user-management
// responses opt back in via makeVisible. Server-side payroll math reads
// the attribute directly and is unaffected.
#[Hidden(['password', 'remember_token', 'hourly_rate'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function timesheets(): HasMany
    {
        return $this->hasMany(Timesheet::class);
    }

    public function kpiAssignments(): HasMany
    {
        return $this->hasMany(KpiAssignment::class);
    }

    public function dailyScrums(): HasMany
    {
        return $this->hasMany(DailyScrum::class);
    }

    public function accountRequest(): HasOne
    {
        return $this->hasOne(AccountRequest::class);
    }

    public function attendanceSessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isSupervisor(): bool
    {
        return $this->role === UserRole::Supervisor;
    }

    public function isHrFinance(): bool
    {
        return $this->role === UserRole::HrFinance;
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }
}
