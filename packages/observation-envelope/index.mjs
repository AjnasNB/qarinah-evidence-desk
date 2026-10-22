import { createHash } from 'node:crypto';

const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const idPattern = /^[A-Za-z0-9_.:/-]{1,160}$/;

function json(value) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new TypeError('A JSON value is required');
  return JSON.parse(encoded);
}

/** Explicit projections only. This is an output contract, not a UI controller. */
export class ObservationEnvelope {
  #seen = new Map();
  constructor({ maxReferences = 128 } = {}) {
    if (!Number.isInteger(maxReferences) || maxReferences < 1 || maxReferences > 1024) {
      throw new RangeError('maxReferences must be 1..1024');
    }
    this.maxReferences = maxReferences;
  }

  pack({ sourceId, revision, observedAt, artifactRef, payload, selected = {}, budgetBytes = 4096 }) {
    if (![sourceId, revision].every(x => typeof x === 'string' && idPattern.test(x))) {
      throw new TypeError('sourceId and revision must be bounded opaque identifiers');
    }
    if (typeof artifactRef !== 'string' || !/^artifact:[A-Za-z0-9_.:/-]{1,160}$/.test(artifactRef)) {
      throw new TypeError('artifactRef must be an opaque artifact: reference, not a private URL');
    }
    if (typeof observedAt !== 'string' || !Number.isFinite(Date.parse(observedAt))) {
      throw new TypeError('observedAt must be a timestamp');
    }
    if (!Number.isInteger(budgetBytes) || budgetBytes < 512 || budgetBytes > 65536) {
      throw new RangeError('budgetBytes must be 512..65536');
    }
    const original = json(payload);
    const projection = json(selected);
    if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
      throw new TypeError('selected must be an explicit JSON object');
    }
    const sourceHash = digest(original);
    const projectionHash = digest(projection);
    const key = `${sourceId}|${revision}|${sourceHash}|${projectionHash}`;
    const failureObserved = !!(original && typeof original === 'object' &&
      (original.isError === true || original.error != null ||
       ['error', 'failed', 'failure'].includes(original.status)));
    const base = {
      schema: 'qarinah.observation.v1', sourceId, revision, observedAt, sourceHash,
      artifactRef, sourceBytes: bytes(original), failureObserved,
      instructionsTrusted: false, freshObservationRequiredAfterAction: true,
      providerTokens: null,
    };
    const earlier = this.#seen.get(key);
    let envelope = earlier ? {
      ...base, kind: 'reference', referenceId: earlier,
      completeness: 'reference-only', requiresArtifactForFullEvidence: true,
    } : {
      ...base, kind: 'projection', projection,
      completeness: digest(original) === projectionHash ? 'full' : 'selected-fields',
      requiresArtifactForFullEvidence: digest(original) !== projectionHash,
    };
    if (bytes(envelope) > budgetBytes) {
      envelope = { ...base, kind: 'reference', completeness: 'budget-withheld',
        requiresArtifactForFullEvidence: true, reason: 'Projection exceeds byte budget' };
    }
    // Never silently drop the error flag, provenance or budget-overflow warning.
    if (bytes(envelope) > budgetBytes) throw new RangeError('Budget too small for provenance envelope');
    if (!earlier && envelope.kind === 'projection') {
      this.#seen.set(key, `sha256:${digest(envelope)}`);
      while (this.#seen.size > this.maxReferences) this.#seen.delete(this.#seen.keys().next().value);
    }
    const wireBytes = bytes(envelope);
    return {
      envelope,
      measurement: {
        sourceBytes: base.sourceBytes, envelopeBytes: wireBytes,
        // Report the measurement wrapper too; do not call this a token saving.
        resultBytes: 0, providerTokens: null,
        note: 'UTF-8 serialized bytes; excludes provider prompts, reasoning and tool transport',
      },
    };
  }
}

/** Include the complete returned wrapper in the comparison, with stable byte accounting. */
export function measureResult(result) {
  const measured = json(result);
  for (let i = 0; i < 8; i++) {
    const size = bytes(measured);
    if (measured.measurement.resultBytes === size) return measured;
    measured.measurement.resultBytes = size;
  }
  throw new Error('Serialized size did not converge');
}
