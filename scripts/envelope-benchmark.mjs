import { ObservationEnvelope, measureResult } from '../packages/observation-envelope/index.mjs';

// Public synthetic fixture. Never copy private mailbox or browser traces into this file.
const payload = {
  tool: 'synthetic-source-query', status: 'success',
  rows: [{ source: 'incident-42', decision: 'Hold release until the audit passes' }],
  headers: { decoration: 'repeated non-evidence transport metadata '.repeat(400) },
  htmlAlternative: '<div>redundant presentation markup</div>'.repeat(500),
};
const packer = new ObservationEnvelope();
const args = { sourceId:'fixture.incident-42',revision:'r1',
  observedAt:'2026-10-22T06:00:00Z',artifactRef:'artifact:fixture/incident-42',
  payload,selected:{status:payload.status,rows:payload.rows},budgetBytes:2048 };
const first = measureResult(packer.pack(args));
const repeat = measureResult(packer.pack(args));
process.stdout.write(JSON.stringify({
  fixture:'synthetic, not a provider billing benchmark',
  baselineBytes:Buffer.byteLength(JSON.stringify(payload)),
  firstResultBytes:first.measurement.resultBytes, repeatedResultBytes:repeat.measurement.resultBytes,
  providerTokens:null, limitation:'Selection and artifact storage overhead outside this serialized result must be measured separately. No answer-quality or token-saving claim.',
},null,2)+'\n');
