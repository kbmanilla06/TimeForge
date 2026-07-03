<?php

namespace App\Providers;

use App\Ai\AiProvider;
use App\Ai\StubAiProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
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

        // Sprint 14 hardening: no rate limiting existed before this sprint.
        // "auth" guards the public credential endpoints against brute force,
        // keyed per email+IP so one target can't be hammered and one IP
        // can't spray. "api" is a per-user ceiling far above legitimate
        // SPA usage.
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by(Str::lower((string) $request->input('email')).'|'.$request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?? $request->ip());
        });

        // Sprint 19 hardening: GET /register/departments carries no email
        // input, so under the "auth" limiter's email+IP key it collapsed to
        // a single ''|{ip} bucket shared by every no-email request from
        // that IP — a legitimate applicant reloading the registration page
        // could exhaust the same budget that protects login/register
        // against brute force. This endpoint is a harmless public read (no
        // credential, no PII beyond department names), so it gets its own
        // generous per-IP ceiling instead of sharing the anti-brute-force
        // bucket.
        RateLimiter::for('lookup', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });
    }
}
