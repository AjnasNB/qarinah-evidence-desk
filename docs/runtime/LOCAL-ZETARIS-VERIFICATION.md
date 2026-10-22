# Local Zetaris verification

This runbook prepares a one-time local check. Its existence and mock validation do not establish a working provider. The script uses the approved local admin session, creates no API keys or security grants, runs no Docker commands, and never uploads data or contacts cloud accounts.

Prerequisites: root owns Compose startup, loopback binding, telemetry configuration, public-safe capture/export and file copying. Wait for the real UI/API/driver to become healthy. Restart the Evidence Desk backend with the committed bundled adapter when coordinated. Keep existing private `ZETARIS_UI_URL`, `ZETARIS_USERNAME` and `ZETARIS_PASSWORD` in ignored `.env.local`; the UI origin must be loopback HTTP. Never print this file or put credentials in arguments.

From the project root, probe once:

```powershell
node --import tsx scripts/verify-local-zetaris.mjs --probe
```

It checks `/api/config`, logs in, runs fixed `SELECT 1 AS one` with `pageLimit:5`, validates the bundled `records` envelope and attempts DELETE query cleanup. It does not poll or retry. An unknown close mapping remains `unconfirmed`; successful source access is not reported as confirmed cleanup.

Prepare actual source packets using the existing capture/export workflow. Preserve original observation times; generate a fresh capture only after the intended source commit is clean. For example:

```powershell
node --import tsx scripts/export-zetaris-handoff.ts '<absolute old packet.json>' '<absolute fresh packet.json>'
```

Review the exported public-safe `handoffs.csv` and manifest under `.local/zetaris-source/`. Root must place that exact CSV at this driver-readable path, with a read-only bind where available:

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
