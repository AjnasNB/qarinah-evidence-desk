import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runVerification } from '../scripts/verify-local-zetaris.mjs';
import { assessRelease, importHandoff, RELEASE_QUESTION } from '../server/handoff.ts';

// Mocked transport contracts, not live sponsor or CI evidence.
const now = Date.parse('2026-10-22T10:00:00Z');
const observedAt = new Date(now - 60_000).toISOString();
const origin = 'http://127.0.0.1:3000', app = 'http://127.0.0.1:4318';
const token = 'syntheticheader.syntheticpayload.syntheticsignature';
const packet = { format: 'qarinah-handoff-v1', provenance: 'local-observation', project: 'catalog-test', currentRevisionRef: 'rev-1', revisions: [{ id: 'rev-1', commit: 'a'.repeat(40), dirty: false, observedAt }], ci: [{ id: 'tests-1', revisionRef: 'rev-1', check: 'tests', outcome: 'passed', observedAt, detail: 'Invented test observation for a mock verifier test.' }, { id: 'build-1', revisionRef: 'rev-1', check: 'build', outcome: 'passed', observedAt, detail: 'Invented build observation for a mock verifier test.' }], releases: [{ id: 'release-1', revisionRef: 'rev-1', decision: 'ready', requiredChecks: ['tests', 'build'], ciRefs: ['tests-1', 'build-1'], observedAt, detail: 'Invented mock release recommendation.' }] };
const csv = Buffer.from(`captured_at,packet_base64\n${observedAt},${Buffer.from(JSON.stringify(packet)).toString('base64')}\n`);
const databases = [{ databaseId: 1, name: 'EXAMPLE', description: 'Mock', tableCount: 0 }, { databaseId: 6, name: 'QARINAH', description: 'Mock', tableCount: 0 }, { databaseId: 9, name: 'OTHER', description: null, tableCount: 0 }];
const handoffs = [{ databaseId: 6, name: 'handoffs', description: null, tags: [] }];
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

async function fixture({ dbReads = [databases], tableReads = [handoffs], genericBody = { result: [] } } = {}) {
  const calls = [], statements = [];
  let dbIndex = 0, tableIndex = 0;
  const snapshot = importHandoff(packet, now);
  snapshot.transport = { provider: 'zetaris', protocol: 'bundled-ui-2.4.3', queryKey: 'current-release', cleanup: 'confirmed', sourceResponseBytes: 4096 };
  const expected = assessRelease(snapshot, RELEASE_QUESTION, now);
  const report = await runVerification({ mode: 'register-source', csvPrepared: 'mock-only.csv', appOrigin: app }, {
    env: { ZETARIS_UI_URL: origin, ZETARIS_USERNAME: 'mock@example.invalid', ZETARIS_PASSWORD: 'SYNTHETIC-PRIVATE-PASSWORD' },
    clock: () => now,
    readFile: async () => csv,
    fetcher: async (input, init = {}) => {
      const url = String(input); calls.push({ url, method: init.method || 'GET' });
      assert.equal(init.redirect, 'manual');
      if (url === origin + '/api/config') return json({});
      if (url === origin + '/api/auth/login') return json({ idToken: token, orgId: 37 });
      if (url === origin + '/api/proxy/query/sql/start') return json({ records: [{ one: '1' }], pageNumber: 1, pageLimit: 5, totalCount: 1, totalPages: 1, queryToken: 'synthetic-query-token' });
      if (url === origin + '/api/proxy/query/sql/close/synthetic-query-token') return new Response(null, { status: 204 });
      if (url === app + '/api/status') return json({ zetaris: { protocol: 'bundled-ui-2.4.3', currentRelease: { configured: true } } });
      if (url === origin + '/api/proxy/lightning-database/databases') return json(dbReads[Math.min(dbIndex++, dbReads.length - 1)]);
      if (url === origin + '/api/proxy/lightning-database/databases/QARINAH/file-store-tables') return json(tableReads[Math.min(tableIndex++, tableReads.length - 1)]);
      if (url === origin + '/api/proxy/query/sql/generic-query') { statements.push(JSON.parse(init.body).sql); return json(genericBody); }
      if (url === app + '/api/source/query') return json({ snapshot });
      if (url === app + '/api/answer') return json({ mode: 'retrieval-only', status: 'answered', releaseDecision: expected.decision, citations: expected.selected, metrics: { providerAttempts: 0, providerUsage: null } });
      throw new Error('Unexpected mock request containing no live provider credentials.');
    }
  });
  assert.equal(JSON.stringify(report).includes(token), false);
  assert.equal(JSON.stringify(report).includes('SYNTHETIC-PRIVATE-PASSWORD'), false);
  return { report, calls, statements };
}

test('native catalog preserves the existing QARINAH database and confirms one missing file table by name', async () => {
  const { report, calls, statements } = await fixture({ tableReads: [[], handoffs] });
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.registration, { databaseExisted: true, tableExisted: false, databaseConfirmed: true, tableConfirmed: true, existingObjectsReplaced: false });
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^CREATE LIGHTNING FILESTORE TABLE handoffs FROM QARINAH FORMAT CSV /);
  assert.equal(statements.some(sql => /DATABASE|SHOW /i.test(sql)), false);
  assert.equal(calls.filter(call => call.url.endsWith('/databases/QARINAH/file-store-tables')).length, 2);
  assert.equal(calls.some(call => /datasource\/datasources|\/databases\/6\//.test(call.url)), false);
  assert.equal(report.application.sourceMatchesPreparedPacket, true);
});

test('an existing matching file table requires no DDL', async () => {
  const { report, statements } = await fixture();
  assert.equal(report.status, 'passed');
  assert.equal(report.registration.tableExisted, true);
  assert.deepEqual(statements, []);
});

test('unknown or ambiguous native database metadata stops before any DDL', async () => {
  for (const body of [{ result: [] }, [{ name: 'QARINAH', databaseId: '6', tableCount: 0 }], [{ ...databases[1], futureField: true }], [{ ...databases[1], tableCount: [0] }], [...databases, { ...databases[1], databaseId: 7, name: 'qarinah' }], [...databases, { ...databases[1], name: 'DIFFERENT' }]]) {
    const { report, statements } = await fixture({ dbReads: [body] });
    assert.equal(report.status, 'failed');
    assert.equal(report.failure.stage, 'catalog-databases');
    assert.match(report.failure.code, /^CATALOG_(SHAPE_UNVERIFIED|AMBIGUOUS)$/);
    assert.deepEqual(statements, []);
  }
});

test('file-table metadata rejects wrong database IDs, duplicate names and unknown fields before DDL', async () => {
  for (const body of [{ result: [] }, [{ ...handoffs[0], databaseId: 7 }], [{ ...handoffs[0], databaseId: '6' }], [{ ...handoffs[0], tags: {} }], [{ ...handoffs[0], relationId: 2 }], [...handoffs, { ...handoffs[0], name: 'HANDOFFS' }]]) {
    const { report, statements } = await fixture({ tableReads: [body] });
    assert.equal(report.status, 'failed');
    assert.equal(report.failure.stage, 'catalog-tables');
    assert.match(report.failure.code, /^CATALOG_(SHAPE_UNVERIFIED|AMBIGUOUS)$/);
    assert.deepEqual(statements, []);
  }
});

test('an unconfirmed database creation stops after one DDL without retrying or creating its table', async () => {
  const { report, statements } = await fixture({ dbReads: [[], []] });
  assert.equal(report.status, 'failed');
  assert.deepEqual(report.failure, { stage: 'confirm-database', code: 'DATABASE_REGISTRATION_UNCONFIRMED' });
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^CREATE LIGHTNING DATABASE QARINAH /);
});
