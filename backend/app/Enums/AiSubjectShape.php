<?php

namespace App\Enums;

/**
 * The three subject shapes an AI output can be about (Sprint 12): one
 * user, one department, or the whole organization (stored with both
 * subject foreign keys null — a shape ai_outputs supported by design).
 */
enum AiSubjectShape
{
    case User;
    case Department;
    case Organization;
}
