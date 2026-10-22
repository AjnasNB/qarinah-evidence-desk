# Qarinah Evidence Desk

Local review draft for the Open Agent Hackathon Wildcard route. **Submission remains blocked.** This package has not been published or submitted. Required live Zetaris and Cursor evidence, the final video URL and public source publication remain pending.

## Project description

Qarinah Evidence Desk helps a developer inspect the evidence behind a release recommendation. It imports chosen observations of a Git revision, tests, build and release statement, then answers one concrete question: **What is the current release decision?**

A recommendation can lose its context when an agent repeatedly reads large tool outputs or carries an old summary into a new task. The desk keeps the supporting observations inspectable. Its typed rules check revision references, freshness, explicit supersession and conflicting outcomes. A dirty revision or conclusive failure holds the handoff. Missing, stale, unknown or unresolved conflicting evidence causes abstention. The result grants no deployment authority.

## What we built

The local capture helper runs this project's tests and build, records their output hashes and captures the current Git revision and working-tree state. It defaults the release recommendation to hold. The user previews a bounded JSON packet before explicitly importing it into the desk.

The backend stores sourced observations through the actual pinned Meterless H-MEM reference implementation. Review resolves selected evidence against the active snapshot and exposes citations, exclusions and memory audit history. Supplied observation text remains untrusted data. Import and handoff review execute no source instructions and make no model request.

Separate synthetic Atlas/Beacon support examples demonstrate consistent, conflicting and missing evidence. The new Investigate handoff action reads a fixed developer packet through the bundled Zetaris adapter, preserving its original times and provenance. Forty local tests pass, including mocked provider contracts, but a live authenticated Zetaris query has not yet succeeded. Optional NVIDIA excerpt selection remains disabled. Cursor support acknowledged escalation; account access and actual development use remain unverified.

## Verified local result

The current committed validation receipt records a clean capture at `dee93876a5a108ff711aa25f2021705fa618cb34`: 40 tests passed, with no failures or skips, and build/typecheck passed. Chrome reviewed the actual new packet with four citations; a separate API cross-check confirmed zero provider attempts. Re-importing the unchanged older capture after its observations expired correctly produced abstention.

This verifies a local rehearsal using caller-declared observations. It does not independently authenticate CI or reproduce captured logs. Source: `docs/validation/2026-10-22-bundled.json`, committed in `69e29c6`. The original `d0c2bce` 30-test receipt remains preserved for the dated film and r2 deck; the deck needs a final refresh after real sponsor verification.

A revised local 96-second, 1080p/30 fps demo combines actual product recordings, the authentic logo, original 120 BPM instrumental, texture and clearly editorial motion graphics. Full decode, motion, audio-level and BT.709 checks passed; an independent visual review cleared the earlier timing/disclosure issues. It is a dated demonstration of the named `d0c2bce` capture, not footage of the newer backend or proof that old observations remain current. Sponsor footage and an approved public video URL remain pending. No narration or human listening review is claimed. See `docs/video/r3/QA.md`.

A separate synthetic observation-envelope benchmark measured 36,584 UTF-8 source bytes against 789 bytes for the first complete serialized result wrapper and 758 for a repeated result. These are fixture byte measurements. Total workflow cost, provider-token savings and downstream task quality remain unmeasured.

## New work and attribution

This independent extension began on 22 October 2026. Existing Qarinah concepts and brand assets predate the event. New work includes the review UI, typed developer-handoff import, deterministic release assessment, capture helper, sponsor adapters, receipts and observation-envelope package. Meterless reference code retains its attribution and uses deterministic hash embeddings rather than a learned semantic model.

Team: **Cognifyr, Ajnas N B**, solo builder. Development uses AI assistance. Built with JavaScript/TypeScript, React, Vite, Node.js and the pinned Meterless H-MEM reference.

## Planned enhancements

Future work would add independently authenticated CI receipts, developer observations retrieved through Zetaris, and held-out task comparisons that measure total workflow overhead, actual provider usage and answer quality. These remain proposed enhancements. The current implementation reviews caller-declared local observations and fixed source samples.

## Internal completion gates

| Gate | Current evidence |
| --- | --- |
| Local product and validation | Captured and documented |
| Meterless | Actual reference H-MEM execution and audit history |
| Zetaris | Adapter present, live query pending |
| Cursor development | Access blocked, CLI installed, actual use unverified |
| NVIDIA | Optional, disabled, no inference receipt |
| Deck | Local editable review deck and PDF |
| Video | Local 108-second draft complete, sponsor footage and public URL pending, narration optional |
| GitHub source and README | Public entry source URL pending approval |
| Final competition entry | Blocked, no submission |

The main task verified the intended route requires Zetaris, Meterless and Cursor development evidence, with NVIDIA where it contributes. Recheck the final published requirements before submission. Official rules: [Open Agent Hackathon](https://hackathon.genai.works/event/open-agent-hackathon-2026#rules).
