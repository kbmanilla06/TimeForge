<?php

namespace App\Enums;

enum TimesheetCommentAction: string
{
    case Approved = 'approved';
    case Rejected = 'rejected';
    case RevisionRequested = 'revision_requested';
    case Reopened = 'reopened';
}
