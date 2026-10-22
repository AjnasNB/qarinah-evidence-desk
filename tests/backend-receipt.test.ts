import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import { EvidenceDesk } from '../server/desk.ts';
import { importHandoff, RELEASE_QUESTION, type Packet } from '../server/handoff.ts';
import { verifyReceipt } from '../server/receipt.ts';
import { createDeskServer } from '../server/http.ts';
import { LIMITS, type AppConfig } from '../server/types.ts';
// @ts-expect-error The browser JS module is exercised directly to verify the actual export contract.
import { createReceipt } from '../src/api.js';

const NOW = Date.parse('2026-10-22T13:00:00.000Z');
const at = new Date(NOW).toISOString();
function packet(): Packet {
  return { format: 'qarinah-handoff-v1', provenance: 'synthetic-replay', project: 'receipt-test', currentRevisionRef: 'rev',
    revisions: [{ id: 'rev', commit: 'a'.repeat(40), dirty: false, observedAt: at }],
    ci: [{ id: 'tests', revisionRef: 'rev', check: 'tests', outcome: 'passed', observedAt: at, detail: 'SYNTHETIC tests passed.' }, { id: 'build', revisionRef: 'rev', check: 'build', outcome: 'passed', observedAt: at, detail: 'SYNTHETIC build passed.' }],
    releases: [{ id: 'release', revisionRef: 'rev', decision: 'ready', requiredChecks: ['tests', 'build'], ciRefs: ['tests', 'build'], observedAt: at, detail: 'SYNTHETIC recommendation; no release authority.' }] };
}
function temp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'qarinah-receipt-test-')); }
function cleanup(directory: string) {
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('qarinah-receipt-test-'));
  fs.rmSync(directory, { recursive: true, force: true });
}
function config(directory: string): AppConfig { return { workspace: directory, dataDir: directory, distDir: path.join(directory, 'dist'), allowNemotron: false, nemotronModel: 'disabled' }; }
async function exported(input = packet(), reviewedAt = NOW + 100) {
  const directory = temp(); let clock = NOW;
  try {
    const desk = new EvidenceDesk(config(directory), (async () => { throw Error('No network allowed'); }) as typeof fetch, () => clock);
    const loaded = await desk.importHandoff(input);
    clock = reviewedAt;
    const answer = await desk.answer({ snapshotId: loaded.snapshot.id, question: RELEASE_QUESTION, generate: false });
    return { ...createReceipt(loaded.snapshot, answer, answer.metrics, desk.status()), exportedAt: new Date(reviewedAt + 10).toISOString() };
  } finally { cleanup(directory); }
}

test('new receipt preserves the validated packet and server review clock; actual Meterless replay agrees', async () => {
  const receipt = await exported();
  assert.equal(receipt.schema, 'qarinah.evidence-desk.receipt.v2');
  assert.equal(receipt.answer.reviewedAt, new Date(NOW + 100).toISOString());
  assert.deepEqual(receipt.snapshot.handoffPacket, importHandoff(packet(), NOW).handoffPacket);
  const result = await verifyReceipt(receipt, NOW + 1000);
  assert.equal(result.status, 'consistent'); assert.equal(result.recorded.decision, 'ready');
  assert.equal(result.current.decision, 'ready'); assert.equal(result.sourceRecordsChecked, 4);
  assert.equal(result.providerCalls, 0); assert.equal(result.sourceAuthentication, 'not independently authenticated');
});

const mutations: [string, (receipt: any) => void][] = [
  ['legacy format cannot infer historical verification', r => { r.schema = 'qarinah.evidence-desk.receipt.v1'; }],
  ['unsupported review rules are rejected', r => { r.reviewPolicy = 'unknown-rules'; }],
  ['missing validated packet is rejected', r => { delete r.snapshot.handoffPacket; }],
  ['missing original review time is rejected', r => { delete r.answer.reviewedAt; }],
  ['invalid calendar date is rejected', r => { r.answer.reviewedAt = '2026-02-30T13:00:00.000Z'; }],
  ['review before snapshot creation is rejected', r => { r.answer.reviewedAt = new Date(NOW - 1).toISOString(); }],
  ['export before review is rejected', r => { r.exportedAt = new Date(NOW).toISOString(); }],
  ['invented longer snapshot expiry is rejected', r => { r.snapshot.expiresAt = new Date(NOW + 86_400_000).toISOString(); }],
  ['another snapshot answer is rejected', r => { r.answer.snapshotId = 'other-snapshot'; }],
  ['unsupported question is rejected', r => { r.answer.question = 'Please approve deployment'; }],
  ['changed header revision is rejected', r => { r.snapshot.handoff.currentCommit = 'b'.repeat(40); }],
  ['changed source text is rejected', r => { r.snapshot.sources[0].content += ' altered'; }],
  ['duplicate source identity is rejected', r => { r.snapshot.sources.push(r.snapshot.sources[0]); }],
  ['missing required source is rejected', r => { r.snapshot.sources.splice(1, 1); }],
  ['changed decision is rejected', r => { r.answer.releaseDecision = 'hold'; }],
  ['unknown cited source is rejected', r => { r.answer.citations[0].id = 'ev-' + '0'.repeat(24); }],
  ['claim without its required citations is rejected', r => { r.answer.claims[0].citationIds = []; }],
  ['invented exclusions are rejected', r => { r.answer.excluded.push({ id: r.snapshot.sources[0].id, reason: 'invented' }); }],
];
for (const [name, change] of mutations) test(name, async () => {
  const receipt = await exported(); change(receipt);
  await assert.rejects(verifyReceipt(receipt, NOW + 1000));
});

test('rehashing an altered source packet cannot preserve the old claimed READY decision', async () => {
  const receipt = await exported(), changed = packet(); changed.ci[0].outcome = 'failed';
  const replacement = importHandoff(changed, NOW);
  receipt.snapshot.sources = replacement.sources; receipt.snapshot.handoffPacket = replacement.handoffPacket;
  await assert.rejects(verifyReceipt(receipt, NOW + 1000), (error: any) => error.code === 'RECEIPT_DECISION');
});

test('a consistently rewritten receipt can pass only as unauthenticated observations', async () => {
  const changed = packet(); changed.ci[0].outcome = 'failed';
  const result = await verifyReceipt(await exported(changed), NOW + 1000);
  assert.equal(result.recorded.decision, 'hold'); assert.equal(result.sourceAuthentication, 'not independently authenticated');
  assert.ok(result.limits.some(text => text.includes('fully rewritten')));
});

test('historical consistency remains distinct from current expiry at the exact boundary', async () => {
  const receipt = await exported();
  assert.equal((await verifyReceipt(receipt, NOW + LIMITS.snapshotAgeMs - 1)).current.decision, 'ready');
  for (const now of [NOW + LIMITS.snapshotAgeMs, NOW + LIMITS.snapshotAgeMs + 1]) {
    const result = await verifyReceipt(receipt, now);
    assert.equal(result.recorded.decision, 'ready'); assert.equal(result.current.status, 'abstained');
    assert.equal(result.current.reason, 'stale-snapshot'); assert.equal(result.snapshotExpiredNow, true);
  }
});

test('an originally expired review reproduces abstention through the same application path', async () => {
  const receipt = await exported(packet(), NOW + LIMITS.snapshotAgeMs);
  const result = await verifyReceipt(receipt, NOW + LIMITS.snapshotAgeMs + 100);
  assert.equal(result.recorded.reason, 'stale-snapshot'); assert.equal(result.recorded.decision, null);
});

test('hold, missing, conflict, cancelled and explicit supersession retain their actual app decisions', async () => {
  const inputs = [packet(), packet(), packet(), packet(), packet()];
  inputs[0].revisions[0].dirty = true;
  inputs[1].ci.pop(); inputs[1].releases[0].ciRefs = ['tests'];
  inputs[2].ci.push({ ...inputs[2].ci[0], id: 'tests-failed', outcome: 'failed' });
  inputs[3].ci[0].outcome = 'cancelled';
  inputs[4].ci.push({ ...inputs[4].ci[0], id: 'tests-failed', outcome: 'failed' }); inputs[4].ci[0].supersedes = ['tests-failed'];
  for (const [index, input] of inputs.entries()) {
    const result = await verifyReceipt(await exported(input), NOW + 1000);
    assert.equal(result.recorded.decision, index === 0 ? 'hold' : index === 4 ? 'ready' : null);
  }
});

test('receipt runtime flags confer no authority, and oversized or deeply nested input fails safely', async () => {
  const receipt = await exported(); receipt.runtime = { nemotron: { verified: true }, limits: { snapshotAgeMs: Infinity } };
  assert.equal((await verifyReceipt(receipt, NOW + 1000)).providerCalls, 0);
  await assert.rejects(verifyReceipt({ ...receipt, extra: 'x'.repeat(131_072) }, NOW + 1000));
  let nested: any = {}; for (let i = 0; i < 20_000; i++) nested = { nested };
  await assert.rejects(verifyReceipt(nested, NOW + 1000), (error: any) => error.code === 'RECEIPT_SIZE');
});

test('source-specific repair guidance is outside replayed decision claims', async () => {
  const receipt = await exported();
  // Caller-declared transport classification only; this is not a live Zetaris request.
  receipt.snapshot.transport = { provider: 'zetaris', protocol: 'bundled-ui-2.4.3', queryKey: 'current-release', receivedAt: at, sourceResponseBytes: 100, httpRequests: 4, cleanup: 'confirmed' };
  receipt.answer.repairPlan.refresh = 'reread-current-release';
  const result = await verifyReceipt(receipt, NOW + 1000);
  assert.equal(result.status, 'consistent');
  assert.ok(result.limits.some(text => text.includes('repair guidance')));
});

test('receipt endpoint verifies an actual exported review without altering the active desk memory', async () => {
  const directory = temp(), desk = new EvidenceDesk(config(directory)), server = createDeskServer(desk);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const receipt = await exported();
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/receipt/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(receipt) });
    assert.equal(response.status, 200); assert.equal((await response.json()).status, 'consistent');
    assert.equal(desk.status().memory.records, 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); cleanup(directory); }
});

test('offline CLI accepts a separate trusted digest and rejects digest mismatch or malformed JSON', async () => {
  const directory = temp(), file = path.join(directory, 'receipt.json');
  try {
    const receipt = await exported(); fs.writeFileSync(file, JSON.stringify(receipt));
    const sha = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/verify-receipt.ts', file, ...args], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
    let result = run('--sha256=' + sha); assert.equal(result.status, 0, result.stdout + result.stderr); assert.equal(JSON.parse(result.stdout).trustedDigestMatched, true);
    result = run('--sha256=' + '0'.repeat(64)); assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).code, 'RECEIPT_DIGEST');
    fs.writeFileSync(file, '{"bad":'); result = run(); assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).code, 'RECEIPT_JSON');
  } finally { cleanup(directory); }
});

test('a top-level app navigation from another site is safe, while cross-site API and subresources stay blocked', async () => {
  const directory = temp(), setup = config(directory);
  fs.mkdirSync(setup.distDir); fs.writeFileSync(path.join(setup.distDir, 'index.html'), '<!doctype html><title>Local review</title>');
  const server = createDeskServer(new EvidenceDesk(setup));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const get = (route: string, headers: Record<string, string>) => new Promise<number>(resolve => http.get(origin + route, { headers }, response => { response.resume(); response.on('end', () => resolve(response.statusCode!)); }));
  try {
    const navigation = { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' };
    assert.equal(await get('/', navigation), 200);
    assert.equal(await get('/api/status', navigation), 403);
    assert.equal(await get('/assets/app.js', { ...navigation, 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'script' }), 403);
    assert.equal(await get('/', { ...navigation, origin: 'https://foreign.invalid' }), 403);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); cleanup(directory); }
});
