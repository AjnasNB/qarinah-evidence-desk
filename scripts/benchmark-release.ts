import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EvidenceDesk } from '../server/desk.ts';
import { createDeskServer } from '../server/http.ts';
import { RELEASE_QUESTION } from '../server/handoff.ts';
import { HMEM_COMMIT, type Answer, type AppConfig, type Snapshot } from '../server/types.ts';

type Label = 'ready' | 'hold' | 'abstain' | 'rejected' | 'unexpected';
type Patch = { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown };
type Challenge = { id: string; expected: Exclude<Label, 'unexpected'>; rationale: string; patch: Patch[]; answerAfterMs?: number };
type Suite = { schema: string; description: string; clock: string; policy: Record<string, string>; basePacket: unknown; cases: Challenge[] };
type Exchange = { step: string; status: number; requestBodyBytes: number; responseBodyBytes: number; roundTripMs: number; requestSha256: string; responseSha256: string };
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixturePath = path.join(root, 'tests/fixtures/release-challenge.json');
const outputPath = path.join(root, 'docs/validation/release-challenge.json');
const reportPath = path.join(root, 'docs/BENCHMARK.md');
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const round = (value: number) => Math.round(value * 1000) / 1000;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? 0;

// Only this trusted fixture's small JSON Pointer subset is applied. No text is evaluated.
function materialize(base: unknown, patches: Patch[]): unknown {
  const result = structuredClone(base);
  for (const patch of patches) {
    assert.ok(patch.path.startsWith('/') && patch.path.length < 180, 'Invalid fixture path');
    const keys = patch.path.slice(1).split('/').map(key => key.replace(/~1/g, '/').replace(/~0/g, '~'));
    assert.ok(keys.every(key => !['__proto__', 'prototype', 'constructor'].includes(key)), 'Unsafe fixture key');
    let parent: any = result;
    for (const key of keys.slice(0, -1)) { assert.ok(Object.hasOwn(parent, key), 'Missing fixture path'); parent = parent[key]; }
    const key = keys.at(-1)!;
    if (Array.isArray(parent)) {
      const index = key === '-' ? parent.length : Number(key);
      assert.ok(Number.isSafeInteger(index) && index >= 0 && index <= parent.length, 'Invalid fixture index');
      if (patch.op !== 'add') assert.ok(index < parent.length, 'Missing fixture index');
      if (patch.op === 'remove') parent.splice(index, 1);
      else if (patch.op === 'add') parent.splice(index, 0, structuredClone(patch.value));
      else parent[index] = structuredClone(patch.value);
    } else {
      assert.ok(parent && typeof parent === 'object', 'Invalid fixture parent');
      if (patch.op !== 'add') assert.ok(Object.hasOwn(parent, key), 'Missing fixture key');
      if (patch.op === 'remove') delete parent[key];
      else parent[key] = structuredClone(patch.value);
    }
  }
  return result;
}

function sourceIdentity() {
  const walk = (relative: string): string[] => fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const name = `${relative}/${entry.name}`;
    return entry.isDirectory() ? walk(name) : /\.(?:ts|mjs|js|json)$/.test(name) ? [name] : [];
  });
  const files = [...walk('server'), ...walk('vendor/meterless-hmem/src')].sort().map(file => ({ file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
  return { sha256: hash(JSON.stringify(files)), files };
}

async function exchange(port: number, step: string, route: string, input: unknown, records: Exchange[]) {
  assert.ok(Number.isSafeInteger(port) && port > 0 && port < 65536);
  const body = input === undefined ? '' : JSON.stringify(input);
  const started = performance.now();
  return new Promise<{ status: number; value: any }>((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port, path: route, method: input === undefined ? 'GET' : 'POST', headers: input === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, response => {
      const chunks: Buffer[] = []; let length = 0;
      response.on('data', (chunk: Buffer) => { length += chunk.length; if (length > 1_048_576) response.destroy(new Error('Unexpected response bound')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => {
        try {
          const raw = Buffer.concat(chunks);
          records.push({ step, status: response.statusCode ?? 0, requestBodyBytes: Buffer.byteLength(body), responseBodyBytes: raw.byteLength, roundTripMs: round(performance.now() - started), requestSha256: hash(body), responseSha256: hash(raw) });
          resolve({ status: response.statusCode ?? 0, value: JSON.parse(raw.toString('utf8')) });
        } catch (error) { reject(error); }
      });
    });
    request.setTimeout(10_000, () => request.destroy(new Error('Loopback request timed out')));
    request.on('error', reject);
    request.end(body || undefined);
  });
}

const startedAt = new Date().toISOString();
const suiteBytes = fs.readFileSync(fixturePath);
const suite: Suite = JSON.parse(suiteBytes.toString('utf8'));
assert.equal(suite.schema, 'qarinah.release-challenge.v1');
assert.equal(suite.cases.length, 20);
assert.equal(new Set(suite.cases.map(item => item.id)).size, suite.cases.length);
assert.ok(suite.cases.every(item => /^[a-z0-9-]+$/.test(item.id) && Object.hasOwn(suite.policy, item.expected)));
const syntheticNow = Date.parse(suite.clock);
assert.ok(Number.isFinite(syntheticNow));
const sourceBefore = sourceIdentity();
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const revisionStatus = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', windowsHide: true });
const runDirectory = path.join(root, '.local/release-challenge', startedAt.replace(/[^0-9TZ]/g, ''));
fs.mkdirSync(runDirectory, { recursive: true });
const results: any[] = [];

for (const challenge of suite.cases) {
  const setupStarted = performance.now();
  let now = syntheticNow, providerCalls = 0;
  const directory = path.join(runDirectory, challenge.id);
  const config: AppConfig = { workspace: directory, dataDir: directory, distDir: path.join(directory, 'no-static-assets'), allowNemotron: false, nemotronModel: 'nvidia/llama-3.3-nemotron-super-49b-v1' };
  const desk = new EvidenceDesk(config, (async () => { providerCalls++; throw new Error('Provider access forbidden in this local challenge'); }) as typeof fetch, () => now);
  const server = createDeskServer(desk);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const initializationMs = round(performance.now() - setupStarted);
  const port = (server.address() as { port: number }).port;
  const exchanges: Exchange[] = [];
  const packet = materialize(suite.basePacket, challenge.patch);
  let actual: Label = 'unexpected', reason = '', memoryAuditCount = 0, citations = 0;
  let modelAttempts = 0, providerUsage: unknown = null, checksPassed = true;
  const caseStarted = performance.now();
  try {
    const loaded = await exchange(port, 'import', '/api/handoff/import', packet, exchanges);
    if (loaded.status >= 400 && loaded.status < 500) {
      actual = 'rejected'; reason = loaded.value?.error?.code ?? 'HTTP_REJECTION';
      assert.equal(desk.status().memory.records, 0, 'Rejected input persisted memory');
    } else {
      assert.equal(loaded.status, 200, 'Import did not return an accepted snapshot or client rejection');
      const snapshot = loaded.value.snapshot as Snapshot;
      assert.equal(snapshot.mode, 'handoff');
      assert.equal(snapshot.handoff?.provenance, 'synthetic-replay');
      now += challenge.answerAfterMs ?? 0;
      // generate:true is deliberately requested: handoff mode must still remain deterministic.
      const reviewed = await exchange(port, 'review', '/api/answer', { snapshotId: snapshot.id, question: RELEASE_QUESTION, generate: true }, exchanges);
      assert.equal(reviewed.status, 200, 'Review returned an unexpected HTTP error');
      const answer = reviewed.value as Answer;
      assert.equal(answer.snapshotId, snapshot.id);
      assert.equal(answer.mode, 'retrieval-only');
      modelAttempts = answer.metrics.providerAttempts;
      providerUsage = answer.metrics.providerUsage;
      assert.equal(modelAttempts, 0); assert.equal(providerUsage, null);
      citations = answer.citations.length;
      assert.ok(answer.claims.every(claim => claim.citationIds.every(id => answer.citations.some(source => source.id === id))), 'Unresolved claim citation');
      for (const memory of answer.memories) {
        const source = snapshot.sources.find(record => record.sourceId === memory.source);
        assert.ok(source, 'Recalled memory has no current source');
        const audit = await exchange(port, 'memory-audit', `/api/audit/${encodeURIComponent(memory.id)}`, undefined, exchanges);
        assert.equal(audit.status, 200);
        assert.ok(audit.value.memory.provenance.refs.includes(source.id) && audit.value.memory.provenance.refs.includes(source.hash), 'Memory provenance does not resolve to the exact current source');
        assert.ok(audit.value.entries.some((entry: { action: string }) => entry.action === 'read'), 'No actual H-MEM read event');
        memoryAuditCount++;
      }
      actual = answer.status === 'abstained' ? 'abstain' : answer.status === 'answered' && ['ready', 'hold'].includes(answer.releaseDecision ?? '') ? answer.releaseDecision as Label : 'unexpected';
      reason = answer.reason ?? answer.trace.reason;
      fs.writeFileSync(path.join(directory, 'response.private.json'), JSON.stringify({ packet, snapshot, answer }, null, 2));
    }
    assert.equal(providerCalls, 0, 'Unexpected provider fetch');
  } catch (error) {
    checksPassed = false;
    fs.writeFileSync(path.join(directory, 'harness-error.private.txt'), error instanceof Error ? error.stack ?? error.message : String(error));
    reason = 'harness-or-integrity-failure; inspect ignored local artifacts';
  } finally {
    const workflowMs = round(performance.now() - caseStarted);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const requestBodyBytes = sum(exchanges.map(item => item.requestBodyBytes));
    const responseBodyBytes = sum(exchanges.map(item => item.responseBodyBytes));
    results.push({ id: challenge.id, expected: challenge.expected, actual, passed: actual === challenge.expected && checksPassed && providerCalls === 0, rationale: challenge.rationale, reason, falseReady: actual === 'ready' && challenge.expected !== 'ready', citations, memoryAuditCount, providerCalls, modelAttempts, providerUsage, initializationMs, workflowMs, requestBodyBytes, responseBodyBytes, totalBodyBytes: requestBodyBytes + responseBodyBytes, exchanges });
  }
}

const sourceAfter = sourceIdentity();
const sourceStable = sourceBefore.sha256 === sourceAfter.sha256;
const failures = results.filter(item => !item.passed);
const falseReady = results.filter(item => item.falseReady);
const totalRequests = sum(results.map(item => item.exchanges.length));
const summary = {
  falseReady: falseReady.length, nonReadyChallenges: results.filter(item => item.expected !== 'ready').length,
  passed: results.length - failures.length, failed: failures.length, total: results.length, sourceStable,
  providerCalls: sum(results.map(item => item.providerCalls)), modelAttempts: sum(results.map(item => item.modelAttempts)), providerUsage: null,
  httpRequests: totalRequests,
  requestBodyBytes: sum(results.map(item => item.requestBodyBytes)), responseBodyBytes: sum(results.map(item => item.responseBodyBytes)),
  totalBodyBytes: sum(results.map(item => item.totalBodyBytes)),
  workflowLatencyMs: { median: round(percentile(results.map(item => item.workflowMs), 0.5)), p95: round(percentile(results.map(item => item.workflowMs), 0.95)), max: Math.max(...results.map(item => item.workflowMs)) },
};
const report = {
  schema: 'qarinah.release-challenge-result.v1', startedAt, finishedAt: new Date().toISOString(),
  classification: 'hand-authored synthetic regression challenge; not blind held-out evaluation or user study',
  syntheticClock: suite.clock, commit: revision, workingTreeDirtyAtRun: Boolean(revisionStatus), nodeVersion: process.version,
  sourceIdentity: sourceBefore, sourceIdentityAfterSha256: sourceAfter.sha256,
  fixture: { path: 'tests/fixtures/release-challenge.json', sha256: hash(suiteBytes) },
  runner: { path: 'scripts/benchmark-release.ts', sha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))) },
  runtime: { harness: 'real local HTTP import/review/audit routes, isolated actual EvidenceDesk and Meterless H-MEM instance per case', hmemCommit: HMEM_COMMIT, clock: 'injected fixed clock; expiry case advances the clock after import', providerAccess: 'no credentials configured; provider fetch is a counting fail-closed stub', question: RELEASE_QUESTION, generateRequested: true },
  summary, results,
  limitations: [
    'Expected labels were hand-authored before execution from the documented policy; the author could inspect production source. These are synthetic regression cases, not blind held-out data or independent CI facts.',
    'One sequential run, one fresh desk per case. Initialization is reported separately; workflow latency starts before import and includes review, required source-resolution audit requests and local harness checks. It is not a user-task completion time.',
    'Body bytes are measured from the complete actual serialized HTTP request/response bodies, including JSON wrappers, citations, metadata, measurements and queried memory audits. HTTP headers, TCP framing, UI assets, process startup, memory disk I/O and benchmark output files are excluded. This is not total workflow storage or network cost.',
    'Internal prompt/evidence counters are not substituted for complete body measurements. No baseline, provider token count, token savings, cost savings, model quality or sponsor execution is established.',
    'Raw synthetic packets/responses, runtime ledgers and harness diagnostics remain under ignored .local/release-challenge/. Only sanitized fixture definitions and aggregate/per-case measurements are public-safe source artifacts.',
  ],
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Release challenge — synthetic regression measurement', '',
  `**False-ready results: ${summary.falseReady} / ${summary.nonReadyChallenges} non-ready challenges.** This finite challenge set does not establish a real-world false-ready rate.`, '',
  `Expected classification matches: **${summary.passed}/${summary.total}**. Production source unchanged during run: **${sourceStable}**. Provider calls/model attempts: **${summary.providerCalls}/${summary.modelAttempts}**; actual provider tokens **unknown**.`, '',
  'The 20 cases were hand-authored from the documented strict handoff policy before execution. They are synthetic regression cases, not a blind held-out benchmark, user study or authenticated CI evidence. The runner uses real loopback HTTP import, review and memory-audit routes with the actual pinned Meterless H-MEM reference. It requests generation but the handoff workflow remains deterministic. No production logic is modified.', '',
  `Measured ${startedAt}; source commit \`${revision}\`; working tree dirty at run: ${Boolean(revisionStatus)}. The fixture/runner and production-source SHA-256 identities are recorded in [the result](validation/release-challenge.json). A fixed synthetic evidence clock is used; these timestamps are not fresh real developer observations.`, '',
  '| Case | Expected | Actual | Match | Workflow ms | Request body B | Response body B |',
  '| --- | --- | --- | --- | ---: | ---: | ---: |',
  ...results.map(item => `| ${item.id} | ${item.expected} | ${item.actual} | ${item.passed ? 'yes' : 'NO'} | ${item.workflowMs} | ${item.requestBodyBytes} | ${item.responseBodyBytes} |`), '',
  `Totals: **${summary.httpRequests} HTTP requests; ${summary.requestBodyBytes.toLocaleString('en-US')} request-body bytes + ${summary.responseBodyBytes.toLocaleString('en-US')} response-body bytes = ${summary.totalBodyBytes.toLocaleString('en-US')} bytes**. Median workflow ${summary.workflowLatencyMs.median} ms; p95 ${summary.workflowLatencyMs.p95} ms; maximum ${summary.workflowLatencyMs.max} ms. These machine-specific single-run latencies are descriptive, not a performance guarantee.`, '',
  '## Measurement boundaries', '',
  ...report.limitations.map(item => `- ${item}`), '',
  '## Reproduce', '',
  '```text', 'npm ci --ignore-scripts', 'node --import tsx scripts/benchmark-release.ts', '```', '',
  'Only an ephemeral 127.0.0.1 server is opened. The script does not load .env.local, configure credentials, contact sponsors or execute evidence text. It retains runtime records under ignored .local/. It exits nonzero for classification/integrity failures, unexpected provider calls or a production-source change during the run. New repairs require rerunning the challenge; this report does not validate any later code.', '',
];
fs.writeFileSync(reportPath, lines.join('\n'));
console.log(JSON.stringify({ ...summary, output: 'docs/validation/release-challenge.json', report: 'docs/BENCHMARK.md' }, null, 2));
if (failures.length || falseReady.length || !sourceStable || summary.providerCalls || summary.modelAttempts) process.exitCode = 1;
