<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ExportCompleted extends Notification
{
    use Queueable;

    public string $filename;
    public string $downloadUrl;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $filename, string $downloadUrl)
    {
        $this->filename = $filename;
        $this->downloadUrl = $downloadUrl;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'subject' => 'Export Ready',
            'message' => "Your requested export file ({$this->filename}) is ready for download.",
            'link' => $this->downloadUrl,
            'filename' => $this->filename,
        ];
    }
}
