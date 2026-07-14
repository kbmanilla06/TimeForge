<?php

namespace App\Notifications;

use App\Support\OtpPolicy;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

/**
 * Sent immediately after registration submission, before the applicant is
 * verified or an Admin is notified — the only email sent at this point in
 * the flow (Sprint 36). Mail-only: the applicant has no account access yet.
 */
class RegistrationOtpIssued extends Notification
{
    use Queueable;

    public function __construct(private readonly string $code)
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
        \Illuminate\Support\Facades\Log::info("Registration OTP for {$notifiable->email}: {$this->code}");

        return (new MailMessage)
            ->subject('All in Time — Verify Your Email')
            ->greeting("Hi {$notifiable->name},")
            ->line('Enter this code to verify your email and continue your All in Time registration:')
            ->line(new HtmlString("<strong style=\"font-size: 24px; letter-spacing: 4px;\">{$this->code}</strong>"))
            ->line("This code expires in ".OtpPolicy::TTL_MINUTES.' minutes.')
            ->line("If you didn't request this, you can safely ignore this email.");
    }
}
