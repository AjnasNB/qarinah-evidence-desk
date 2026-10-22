# Evidence Desk: product refinement

Outcome after this plan: the user explicitly approved source `6bd93e0` and R7 publication, including the desktop-demo limitation. The existing HackOS entry's new video and exact description persist after reload. See [the upgrade receipt](submission/UPGRADE-RECEIPT-2026-10-22.json). The original planning statement below describes the state before that approved update.

The submitted Wildcard entry remains at public commit `e1d7d6f`. This document describes a subsequent local improvement, not an updated competition submission. Prize probability is unknown. The current [official rubric](https://hackathon.genai.works/event/open-agent-hackathon-2026#rules) weights impact 30, technical execution 20, innovation 15, demo 15, UX 10 and sponsor use 10. A test pass rate cannot be substituted for a chance of winning.

## Intent and opportunity

For a developer receiving an agent's release handoff, the useful question is: **can I inspect and reproduce the recommendation without trusting its summary?** The existing desk already retrieves observations through Zetaris, keeps source lineage in Meterless and abstains on inadequate evidence. Its exported receipt contains the sources and answer, but has no independent replay tool or recorded review timestamp. A recipient currently has to inspect it by hand.

The selected extension is **replayable release review**. Keep the current product and add an offline verifier, a small local review form and a recorded review timestamp. Verify source identity and reference structure, replay the actual Evidence Desk rules and Meterless source resolution at the recorded time, compare the decision and citations, then assess the same packet at the present time. State caller-declared provenance prominently. No deployment, paid provider, new model or remote publication is needed.

This is the builder's scope decision within the requested product refinement. It is not a user quotation or evidence of customer demand.

## Ideation from three perspectives

These are candidate solutions, not customer research findings.

| Perspective | Candidate | Opportunity / principal weakness |
| --- | --- | --- |
| Product | Replayable release review | A reviewer can reproduce a saved decision; source authenticity still needs a trusted producer |
| Product | Hosted team workspace | Easier collaboration; new authentication, privacy and hosting burden |
| Product | CI-provider source adapter | Stronger provenance; real authorized pipeline access and new integration needed |
| Product | Developer impact study | Tests actual task utility; requires independent participants |
| Product | Browser-output budget advisor | Relevant token problem; total usage and quality baseline are still missing |
| Design | Side-by-side evidence change view | Clarifies why a decision changed; more UI without source authentication |
| Design | Review a saved receipt | Fits the existing export workflow; must distinguish expiry from corruption |
| Design | Guided first handoff | Reduces JSON friction; easy to mistake a sample for real work |
| Design | Accessible source timeline | Makes original observation times visible; already partly covered by source detail |
| Design | One-page reviewer checklist | Cheap orientation; documentation alone does not strengthen the product |
| Engineering | Isolated offline replay | Reuses actual Meterless and deterministic rules; must validate input before replay |
| Engineering | Trusted digest comparison | Detects change against a separately trusted file hash; an attacker can replace an untrusted hash |
| Engineering | Signed CI attestations | Can establish a producer identity; key issuance and trust policy required |
| Engineering | Cross-provider corroboration | Independent evidence sources; larger permission and freshness surface |
| Engineering | Property and mutation challenges | Can falsify unsafe behavior cheaply; synthetic results do not establish user impact |

## Five priorities

1. **Replayable release review:** selected for this local build. Reuses the actual engine and exported observations, adds a concrete reviewer action and a falsifiable correctness check.
2. **Trusted digest comparison:** include as an optional CLI input. Never describe an embedded or attacker-replaceable hash as a signature.
3. **Adversarial receipt challenges:** include malformed references, edited decisions, rehashed source changes, wrong citations and expiry. These verify behavior, not market demand.
4. **Authenticated CI adapter:** next major product direction, deferred until a concrete authorized producer can be tested. Do not claim that local replay solves it.
5. **Independent task study:** prepare a protocol now; recruit or contact nobody without approval. This is needed before making user-impact or token-saving claims.

## Risk assumptions and cheap experiments

| Risk | Assumption / what can fail | Confidence | Experiment | Proposed threshold | Current status |
| --- | --- | --- | --- | --- | --- |
| Value | A saved release review matters to developers beyond this build | Low | Five independent developers compare two matched handoff tasks with/without the desk; counterbalance task order | At least four identify the correct blocker and cite its source; report all completion times and errors | Not run; no users invented |
| Usability | People distinguish consistent history from current readiness | Low | Ask the same participants to interpret one valid but expired receipt | All five explain that old READY grants no current release permission | Not run |
| Viability | Teams will pay for review rather than existing CI dashboards | Low | Approved interviews about actual recent handoffs and current spend; do not ask hypothetical willingness alone | Evidence of a recurring workflow and a real next-step commitment from at least two teams | Not run |
| Feasibility | A receiver can replay without credentials/network | Medium before implementation | Local endpoint and CLI use an isolated actual Desk/Meterless instance, with a fail-closed provider stub | Exact decision and source/citation comparison; zero provider calls; temp state removed | Execute against the implementation |
| Integrity | Simple source/result edits cannot pass as consistent | Medium before implementation | At least 16 distinct negative/mutation checks including rehashed changes | Every inconsistent mutation rejected; record legitimate controls too | Execute against the implementation |
| Freshness | An expired consistent receipt is not mistaken for a fresh result | Medium before implementation | Fixed-clock replay at original review time and beyond one-hour expiry | Historical result matches; present assessment abstains | Execute against the implementation |
| Efficiency | The workflow saves total tokens and time without quality loss | Low | Future complete request/response and actual provider-usage comparison alongside task accuracy | Predefine non-inferiority and cost criteria before collection | Not measured; byte sizes remain byte sizes |

Thresholds are design decisions, not observed results or statistically established population rates.

## Build and evidence contract

- Preserve the receipt's original source times and the exact historical result. Add server-side `reviewedAt` to new answers; do not invent it for old exports.
- Support typed developer handoffs only. Reject missing review time, unsupported formats, malformed/oversized JSON, invalid references, inconsistent source hashes and altered claimed results.
- Retain the normalized validated packet alongside source records, rather than reconstructing it from source prose. Validate it with the existing importer; require regenerated canonical source records and handoff header to equal the receipt. Do not execute evidence text, URLs or shell commands. The extra packet bytes are part of the actual exported/API body, not an assumed saving.
- Replay the actual Evidence Desk/Meterless engine in owned temporary state, first at the original review time and then at the verifier's current clock. Exclude nondeterministic latency/byte counters and memory IDs from the verification claim.
- Display historical consistency, recorded result and current packet assessment separately. Neither passing replay nor a supplied digest authenticates CI or authorizes release.
- Record real browser interaction with the running form after validation. Preserve R6 and the submitted assets. Any new clip is local review material until a separately approved publication/update.
- Keep a claim-to-evidence checklist. Product implementation, tests, real footage and measurement receipts need exact identities; user-impact, actual token savings, source authentication and winning odds remain unproven.

## Skills used

Installed and applied `brainstorm-ideas-existing`, `identify-assumptions-existing`, `brainstorm-experiments-existing` (phuryn/pm-skills, MIT, pinned revision `c68487d721e419ec87af1ae6412a842978eab785`) and `verification-before-completion` (obra/superpowers, MIT, pinned revision `bb92a77741419a4ab5f06e711a283343f1ada0c3`). SkillDash discovery provided pinned manifests; the Codex installer installed the verification skill. All eight instruction/license files were checked against manifest hashes. See [the setup receipt](validation/skill-setup-2026-10-22.json). Qarinah supplies project-local cited memory. Skills provide methods; they provide neither market evidence nor a judging guarantee.
