<?php

namespace App\Notifications;

use App\Models\Timesheet;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TimesheetSubmitted extends Notification
{
    use Queueable;

    public function __construct(private readonly Timesheet $timesheet)
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
            'employee_name' => $this->timesheet->user->name,
            'message' => "{$this->timesheet->user->name} submitted a timesheet for {$this->timesheet->date->toDateString()}.",
        ];
    }
}
