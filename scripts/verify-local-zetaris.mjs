import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { boundedResponse, queryBundledZetaris } from '../server/providers.ts';
import { assessRelease, importHandoff, RELEASE_QUESTION } from '../server/handoff.ts';
import { digest } from '../server/evidence.ts';

const workspace = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const driverCsv = '/home/zetaris/customer-data/shared/qarinah-evidence-desk/handoffs.csv';
const ddl = Object.freeze({ database: 'CREATE LIGHTNING DATABASE QARINAH DESCRIBE BY "Qarinah local developer observations" OPTIONS ()', table: `CREATE LIGHTNING FILESTORE TABLE handoffs FROM QARINAH FORMAT CSV OPTIONS (path "${driverCsv}", header "true", inferSchema "false")` });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
class SafeFailure extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new SafeFailure(code); };
function localOrigin(value) {
  try { const url = new URL(value); if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) fail('LOCAL_ORIGIN_REQUIRED'); return url.origin; }
  catch { fail('LOCAL_ORIGIN_REQUIRED'); }
}
export function argumentsFor(args) {
  const options = { mode: undefined, csvPrepared: undefined, appOrigin: 'http://127.0.0.1:4318' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (['--probe', '--register-source', '--verify-source'].includes(arg)) { if (options.mode) fail('ONE_MODE_REQUIRED'); options.mode = arg.slice(2); }
    else if (arg === '--csv-prepared' && !options.csvPrepared && args[index + 1]) options.csvPrepared = args[++index];
    else if (arg === '--app-origin' && args[index + 1]) options.appOrigin = localOrigin(args[++index]);
    else fail('UNSUPPORTED_ARGUMENT');
  }
  if (!options.mode || (options.mode !== 'probe' && !options.csvPrepared) || (options.mode === 'probe' && options.csvPrepared)) fail('EXPLICIT_MODE_AND_SOURCE_REQUIRED');
  if (options.csvPrepared) {
    const file = path.resolve(options.csvPrepared), allowed = path.join(workspace, '.local', 'zetaris-source') + path.sep;
    if (!path.isAbsolute(options.csvPrepared) || !file.startsWith(allowed) || path.basename(file) !== 'handoffs.csv') fail('PREPARED_CSV_PATH_REQUIRED');
    options.csvPrepared = file;
  }
  return options;
}
export function preparedCsv(raw, now) {
  if (raw.byteLength > 65_536) fail('CSV_SIZE');
  let text; try { text = new TextDecoder('utf8', { fatal: true }).decode(raw); } catch { fail('CSV_UTF8'); }
  const lines = text.replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (lines.shift() !== 'captured_at,packet_base64' || !lines.length || lines.length > 2) fail('CSV_SCHEMA');
  const rows = lines.map(line => {
    const cells = line.split(',');
    if (cells.length !== 2 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(cells[0]) || !Number.isFinite(Date.parse(cells[0])) || new Date(cells[0]).toISOString() !== cells[0] || cells[1].length > 21_848 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(cells[1])) fail('CSV_SCHEMA');
    try {
      const bytes = Buffer.from(cells[1], 'base64');
      if (bytes.length > 16_384 || bytes.toString('base64') !== cells[1]) fail('CSV_PACKET');
      const packet = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes));
      const snapshot = importHandoff(packet, now);
      const revision = packet.revisions.find(item => item.id === packet.currentRevisionRef);
      if (packet.provenance !== 'local-observation' || revision.observedAt !== cells[0]) fail('CSV_PACKET');
      return { capturedAt: cells[0], packet, snapshot, packetSha256: sha256(bytes) };
    } catch { fail('CSV_PACKET'); }
  }).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  if (new Set(rows.map(row => row.capturedAt)).size !== rows.length) fail('CSV_ORDER_UNCERTAIN');
  return { rows, latest: rows.at(-1), sha256: sha256(raw), bytes: raw.byteLength };
}
function nativeCatalog(body, kind, databaseId) {
  if (!Array.isArray(body) || body.length > 100) fail('CATALOG_SHAPE_UNVERIFIED');
  const fields = kind === 'database' ? ['databaseId', 'name', 'description', 'tableCount'] : ['databaseId', 'name', 'description', 'tags'];
  const names = new Set(), ids = new Set();
  return body.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !fields.includes(key)) || !Number.isSafeInteger(row.databaseId) || row.databaseId <= 0 || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 128 || /[\u0000-\u001f\u007f]/.test(row.name) || (row.description !== undefined && row.description !== null && (typeof row.description !== 'string' || row.description.length > 4096))) fail('CATALOG_SHAPE_UNVERIFIED');
    if (kind === 'database' ? !Number.isSafeInteger(row.tableCount) || row.tableCount < 0 : row.databaseId !== databaseId || !Array.isArray(row.tags) || row.tags.length > 100 || row.tags.some(tag => typeof tag !== 'string' || tag.length > 256)) fail('CATALOG_SHAPE_UNVERIFIED');
    const name = row.name.toLowerCase();
    if (names.has(name) || (kind === 'database' && ids.has(row.databaseId))) fail('CATALOG_AMBIGUOUS');
    names.add(name); ids.add(row.databaseId);
    return { name: row.name, databaseId: row.databaseId };
  });
}
/** Dependency injection exists only for local mock checks; the CLI always uses native fetch. */
export async function runVerification(options, { env = process.env, fetcher = fetch, readFile = fs.readFile, clock = Date.now } = {}) {
  const report = { format: 'qarinah.zetaris-local-verification.v1', startedAt: new Date(clock()).toISOString(), mode: options.mode, status: 'failed', steps: [], uncertainties: [], note: 'No credentials, tokens, raw provider errors, source detail or account identifiers are retained in this receipt.' };
  let stage = 'configuration';
  const request = async (label, url, init = {}) => {
    stage = label;
    const step = { stage: label, method: init.method || 'GET', status: 'unconfirmed' }; report.steps.push(step);
    try {
      const response = await fetcher(url, { ...init, redirect: 'manual', signal: init.signal ?? AbortSignal.timeout(20_000) });
      step.httpStatus = response.status;
      if (!response.ok) { await response.body?.cancel(); fail('HTTP_REJECTED_OR_UNCONFIRMED'); }
      step.status = 'received'; return response;
    } catch (error) { step.code = error instanceof SafeFailure ? error.code : 'TRANSPORT_UNCONFIRMED'; throw new SafeFailure(step.code); }
  };
  const jsonRequest = async (label, url, init, cap = 131_072) => {
    const response = await request(label, url, init);
    try { const result = await boundedResponse(response, cap); report.steps.at(-1).bytes = result.bytes; return result.body; }
    catch { fail('RESPONSE_SHAPE_UNVERIFIED'); }
  };
  try {
    const origin = localOrigin(env.ZETARIS_UI_URL), appOrigin = localOrigin(options.appOrigin);
    const credentials = { origin, username: env.ZETARIS_USERNAME, password: env.ZETARIS_PASSWORD };
    if (typeof credentials.username !== 'string' || !credentials.username || typeof credentials.password !== 'string' || !credentials.password) fail('PRIVATE_CONFIGURATION_MISSING');
    const source = options.csvPrepared ? preparedCsv(await readFile(options.csvPrepared), clock()) : undefined;
    const health = await request('ui-health', origin + '/api/config'); await health.body?.cancel(); report.steps.at(-1).status = 'passed';
    stage = 'probe';
    const probe = await queryBundledZetaris(credentials, 'probe', async (input, init) => {
      const route = String(input).slice(origin.length);
      const label = route === '/api/auth/login' ? 'probe-login' : route === '/api/proxy/query/sql/start' ? 'probe-select' : route.startsWith('/api/proxy/query/sql/close/') ? 'probe-close' : 'unsupported-route';
      if (label === 'unsupported-route') fail('UNSUPPORTED_ROUTE');
      return request(label, input, init);
    });
    if (probe.rows.length !== 1 || Object.keys(probe.rows[0]).length !== 1 || ![1, '1'].includes(probe.rows[0].one)) fail('PROBE_CONSTANT_UNVERIFIED');
    report.probe = { one: 1, cleanup: probe.cleanup, sourceResponseBytes: probe.bytes, httpRequests: probe.httpRequests };
    if (probe.cleanup !== 'confirmed') report.uncertainties.push('PROBE_CLEANUP_UNCONFIRMED');
    if (options.mode !== 'probe') {
      const appStatus = await jsonRequest('app-status', appOrigin + '/api/status', undefined, 16_384);
      if (appStatus?.zetaris?.protocol !== 'bundled-ui-2.4.3' || appStatus?.zetaris?.currentRelease?.configured !== true) fail('APP_BUNDLED_CONFIGURATION_REQUIRED');
      if (options.mode === 'register-source') {
        const auth = await jsonRequest('setup-login', origin + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': randomUUID() }, body: JSON.stringify({ username: credentials.username, password: credentials.password }) }, 32_768);
        if (!auth || typeof auth.idToken !== 'string' || auth.idToken.length > 16_384 || !/^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(auth.idToken) || !Number.isSafeInteger(auth.orgId) || auth.orgId <= 0) fail('SETUP_SESSION_UNVERIFIED');
        const generic = async (label, sql) => {
          const body = await jsonRequest(label, origin + '/api/proxy/query/sql/generic-query', { method: 'POST', headers: { authorization: 'Bearer ' + auth.idToken, 'x-org-id': String(auth.orgId), 'x-request-id': randomUUID(), 'content-type': 'application/json' }, body: JSON.stringify({ sql }) });
          if (!body || typeof body !== 'object' || !Array.isArray(body.result) || body.result.length > 100 || Object.keys(body).some(key => key !== 'result')) fail('GENERIC_RESPONSE_UNVERIFIED');
          return body;
        };
        const catalogHeaders = { authorization: 'Bearer ' + auth.idToken, 'x-org-id': String(auth.orgId), 'x-request-id': randomUUID() };
        const databases = async label => nativeCatalog(await jsonRequest(label, origin + '/api/proxy/lightning-database/databases', { headers: catalogHeaders }), 'database');
        const findDatabase = rows => rows.find(row => row.name.toLowerCase() === 'qarinah');
        let database = findDatabase(await databases('catalog-databases'));
        const databaseExisted = Boolean(database);
        if (!database) { await generic('register-database', ddl.database); database = findDatabase(await databases('confirm-database')); if (!database) fail('DATABASE_REGISTRATION_UNCONFIRMED'); }
        const tables = async label => nativeCatalog(await jsonRequest(label, origin + '/api/proxy/lightning-database/databases/' + encodeURIComponent(database.name) + '/file-store-tables', { headers: catalogHeaders }), 'table', database.databaseId);
        const hasTable = rows => rows.some(row => row.name.toLowerCase() === 'handoffs');
        const tableExisted = hasTable(await tables('catalog-tables'));
        if (!tableExisted) { await generic('register-table', ddl.table); if (!hasTable(await tables('confirm-table'))) fail('TABLE_REGISTRATION_UNCONFIRMED'); }
        report.registration = { databaseExisted, tableExisted, databaseConfirmed: true, tableConfirmed: true, existingObjectsReplaced: false };
      }
      const latest = source.latest;
      report.source = { csvBytes: source.bytes, csvSha256: source.sha256, rowCount: source.rows.length, packetSha256: latest.packetSha256, observedAt: latest.capturedAt, commit: latest.snapshot.handoff.currentCommit, expectedObservations: latest.snapshot.sources.length, confidentiality: 'Base64 is not encryption; source is public-safe caller-declared local observations.' };
      const loaded = await jsonRequest('app-current-release', appOrigin + '/api/source/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ queryKey: 'current-release' }) }, 262_144);
      const actual = loaded?.snapshot, expectedIds = latest.snapshot.sources.map(item => item.id).sort();
      if (actual?.mode !== 'handoff' || actual?.transport?.provider !== 'zetaris' || actual?.transport?.protocol !== 'bundled-ui-2.4.3' || actual?.transport?.queryKey !== 'current-release' || actual?.handoff?.currentCommit !== latest.snapshot.handoff.currentCommit || actual?.handoff?.provenance !== 'local-observation' || !Array.isArray(actual.sources) || JSON.stringify(actual.sources.map(item => item.id).sort()) !== JSON.stringify(expectedIds) || !/^[a-f0-9-]{36}$/.test(actual.id)) fail('APP_SOURCE_UNVERIFIED');
      for (const source of actual.sources) { const { id, hash, ...original } = source; if (digest(original) !== hash || latest.snapshot.sources.find(item => item.id === id)?.hash !== hash) fail('APP_SOURCE_UNVERIFIED'); }
      if (actual.transport.cleanup !== 'confirmed') report.uncertainties.push('SOURCE_CLEANUP_UNCONFIRMED');
      const answer = await jsonRequest('app-release-answer', appOrigin + '/api/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ snapshotId: actual.id, question: RELEASE_QUESTION, generate: false }) }, 262_144);
      const expected = assessRelease(importHandoff(latest.packet, clock()), RELEASE_QUESTION, clock());
      if (answer?.mode !== 'retrieval-only' || answer?.metrics?.providerAttempts !== 0 || answer?.metrics?.providerUsage !== null || answer.status !== (expected.decision ? 'answered' : 'abstained') || answer.releaseDecision !== expected.decision || !Array.isArray(answer.citations) || JSON.stringify(answer.citations.map(item => item.id).sort()) !== JSON.stringify(expected.selected.map(item => item.id).sort())) fail('APP_DECISION_UNVERIFIED');
      report.application = { snapshotId: actual.id, sourceMatchesPreparedPacket: true, transport: { cleanup: actual.transport.cleanup === 'confirmed' ? 'confirmed' : 'unconfirmed', sourceResponseBytes: Number.isSafeInteger(actual.transport.sourceResponseBytes) ? actual.transport.sourceResponseBytes : null }, answer: { status: answer.status, releaseDecision: answer.releaseDecision ?? null, citations: answer.citations.map(item => item.id), providerAttempts: 0, providerUsage: null }, note: 'Transport verification does not authenticate CI, certify release safety or authorize deployment. Old observations remain old.' };
    }
    report.status = report.uncertainties.length ? 'uncertain' : 'passed';
  } catch (error) { report.failure = { stage, code: error instanceof SafeFailure ? error.code : 'OPERATION_UNCONFIRMED' }; }
  report.finishedAt = new Date(clock()).toISOString();
  return report;
}
async function main() {
  if (process.argv.slice(2).includes('--help')) { console.log('node --import tsx scripts/verify-local-zetaris.mjs --probe | --register-source --csv-prepared <absolute CSV> | --verify-source --csv-prepared <absolute CSV> [--app-origin http://127.0.0.1:4318]'); return; }
  const options = argumentsFor(process.argv.slice(2));
  const envPath = path.join(workspace, '.env.local');
  try { await fs.access(envPath); process.loadEnvFile(envPath); } catch { fail('PRIVATE_CONFIGURATION_MISSING'); }
  const report = await runVerification(options);
  const directory = path.join(workspace, '.local', 'zetaris-verification', new Date().toISOString().replace(/[^0-9TZ]/g, '') + '-' + randomUUID().slice(0, 8));
  await fs.mkdir(directory, { recursive: true });
  const receipt = path.join(directory, 'receipt.json');
  await fs.writeFile(receipt, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: report.status, receipt, failure: report.failure ?? null, uncertainties: report.uncertainties }));
  if (report.status !== 'passed') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(JSON.stringify({ status: 'failed', code: error instanceof SafeFailure ? error.code : 'LOCAL_HELPER_UNCONFIRMED' })); process.exitCode = 1; });
