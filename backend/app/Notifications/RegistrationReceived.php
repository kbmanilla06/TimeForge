<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the applicant immediately after they submit a registration.
 * Mail-only: a pending applicant cannot log in, so an in-app "database"
 * notification would never be visible to anyone.
 */
class RegistrationReceived extends Notification
{
    use Queueable;

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('All in Time — Registration Received')
            ->greeting("Hi {$notifiable->name},")
            ->line('Thanks for registering for All in Time. Your request has been submitted and is pending administrator approval.')
            ->line("You'll receive another email once a decision has been made. There's nothing else for you to do right now.");
    }
}
