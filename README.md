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

## Review real local observations

The following command runs this project's actual tests and build, records output hashes, and produces a packet and private logs in `.local/handoff/`. It reads the current Git revision and status. It does not upload anything or call a provider.

```text
npm run evidence
```

The default release recommendation is `hold`. An explicit local reviewer may run `npm run evidence -- --recommendation=ready`; the desk still requires a clean revision and successful referenced checks. If HEAD changes during capture, no packet is accepted. Uncommitted changes remain visible as a dirty revision.

Paste the generated `packet.json` into Developer handoff, inspect the preview, select Import handoff, then review **What is the current release decision?** Imported provenance is caller-declared; this is not authenticated CI. Editing the question clears its result. Editing pasted JSON changes only the preview until Import handoff is selected; it does not replace the active snapshot. Unknown fields and malformed references are rejected by the backend.

Synthetic Atlas/Beacon cases remain available for clean, conflicting and missing support evidence. They are visibly labeled replay data, not live sponsor calls.

For the bundled Zetaris platform, **Investigate handoff** reads the fixed latest developer packet, prepares the release question and clears the earlier review. It does not run CI or deploy. A successful connection probe does not mark this separate handoff query verified. Review timestamps and a historical-result cue make expired observations visible without silently fetching new data. See [source preparation and configuration](docs/ZETARIS-HANDOFF.md).

## Integrations and limits

- **Meterless:** actual pinned H-MEM add/query/persistence/audit operations. The upstream reference uses deterministic hash embeddings, not a learned semantic model.
- **Zetaris:** fixed, bounded read-only queries. The bundled 2.4.3 UI session and modern REST API modes have separate configuration and response validation. Put credentials only in ignored `.env.local`. The bundled handoff path preserves original timestamps and exposes query cleanup uncertainty. Configuration and an account login alone do not establish a successful query.
- **NVIDIA:** optional, disabled by default. When explicitly enabled with existing credits, only selected question/evidence data is sent. Returned excerpts must match current citations. Handoff review itself is deterministic and makes no model request.
- **Cursor:** required event development evidence is tracked separately. This repository does not claim that Codex work is Cursor work.

Byte measurements describe serialized UTF-8 data. The full-context prompt is a counterfactual comparison, not an executed baseline. Provider token counts remain unknown without a usage receipt. See [the overhead report](docs/TOKEN-OVERHEAD.md) and [critique](docs/CRITIQUE.md).

## Validate

At clean revision `d0c2bce`, all 30 tests, the production build and typecheck passed. The actual capture packet was imported and reviewed in Chrome, returning four cited records and zero provider attempts. See [the local validation receipt](docs/validation/2026-10-22-local.json). Live Zetaris and Cursor-use evidence remain pending; local checks do not establish event eligibility.

```text
npm test
npm run typecheck
npm run build
node scripts/verify-vendor.mjs
node scripts/envelope-benchmark.mjs
```

API routes: `GET /api/status`, `POST /api/demo/load`, `POST /api/handoff/import`, `POST /api/source/query`, `POST /api/answer`, and `GET /api/audit/:memoryId`. Browser cross-site requests are rejected. Request, source, memory, context and journal bounds are explicit in `server/types.ts`.

Runtime keys, credentials, Qarinah ledgers, dependency directories, recordings and generated media stay outside Git. No public deployment or competition submission is implied by a passing local test.
