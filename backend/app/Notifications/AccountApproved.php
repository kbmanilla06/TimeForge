<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the applicant once an Admin approves their account request.
 */
class AccountApproved extends Notification
{
    use Queueable;

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $loginUrl = rtrim(config('app.frontend_url'), '/').'/login';

        return (new MailMessage)
            ->subject('TimeForge — Account Approved')
            ->greeting("Hi {$notifiable->name},")
            ->line('Your TimeForge account has been approved. You can now log in.')
            ->action('Log In', $loginUrl);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'Your account has been approved. You can now log in.',
        ];
    }
}
