# Replay a saved release review

The local upgrade adds one concrete reviewer action: reproduce an exported handoff decision from its validated packet, sources and citations. The submitted HackOS entry and public `e1d7d6f` source remain unchanged until a later approved update.

## Use the browser

1. Import explicit developer observations or investigate the configured Zetaris handoff, then review the supported release question.
2. Select **Export receipt**. New handoff reviews export `qarinah.evidence-desk.receipt.v2`, with the server's original review time, the normalized validated packet and `qarinah-release-review-v1` policy identifier. The normalized packet is not a claim to preserve the original JSON byte encoding.
3. Open **Verify a saved release review**, paste the exported JSON, then select **Verify receipt**. This sends only that supplied receipt to the loopback backend. It does not change the active desk's evidence or fetch a source.
4. Inspect the reproduced recorded decision, the packet assessment at the displayed check time and the original source provenance. Verify again for a later freshness assessment. An old READY can reproduce correctly while the same packet now abstains.

The browser accepts 16 KiB, matching the existing API request bound. An oversized pasted receipt has a clear error; use the offline CLI for larger exports. Other source modes and legacy v1 exports remain readable JSON but do not gain invented packet or timing evidence.

## Use the offline CLI

```text
npm run verify:receipt -- path/to/receipt.json
npm run verify:receipt -- path/to/receipt.json --sha256=SEPARATELY_TRUSTED_64_CHARACTER_LOWERCASE_DIGEST
```

The CLI accepts a file up to 128 KiB. It makes no network/provider request. A rejected receipt exits 1 with a bounded error code. A consistent receipt exits 0 and distinguishes its recorded result from its assessment at `checkedAt`.

An optional trusted SHA-256 must come from a separately trusted channel. Copying a hash from the same untrusted receipt does not authenticate it. No producer-signature or independently authenticated CI feature is implemented.

## What replay checks

- Supported receipt/policy version and original creation, review, export and expiry ordering.
- Exact snapshot/question binding and validated packet structure, references, typed outcomes and supersession.
- Regenerated canonical source records, full source hashes, identities and handoff header equality.
- A separate actual Evidence Desk and pinned Meterless reference instance, using the original capture and review clocks. Its complete expiry, source-resolution and context-bound path produces the comparison result.
- Equality of the saved status, mode, reason, release decision, answer, claims, citations, exclusions and conflicts.
- A second assessment of the same packet using verification time. No old observation time is renewed.

Owned temporary replay state is removed afterward. The verifier executes neither source text nor referenced commands/URLs. It does not load local provider credentials.

## What replay does not establish

Hashes are not signatures. A person can replace an entire packet and create a new internally consistent receipt. Replay does not prove CI ran, a historical memory lookup occurred, source claims are true or a producer identity is trusted. It also does not verify exported runtime flags, sponsor transport/cleanup metadata, repair guidance, historical memory IDs, latency, body-byte counters or provider usage. Source-specific repair guidance is excluded because a Zetaris reread action differs from a plain import action even when the decision is identical.

The extra normalized packet is part of exported/API bytes. No total token saving, user-task improvement or winning probability follows from replay passing.

## Verification and next evidence

The focused suite includes at least 18 distinct negative receipt mutations, rehashed-source/old-result rejection, a consistently rewritten unauthenticated control, precise expiry boundaries, actual CLI digest checks, isolation of active memory, and a mocked Zetaris query → review → export → replay regression. These are software regressions, not customer research. The five-participant task protocol and cash/impact assumptions are in [the refinement plan](IDEA-REFINEMENT-2026-10-22.md).

Recorded product footage and the real local test/build capture retain their exact source commit. New media stays local for review; the earlier submitted R6 is preserved.
