<?php

namespace App\Notifications;

use App\Models\Timesheet;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TimesheetApproved extends Notification
{
    use Queueable;

    public function __construct(private readonly Timesheet $timesheet, private readonly ?string $comment = null)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'timesheet_id' => $this->timesheet->id,
            'date' => $this->timesheet->date->toDateString(),
            'comment' => $this->comment,
            'message' => "Your timesheet for {$this->timesheet->date->toDateString()} was approved.",
        ];
    }
}
