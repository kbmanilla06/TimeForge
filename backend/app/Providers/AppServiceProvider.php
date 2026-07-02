<?php

namespace App\Providers;

use App\Ai\AiProvider;
use App\Ai\StubAiProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Sprint 11: the AI layer is provider-agnostic behind AiProvider,
        // but only the local, deterministic stub exists — external providers
        // (and their data-privacy rules) are explicitly deferred, so any
        // other configured value is a hard error rather than a silent swap.
        $this->app->bind(AiProvider::class, function () {
            return match ($provider = config('ai.provider')) {
                'stub' => new StubAiProvider,
                default => throw new InvalidArgumentException(
                    "Unsupported AI provider [{$provider}]; only [stub] is implemented."
                ),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The app is API-only (no "password.reset" web route), so point the
        // reset email at the frontend SPA's reset-password page instead.
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $email = urlencode($notifiable->getEmailForPasswordReset());

            return rtrim(config('app.frontend_url'), '/')."/reset-password/{$token}?email={$email}";
        });
    }
}
