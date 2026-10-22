# Qarinah Evidence Desk

Local review draft for the Open Agent Hackathon Wildcard route. **Submission remains blocked.** This package has not been published or submitted. Required live Zetaris and Cursor evidence, the final video URL and public source publication remain pending.

## Project description

Qarinah Evidence Desk helps a developer inspect the evidence behind a release recommendation. It imports chosen observations of a Git revision, tests, build and release statement, then answers one concrete question: **What is the current release decision?**

A recommendation can lose its context when an agent repeatedly reads large tool outputs or carries an old summary into a new task. The desk keeps the supporting observations inspectable. Its typed rules check revision references, freshness, explicit supersession and conflicting outcomes. A dirty revision or conclusive failure holds the handoff. Missing, stale, unknown or unresolved conflicting evidence causes abstention. The result grants no deployment authority.

## What we built

The local capture helper runs this project's tests and build, records their output hashes and captures the current Git revision and working-tree state. It defaults the release recommendation to hold. The user previews a bounded JSON packet before explicitly importing it into the desk.

The backend stores sourced observations through the actual pinned Meterless H-MEM reference implementation. Review resolves selected evidence against the active snapshot and exposes citations, exclusions and memory audit history. Supplied observation text remains untrusted data. Import and handoff review execute no source instructions and make no model request.

Separate synthetic Atlas/Beacon support examples demonstrate consistent, conflicting and missing evidence. Fixed Zetaris query adapters exist, but a live authenticated Zetaris query has not yet succeeded. Optional NVIDIA excerpt selection remains disabled. Cursor access is blocked, with the CLI installed but no verified development use.

## Verified local result

The committed validation receipt records a clean capture at `d0c2bce75d8eba29a83fcfa2d1f9518a727cec94`: 30 tests passed, with no failures or skips, and build/typecheck passed. The actual packet was imported and reviewed through Chrome. The result cited four observations and made zero provider attempts.

This verifies a local rehearsal using caller-declared observations. It does not independently authenticate CI or reproduce captured logs. Source: `docs/validation/2026-10-22-local.json`, committed in `9fbf949`.

A local 108.07-second, 1080p/30 fps silent captioned video draft now uses actual product footage. The main task verified its complete frame decode and reviewed motion keyframes. Sponsor footage and an approved public video URL remain pending. Narration is optional.

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
