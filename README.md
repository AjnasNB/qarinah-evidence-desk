# Qarinah Evidence Desk

Inspect a developer handoff before accepting its release recommendation. The desk checks the current Git revision, referenced test/build observations, explicit supersession, unresolved conflicts and missing evidence. It returns citations or abstains. A recommendation never deploys anything or grants approval.

New extension started during the Open Agent Hackathon build window on 22 October 2026. Existing Qarinah concepts, brand assets and Meterless reference code are disclosed in [PRODUCT.md](PRODUCT.md), [brand provenance](public/brand/SOURCE.txt) and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

## Run locally

Requires Node 22.12+ and npm. No account or card is required for the local replay and explicit-import workflows.

```text
npm ci --ignore-scripts
npm run dev
```

Open http://127.0.0.1:5183/. The backend binds only 127.0.0.1:4318. For a production bundle, run `npm run build` followed by `npm start`, then open port 4318.

For Cursor, open `qarinah-evidence-desk.code-workspace` and press **Ctrl+Shift+B** for the local validation task. Run/debug tasks, private context exclusions and an honest editor-evidence checklist are in [the Cursor guide](docs/CURSOR.md). Opening the workspace does not claim actual development use or restored account access.

## Review real local observations

The following command runs this project's actual tests and build, records output hashes, and produces a packet and private logs in `.local/handoff/`. It reads the current Git revision and status. It does not upload anything or call a provider.

```text
npm run evidence
```

The default release recommendation is `hold`. An explicit local reviewer may run `npm run evidence -- --recommendation=ready`; the desk still requires a clean revision and successful referenced checks. If HEAD changes during capture, no packet is accepted. Uncommitted changes remain visible as a dirty revision.

Paste the generated `packet.json` into Developer handoff, inspect the preview, select Import handoff, then review **What is the current release decision?** Imported provenance is caller-declared; this is not authenticated CI. Editing the question clears its result. Editing pasted JSON changes only the preview until Import handoff is selected; it does not replace the active snapshot. Unknown fields and malformed references are rejected by the backend.

New local upgrade: export a v2 handoff receipt and open **Verify a saved release review** to reproduce its decision, source identities and citations through an isolated Desk/Meterless instance. Its recorded result is separate from the dated freshness assessment. The offline command is `npm run verify:receipt -- receipt.json`. See [replay scope and limitations](docs/RECEIPT-REPLAY.md). The published submission remains the earlier approved version until an update is authorized.

Bounded Next steps identify stale, missing, failed or conflicting observations and link to their exact evidence. Fix failed checks at their source and capture real new results. The explicit import or source-reread action retrieves observations; it never changes outcomes, runs CI or grants deployment permission.

Synthetic Atlas/Beacon cases remain available for clean, conflicting and missing support evidence. They are visibly labeled replay data, not live sponsor calls.

For the bundled Zetaris platform, **Investigate handoff** reads the fixed latest developer packet, prepares the release question and clears the earlier review. It does not run CI or deploy. A successful connection probe does not mark this separate handoff query verified. Review timestamps and a historical-result cue make expired observations visible without silently fetching new data. See [source preparation and configuration](docs/ZETARIS-HANDOFF.md).

## Integrations and limits

- **Meterless:** actual pinned H-MEM add/query/persistence/audit operations. The upstream reference uses deterministic hash embeddings, not a learned semantic model.
- **Zetaris:** fixed, bounded read-only queries. The bundled 2.4.3 UI session and modern REST API modes have separate configuration and response validation. Put credentials only in ignored `.env.local`. The bundled handoff path preserves original timestamps and exposes query cleanup uncertainty. Configuration and an account login alone do not establish a successful query.
- **NVIDIA:** optional, disabled by default. When explicitly enabled with existing credits, only selected question/evidence data is sent. Returned excerpts must match current citations. Handoff review itself is deterministic and makes no model request.
- **Cursor:** the founder reports running the project's validation task in Cursor during development. Most implementation was assisted by Codex; the retained validation receipt is from a separate Codex terminal run. No Cursor AI session is claimed. See [the usage disclosure](docs/submission/READINESS-2026-10-22.md).

Byte measurements describe serialized UTF-8 data. The full-context prompt is a counterfactual comparison, not an executed baseline. Provider token counts remain unknown without a usage receipt. See [the overhead report](docs/TOKEN-OVERHEAD.md) and [critique](docs/CRITIQUE.md).

## Validate

The full suite passed 51 tests after the native catalog verifier fix. The clean movie capture at `968764a` passed 46 tests, the production build and typecheck. Chrome and the actual recording demonstrated stale repair guidance followed by a separate fresh capture with four citations. See [the capture receipt](docs/validation/2026-10-22-repair.json); earlier receipts remain preserved.

Real bundled Zetaris authentication, native source registration, exact old/fresh source reads and query cleanup also passed. The old observations abstained; an explicit reread after the genuine source update returned the expected revision and four matching citations. No model attempt was made. See [the live verification receipt](docs/validation/2026-10-22-zetaris-live.json) and [local verification runbook](docs/runtime/LOCAL-ZETARIS-VERIFICATION.md). These observations do not independently authenticate CI. Cursor use is disclosed as founder-reported activity; the organizer determines eligibility. HackOS confirmed the Wildcard entry as submitted on 22 October 2026, with status preserved after reload. See [the submission receipt](docs/submission/SUBMISSION-RECEIPT-2026-10-22.json).

```text
npm run validate
npm test
npm run typecheck
npm run build
node scripts/verify-vendor.mjs
node scripts/envelope-benchmark.mjs
```

API routes: `GET /api/status`, `POST /api/demo/load`, `POST /api/handoff/import`, `POST /api/source/query`, `POST /api/answer`, and `GET /api/audit/:memoryId`. Browser cross-site requests are rejected. Request, source, memory, context and journal bounds are explicit in `server/types.ts`.

Runtime keys, credentials, Qarinah ledgers, dependency directories, recordings and generated media stay outside Git. No public deployment or competition submission is implied by a passing local test.
