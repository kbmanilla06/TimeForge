<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiAssignment extends Model
{
    /** @use HasFactory<\Database\Factories\KpiAssignmentFactory> */
    use HasFactory;

    protected $fillable = [
        'kpi_id',
        'user_id',
        'department_id',
        'progress_value',
    ];

    public function kpi(): BelongsTo
    {
        return $this->belongsTo(Kpi::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * The department this assignment is scoped to, whether assigned
     * directly to a department or indirectly via an individual's own
     * department.
     */
    public function scopedDepartmentId(): ?int
    {
        return $this->department_id ?? $this->user?->department_id;
    }
}
