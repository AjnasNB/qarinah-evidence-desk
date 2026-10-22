# Local Zetaris verification

This runbook prepares a one-time local check. Its existence and mock validation do not establish a working provider. The script uses the approved local admin session, creates no API keys or security grants, runs no Docker commands, and never uploads data or contacts cloud accounts.

Prerequisites: root owns Compose startup, loopback binding, telemetry configuration, public-safe capture/export and file copying. Wait for the real UI/API/driver to become healthy. Restart the Evidence Desk backend with the committed bundled adapter when coordinated. Keep existing private `ZETARIS_UI_URL`, `ZETARIS_USERNAME` and `ZETARIS_PASSWORD` in ignored `.env.local`; the UI origin must be loopback HTTP. Never print this file or put credentials in arguments.

## Shipped UI contract, statically checked

On 22 October, the approved UI image `zetaris-new-ui:2.4.3-v2.4.3.1-hackathon.88e49b0db015979a2d071d2d68a6865d38a39f15` was inspected through a temporary, never-started container with networking disabled. The container was removed after copying three compiled route files into ignored local inspection storage. No credentials were used in this inspection.

The shipped `/api/auth/login` POST route accepts `username` and `password`, calls the API's `/api/v1.0/internal/auth/legacy-login` GET route on port 8889 using Basic authentication, and passes a successful response through. The `/api/proxy/{path}` route forwards to `/api/v1.0/{path}` on port 8888, retaining the HTTP method, body, query string, authorization and organisation headers, and response status/body. Its exported methods include DELETE. This independently supports the adapter's version-specific login and SQL close mapping; it does not prove an actual successful login, SQL execution or cleanup body.

The inspected login route SHA-256 is `319b13f172da1258ed89bab6daa7d73294b9dece2d2098c1cfc6fd971aae0c3b`; the proxy route SHA-256 is `b0b78734e87aba01fd1aa1a31cb5e049c8616ddf002398177491127ff799890f`. Vendor implementation files remain outside Git. Live verification below remains required.

## One-time runtime verification

From the project root, probe once:

```powershell
node --import tsx scripts/verify-local-zetaris.mjs --probe
```

It checks `/api/config`, logs in, runs fixed `SELECT 1 AS one` with `pageLimit:5`, validates the bundled `records` envelope and attempts DELETE query cleanup. It does not poll or retry. An unknown close mapping remains `unconfirmed`; successful source access is not reported as confirmed cleanup.

Prepare actual source packets using the existing capture/export workflow. Preserve original observation times; generate a fresh capture only after the intended source commit is clean. For example:

```powershell
node --import tsx scripts/export-zetaris-handoff.ts '<absolute old packet.json>' '<absolute fresh packet.json>'
```

Review the exported public-safe `handoffs.csv` and manifest under `.local/zetaris-source/`. Root must place that exact CSV at this driver-readable path in the platform's existing shared customer-data volume; no additional host mount is required:

```text
/home/zetaris/customer-data/shared/qarinah-evidence-desk/handoffs.csv
```

The script does not copy it. `--csv-prepared` is the operator's explicit declaration that the reviewed file has been placed there. It accepts only an absolute `handoffs.csv` path under this project's ignored `.local/zetaris-source/` directory. The two plain-text columns are `captured_at,packet_base64`; Base64 adds bytes and provides no encryption. There must be one or two valid local-observation packets with distinct, canonical UTC capture times (`YYYY-MM-DDTHH:mm:ss.sssZ`) and at most 16 KiB decoded JSON each.

Register once, then read and assess through the running application:

```powershell
node --import tsx scripts/verify-local-zetaris.mjs --register-source --csv-prepared '<absolute .local/zetaris-source/.../handoffs.csv>'
```

Registration uses the shipped generic admin SQL route `/api/proxy/query/sql/generic-query` with `{sql}`. It checks `SHOW DATASOURCES` and `SHOW DATASOURCE TABLES QARINAH` before creating missing objects, then checks again. Unknown catalog shapes, response errors or uncertain creation stop the run. Existing objects are never dropped, replaced or retried based on an error message. The fixed local DDL follows the [official SQL manual](https://kbase.zetaris.com/knowledge/sql-manual), sections 13 and 15:

```sql
CREATE LIGHTNING DATABASE QARINAH
DESCRIBE BY "Qarinah local developer observations" OPTIONS ();

CREATE LIGHTNING FILESTORE TABLE handoffs FROM QARINAH FORMAT CSV
OPTIONS (path "/home/zetaris/customer-data/shared/qarinah-evidence-desk/handoffs.csv",
         header "true", inferSchema "false");
```

The syntax is documented; successful registration of this shipped runtime is still a live check. If its catalog columns differ from the supported name fields, the helper stops with `CATALOG_SHAPE_UNVERIFIED` instead of guessing absence or creating duplicates. A registration HTTP response alone is insufficient: catalog confirmation and a matching application source result are required.

For an already registered source, omit DDL:

```powershell
node --import tsx scripts/verify-local-zetaris.mjs --verify-source --csv-prepared '<absolute .local/zetaris-source/.../handoffs.csv>'
```

Both source modes call the application's fixed `current-release` query and supported release question with `generate:false`. They compare returned source identities to the exact prepared latest packet and check the existing deterministic ready/hold/abstain result. Old, missing, conflicting or failed artifacts retain their original meaning. A matching result proves this selected packet was read, not authenticated CI or permission to deploy.

Output is a small status and path to an ignored private receipt. The receipt retains fixed operation names, HTTP statuses, byte counts, CSV/packet hashes, original revision/time, source identities and an answer summary. It excludes auth tokens, user identity, raw provider errors and source detail. `passed` requires no recorded uncertainty; cleanup uncertainty produces `uncertain` and exit code 1. Runtime/provider failures are bounded, are not automatically retried, and do not manufacture success.

## Guarded completion after the existing download

Root may start this one-shot runner after reviewing and committing the intended source changes. Check input presence first; this mode reads no credentials and executes no child process:

```powershell
node scripts/complete-local-integration.mjs --check-only
node scripts/complete-local-integration.mjs
```

It uses `%LOCALAPPDATA%/QarinahEvidenceDesk` by default; `--runtime-root <absolute directory>` can explicitly select the same local installation elsewhere. It uses the existing private Docker configuration, Docker Desktop Linux named pipe, vendor Compose/env and project loopback override. It never starts, cancels, restarts or pulls services. Only `compose ps --format json` is polled every 30 seconds, for at most 120 minutes; all four required services must be running and healthy. Authentication is not polled.

At launch the runner requires a clean Git tree and pins the intended HEAD. Once healthy, it checks that the same revision is still clean, runs native Node/npm typecheck, then captures actual tests/build with `npm run evidence -- --recommendation=ready`. A change made during the wait stops the run. It verifies the new clean capture and exports it with the original `d0c2bce` packet, preserving old observation times. It creates the task's fixed directory in the existing driver shared volume, copies the public-safe CSV and verifies its SHA-256 inside the container. The existing registration verifier runs exactly once afterward. An existing read-only mount or permission error stops the run; no mount, ownership, grants or security settings are changed to bypass it.

Every command is bounded and runs without a shell or visible window. Its output is retained only in bounded ignored private logs. The orchestration receipt stores safe stage/exit/path/hash data, never configuration contents or raw command output. Failed, timed-out, truncated or uncertain operations stop; no retry, drop, Git write, account action, model call or public action follows. A recorded ready recommendation is a local test observation, not a promise of a successful release or competition result. Syntax and mock checks do not establish live integration.

If root explicitly supplies the existing `PLAYWRIGHT_MODULE` path when launching the runner, a confirmed integration is checkpointed first, then `record-live-integration.mjs --packet=<fresh packet>` runs once using native Node. Without that variable recording stays explicitly pending. A recording failure preserves the integration receipt and is reported separately; raw footage remains ignored and requires manual review/editing before any publication.
