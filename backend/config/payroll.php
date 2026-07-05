<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Overtime Multiplier
    |--------------------------------------------------------------------------
    |
    | A single, global multiplier applied to the hourly rate for approved
    | overtime minutes (any approved work beyond 8 hours in one day).
    | Per Sprint 8 decisions, this is environment-configurable only — not a
    | per-employee override and not an in-app settings screen.
    |
    */

    'overtime_multiplier' => (float) env('PAYROLL_OVERTIME_MULTIPLIER', 1.25),

    /*
    |--------------------------------------------------------------------------
    | Overtime Exception Threshold
    |--------------------------------------------------------------------------
    |
    | Sprint 50: total approved overtime hours per employee per payroll
    | period above this value is flagged in the Payroll Exceptions report.
    | A single, global threshold — environment-configurable only, same
    | precedent as the overtime multiplier above (not a per-employee
    | override, not an in-app settings screen).
    |
    */

    'overtime_exception_threshold_hours' => (float) env('PAYROLL_OVERTIME_EXCEPTION_THRESHOLD_HOURS', 20),

];
