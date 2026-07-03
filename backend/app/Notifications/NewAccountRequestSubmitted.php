<?php

namespace App\Notifications;

use App\Models\AccountRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to every active Admin when a new account request is submitted.
 */
class NewAccountRequestSubmitted extends Notification
{
    use Queueable;

    public function __construct(private readonly AccountRequest $accountRequest)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $applicant = $this->accountRequest->user;
        $reviewUrl = rtrim(config('app.frontend_url'), '/').'/admin/account-requests';

        return (new MailMessage)
            ->subject('TimeForge — New Account Request')
            ->greeting("Hi {$notifiable->name},")
            ->line("{$applicant->name} ({$applicant->email}) has requested a TimeForge account and is awaiting your review.")
            ->line('Department: '.($applicant->department?->name ?? '—'))
            ->action('Review Account Requests', $reviewUrl);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $applicant = $this->accountRequest->user;

        return [
            'account_request_id' => $this->accountRequest->id,
            'applicant_name' => $applicant->name,
            'applicant_email' => $applicant->email,
            'message' => "{$applicant->name} requested a TimeForge account.",
        ];
    }
}
