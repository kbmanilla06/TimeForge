<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('mail:test {email}', function (string $email) {
    $this->info("Attempting to send a test email to {$email} using mailer: " . config('mail.default'));

    $validator = Illuminate\Support\Facades\Validator::make(['email' => $email], [
        'email' => 'required|email',
    ]);

    if ($validator->fails()) {
        $this->error("Invalid email address provided.");
        return 1;
    }

    try {
        Illuminate\Support\Facades\Mail::raw('This is a test email from TimeForge to verify mail delivery configuration.', function ($message) use ($email) {
            $message->to($email)
                ->subject('TimeForge Mail Delivery Test');
        });

        $this->info("Mail successfully sent/enqueued! Check logs or inbox.");
    } catch (\Throwable $e) {
        $this->error("Mail sending failed!");
        $this->line($e->getMessage());
        return 1;
    }

    return 0;
})->purpose('Send a test email to verify mail delivery configuration');

