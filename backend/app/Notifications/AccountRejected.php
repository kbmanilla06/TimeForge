<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the applicant if an Admin rejects their account request.
 * Mail-only: a rejected account is deactivated, so the applicant can
 * never log in to see an in-app "database" notification.
 */
class AccountRejected extends Notification
{
    use Queueable;

    public function __construct(private readonly ?string $reason = null)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('All in Time — Account Request Update')
            ->greeting("Hi {$notifiable->name},")
            ->line('Your All in Time account request was not approved.');

        if ($this->reason) {
            $message->line("Reason: {$this->reason}");
        }

        return $message->line('If you believe this is a mistake, please contact your administrator.');
    }
}
