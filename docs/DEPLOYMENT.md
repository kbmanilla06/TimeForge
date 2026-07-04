# TimeForge Production Deployment

Sprint 39 resolved the previously-open "deployment target" decision (`docs/DECISIONS.md` → Decisions Still Required): **Supabase-hosted Postgres** for the database, **Supabase Storage** (S3-compatible) for file storage, **Google SMTP** for mail, **Cloudflare Turnstile** for CAPTCHA. This document covers what's needed to actually deploy, and what was verified.

## Architecture

- **Backend:** Laravel API (this repo's `backend/`), stateless Bearer-token auth via Sanctum — no server-side sessions to worry about for the API itself (the `database` session/cache drivers still need a working DB connection, but nothing here is sticky-session-dependent).
- **Database:** Supabase-hosted Postgres (a managed Postgres instance — not Supabase's other products unless you separately choose to use them).
- **File storage:** Supabase Storage, via Laravel's generic S3-compatible `s3` disk driver — no custom SDK, no code specific to Supabase.
- **Mail:** Google's SMTP relay (`smtp.gmail.com:587`) via Laravel's generic `smtp` mailer.
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

### Mail — Google SMTP

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_FROM_ADDRESS=your-gmail-address@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

The password is a 16-character **Gmail App Password**, not the account's normal login password — requires 2-Step Verification enabled on the Google account: https://myaccount.google.com/apppasswords. Leave `MAIL_SCHEME` unset; this app's `config/mail.php` doesn't read `MAIL_ENCRYPTION` — port 587 auto-negotiates STARTTLS.

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

## What Was Actually Verified (Sprint 39)

- **Migrations against real Postgres**: `docker-compose.yml`'s `mysql` service was replaced with a local `postgres:16-alpine` service (dev/prod parity — dev now runs the same SQL dialect as production, just self-hosted instead of Supabase-hosted). `php artisan migrate:fresh` ran clean against it with zero errors across all 27 migrations, and `php artisan db:seed` completed successfully.
- **Authentication against Postgres**: login, `GET /me` with a real Sanctum token, and the `throttle:auth`/`throttle:api` rate limiters (which read/write through the `database` cache driver, now Postgres-backed) were smoke-tested live against the migrated container — all behaved correctly, including a 429 after exceeding the per-minute cap.
- **CAPTCHA against the real Cloudflare endpoint**: a live registration request with Cloudflare's test key pair successfully round-tripped to `https://challenges.cloudflare.com/turnstile/v0/siteverify` and passed — confirms outbound connectivity and the verification logic work outside of `Http::fake()` tests.
- **Production build**: `composer install --no-dev --optimize-autoloader`, `config:cache`, and `route:cache` all completed without error inside the app container; the app continued serving requests correctly afterward. `npm run build` produced a clean static bundle (dev dependencies and cached config were restored afterward for continued local development).
- **Storage disk fix**: `TimeEntryAttachment`, `TimeEntryAttachmentController`, and `ProfileController` (6 call sites total) used to hardcode `Storage::disk('local')`, so `FILESYSTEM_DISK` had no effect on them. Fixed to use the default disk facade (`Storage::` without `->disk('local')`), so switching `FILESYSTEM_DISK=s3` in `.env` now actually redirects attachments and profile pictures to Supabase Storage.

## Known Gaps Found During Verification (not fixed this sprint — flagging for a follow-up)

- **Google SMTP credentials in the current local `.env` are rejected by Google** (535 "Username and Password not accepted") even though outbound connectivity to `smtp.gmail.com:587` itself works fine. The stored App Password needs to be regenerated (https://myaccount.google.com/apppasswords) before real mail delivery will work — this is a credential problem, not a code or connectivity problem.
- **Registration isn't transactionally safe against a mail-send failure.** While reproducing the SMTP issue above, a real request left a `User`/`AccountRequest` row created in the database even though the subsequent OTP-email `notify()` call threw and the endpoint returned a raw 500 — the applicant never received a usable OTP and can't cleanly retry (the email is now taken). This is a genuine production-readiness gap in `RegistrationController::store()`, out of this sprint's approved scope (env/deployment configuration, not registration-flow behavior) — recommend a dedicated follow-up sprint to wrap the create-and-notify sequence so a mail failure doesn't leave an orphaned, unrecoverable registration.
- **Malware scanning on uploads remains an accepted MVP risk** (Sprint 13 decision, explicitly deferred "to be revisited at deployment/security hardening" — this is that moment, but it wasn't in this sprint's approved scope either). Revisit if/when this becomes a priority.

## Rollback

Supabase Postgres and Supabase Storage are both used through Laravel's own generic, unmodified `pgsql` connection and `s3` disk driver — there's no Supabase-specific code to unwind. Reverting to a different Postgres host (or, with more work, a different engine) is purely an environment-variable change plus, for a different engine, re-validating migration portability the same way this sprint did.
