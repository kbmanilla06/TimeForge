# Error Monitoring Configuration & PII Scrubbing

This document outlines the setup, deployment guidelines, and privacy guards implemented for central error monitoring in All in Time using Sentry.

---

## 1. Architecture & Local Development Parity

To prevent local development from leaking exceptions or generating unnecessary external network traffic, error monitoring is **dormant by default** across all environments:
* If no Sentry DSN is specified in the environment file, the Sentry SDK integrations on both the backend and frontend are completely bypassed.
* Local testing and development run perfectly with empty configuration values.
* Real exception instances flow purely to standard local output handlers (e.g., `storage/logs/laravel.log` on the backend and browser console streams on the frontend).

---

## 2. Environment Variables

To activate centralized alerting on a staging or production deployment, configure the following keys:

### Backend (Laravel)
Set these variables in the server's `.env` configuration:
```env
# Sentry endpoint URL (obtain from Sentry project settings)
SENTRY_LARAVEL_DSN=https://your-public-key@o0.ingest.sentry.io/your-project-id

# Percentage of HTTP requests to trace for performance. Defaults to 0.0 (disabled).
# Set to a value between 0.0 and 1.0 (e.g. 0.1 for 10%) if tracing is desired.
SENTRY_TRACES_SAMPLE_RATE=0.0
```

### Frontend (React SPA)
Provide this variable at build time (e.g. inside the build container/CI runner):
```env
# Sentry endpoint URL (visible to browser clients)
VITE_SENTRY_DSN=https://your-public-key@o0.ingest.sentry.io/your-project-id
```

---

## 3. PII & Sensitive Data Scrubbing

We maintain strict privacy guards to ensure zero leakage of user passwords, database credentials, authentication headers, cookies, or IP addresses to Sentry.

### Backend Scrubbing Rules (`backend/config/sentry.php`)
* **Default PII Disabled**: `'send_default_pii' => false` is hardcoded. This blocks Sentry from automatically collecting request cookies, HTTP authorization headers, session details, and user IP addresses.
* **Database Binding Safety**: `'sql_bindings' => false` and `'sql_queries' => false` are set. This prevents SQL database logs containing real parameter inputs (such as emails or sensitive values) from being included as breadcrumbs.

### Frontend Scrubbing Rules (`frontend/src/main.tsx`)
* **Default PII Disabled**: `sendDefaultPii: false` is supplied to `Sentry.init()`. This keeps IP addresses and user profiles anonymous.

---

## 4. Warnings & Best Practices

1. **Never Commit Secrets**: Do not commit real Sentry DSN values to git or write them literally in `main.tsx` or `bootstrap/app.php`. Always load them via environment variables.
2. **Reviewing Logs**: For debug auditing, verify that stack traces do not embed raw passwords or credentials before deploying new exception hooks.
3. **Queue / Horizon Errors**: The backend Sentry integration listens automatically to failing queued jobs and Horizon worker loop errors.
