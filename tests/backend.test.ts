import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EvidenceDesk } from '../server/desk.ts';
import { configuration } from '../server/index.ts';
import { modelBody, providerUsage, queryZetaris, SQL } from '../server/providers.ts';
import { createDeskServer } from '../server/http.ts';
import { DeskError, LIMITS, type AppConfig } from '../server/types.ts';
import { jsonBytes } from '../server/evidence.ts';

const privateValue = 'PRIVATE-SYNTHETIC-KEY customer@example.invalid';
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
const temporary = () => fs.mkdtempSync(path.join(os.tmpdir(), 'qarinah-backend-'));
function cleanup(directory: string) { assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir())); assert.ok(path.basename(directory).startsWith('qarinah-backend-')); fs.rmSync(directory, { recursive: true, force: true }); }
function fixture(fetcher: typeof fetch = (async () => { throw new Error('Unexpected network'); }) as typeof fetch, overrides: Partial<AppConfig> = {}, clock: () => number = () => Date.parse('2026-10-22T12:00:00Z')) {
  const directory = temporary(); const config: AppConfig = { workspace: directory, dataDir: directory, distDir: path.join(directory, 'dist'), nemotronModel: 'nvidia/llama-3.3-nemotron-super-49b-v1', allowNemotron: false, ...overrides };
  return { directory, config, desk: new EvidenceDesk(config, fetcher, clock) };
}

test('real Meterless memory persists, deduplicates repeated fixtures and returns auditable sourced excerpts', async () => {
  const f = fixture();
  try {
    const first = await f.desk.loadDemo({ case: 'clean' });
    assert.equal(first.snapshot.mode, 'synthetic'); assert.equal(first.metrics.sourceCalls, 0);
    assert.ok(first.snapshot.warnings.some(text => /synthetic/.test(text)));
    const second = await f.desk.loadDemo({ case: 'clean' }); assert.equal(second.snapshot.memoryCount, first.snapshot.memoryCount);
    const result = await f.desk.answer({ snapshotId: first.snapshot.id, question: 'What is the Atlas upload limit?', generate: false });
    assert.equal(result.status, 'retrieved'); assert.equal(result.mode, 'retrieval-only');
    assert.equal(result.citations.length, 1); assert.match(result.answer, /25 MB/); assert.equal(result.metrics.providerUsage, null); assert.equal(result.metrics.providerAttempts, 0); assert.equal(result.metrics.requestBytes, 0);
    assert.ok(result.metrics.fullContextPromptBytes > result.metrics.promptBytes); assert.ok(result.metrics.selectionOverheadBytes > 0);
    const body = modelBody(result.question, result.citations, f.config.nemotronModel);
    assert.equal(result.metrics.promptBytes, jsonBytes(body.messages));
    const audit = f.desk.audit(result.memories[0].id); assert.ok(audit.entries.some(entry => entry.action === 'create')); assert.ok(audit.entries.some(entry => entry.action === 'read'));
    const restored = new EvidenceDesk(f.config, f.desk.fetcher); assert.equal(restored.status().memory.records, first.snapshot.memoryCount);
    await assert.rejects(restored.answer({ snapshotId: first.snapshot.id, question: 'Atlas upload limit?' }), (error: DeskError) => error.code === 'SNAPSHOT_NOT_FOUND');
  } finally { cleanup(f.directory); }
});

test('conflicts, missing facts and cross-product evidence abstain before any model call', async () => {
  let calls = 0; const f = fixture((async () => { calls++; throw new Error('No call allowed'); }) as typeof fetch, { allowNemotron: true, nemotronKey: privateValue });
  try {
    for (const name of ['conflict', 'missing'] as const) {
      const { snapshot } = await f.desk.loadDemo({ case: name });
      const answer = await f.desk.answer({ snapshotId: snapshot.id, question: 'What is the Atlas upload limit?', generate: true });
      assert.equal(answer.status, 'abstained'); assert.equal(answer.claims.length, 0); assert.equal(answer.citations.length, 0); assert.equal(answer.reason, name === 'conflict' ? 'conflicting-evidence' : 'missing-evidence');
      assert.equal(answer.metrics.providerAttempts, 0); assert.equal(answer.metrics.providerUsage, null);
    }
    assert.equal(calls, 0);
    const { snapshot } = await f.desk.loadDemo({ case: 'conflict' });
    assert.equal((await f.desk.answer({ snapshotId: snapshot.id, question: 'What is Atlas retention?' })).status, 'retrieved', 'Unrelated upload conflict must not suppress consistent retention evidence.');
  } finally { cleanup(f.directory); }
});

test('older memory cannot repair a missing selected snapshot and expired evidence is withheld', async () => {
  let now = Date.parse('2026-10-22T12:00:00Z'); const f = fixture(undefined, {}, () => now);
  try {
    await f.desk.loadDemo({ case: 'clean' }); const { snapshot } = await f.desk.loadDemo({ case: 'missing' });
    const missing = await f.desk.answer({ snapshotId: snapshot.id, question: 'Atlas upload limit?' }); assert.equal(missing.reason, 'missing-evidence');
    now += LIMITS.snapshotAgeMs + 1;
    const stale = await f.desk.answer({ snapshotId: snapshot.id, question: 'Atlas retention?' }); assert.equal(stale.reason, 'stale-snapshot'); assert.equal(stale.citations.length, 0);
  } finally { cleanup(f.directory); }
});

test('invalid or oversized inputs and arbitrary query destinations cannot start provider work', async () => {
  let calls = 0; const f = fixture((async () => { calls++; return json({}); }) as typeof fetch);
  try {
    await assert.rejects(f.desk.querySource({ queryKey: 'probe', url: 'https://private.invalid' }));
    await assert.rejects(f.desk.querySource({ queryKey: 'SELECT 1; DROP TABLE x' }));
    await assert.rejects(f.desk.loadDemo({ case: 'clean', extra: 1 }));
    const { snapshot } = await f.desk.loadDemo({ case: 'clean' });
    await assert.rejects(f.desk.answer({ snapshotId: snapshot.id, question: '界'.repeat(400) }));
    await assert.rejects(f.desk.answer({ snapshotId: snapshot.id, question: 'Atlas upload limit?', generate: 'true' }));
    const unavailable = await f.desk.answer({ snapshotId: snapshot.id, question: 'Atlas upload limit?', generate: true });
    assert.equal(unavailable.status, 'unavailable'); assert.equal(unavailable.metrics.providerAttempts, 0); assert.equal(calls, 0);
  } finally { cleanup(f.directory); }
});

test('workspace isolation and serialized writes preserve distinct bounded local memory', async () => {
  const f = fixture();
  try {
    await Promise.all(Array.from({ length: 6 }, () => f.desk.loadDemo({ case: 'clean' })));
    assert.equal(f.desk.status().memory.records, 12);
    const other = new EvidenceDesk({ ...f.config, workspace: path.join(f.directory, 'other-workspace') });
    assert.equal(other.status().memory.records, 0); assert.notEqual(other.directory, f.desk.directory);
    fs.writeFileSync(path.join(f.desk.directory, 'ledger.jsonl'), 'x'.repeat(LIMITS.journalBytes - LIMITS.storageReserveBytes + 1));
    await assert.rejects(f.desk.loadDemo({ case: 'clean' }), (error: DeskError) => error.code === 'MEMORY_CAPACITY');
  } finally { cleanup(f.directory); }
});

test('exact Zetaris fixed read uses real header and body contracts and preserves explicit live provenance', async () => {
  const seen: { input: string; init?: RequestInit }[] = [];
  const fake = (async (input, init) => { seen.push({ input: String(input), init }); return json({ data: [['1']] }); }) as typeof fetch;
  const f = fixture(fake, { zetarisUrl: 'https://zetaris.example.invalid/api/v1.0', zetarisKey: privateValue, zetarisOrgId: '22' });
  try {
    assert.equal(f.desk.status().zetaris.verified, false);
    const loaded = await f.desk.querySource({ queryKey: 'probe' });
    assert.equal(loaded.snapshot.mode, 'zetaris'); assert.equal(loaded.metrics.sourceCalls, 1); assert.equal(f.desk.status().zetaris.verified, true);
    assert.equal(seen[0].input, 'https://zetaris.example.invalid/api/v1.0/sql-editor/sqls/run');
    const headers = new Headers(seen[0].init?.headers); assert.equal(headers.get('authorization'), 'Bearer ' + privateValue); assert.equal(headers.get('x-org-id'), '22'); assert.match(headers.get('x-request-id')!, /^[a-f0-9-]{36}$/);
    assert.equal(seen[0].init?.redirect, 'manual'); assert.deepEqual(JSON.parse(String(seen[0].init?.body)), { queryId: JSON.parse(String(seen[0].init?.body)).queryId, sql: SQL.probe, source: 'SqlEditor', limit: 5 });
    assert.equal(JSON.stringify(loaded).includes('PRIVATE'), false);
    const answer = await f.desk.answer({ snapshotId: loaded.snapshot.id, question: 'What did the connection probe return?' }); assert.equal(answer.status, 'retrieved'); assert.equal(answer.metrics.sourceCalls, 0, 'Answer uses the explicit cached snapshot, without hidden repeat queries.');
  } finally { cleanup(f.directory); }
});

test('Zetaris blocks redirects, invalid envelopes, excessive rows, oversized bodies and secret-bearing exceptions', async () => {
  const f = fixture(undefined, { zetarisUrl: 'https://zetaris.example.invalid/api/v1.0', zetarisKey: privateValue, zetarisOrgId: '22' });
  try {
    const providers = [() => json({ data: [['1']] }, 302, { location: 'https://private.invalid/' + privateValue }), () => json({ results: [['1']] }), () => json({ data: Array(6).fill(['1']) }), () => new Response('x'.repeat(LIMITS.sourceResponseBytes + 1)), () => { throw new Error(privateValue); }];
    for (const provider of providers) { let calls = 0; await assert.rejects(queryZetaris(f.config, 'probe', Date.now(), (async () => { calls++; return provider(); }) as typeof fetch), error => !String(error).includes('PRIVATE')); assert.equal(calls, 1); }
  } finally { cleanup(f.directory); }
});

test('distinct live collection rows do not become contradictory singleton facts', async () => {
  const rows = [['1', 'Damaged package'], ['2', 'Wrong item'], ['3', 'Changed preference'], ['4', 'Late delivery'], ['5', 'Other']];
  const f = fixture((async () => json({ data: rows })) as typeof fetch, { zetarisUrl: 'https://zetaris.example.invalid/api/v1.0', zetarisKey: privateValue, zetarisOrgId: '22' });
  try {
    const { snapshot } = await f.desk.querySource({ queryKey: 'reasons' });
    const result = await f.desk.answer({ snapshotId: snapshot.id, question: 'Show the returned reason rows.' });
    assert.equal(result.status, 'retrieved'); assert.equal(result.conflicts.length, 0); assert.equal(result.citations.length, 5);
    assert.equal(new Set(result.citations.map(record => record.sourceId)).size, 5);
    const conflict = await f.desk.loadDemo({ case: 'conflict' });
    assert.equal((await f.desk.answer({ snapshotId: conflict.snapshot.id, question: 'What is the Atlas upload limit?' })).reason, 'conflicting-evidence');
  } finally { cleanup(f.directory); }
});

test('Nemotron accepts only exact current cited excerpts and records provider usage independently of output validation', async () => {
  let invalid = false; let calls = 0;
  const fake = (async (_input, init) => {
    calls++; const request = JSON.parse(String(init?.body)); const evidence = JSON.parse(request.messages[1].content).evidence;
    return json({ choices: [{ message: { content: JSON.stringify({ claims: [{ text: invalid ? 'Atlas allows 10000 MB' : evidence[0].content, citationIds: [invalid ? 'invented-id' : evidence[0].id] }] }) } }], usage: { prompt_tokens: 123, completion_tokens: 45, total_tokens: 168 }, private: privateValue });
  }) as typeof fetch;
  const f = fixture(fake, { nemotronKey: privateValue, allowNemotron: true });
  try {
    const { snapshot } = await f.desk.loadDemo({ case: 'clean' });
    const answer = await f.desk.answer({ snapshotId: snapshot.id, question: 'Atlas upload limit?', generate: true });
    assert.equal(answer.status, 'answered'); assert.equal(answer.mode, 'nemotron'); assert.deepEqual(answer.metrics.providerUsage, { promptTokens: 123, completionTokens: 45, totalTokens: 168 }); assert.equal(answer.metrics.providerAttempts, 1); assert.ok(answer.metrics.requestBytes > 0);
    invalid = true;
    const rejected = await f.desk.answer({ snapshotId: snapshot.id, question: 'Atlas upload limit?', generate: true });
    assert.equal(rejected.status, 'unavailable'); assert.equal(rejected.claims.length, 0); assert.equal(rejected.reason, 'model-citation'); assert.deepEqual(rejected.metrics.providerUsage, answer.metrics.providerUsage); assert.equal(JSON.stringify(rejected).includes('PRIVATE'), false); assert.equal(calls, 2);
  } finally { cleanup(f.directory); }
});

test('missing usage never becomes token estimates and the persistent model budget reserves attempts before calls', async () => {
  let calls = 0; const f = fixture((async () => { calls++; return json({ choices: [{ message: { content: '{"claims":[]}' } }] }); }) as typeof fetch, { nemotronKey: privateValue, allowNemotron: true });
  try {
    assert.equal(providerUsage({}), null); assert.equal(providerUsage({ usage: { prompt_tokens: '123', total_tokens: -1 } }), null);
    const { snapshot } = await f.desk.loadDemo({ case: 'clean' });
    fs.writeFileSync(path.join(f.desk.directory, 'provider-budget.json'), JSON.stringify({ day: '2026-10-22', attempts: LIMITS.maxProviderCallsPerDay - 1 }));
    const restored = new EvidenceDesk(f.config, f.desk.fetcher, () => Date.parse('2026-10-22T12:00:00Z'));
    const loaded = await restored.loadDemo({ case: 'clean' });
    const last = await restored.answer({ snapshotId: loaded.snapshot.id, question: 'Atlas upload limit?', generate: true }); assert.equal(last.metrics.providerUsage, null); assert.equal(last.metrics.providerAttempts, 1);
    const blocked = await restored.answer({ snapshotId: loaded.snapshot.id, question: 'Atlas upload limit?', generate: true }); assert.equal(blocked.reason, 'provider-budget'); assert.equal(blocked.metrics.providerAttempts, 0); assert.equal(calls, 1);
    assert.equal(snapshot.mode, 'synthetic');
  } finally { cleanup(f.directory); }
});

test('HTTP API rejects foreign origins, arbitrary SQL and malformed requests, and sanitizes errors', async () => {
  const f = fixture(); const server = createDeskServer(f.desk);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const address = server.address() as { port: number }; const base = 'http://127.0.0.1:' + address.port;
  try {
    const status = await (await fetch(base + '/api/status')).json(); assert.equal(status.zetaris.configured, false); assert.equal(status.nemotron.enabled, false); assert.equal(JSON.stringify(status).includes('PRIVATE'), false);
    const foreign = await fetch(base + '/api/demo/load', { method: 'POST', headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' }, body: '{"case":"clean"}' }); assert.equal(foreign.status, 403);
    const malformed = await fetch(base + '/api/demo/load', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }); assert.equal(malformed.status, 400);
    const arbitrary = await fetch(base + '/api/source/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ queryKey: 'probe', sql: 'DROP TABLE x' }) }); assert.equal(arbitrary.status, 400); assert.ok((await arbitrary.json()).error.code);
    const unconfigured = await fetch(base + '/api/source/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"queryKey":"probe"}' }); assert.equal(unconfigured.status, 503);
    const loaded = await fetch(base + '/api/demo/load', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"case":"clean"}' }); assert.equal(loaded.status, 200); assert.equal((await loaded.json()).snapshot.mode, 'synthetic');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); cleanup(f.directory); }
});

test('configuration never enables inference merely because credentials exist', () => {
  const config = configuration('D:\\synthetic-project', { NVIDIA_API_KEY: privateValue } as NodeJS.ProcessEnv); assert.equal(config.allowNemotron, false); assert.equal(config.nemotronKey, privateValue);
});
