# TimeForge Demo Script

A ~17-minute, role-by-role walkthrough of the complete MVP plus the post-MVP auth/onboarding enhancement, built on the demo dataset. Dress-rehearse once before presenting.

## Setup (before the audience arrives)

```bash
cd backend
php artisan migrate:fresh --seed                      # bootstrap admin
php artisan db:seed --class=DemoDataSeeder            # demo dataset (dev/demo ONLY)
php artisan serve                                     # http://localhost:8000

cd ../frontend
npm run dev                                           # http://localhost:5173
```

Have a small PDF on the desktop ready to upload live. Best demoed on the 3rd day (or later) of a payroll period, so the seeded "logged but never submitted" example exists; on days 1-2 that one example is naturally absent (nothing is ever seeded in the future).

## Demo Credentials (dev/demo only — password is `Passw0rd123!` for all)

| Login | Role | Notes |
| --- | --- | --- |
| admin@timeforge.test | System Administrator | From the base seeder |
| supervisor@timeforge.test | Supervisor | Engineering department |
| employee@timeforge.test | Employee | Engineering; hourly rate $20; the busiest dataset |
| intern@timeforge.test | Employee | Engineering; **no hourly rate** (payroll-validation demo) |
| marketer@timeforge.test | Employee | Marketing; $18 |
| hr@timeforge.test | HR / Finance | |

## What The Seeder Creates (checklist)

- [x] 2 departments (Engineering, Marketing); 6 users across all four roles
- [x] 2 clients (Acme Corp, Globex), 2 projects (Website Redesign, Mobile App)
- [x] 3 KPIs: Bugs Resolved 6/10 for Eve (+3 credited this period, applied), Docs Written 0/10 for Engineering (zero-progress), Sales Calls (no target) for Mark
- [x] Previous payroll period, fully reviewed: approved days incl. a **10h overtime day**, a rejected day, a revision-requested day; Iris (unrated) has approved hours; Mark has an approved Marketing day
- [x] Current period: an approved day, a **submitted day awaiting review**, and (from day 3 of the period) a **logged-but-never-submitted** day
- [x] Daily scrums incl. the blocker "VPN keeps dropping" on two distinct days (recurring) and one one-off blocker
- [x] No attachments seeded — you upload one live (Act 2)
- [x] No pending account requests seeded — you register one live (Act 0) and decide it live (Act 4)

## Act 0 — A New Hire Joins (unauthenticated, ~1.5 min)

1. Open `http://localhost:5173/login` in a private/incognito window (or log out first). *Talking point: this is the landing page, not a bare login box — the same product pitch a new hire sees before they ever have credentials.*
2. Click **Create Account**. Fill in a name, a real department, an email nobody's used yet, and a password — watch the strength meter react as you type. Leave the optional fields (middle name, employee ID, position, contact number) blank to show they're genuinely optional. Check the terms box, submit.
3. Point out the "Registration Received" confirmation — not a silent redirect — and that trying to log in with those exact credentials right now fails with "not active yet." *Talking point: nobody gets in without a human decision — remember this name, it comes back in Act 4.*

## Act 1 — The Employee's Day (employee@, ~4 min)

1. **Time Tracking:** point out the summary cards and the date-grouped entries with statuses. Start a live timer ("Demo: presenting TimeForge"), let it tick, stop it.
2. **Attachments:** on today's editable entry, *Attach file* → upload the PDF → download it back. Try a `.txt` or oversized file — clean rejection. *Talking point: extension + real content type validated; 10MB cap; private storage, never web-served.*
3. **Daily Scrum:** show today's entry; add a blocker.
4. **Submit:** submit today's timesheet — everything on the day locks, including attachments.
5. **AI Insights:** *Daily Summary* → Generate. *Talking point: every number is real stored data; the provider is a local stub — swap-ready architecture, zero external calls; regeneration keeps history (append-only audit).*

## Act 2 — The Supervisor's Review (supervisor@, ~4 min)

1. **Team Timesheets:** the seeded *submitted* day plus the one just submitted; download the attachment you uploaded. Approve one with a comment; *Request revision* on another — flip to a second tab as the employee to show the day unlock.
2. **Team KPIs:** the three assignments and their progress. *Talking point: progress credits only on approval — reviewed productivity, not self-reported.*
3. **Team Scrum:** the recurring "VPN keeps dropping" in plain sight; comment on an entry (it locks for the employee).
4. **AI Insights:** *Recurring Blockers* (finds VPN across days, with counts and names) → *Recommendations* (numbered actions citing exact pending counts, the blocker, zero-hour members) → *KPI Analysis* (ranked completion, zero-progress flag). *Talking point: facts only — no invented scores or judgments, by decision.*

## Act 3 — HR Runs Payroll (hr@, ~3 min)

1. **Payroll:** previous period — Eve ≈ 18h approved with 2h overtime at 1.25× ($370 estimate); Iris has hours but **no rate → no estimate**. Pending/rejected buckets from the seeded states.
2. **Exports:** Payroll PDF and Excel, numbers matching the screen.
3. **AI Insights:** the *single* Payroll Validation tab (organization-wide) — names Iris under missing rates, totals, unsubmitted days, open timers. *Talking point: HR sees computed payroll facts, never raw work logs — role boundaries are server-enforced (403s, not hidden buttons).*

## Act 4 — The Admin View (admin@, ~3 min)

1. **Dashboard:** organization-wide — total hours, department performance, project allocation, attendance trend, KPI completion, billable split, pending approvals, Payroll Summary. Change the period; hit Refresh.
2. **Manage Users:** create "New Hire" (pending) → Activate; set an hourly rate. *Talking point: Admins can still provision accounts directly — the two onboarding paths coexist.*
3. **Account Approvals:** open it, find the Act 0 registrant by searching their name, review their full details, and **Approve** them. Switch to their earlier tab and log in — it now succeeds. *Talking point: same status model as direct-created users — approval just flips `pending` to `active`; reject reuses the existing Deactivate/Activate mechanism, no new states invented.*
4. **Reopen:** reopen an approved timesheet — the employee's day unlocks for correction; the comment trail keeps everything.
5. Close on **AI Insights** as admin: all seven capabilities, any subject.

## Closing Line

"Every PRD module plus a full self-service onboarding flow — landing page, registration, admin approval, email notifications — 211 backend and 186 frontend tests, role security enforced server-side and test-verified, AI built provider-agnostic with a zero-risk local stub — ready for a real provider, real deployment, and real users."

## If Something Goes Wrong

- Blank screens → both servers running? `php artisan serve` + `npm run dev`.
- Wrong numbers → reseed: `php artisan migrate:fresh --seed && php artisan db:seed --class=DemoDataSeeder`.
- 429 during rapid demo logins or registration attempts → wait ~60s (auth rate limit) or use another email for the Act 0 registration.
- The full fallback: `docs/QA_CHECKLIST.md` maps every claim to a verifiable step.
