# TimeForge Production Deployment

Sprint 39 resolved the previously-open "deployment target" decision (`docs/DECISIONS.md` → Decisions Still Required): **Supabase-hosted Postgres** for the database, **Supabase Storage** (S3-compatible) for file storage, **Google SMTP** for mail, **Cloudflare Turnstile** for CAPTCHA. This document covers what's needed to actually deploy, and what was verified.

## Architecture

- **Backend:** Laravel API (this repo's `backend/`), stateless Bearer-token auth via Sanctum — no server-side sessions to worry about for the API itself (the `database` session/cache drivers still need a working DB connection, but nothing here is sticky-session-dependent).
- **Database:** Supabase-hosted Postgres (a managed Postgres instance — not Supabase's other products unless you separately choose to use them).
- **File storage:** Supabase Storage, via Laravel's generic S3-compatible `s3` disk driver — no custom SDK, no code specific to Supabase.
- **Mail:** any provider via Laravel's mail config (Sprint 45) — Google's SMTP relay works today with zero new dependencies; SES/Postmark/Resend/Mailgun are documented options requiring an additional Composer package. See "Mail — Provider Options" below.
- **CAPTCHA:** Cloudflare Turnstile, gating only `POST /forgot-password` and `POST /reset-password`.
- **Frontend:** a static Vite/React build (`frontend/dist/` after `npm run build`) — deployable to any static host/CDN that can serve an SPA with a catch-all-to-`index.html` rewrite rule.
- **Queue/cache:** Redis, required for Horizon and the `database`-driven session/cache stores use Postgres directly (no separate service needed for those).

## Required Production Environment Variables

All of these live in `backend/.env`. `.env.example` documents every one of them with the exact same variable names — the blocks below are commented out there by default (safe dev defaults stay active); uncomment and fill in for a real deployment.

### Application

```
APP_NAME=TimeForge
APP_ENV=production
APP_KEY=                      # generate fresh — see below, never reuse a dev/staging key
APP_DEBUG=false                # never true in production — leaks stack traces/config
APP_URL=https://your-api-domain.example
FRONTEND_URL=https://your-app-domain.example
```

Generate a fresh key for this environment only:

```bash
php artisan key:generate
```

### Database — Supabase Postgres

```
DB_CONNECTION=pgsql
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=your-database-password
DB_SSLMODE=require
```

Find these under your Supabase project's **Database** settings. Use the connection pooler host (port 6543) instead of the direct-connection host if the deployment target runs many concurrent PHP-FPM workers: https://supabase.com/docs/guides/database/connecting-to-postgres

No application code changes are required for this — `config/database.php` ships Laravel's stock `pgsql` connection unmodified, and no migration or query in this codebase uses MySQL-specific SQL (verified: zero `DB::raw`/`whereRaw`/etc. calls anywhere in the app).

### File Storage — Supabase Storage

```
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-supabase-storage-access-key-id
AWS_SECRET_ACCESS_KEY=your-supabase-storage-secret-access-key
AWS_DEFAULT_REGION=your-project-region
AWS_BUCKET=your-bucket-name
AWS_ENDPOINT=https://your-project-ref.supabase.co/storage/v1/s3
AWS_USE_PATH_STYLE_ENDPOINT=true
```

Find the access key pair under your Supabase project's **Storage → S3 Connection** settings: https://supabase.com/docs/guides/storage/s3/compatibility

**Create the bucket as private (Sprint 44) — do not enable public access.** This app never generates a signed/public URL for attachments or profile pictures; every download goes through `ProfileController::showPicture()` / `TimeEntryAttachmentController::download()`, which stream the file through Laravel and re-check authorization (owner, same-department supervisor, or Admin) on every single request — not a one-time signed link that could be cached, shared, or bypass those checks later. If the bucket itself were public, anyone who somehow learned an object's storage path could fetch it directly from Supabase, bypassing the app's authorization entirely. Bucket privacy is what makes "authorization enforced at the app layer" actually hold in production, not just in this codebase's own request handlers.

**Verified this sprint:** every storage call site (`ProfileController`, `TimeEntryAttachmentController`, `TimeEntryAttachment`'s deleting hook) was re-audited and confirmed to still use the default-disk facade with no hardcoded disk name — the Sprint 39 fix is intact. New tests (`ProfileTest::test_profile_picture_flow_follows_the_configured_default_disk`, `TimeEntryAttachmentTest::test_attachment_flow_follows_the_configured_default_disk`) fake a **non-local** disk and prove the full upload/download/delete flow genuinely follows `FILESYSTEM_DISK` — every prior test in both files exercised only the `local` disk, which is also this app's default, so none of them would have caught a reintroduced hardcoding bug. Confirmed by deliberately reintroducing the old hardcoded-`'local'` pattern and watching both new tests fail as expected, before restoring the fix.

### Mail — Provider Options (Sprint 45)

This app's mail config (`config/mail.php`) is Laravel's stock, unmodified config — no code changes are needed to switch providers, only `.env`. Pick based on your own constraints; none of these is "the" answer:

| Provider | Setup effort | Notes |
| --- | --- | --- |
| **Google SMTP relay** | Lowest — works today via the generic `smtp` mailer, zero new Composer packages | Free, but Gmail enforces sending limits (~500/day) not meant for high-volume transactional mail; fine for a pilot's registration/notification volume. Requires a Gmail App Password (2-Step Verification enabled): https://myaccount.google.com/apppasswords |
| **Amazon SES** | Requires `composer require aws/aws-sdk-php` (not currently installed) | Very cheap at volume, strong deliverability if your sending domain is verified/warmed up; more setup (domain verification, sandbox-mode removal request) before first real send |
| **Postmark** | Requires `composer require symfony/postmark-mailer symfony/http-client` (not currently installed) | Purpose-built for transactional mail (not marketing/bulk), excellent deliverability reputation and dashboards out of the box; paid |
| **Resend** | Requires `composer require resend/resend-php` or the Symfony bridge (not currently installed) | Newer, developer-friendly API and dashboard; smaller track record than SES/Postmark |
| **Mailgun** | Requires `composer require symfony/mailgun-mailer symfony/http-client` (not currently installed) | Established, flexible; historically stricter about sender domain verification |
| **Resend** | Built-in via generic SMTP or API integrations | Highly recommended for modern stacks, generous free tier |
| **Postmark** | Built-in via SMTP or API integrations | Focuses entirely on high deliverability for transactional mail |

#### Recommended Production SMTP Configuration (Resend/Postmark/SES)

Dedicated transactional providers are highly recommended for production due to superior deliverability, IP reputation management, and API access controls:

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com # or smtp.postmarkapp.com, email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=resend # or your SMTP username
MAIL_PASSWORD=your-api-or-smtp-password
MAIL_FROM_ADDRESS=notifications@your-verified-domain.com
MAIL_FROM_NAME="${APP_NAME}"
```

#### Google SMTP Configuration (Not Recommended for Production)

Standard password authentication is deprecated. Personal Gmail accounts are heavily rate-limited and will fail when called from cloud host IPs. If used for testing, it requires a 16-character **Gmail App Password** and 2-Step Verification enabled:

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_FROM_ADDRESS=your-gmail-address@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Production Mail Verification Checklist

Before deploying, complete the following steps to verify mail delivery:
1. **Domain Alignment**: Confirm that SPF, DKIM, and DMARC records are configured on your DNS for the `MAIL_FROM_ADDRESS` domain.
2. **Provider Sandbox**: Ensure the transactional mail provider is active and out of sandbox mode (many restrict sending to unverified addresses by default).
3. **Connectivity Verification**: Run the `mail:test` Artisan command inside the app container:
   ```bash
   php artisan mail:test target-email@example.com
   ```
   Confirm the command outputs a success status and that the email arrives in the recipient's inbox.
4. **Resilience Test**: Verify that the application continues to respond with success even if the mail server is temporarily down (mail sending failures should be caught and reported via `report()`, per Sprint 45).

### Mail-Failure Resilience (Sprint 45)

Every place this app sends a notification tied to registration, account approval/rejection, or password reset is now wrapped so a mail-provider failure **never** turns into a raw 500 or an inconsistent response — the underlying state change (account created, email verified, request approved/rejected, reset link "requested") has already succeeded independent of whether the notification itself could actually be delivered:

- `RegistrationController::store()` / `verifyOtp()` / `resendOtp()` — a failed notify() is caught, logged via `report()`, and the normal success response still returns. The applicant can use `resend-otp` once the mail issue is fixed, without needing to re-register.
- `Admin\AccountRequestController::approve()` / `reject()` — same pattern; an admin's approve/reject action isn't reported as failed just because the confirmation email couldn't send.
- `AuthController::forgotPassword()` — this one matters most for security, not just UX: Laravel's password broker never even attempts to mail a *fake* email (it checks existence first), so an unguarded failure here would have meant a *real* registered email hitting a genuine send failure returned a distinguishable 500 while a fake one always returned the generic 200 — a real enumeration side-channel undermining the Sprint 18 anti-enumeration guarantee. Confirmed live against this environment's own (at-the-time) broken Gmail credentials before fixing it. Now both cases are identical regardless of mail provider health.

All six failure points have a test that deliberately simulates a mail-provider outage (mocking the notification dispatcher to throw) and confirms the endpoint still behaves normally — see `RegistrationTest.php`, `Admin/AccountRequestTest.php`, and `Auth/PasswordResetTest.php`.

### Testing OTP Delivery From Logs

With `MAIL_MAILER=log` (the safe local default), every notification — including the registration OTP — writes to `storage/logs/laravel.log` instead of attempting real delivery:

```bash
docker exec timeforge-app tail -60 storage/logs/laravel.log | grep -B2 -A2 "verify your email"
```

Look for a 6-digit number inside a `<strong>` tag. The code expires in 10 minutes and allows 5 attempts; a resend is allowed after a 60-second cooldown. This is also documented in `docs/QA_CHECKLIST.md` Phase 21 with the full register → verify → approve walkthrough.

### CAPTCHA — Cloudflare Turnstile

```
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=turnstile
TURNSTILE_SITE_KEY=your-real-site-key
TURNSTILE_SECRET_KEY=your-real-secret-key
```

Get a real key pair from the Cloudflare dashboard — the value baked into `config/captcha.php`'s defaults is Cloudflare's own published **test** key pair (always passes), fine for dev but must be replaced for production. The frontend needs the matching site key in its own `.env` as `VITE_TURNSTILE_SITE_KEY`.

### Everything else (unchanged from dev)

```
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=redis
```

These don't need to change for production — Sanctum's Bearer-token auth doesn't depend on session cookies, and both drivers work the same against Postgres as they did against MySQL.

### CORS — Allowed Origins (Sprint 43)

```
CORS_ALLOWED_ORIGINS=https://your-app-domain.example
```

Laravel's out-of-the-box default is a wildcard (`Access-Control-Allow-Origin: *`) — confirmed live against this app before this sprint. `config/cors.php` now reads an explicit allowlist instead, defaulting to `FRONTEND_URL` above if `CORS_ALLOWED_ORIGINS` isn't set, so a typical single-frontend deployment needs no extra variable at all. Set `CORS_ALLOWED_ORIGINS` (comma-separated) only if more than one origin needs access — e.g. a staging frontend and production frontend sharing one backend. Never set this to `*` in production.

With exactly one configured origin (the default case), the underlying `fruitcake/php-cors` library always echoes that one value back regardless of the request's actual `Origin` header — this is safe (the browser itself enforces the same-origin match against the header before exposing the response to a page's JS, and the server never reflects an arbitrary attacker-supplied origin), but it means a single-origin allowlist won't show a *missing* header for a disallowed origin, only the *correct configured* one. Genuine per-request gating (header absent for an unlisted origin) only kicks in once `CORS_ALLOWED_ORIGINS` has two or more values — verified directly against the library's own source, not assumed; see `tests/Feature/CorsTest.php`.

This app is Bearer-token-only (no cookies sent cross-origin, confirmed: `apiFetch` never sends `credentials: 'include'`, and Sanctum's stateful/cookie mode is never engaged), so the wildcard default wasn't a CSRF risk — but it did let any origin read API responses cross-origin if a token ever leaked into that page's JS context. Closed as defense-in-depth.

### HTTPS and Trusted Proxies (Sprint 43)

```
TRUSTED_PROXIES=10.0.0.0/8
```

By default, this app trusts **no** proxies — if it ends up behind a reverse proxy or load balancer that terminates TLS and forwards plain HTTP internally (common in most hosting setups, including a more elaborate topology than this repo's own `nginx` Docker container), Laravel won't know the original request was HTTPS. This can produce wrong (`http://`) URLs in generated links and misclassify the connection as insecure.

Set `TRUSTED_PROXIES` to the proxy's IP/CIDR range (comma-separated for more than one), or `*` only if your deployment topology guarantees no untrusted client can reach the app directly (e.g. the app is genuinely unreachable except through the proxy). Leave unset for this repo's own local Docker Compose stack — nothing proxies it. Do **not** set this to `*` casually; it means trusting `X-Forwarded-*` headers from any source, which lets a client spoof its own IP/scheme if the app actually is directly reachable.

## Deployment Sequence

```bash
# Backend
composer install --no-dev --optimize-autoloader
php artisan key:generate           # first deploy only — never on redeploys
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan storage:link           # only if the 'public' disk is ever used directly; attachments/pictures are not

# Frontend
cd frontend
npm run build                      # outputs frontend/dist/ — deploy as a static SPA
```

Run `php artisan config:clear` and `route:clear` before making any further `.env` changes locally — cached config takes precedence over `.env` once cached.

### ⚠️ The `config:cache` database gotcha (Sprint 41)

Once `php artisan config:cache` has run, every `DB_*` value (host, database, username, password) is frozen into `bootstrap/cache/config.php` at that exact moment — **editing `.env` afterward has no effect at all** until `config:clear` runs, even though nothing in the app or its logs indicates this. This is a genuine, easy-to-hit foot-gun, not a hypothetical: it happened mid-session during this project's own Sprint 40 audit, where a temporary `.env` change was silently ignored until `config:clear` was run.

**Rule for any production database change** (rotating credentials, pointing at a different Supabase instance, restoring to a new host after an incident): always run, in this order —

```bash
php artisan config:clear
# edit .env
php artisan config:cache
```

Never edit `.env` alone and assume it took effect — verify with `php artisan tinker --execute="echo config('database.connections.pgsql.host');"` (or `config('database.default')`) if there's ever doubt about which database the running app actually believes it's talking to.

## What Was Actually Verified (Sprint 39)

- **Migrations against real Postgres**: `docker-compose.yml`'s `mysql` service was replaced with a local `postgres:16-alpine` service (dev/prod parity — dev now runs the same SQL dialect as production, just self-hosted instead of Supabase-hosted). `php artisan migrate:fresh` ran clean against it with zero errors across all 27 migrations, and `php artisan db:seed` completed successfully.
- **Authentication against Postgres**: login, `GET /me` with a real Sanctum token, and the `throttle:auth`/`throttle:api` rate limiters (which read/write through the `database` cache driver, now Postgres-backed) were smoke-tested live against the migrated container — all behaved correctly, including a 429 after exceeding the per-minute cap.
- **CAPTCHA against the real Cloudflare endpoint**: a live registration request with Cloudflare's test key pair successfully round-tripped to `https://challenges.cloudflare.com/turnstile/v0/siteverify` and passed — confirms outbound connectivity and the verification logic work outside of `Http::fake()` tests.
- **Production build**: `composer install --no-dev --optimize-autoloader`, `config:cache`, and `route:cache` all completed without error inside the app container; the app continued serving requests correctly afterward. `npm run build` produced a clean static bundle (dev dependencies and cached config were restored afterward for continued local development).
- **Storage disk fix**: `TimeEntryAttachment`, `TimeEntryAttachmentController`, and `ProfileController` (6 call sites total) used to hardcode `Storage::disk('local')`, so `FILESYSTEM_DISK` had no effect on them. Fixed to use the default disk facade (`Storage::` without `->disk('local')`), so switching `FILESYSTEM_DISK=s3` in `.env` now actually redirects attachments and profile pictures to Supabase Storage.
- **Mail-failure resilience (Sprint 45)**: registration (OTP issue/verify/resend), account approve/reject, and forgot-password were all previously vulnerable to an unguarded `notify()`/`sendResetLink()` call surfacing a raw 500 on a mail-provider failure — worse, `forgotPassword()` specifically had a real, confirmed enumeration side-channel under mail failure (a real email could 500 while a fake one always returned the generic 200). All six call sites are now wrapped, logged via `report()` on failure, and proven with tests that simulate a mail outage by mocking the notification dispatcher — each test was independently verified to fail against the un-fixed code before confirming it passes against the fix.

## Known Gaps Found During Verification (not fixed this sprint — flagging for a follow-up)

- **Google SMTP credentials in the current local `.env` are rejected by Google** (535 "Username and Password not accepted") even though outbound connectivity to `smtp.gmail.com:587` itself works fine. The stored App Password needs to be regenerated (https://myaccount.google.com/apppasswords) before real mail delivery will work — this is a credential problem, not a code or connectivity problem, and isn't something a code sprint can fix.
- ~~Registration isn't transactionally safe against a mail-send failure~~ — resolved in Sprint 45; see "Mail-Failure Resilience" above.
- **Malware scanning on uploads remains an accepted MVP risk** (Sprint 13 decision, explicitly deferred "to be revisited at deployment/security hardening" — this is that moment, but it wasn't in this sprint's approved scope either). Revisit if/when this becomes a priority.

## Production Environment Checklist (Sprint 43)

Run through this before any real deployment — it consolidates every environment-safety item documented above into one pass:

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false` (confirm — never `true` in production, leaks stack traces/config to error responses)
- [ ] `APP_KEY` freshly generated for this environment (`php artisan key:generate`), never copied from dev/staging
- [ ] `APP_URL` set to this backend's own public URL
- [ ] `FRONTEND_URL` set to the deployed SPA's origin
- [ ] `CORS_ALLOWED_ORIGINS` set if more than one frontend origin needs access (otherwise `FRONTEND_URL` alone covers it) — confirm it is **not** a wildcard
- [ ] `TRUSTED_PROXIES` set if a TLS-terminating reverse proxy/load balancer sits in front of the app; confirmed generated URLs are `https://` afterward
- [ ] `DB_*` point at the real production Postgres instance, `DB_SSLMODE=require` for Supabase
- [ ] `FILESYSTEM_DISK=s3` with real Supabase Storage credentials (not local disk)
- [ ] `MAIL_MAILER` set to a transactional mail provider or SMTP server — verified via `php artisan mail:test` that emails successfully deliver to the inbox
- [ ] `CAPTCHA_ENABLED=true` with real Turnstile keys (not the published test key pair) and the frontend's `VITE_TURNSTILE_SITE_KEY` matches
- [ ] `php artisan migrate --force` run and confirmed clean (`php artisan migrate:status` shows nothing pending)
- [ ] `php artisan config:cache` run **last**, after every other `.env` value above is finalized (see the `config:cache` gotcha above — changing `.env` afterward silently does nothing until `config:clear`)
- [ ] Demo/seed data (`DemoDataSeeder`) never run against this environment; every demo credential changed or removed
- [ ] `/horizon` confirmed inaccessible (its allowlist is empty by default — access only in `local`)
- [ ] `LOG_LEVEL` raised above `debug` (e.g. `error` or `warning`) — see "Production Logging Expectations" below
- [ ] `GET /health` returns `200` with every check `"status": "ok"` before declaring the deployment live — see "Health Check" below

## Backup and Restore

See `docs/BACKUP_RESTORE.md` (Sprint 47) for the full runbook: `pg_dump`/
`pg_restore` commands for Docker local and Supabase, storage backup
guidance for local/Supabase/S3, what must be backed up vs. never
committed, a disaster recovery checklist, and a restore verification
checklist. Take a database backup before any risky production migration
or credential rotation, in addition to whatever automatic backups your
Supabase plan provides.

## Health Check (Sprint 52)

`GET /health` — public, unauthenticated (standard for monitoring/load-balancer tooling that can't authenticate), rate-limited via the existing `throttle:lookup` bucket (30 requests/minute per IP, Sprint 19) as defense-in-depth. Point an uptime monitor, Kubernetes liveness/readiness probe, or load balancer health check at this URL.

Checks three dependencies with a cheap, safe operation each:

- **database** — a trivial `select 1`.
- **redis** — `Redis::connection()->ping()`. This is what Horizon/the queue actually depend on (`QUEUE_CONNECTION=redis`), which is a separate thing from the cache store (`CACHE_STORE=database` by default) — checking Redis directly is more useful than checking the cache facade, which may not touch Redis at all.
- **storage** — a real put/read/delete round-trip against a small marker file on the configured default disk (`FILESYSTEM_DISK`). This is the only check that works identically whether the disk is `local` or Supabase Storage (`s3`) — the two drivers have no shared "is the directory writable" primitive, so a real round-trip is the only reliable cross-driver check.

Response shape:

```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "storage": { "status": "ok" }
  },
  "timestamp": "2026-07-05T12:00:00.000000Z"
}
```

HTTP status is `200` only if every check passes; `503` if any fails, so a monitor can act on the status code alone without parsing the body. **Never includes hostnames, credentials, DSNs, or raw exception messages** — a failing check reports its real exception via `report()` (so it still reaches logs/whatever error monitoring is wired up, see below) and the public response only ever says `"status": "error"`, nothing more specific.

**Resolved Gap (Sprint 53):** The Redis connectivity gap has been resolved by installing the `predis/predis` package and setting `REDIS_CLIENT=predis` in the environment configuration. Running `/health` against the Docker container now reports `redis: ok` and Redis pings successfully, enabling Horizon, queues, and health checks to function correctly.

## Error Monitoring — Sentry/Bugsnag Setup (Documentation Only, Sprint 52)

No error monitoring provider is installed. This section documents how to add one later — per this sprint's non-scope, nothing here is wired up now.

This app already has an established pattern, used extensively since Sprint 45 (mail-failure resilience) and Sprint 46 (audit logging), of catching failures at every resilience point and calling `report($e)` rather than letting them surface as raw errors or silently disappearing:

```php
try {
    // ...
} catch (\Throwable $e) {
    report($e);
}
```

Every one of these call sites already flows through Laravel's exception handler (`bootstrap/app.php`'s `withExceptions()`), which is the exact integration point Sentry/Bugsnag hook into. **Wiring up a real provider later requires zero changes to any existing `report()` call site** — only a package install and one bootstrap hook.

**Sentry** (recommended — widest Laravel-specific tooling and docs):

```bash
composer require sentry/sentry-laravel
php artisan sentry:publish --dsn=your-dsn-here
```

Add to `.env`:

```
SENTRY_LARAVEL_DSN=https://your-key@your-org.ingest.sentry.io/your-project
SENTRY_TRACES_SAMPLE_RATE=0.2
```

The published config auto-registers Sentry's exception handler integration; no manual edit to `bootstrap/app.php` is required by default with recent `sentry-laravel` versions (the package's service provider hooks in automatically).

**Bugsnag** (alternative):

```bash
composer require bugsnag/bugsnag-laravel
```

Add to `.env`:

```
BUGSNAG_API_KEY=your-api-key-here
```

Both require installing a new Composer package not currently in `composer.json` — treat that as its own decision when the time comes, the same framing Sprint 45 used for mail providers beyond the generic SMTP transport.

## Production Logging Expectations (Sprint 52)

`LOG_LEVEL=debug` is `.env.example`'s default — appropriate for local development, **not for production**. Debug-level logging is noisy and can log more request/query detail than a production environment should retain. Raise it:

```
LOG_LEVEL=error
```

(`warning` is a reasonable middle ground if you want deprecation/warning-level signal without full debug noise.)

`LOG_CHANNEL=stack` (default, unchanged) fans out to whatever channels `LOG_STACK` lists — `single` (one rotating file at `storage/logs/laravel.log`) by default. For a containerized deployment, consider pointing the stack at `stderr` instead (Laravel's built-in `stderr` channel) so logs are captured by your container platform's own log aggregation rather than a file inside the container that disappears when the container is replaced.

Once an error monitoring provider is wired up (see above), it typically adds itself as an additional channel in the `stack` list — logs continue going wherever they already go, and also reach the monitoring provider, with no change to any of the `report()` call sites already throughout this codebase.

## Rollback

Supabase Postgres and Supabase Storage are both used through Laravel's own generic, unmodified `pgsql` connection and `s3` disk driver — there's no Supabase-specific code to unwind. Reverting to a different Postgres host (or, with more work, a different engine) is purely an environment-variable change plus, for a different engine, re-validating migration portability the same way this sprint did.
