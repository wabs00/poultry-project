# Flock & Field — poultry web application

A responsive, private farm workspace inspired by the supplied production dashboard. Version 1.1, 13 October 2026.

## Included workflows

- Flocks: opening birds, house, species, layer/broiler classification and assigned feed.
- Daily production: eggs, feed kg, water L, mortality, weight and notes; corrections retain prior database revisions.
- Feed inventory: feed definitions, receipts, consumption ledger and configurable low-stock alerts.
- Health: observation and follow-up records, completion/reopening.
- Tasks: due dates, assigned-person labels and completion/reopening.
- Sales: egg/bird quantities, customers, partial payments and outstanding balances.
- Expenses: categorized monetary entries, separate from inventory receipts.
- Reports: date/flock filters, hen-day production and CSV downloads with spreadsheet-formula guards.
- Farm settings and persistent, owner-scoped database revisions with stale-write protection.

The hosted application uses Sites sign-in and a Cloudflare D1 database. Records are not stored only in the browser. It starts empty. Optional fictional demo data is explicitly loaded by the user into an empty workspace; local QA records are never copied into the hosted database or source ZIP.

## Run locally on Windows

Install Node.js 24 LTS. In this project folder:

```powershell
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clear_zodiak.sql
npm run dev -- --port 8030
```

Open the Local URL printed by the server. Local development simulates a test identity on loopback; the published app uses real platform sign-in. Apply the migration once to each new local database, and apply only new migration files thereafter. Local and hosted databases are separate. Keep the terminal open; stop it with Ctrl+C.

## Start with your own records

1. Open Settings and set farm name/currency. Currency is locked after sales or expenses exist.
2. Open Feed & stock, create a feed item and receive available stock.
3. Add a flock with its opening bird count and selected feed.
4. Log each flock's daily production. Negative stock, duplicate dates and negative bird balances are rejected.
5. Record sales, payments, expenses, health follow-ups and farm tasks.
6. Export production/report CSVs and review change history.

## Storage and limits

Every successful save appends a new owner-scoped farm snapshot to `farm_revisions`. The insert checks the previous revision in the same database statement, preventing competing writers from silently replacing each other. Prior snapshots are retained for auditability. This design is intended for a small private farm: at most 5,000 active records and 1 MB of current snapshot data. Historical snapshots consume additional database space. Larger farms should migrate to normalized tables and paginated endpoints before exceeding these limits.

This version does not include staff login/role sharing, payroll, full double-entry accounting, veterinary recommendations, hatchery/processing modules, attachments, offline synchronization, multi-farm switching, purchasing invoices or bank integration. Assigned staff names are task labels. Recorded sales less expenses is not a full accounting profit measure. Health records document activities; they do not prescribe treatment. Broiler FCR is not calculated without consistent weight-gain inputs. Backup/restore and retention controls must be managed in the hosting account; CSV exports are operational reports, not a complete database backup.

## Verification

```powershell
node --test tests/operations.mjs tests/storage.mjs
node node_modules/typescript/bin/tsc --noEmit
```

With local preview running on 8030, `python tests/http_audit.py` adds synthetic QA records and checks API behavior. Never run that script against live farm records. See `VALIDATION.md` for results and limits.

## Source and design

`app/workspace.tsx`: interface; `app/core.ts`: validated operations and balances; `app/api/workspace/route.ts`: authenticated persistence; `db/schema.ts` and `drizzle/`: database schema/migrations. The retained Sites starter supplies deployment and authentication integration. Refer to the original build plan beside this project for workflow research.

The repaired release is documented in [AUDIT_REPORT.md](AUDIT_REPORT.md). Extract the audited ZIP into a fresh folder for a clean installation.
