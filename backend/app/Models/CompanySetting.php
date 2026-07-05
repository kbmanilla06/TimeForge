<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Singleton organization-level defaults (Sprint 48) — company name,
 * contact email, default timezone, logo. Exactly one row exists; no
 * multi-tenancy. Fields left null fall back to app defaults wherever
 * they're displayed (e.g. company_name falls back to config('app.name')).
 */
class CompanySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'contact_email',
        'default_timezone',
        'logo_path',
    ];

    /**
     * Always returns the one settings row, creating it with all-null
     * defaults the first time it's touched. Callers never need to think
     * about whether the row exists yet.
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }

    /**
     * The one response shape both the public read endpoint and the
     * admin write endpoint return, so the frontend always sees the same
     * fields regardless of which call produced them. overtime_multiplier
     * and payroll_period_label are read-only (Sprint 8 decision
     * preserved) — sourced from config()/the fixed algorithm, never
     * stored in this table, never accepted from a request.
     *
     * @return array<string, mixed>
     */
    public function toDisplayArray(): array
    {
        return [
            'company_name' => $this->company_name ?? config('app.name'),
            'contact_email' => $this->contact_email,
            'default_timezone' => $this->default_timezone,
            'has_logo' => (bool) $this->logo_path,
            'overtime_multiplier' => (float) config('payroll.overtime_multiplier'),
            'payroll_period_label' => 'Semi-monthly: 1st–15th, 16th–end of month',
        ];
    }
}
