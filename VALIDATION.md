# Render edition verification — 13 October 2026

- Clean `npm ci --include=dev` completed from the committed lockfile.
- 38 automated tests pass: 31 farm operations/storage tests and 7 authentication, SQLite, rate-limit and proxy-origin tests.
- Final `npm run build` succeeds, including Next.js production compilation, TypeScript and route generation. Production start uses standard Next.js, binds `0.0.0.0`, and reads `PORT`.
- 28 production HTTP checks across two starts pass: health, unauthenticated rejection, incorrect password, authenticated read/write, CSRF rejection, stale revision conflict, invalid operation, audit history and server-side logout. SQLite revisions persisted across a full process restart (revision 0 → 1 → 2).
- Browser verified the owner login and retained farm dashboard with synthetic test records.
- Dependency install and production audit report zero known vulnerabilities at verification time.

Test platform: Windows, Node 24.21.0, Next.js 16.4.0. Webpack build workers are disabled to avoid a reproduced Windows sandbox directory-write failure; the final build runs compilation in the main process. The server runtime is unchanged by that build setting. The source uses only Node/Next/SQLite; no workerd process or Cloudflare dependency is required.

Not yet verified: a live Render deployment, persistent-disk attachment or production credentials. These require your Render account configuration. No paid Render service was created. Existing D1/local-preview records have not been migrated. The test database and synthetic credentials are outside the deliverable and excluded from GitHub.
