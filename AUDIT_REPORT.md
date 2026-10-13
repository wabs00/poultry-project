# Poultry application audit — release 1.1.0

13 October 2026. Audited source: `PoultryManager`, with an isolated clean-install checkout and fictional farm data. Existing project databases were preserved.

## Outcome

The tested operational workflows pass after repairs. This is not a claim that every possible defect is eliminated or that the application is ready for a large multi-user farm. One upstream dependency advisory remains unpatched, and online publication remains incomplete.

## Repairs

| Finding | Result |
| --- | --- |
| Hen-day denominator included same-day bird sales | Uses opening live-bird count. Eight eggs from ten opening birds remains 80%, even after nine birds are sold and one mortality is recorded that day. Verified through API rules and phone sale/report workflow. |
| Egg-production chart ignored selected flock | Chart now filters by flock; a broiler-only selection produces a zero-egg series. |
| Date input could visually change without updating filters | Date filters now handle input events directly. Clearing a bound updates the report immediately. |
| Invalid/missing dates allowed misleading CSV export | Invalid periods show an error, hide period-dependent totals and disable export. |
| Conflict refresh left a stale form ready to overwrite newer values | Save is disabled after a conflict; close and reopen the latest record before retrying. |
| Hidden mobile navigation remained keyboard-accessible | Closed phone sidebar is inert; opening navigation restores access. |
| Closing a dialog could leave focus on a detached element | Restores focus after rendering, with a visible heading-action fallback. Verified in the browser. |
| Modal background remained accessible | Background workspace and sidebar are inert while a dialog is open; focus stays inside the form. |
| Financial page displayed an ineffective flock filter | Removed that control from the financial page; totals explicitly describe whole-farm scope. |
| Demo onboarding offered an action that fails in a partly configured farm | Demo loading is offered only for an empty workspace; setup proceeds to flocks once feed items exist. |
| A flock with no birds could record later production | Rejects nonzero production for days starting with no live birds. |
| Health activity could precede flock placement | Rejects dates before placement while allowing future scheduled activities. |
| Capacity limit prevented correcting an existing daily record | Corrections remain available at the 5,000-record ceiling; new additions remain blocked. |
| Invalid month produced a technical date error | Returns a friendly date-validation message. |
| Request validation accepted malformed command shapes | Rejects arrays, missing fields and negative revisions. Request body is bounded by bytes while streaming. |
| Stored corruption could leak an exception or crash the interface | Validates snapshot structure and references. Both reads and writes return controlled 503 JSON errors; they do not replace damaged data with an empty farm. |
| Change-history load failure looked like empty history | Displays an error and discards late responses after navigating away. |
| Unexpected HTML response exposed JSON parsing errors | Displays a readable retry/sign-in message. |
| Balance validation repeatedly rescanned entire collections | Uses a chronological event ledger; preserves day-level stock and bird checks. No production throughput claim is made. |

## Verification

- **31 unit tests passed:** 25 operation tests plus six stored-snapshot tests.
- **40 HTTP checks passed:** 33 integration checks plus seven corrupted-storage/recovery checks.
- Simultaneous writes from one revision returned exactly one success and one conflict (200/409).
- Malformed JSON and malformed-but-valid-JSON storage were temporarily injected only into the isolated QA database. Reads/writes failed safely; original test snapshots were restored in `finally` blocks.
- Strict TypeScript checks passed. Drizzle generation confirmed no schema changes. The existing migration remains unchanged.
- Fresh locked installations in both the isolated checkout and the main project folder completed successfully with 683 packages. An interrupted installation in the original source folder was moved into `work` and preserved rather than deleting project data.
- A read-only startup check in the main project loaded its existing database at revision 30; no farm records were changed.
- Production build passed after framework updates. Desktop and phone flows verified conflict handling, corrections, date guards, filtered chart, mobile navigation and sale/report calculations. Phone layout had no document-level horizontal overflow.

## Dependencies

Initial audit: **30 affected package entries** (one critical, 21 high, seven moderate, one low). Final locked audit: **eight high entries**, zero critical/moderate/low. All remaining entries trace to the same unpatched `braces` advisory. Package counts include indirect dependents and are not counts of distinct defects.

Updated the Next compatibility dependency, React/RSC, Vinext, Vite, Cloudflare plugin, Wrangler and matching worker types. Applied compatible transitive updates and scoped esbuild/fflate overrides; tested migration generation, build and runtime afterward. No forced framework downgrade was used.

Evidence: `audit/npm-before.json` and `audit/npm-after.json`. The Next critical advisory is [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j); RSC advisory [GHSA-wx67-qw84-cm4g](https://github.com/advisories/GHSA-wx67-qw84-cm4g). No exploit was demonstrated against this application. Remaining advisory: [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Do not describe this release as security-clean.

## Remaining limits

- Single-owner farm; staff names are task labels, not shared user accounts or role permissions.
- No offline synchronization, full accounting, payroll, attachments, or veterinary advice.
- Snapshot persistence is bounded to 5,000 active records / 1 MB current data; retained revisions consume additional database space. Normalize and paginate before scaling beyond this design.
- Hosted sign-in/access, external recovery controls and real-device behavior were not tested against a live deployment. No sustained load test, independent penetration test or backup/restore rehearsal was performed.
- The toolchain emits non-fatal migration guidance for a future Vite config-loader change and Vinext CLI usage. Current build and runtime checks pass.
- Publication remains blocked by the previously reported automatic approval rejection for the publishing helper. No live URL is claimed.

## Use the repaired release

Extract `PoultryManager-v1.1-audited.zip` into a fresh folder and follow `README-POULTRY.md`. Keep your existing `.wrangler` data separate and backed up before updating an established installation. The ZIP contains no QA database, installed dependencies or credentials.
