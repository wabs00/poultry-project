# Flock & Field — Render edition (1.2)

This version replaces the Cloudflare/Vinext development runtime with a standard Next.js Node server. SQLite on a Render persistent disk replaces D1. A single owner username/password login replaces Sites/ChatGPT sign-in. The existing poultry interface, validated operations, per-revision audit history and conflict checks are retained. There is no staff account registration or password recovery email.

## Deploy an existing Render service

1. Deploy this folder's contents at the repository root. Choose **Node** runtime, not Python or a static site.
2. Set build command: `npm ci --include=dev && npm run build`.
3. Set start command: `npm start`.
4. Set `NODE_VERSION=24.21.0` and health check `/api/health`.
5. Attach a persistent disk at `/var/data`; set `DATABASE_PATH=/var/data/poultry.sqlite`. This requires a paid Render service. Review your Render plan and disk charges before saving. A free service with ephemeral SQLite would lose farm records, so this configuration deliberately requires the disk. Keep one instance.
6. Set `ADMIN_USERNAME` to your chosen owner username. Generate a password hash locally with `npm run password`; the password prompt hides your input. Use at least 12 characters. Put its `scrypt$...` output in Render's secret `ADMIN_PASSWORD_HASH` field. Do not commit it. Set `COOKIE_SECURE=true`.
7. Redeploy, visit the HTTPS Render URL and sign in with the username and original password. Missing owner configuration makes startup/health checks fail explicitly.

Render's `RENDER_EXTERNAL_URL` is used for request-origin checks. If you use a custom domain, set `APP_ORIGIN` to its exact HTTPS origin (for example `https://farm.example.com`). Local `.env.example` uses `http://127.0.0.1:8050`; adjust it if you change the port.

Alternatively use the supplied `render.yaml` Blueprint. It requests a paid `starter` service plus a 1 GB disk; creating it is a billing action you must review in Render. It prompts for the username and password hash. No paid service has been provisioned by this code change.

The server listens on `0.0.0.0` and Render's `PORT`. No Wrangler, workerd, Cloudflare D1 binding or Sites header injection is needed. Builds do not open the database; schema initialization happens at server startup because Render disks are unavailable during builds.

## Local Windows run

Install Node 24.13+ (Node 24 recommended). In PowerShell in this folder:

```powershell
npm.cmd ci
npm.cmd run password
```

Copy `.env.example` to `.env.local`, set the username and generated hash, keep `COOKIE_SECURE=false` for local HTTP only, then run:

```powershell
npm.cmd run dev -- --port 8050
```

Open http://127.0.0.1:8050. `next dev` loads `.env.local`. For a local production run, build first and set the variables in the process environment or use Node's env-file support:

```powershell
npm.cmd run build
node --env-file=.env.local scripts/start.mjs
```

## Data and security

The Render database begins empty; existing D1/local-preview records are not automatically migrated. Keep the original project and database backup if you need those records. Username changes select a different farm owner and hide previous records; keep `ADMIN_USERNAME` stable. Password-hash changes revoke existing sessions. Sign-out revokes the server session. Sessions expire after seven days and use HttpOnly, SameSite Strict and production Secure cookies. Ten login attempts across the service in five minutes trigger cooldown; this is a single-owner limiter, not enterprise identity management. Back up the SQLite database with SQLite's online backup API (include consistency with WAL); CSV export is not a full backup. Persistent disks prevent restart loss but are not a backup plan. Disk services can have downtime during deploys and cannot horizontally scale this database.

## Verification

`npm test` runs 31 existing farm/storage tests plus 7 Render-specific authentication/database tests. See `VALIDATION.md` for the production build and HTTP smoke results and limitations.

References: [Render disks](https://render.com/docs/disks), [Render port binding](https://render.com/docs/web-services#port-binding), [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).
