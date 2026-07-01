<?php

namespace App\Enums;

enum UserRole: string
{
    case Employee = 'employee';
    case Supervisor = 'supervisor';
    case HrFinance = 'hr_finance';
    case Admin = 'admin';
}
