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

];
