# Tool and context overhead

Status: local evidence reviewed on 22 October 2026. No provider-token or billing comparison has been measured.

## Why this task's payloads become large

Tool results can contain the evidence, transport metadata, presentation markup, line-numbered source files and serialized wrappers together. Returning an entire connector result can repeat the same pack in text and structured fields. Nested JSON adds escaping; another full-file read repeats material already available. Batched reads reduce round trips but can still produce a large, truncated result that requires another read.

These are visible output costs, not access to hidden prompts or reasoning. Removing irrelevant fields helps only when required facts, errors, freshness, exclusions and source references survive. Small inputs can grow after adding provenance.

## What was measured

`node scripts/envelope-benchmark.mjs` independently reproduced:

| Synthetic serialized payload | UTF-8 bytes |
| --- | ---: |
| Full source fixture | 36,584 |
| First selected result, including measurement wrapper | 789 |
| Repeated result, including measurement wrapper | 758 |

The fixture deliberately contains redundant presentation markup and metadata. The caller explicitly selects the retained fields. Repetition refers to a previously emitted envelope; the caller must retain the envelope and authorized full artifact. The cache is bounded and temporary, not durable evidence storage.

This comparison excludes selection work, full-artifact retrieval/storage, surrounding prompts, model output, retries, transport and downstream answer quality. It measures neither total workflow savings nor billed tokens. Provider usage remains null without a real usage receipt. The browser product's full-context request is a constructed counterfactual, not an executed baseline.

These fixture numbers do not measure the developer handoff capture/import workflow. A clean-revision rehearsal at `d0c2bce` passed 30 tests and the production build, then returned four citations in Chrome. The end-to-end overhead comparison remains pending; no workflow saving is inferred from the older benchmark.

## Qarinah checkpoint and recall

The operator reported that a manual source checkpoint and cited summary became retrievable after rebuilding a stale derived index. At the initial review observation, the exact workspace was initialized and `context.doctor` reported `ok:true`, two ledger events and a current derived index. This verifies that observed state, not automatic hook capture, today's event count or the earlier rebuild operation itself.

For the same focused query, `Measured local envelope foundation`, a summary recall with `limit:3,maxChars:1000` returned no items, `coverage:none` and `truncated:true`. At `maxChars:2000`, it returned the 442-character summary with genuine summary/source event references and `truncated:false`. The complete citation envelope needs room beyond the excerpt alone. An empty, truncated pack must not be interpreted as absence of project evidence.

Use compact summaries first, enlarge a clearly truncated budget once, and retrieve only a specific cited source when needed. Keep this exact-root memory separate from other projects; local Git notes and Qarinah checkpoints are sufficient without Slack.

After the clean local handoff validation, the operator added a verified source checkpoint and a 758-character cited summary. The derived index again reported `INDEX_STALE`; the trusted installed runtime rebuilt it, after which `context.doctor` reported `ok:true`, four ledger events and a current index. A focused summary recall with `limit:1,maxChars:2000` returned that summary and its genuine source reference without truncation. These are manual checkpoint and retrieval results. Automatic hook capture and billed-token savings remain unestablished.

## Next measurement

Use held-out developer tasks with the same authorized sources and model: full context, bounded context, then bounded context plus synthesis. Include all retrieval/selection calls, wrappers, retries, provider usage and latency. Check required-fact coverage, citations and task outcomes alongside size. Until then, describe this as a measured synthetic payload reduction only.
