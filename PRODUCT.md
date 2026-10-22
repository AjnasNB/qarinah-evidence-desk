# Qarinah Evidence Desk

An evidence review desk for developers whose agents repeatedly receive verbose tool results. It turns explicitly authorized evidence into inspectable bounded context with hashes, citations, conflicts and missing-evidence abstention. A shorter answer is useful only when it remains supported.

## New hackathon work

Started 22 October 2026, after the Open Agent Hackathon build window opened. Qarinah's existing open-source project and its persistent-memory concepts predate this event. This independent extension adds a new review UI, sponsor adapters, reproducible synthetic cases, receipts and a local observation-envelope package. Existing Meterless reference code is attributed separately. No claim is made that earlier Qarinah code was created during this build window.

## Review journey

The first concrete developer workflow now imports explicit revision, CI and release observations. It resolves the current release decision through Meterless and deterministic typed rules. Malformed enums are rejected; failure/dirty state holds the handoff; missing, stale or conflicting evidence abstains. The supplied provenance is clearly labeled as caller-declared.

1. Inspect sponsor availability and the source mode.
2. Capture explicit local test/build observations with `npm run evidence`, or supply a bounded handoff packet. The capture helper defaults its recommendation to hold. Synthetic support replays and fixed Zetaris reads are separate source modes.
3. Preview the supplied JSON, then explicitly import it. Import stores the observations locally; it does not execute their contents or independently authenticate CI.
4. Ask **What is the current release decision?** for a handoff, and inspect its citations, exclusions, supersession and byte measurements. Missing, stale or conflicting required evidence withholds the decision.
5. Handoff review is deterministic and makes no model request. Optional cited model excerpts apply only to the separate support/sample workflow when explicitly enabled.
6. Inspect or download the receipt. Review current sources before any consequential action; readiness within an imported packet grants no release authority.

Implementation checkpoint: `ff4acd0` includes the typed handoff import and local capture helper. The initial 19-test baseline is historical; the expanded suite/build receipt and clean-revision capture are pending a fresh recorded run. No live Zetaris query or Cursor-use evidence is established yet.

## Proof requirements

- Meterless: actual pinned H-MEM execution and persistent ledger history. Its reference embedder is a deterministic mock, not a learned semantic model.
- Zetaris: authenticated read-only response before claiming live integration. An account-ready email is provision evidence only.
- Cursor: actual development or review in Cursor before describing it as used. A CLI installation alone is insufficient.
- Model: provider usage fields remain null without a real provider receipt. Synthetic replay never counts as a live model call.
- Video: real running-product recordings, edited with footage-based motion. No fabricated dashboard, synthetic cursor performance or CSS slideshow.

The project is not submitted until required integrations, footage, publication and the actual submission receipt are verified. Winning probability and payment are unknown.
