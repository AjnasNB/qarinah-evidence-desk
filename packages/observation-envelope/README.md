# Observation Envelope

Local, private package for explicitly selected tool results. It never controls a browser, bypasses a fresh-observation requirement, reads a mailbox, or executes source instructions. The caller supplies authorized JSON and an opaque reference to the full artifact. Keep that artifact in an appropriate private store; this package does not store it.

`ObservationEnvelope.pack()` hashes the full source, preserves observation time, revision and an error-presence flag, and includes only a caller-selected projection. Oversized projections become explicit `budget-withheld` references. Byte limits apply to the envelope; `measureResult()` additionally counts the complete returned measurement wrapper. Exact repetitions can refer to a prior envelope hash. The caller must retain prior envelopes to resolve those hashes. The bounded in-process cache is an optimization, not durable memory or access control.

```js
import { ObservationEnvelope, measureResult } from './index.mjs';
const packer = new ObservationEnvelope();
const result = measureResult(packer.pack({
  sourceId: 'query.release', revision: 'r1',
  observedAt: new Date().toISOString(), artifactRef: 'artifact:run/42',
  payload: authorizedToolResult,
  selected: { status: authorizedToolResult.status, rows: authorizedToolResult.rows },
  budgetBytes: 2048,
}));
```

Projection is a caller decision and can discard relevant evidence. Inspect the artifact when selected fields are insufficient. `instructionsTrusted:false` labels source text; it does not make a downstream model immune to prompt injection. Failure presence is retained without automatically copying potentially private diagnostics. Never present a reference-only observation as a complete source.

Run `node --test tests/envelope.test.mjs` and `node scripts/envelope-benchmark.mjs` from the repository root. The benchmark is synthetic and measures UTF-8 bytes, not billed tokens. Model prompts, reasoning, retries, retrieval, storage, transport and answer quality need separate measurements. Small sources can grow after wrapping.
