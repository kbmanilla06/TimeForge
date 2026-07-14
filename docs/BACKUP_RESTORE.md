# All in Time Backup and Restore Runbook

Sprint 47. Covers how to back up and restore All in Time's data — the
Postgres database, uploaded files, and the environment variables needed
to reconstruct a working deployment — for both local Docker development
and Supabase-hosted production (`docs/DEPLOYMENT.md`).

This is a documentation and verification sprint only: no new
infrastructure, no paid backup service, no destructive command was run
against real data. See "Verification Performed (Sprint 47)" at the
bottom for exactly what was tested and how.

## What Must Be Backed Up

- **Database** — every table (`users`, `timesheets`, `time_entries`,
  `departments`, `clients`, `projects`, `kpis`, `audit_logs`, etc.). This
  is the source of truth for almost everything in the app.
- **Uploaded files** — profile pictures and timesheet attachments. These
  live outside the database (on disk locally, in Supabase Storage/S3 in
  production) and are **not** included in a database dump — they need
  their own backup.
- **Environment variable values** — `APP_KEY`, database credentials,
  storage credentials, mail credentials, CAPTCHA secret. Not a file to
  back up (see below) but values that must be recoverable from a secrets
  manager/password vault if the environment is ever rebuilt from
  scratch. Without `APP_KEY` specifically, every encrypted value and
  existing session/cookie becomes unrecoverable.

Redis is **not** in this list — it's used only as a cache/queue driver
(`QUEUE_CONNECTION=redis`) here, never as a system of record. Losing it
loses in-flight jobs and cached values, not durable data.

## What Must Never Be Committed

- `.env`, `.env.backup`, `.env.production` — already excluded by
  `backend/.gitignore`.
- `APP_KEY`, `DB_PASSWORD`, `AWS_SECRET_ACCESS_KEY`, `MAIL_PASSWORD`,
  `TURNSTILE_SECRET_KEY` — any credential from `docs/DEPLOYMENT.md`'s
  environment variable list.
- **Backup files themselves.** A `pg_dump` file or a storage archive
  contains real user data (names, emails, uploaded documents) and is
  just as sensitive as the live database. The root `.gitignore` now
  excludes `backups/`, `*.dump`, `*.sql`, and `*.sql.gz` (Sprint 47) so
  a backup taken locally can't be accidentally staged or committed.

## PostgreSQL Backup — Docker Local

Custom format (`-F c`) rather than plain SQL: it's compressed and
supports `pg_restore`'s selective/parallel restore.

```bash
mkdir -p backups
docker exec timeforge-postgres pg_dump -U timeforge -d timeforge -F c -f /tmp/timeforge-backup.dump
docker cp timeforge-postgres:/tmp/timeforge-backup.dump ./backups/timeforge-$(date +%Y%m%d-%H%M%S).dump
docker exec timeforge-postgres rm -f /tmp/timeforge-backup.dump
```

`backups/` is gitignored (see above) — this is a local artifact, not
something to commit. For a real deployment, copy the resulting file to
durable storage (a separate bucket, encrypted volume, or backup
service) outside this repo entirely.

## PostgreSQL Restore — Docker Local

**Always restore into a new, disposable database first to verify the
backup is good — never restore directly on top of the real database
unless this genuinely is a production incident.**

```bash
# Verification restore (safe — does not touch the real `timeforge` database)
docker exec timeforge-postgres createdb -U timeforge timeforge_restore_test
docker cp ./backups/timeforge-<timestamp>.dump timeforge-postgres:/tmp/
docker exec timeforge-postgres pg_restore -U timeforge -d timeforge_restore_test --no-owner /tmp/timeforge-<timestamp>.dump

# ...verify row counts / spot-check data (see "Restore Verification Checklist" below)...

# Clean up the disposable database once verified
docker exec timeforge-postgres dropdb -U timeforge timeforge_restore_test
```

**The destructive variant — only during an actual incident, never as a
drill:**

```bash
# ⚠️ DESTROYS the current contents of the real `timeforge` database.
# Only run this against a genuinely lost/corrupted database, with a
# fresh dump already verified via the disposable-database method above.
docker exec timeforge-postgres dropdb -U timeforge timeforge
docker exec timeforge-postgres createdb -U timeforge timeforge
docker exec timeforge-postgres pg_restore -U timeforge -d timeforge --no-owner /tmp/timeforge-<timestamp>.dump
```

## Supabase Backup/Restore Guidance

Supabase-hosted Postgres (`docs/DEPLOYMENT.md`) supports two approaches:

1. **Dashboard-managed backups** — Supabase takes automatic daily
   backups on paid plans, with point-in-time recovery on higher tiers.
   Restore through the Dashboard's **Database → Backups** panel. This is
   the simplest option and needs no tooling on your side — see
   Supabase's own docs: https://supabase.com/docs/guides/platform/backups
2. **Manual `pg_dump`/`pg_restore`** — identical commands to the Docker
   local section above, pointed at the Supabase connection string
   instead of the local container:

   ```bash
   pg_dump "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require" -F c -f backups/supabase-$(date +%Y%m%d-%H%M%S).dump
   ```

   Use the same disposable-database verification pattern before ever
   restoring over a real Supabase database. Restoring into Supabase
   requires a target database reachable with the same connection string
   shape — either a second Supabase project or a local Postgres
   instance used purely to verify the dump is valid.

Prefer the Dashboard-managed backups as the primary safety net in
production; treat manual dumps as a supplementary, on-demand snapshot
(e.g. immediately before a risky migration).

## Storage Backup Guidance

### Local disk (dev)

The `local` filesystem disk (`config/filesystems.php`) roots at
`storage_path('app/private')`, and `docker-compose.yml` bind-mounts the
whole `backend/` directory (`./backend:/var/www/html`) rather than using
a separate Docker volume — so uploaded files already exist directly on
the host at `backend/storage/app/private/` and
`backend/storage/app/public/`. No Docker-specific step is needed:

```bash
tar -czf backups/storage-$(date +%Y%m%d-%H%M%S).tar.gz -C backend/storage/app private public
```

### Supabase Storage (production)

S3-compatible — the same `AWS_*` credentials already configured for the
app (`docs/DEPLOYMENT.md`) work with the standard AWS CLI against
Supabase's S3-compatible endpoint:

```bash
aws s3 sync s3://<AWS_BUCKET> ./backups/supabase-storage-$(date +%Y%m%d-%H%M%S)/ \
  --endpoint-url "$AWS_ENDPOINT"
```

### Generic S3 (if ever used instead of Supabase Storage)

Same `aws s3 sync` approach, no `--endpoint-url` needed for real AWS S3.

## Disaster Recovery Checklist

Use this if the production database or storage bucket is lost,
corrupted, or needs to move to a new host.

- [ ] Identify the most recent known-good backup (DB dump timestamp +
      storage snapshot timestamp) — confirm they're close enough in time
      that data referenced in one exists in the other (e.g. a timesheet
      row referencing an attachment that must also be in the storage
      snapshot).
- [ ] Provision or confirm a reachable Postgres target (new Supabase
      project, or the existing one recovered by Supabase support).
- [ ] Restore the database (Dashboard point-in-time recovery, or
      `pg_restore` from the manual dump).
- [ ] Restore storage bucket contents (`aws s3 sync` the backup back to
      the bucket, or provision a fresh bucket and sync into it).
- [ ] Update `.env` if the host, credentials, or bucket name changed.
      Rotate every credential if the incident involved a suspected leak,
      not just the ones known to be affected.
- [ ] Run `php artisan config:clear` then `php artisan config:cache`
      **in that order** — see the `config:cache` gotcha already
      documented in `docs/DEPLOYMENT.md`; editing `.env` after a stale
      cache is silently ignored.
- [ ] Run `php artisan migrate --force` and confirm
      `php artisan migrate:status` shows nothing pending, in case the
      restored backup predates a since-added migration.
- [ ] Run through the "Restore Verification Checklist" below.
- [ ] Notify stakeholders of recovery completion and the size of any
      data-loss window (time between the backup and the incident).

## Restore Verification Checklist

Confirms a restore actually worked — not just that the restore command
exited without an error.

- [ ] Table count in the restored database matches the source (`SELECT
      count(*) FROM information_schema.tables WHERE table_schema =
      'public';`).
- [ ] Row counts on key tables (`users`, `timesheets`, `audit_logs`) are
      non-zero and plausible for the expected point in time.
- [ ] A specific known record's field values match exactly, not just its
      row count — e.g. the seeded admin's `name`/`email`/`role`, or a
      specific real record's contents. Row counts alone can coincidentally
      match without proving actual content fidelity.
- [ ] At least one uploaded file (profile picture or attachment)
      downloads successfully and its size/checksum matches the original.
- [ ] `php artisan migrate:status` shows nothing pending against the
      restored database.
- [ ] A real login succeeds against a restored user account.
- [ ] `audit_logs` (Sprint 46) shows the expected historical entries —
      a practical proof that the restore returned to a genuine prior
      state rather than an empty or partially-applied one.

## Verification Performed (Sprint 47)

Executed live against the running local Docker stack
(`timeforge-postgres`), with the real `timeforge` database never
overwritten, dropped, or modified at any point:

1. `pg_dump -F c` of the real `timeforge` database (6 users, 8
   timesheets, 1 `audit_logs` row, 2 departments, 27 tables at the time
   of the drill).
2. Copied the dump out of the container to a local, gitignored
   `backups/` directory — confirmed with `git status` that it produced
   no tracked/staged change.
3. Created a brand-new disposable database, `timeforge_restore_test_sprint47`
   (never used by the running app).
4. Restored the dump into that disposable database with `pg_restore
   --no-owner`.
5. Compared the restored database against the real one:
   - Table count: **27 vs 27** — match.
   - Row counts (`users`, `timesheets`, `audit_logs`, `departments`):
     **6 / 8 / 1 / 2 vs 6 / 8 / 1 / 2** — match.
   - Field-level content, not just counts: the admin user's `id`,
     `name`, `email`, and `role`, and the one `audit_logs` row's
     `action` and `metadata` JSON, were byte-for-byte identical between
     the real and restored databases.
6. Dropped only the disposable database (`dropdb
   timeforge_restore_test_sprint47`) and re-confirmed the real
   `timeforge` database still had its original 6 users afterward.
7. Deleted the local dump file and the container's `/tmp` copy — no
   backup artifact containing real user data was left on disk or ever
   staged in git.

**Result: PASS.** The documented `pg_dump`/`pg_restore` commands above
are exactly the commands used in this drill (with the disposable
database name changed for clarity) — proven to work against this
environment, not written from memory.
