<?php

namespace App\Enums;

enum LeaveType: string
{
    case Vacation = 'vacation';
    case Sick = 'sick';
    case Other = 'other';
}
