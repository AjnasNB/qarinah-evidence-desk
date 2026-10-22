import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// Real localhost UI only. No desktop/profile, source query, generation, CI run, or fabricated response.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/record-repair-workflow.mjs --old=.local/handoff/<old>/packet.json --fresh=.local/handoff/<fresh>/packet.json [--check|--probe]');
  console.log('--check validates actual capture files without browser requests; --probe performs the same actual UI assertions without video or reading holds.');
  process.exit(0);
}
assert(args.every(a => /^(--old=|--fresh=)/.test(a) || ['--check', '--probe'].includes(a)), 'Use explicit old/fresh packet paths and optional --check or --probe.');
assert(args.filter(a => a.startsWith('--old=')).length === 1 && args.filter(a => a.startsWith('--fresh=')).length === 1);
assert(!args.includes('--check') || !args.includes('--probe'), 'Choose one validation mode.');
const probe = args.includes('--probe');
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const git = (...parameters) => execFileSync('git', parameters, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
async function readPacket(flag) {
  const requested = path.resolve(root, args.find(a => a.startsWith(flag + '='))?.slice(flag.length + 1) || '');
  const file = await fs.realpath(requested), local = await fs.realpath(path.join(root, '.local/handoff'));
  const relative = path.relative(local, file);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(file) === 'packet.json', 'Use an actual packet inside this exact project local handoff folder.');
  assert((await fs.stat(file)).size <= 16_384, 'Packet exceeds the application bound.');
  const bytes = await fs.readFile(file), value = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes));
  assert.equal(value.provenance, 'local-observation'); assert.equal(value.format, 'qarinah-handoff-v1');
  const revision = value.revisions.find(row => row.id === value.currentRevisionRef);
  assert(revision && /^[a-f0-9]{40}$/.test(revision.commit) && revision.dirty === false, 'Use a genuine clean-revision capture.');
  assert(value.ci.some(row => row.check === 'tests') && value.ci.some(row => row.check === 'build'));
  assert(value.ci.every(row => row.outcome === 'passed'));
  const observations = [...value.revisions, ...value.ci, ...value.releases];
  assert(observations.every(row => Number.isFinite(Date.parse(row.observedAt))), 'Invalid observation time.');
  return { file, bytes, value, revision, observations, sha256: sha(bytes) };
}
const old = await readPacket('--old'), fresh = await readPacket('--fresh');
assert.notEqual(old.sha256, fresh.sha256); assert.notEqual(old.revision.commit, fresh.revision.commit);
const now = Date.now(), ageLimit = 3_600_000;
assert(old.observations.every(row => Date.parse(row.observedAt) < now - ageLimit), 'Old packet must already be genuinely stale; never edit its timestamps.');
assert(fresh.observations.every(row => Date.parse(row.observedAt) >= now - ageLimit + 600_000 && Date.parse(row.observedAt) <= now + 60_000), 'Fresh packet needs at least ten minutes remaining in the one-hour source-age window.');
assert(fresh.value.releases.some(row => row.decision === 'ready'), 'Fresh source must have its actual justified ready recommendation.');
const captureFile = path.join(path.dirname(fresh.file), 'capture.json');
assert((await fs.stat(captureFile)).size <= 65_536);
const captureBytes = await fs.readFile(captureFile), capture = JSON.parse(captureBytes);
assert(capture.commit === fresh.revision.commit && capture.dirty === false, 'Fresh capture receipt must match the clean packet.');
for (const check of ['tests', 'build']) {
  const row = capture.receipts.find(row => row.check === check);
  assert(row && row.outcome === 'passed' && !row.truncated && /^[a-f0-9]{64}$/.test(row.outputSha256));
  const log = path.join(path.dirname(fresh.file), check + '.log');
  assert((await fs.stat(log)).size <= 262_144); assert.equal(sha(await fs.readFile(log)), row.outputSha256, 'Actual retained command log must match its capture hash.');
}
// Later editorial/docs changes are permitted; the recorded product must match the tested revision.
const productionPaths = ['src', 'server', 'public', 'packages', 'vendor', 'package.json', 'package-lock.json', 'vite.config.js', 'tsconfig.json'];
const unchanged = spawnSync('git', ['diff', '--quiet', fresh.revision.commit, '--', ...productionPaths], { cwd: root, windowsHide: true });
assert.equal(unchanged.status, 0, 'Product source changed after the supplied capture. Obtain a new real capture.');
assert(!git('ls-files', '--others', '--exclude-standard', '--', ...productionPaths), 'Untracked product source is outside the supplied clean capture.');
if (args.includes('--check')) {
  console.log(JSON.stringify({ passed: true, browserRequests: 0, oldPacketSha256: old.sha256, freshPacketSha256: fresh.sha256, freshCommit: fresh.revision.commit }));
  process.exit(0);
}

function synthetic(kind) {
  const value = structuredClone(fresh.value), at = new Date().toISOString();
  value.provenance = 'synthetic-replay'; value.project = `synthetic-repair-${kind}`;
  for (const row of value.revisions) { row.commit = 'f'.repeat(40); row.observedAt = at; }
  for (const row of value.ci) { row.observedAt = at; row.detail = 'SYNTHETIC invented observation; no command was run for this replay.'; }
  for (const row of value.releases) { row.observedAt = at; row.detail = 'SYNTHETIC invented recommendation; not actual CI, approval or deployment authority.'; }
  if (kind === 'failure') value.ci.find(row => row.check === 'tests').outcome = 'failed';
  else { value.ci = value.ci.filter(row => row.check !== 'build'); for (const row of value.releases) row.ciRefs = value.ci.map(row => row.id); }
  return value;
}
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5183';
const out = path.join(root, '.local/video', 'repair-' + new Date().toISOString().replace(/[^0-9TZ]/g, ''));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1,
  locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block',
  ...(probe ? {} : { recordVideo: { dir: out, size: { width: 1600, height: 900 } } }) });
const blocked = [], pageErrors = [], events = [], actions = [], responses = [];
await context.route('**/*', route => {
  const request = route.request(), url = new URL(request.url());
  const local = url.protocol === 'http:' && url.hostname === '127.0.0.1' && ['5183', '4318'].includes(url.port);
  const post = request.method() === 'POST';
  const permittedPost = ['/api/handoff/import', '/api/answer'].includes(url.pathname);
  let noGeneration = true;
  if (url.pathname === '/api/answer' && post) {
    try { noGeneration = JSON.parse(request.postData() || '{}').generate === false; } catch { noGeneration = false; }
  }
  if (local && ['GET', 'HEAD', 'POST'].includes(request.method()) && (!post || permittedPost) && noGeneration && !url.pathname.startsWith('/api/source/')) return route.continue();
  blocked.push({ origin: url.origin, route: url.pathname, method: request.method() }); return route.abort('blockedbyclient');
});
await context.routeWebSocket('**/*', socket => {
  const url = new URL(socket.url());
  if (url.protocol === 'ws:' && url.hostname === '127.0.0.1' && ['5183', '4318'].includes(url.port)) socket.connectToServer();
  else { blocked.push({ origin: url.origin, route: 'WEBSOCKET' }); socket.close(); }
});
const page = await context.newPage(), video = page.video(), began = performance.now();
page.on('pageerror', () => pageErrors.push('PAGE_ERROR'));
const elapsed = () => +((performance.now() - began) / 1000).toFixed(3);
const pause = seconds => page.waitForTimeout(probe ? 30 : seconds * 1000);
const scroll = async selector => { await page.locator(selector).scrollIntoViewIfNeeded(); await pause(.6); };
let activeBeat = 'initial-load';
async function beat(id, provenance, caption, minimumSeconds, perform) {
  activeBeat = id;
  const start = elapsed(); if (perform) await perform();
  await page.screenshot({ path: path.join(out, id + '.png') });
  if (!probe && elapsed() - start < minimumSeconds) await pause(minimumSeconds - (elapsed() - start));
  events.push({ id, start, end: elapsed(), provenance, caption });
}
async function requestAction(id, route, perform) {
  const start = elapsed();
  const waiting = page.waitForResponse(r => new URL(r.url()).pathname === route && r.request().method() === 'POST', { timeout: 30_000 });
  await perform(); const response = await waiting;
  assert(response.ok(), 'Actual UI request did not succeed.'); const body = await response.json();
  actions.push({ id, route, start, responseAt: elapsed() });
  responses.push({ id, route, status: response.status(), reason: body.reason, statusLabel: body.status,
    releaseDecision: body.releaseDecision, citations: body.citations?.length, providerAttempts: body.metrics?.providerAttempts,
    repairStatus: body.repairPlan?.status, repairKinds: body.repairPlan?.items?.map(row => row.kind),
    ...(body.snapshot ? { currentCommit: body.snapshot.handoff?.currentCommit, provenance: body.snapshot.handoff?.provenance,
      sources: body.snapshot.sources.map(row => ({ id: row.id, hash: row.hash, observedAt: row.observedAt })) } : {}) });
  return body;
}
async function importReview(id, packet, original) {
  await scroll('.handoff-panel');
  await page.getByLabel('Observations you chose to share').fill(original || JSON.stringify(packet, null, 2));
  await pause(1);
  const loaded = await requestAction(id + '-import', '/api/handoff/import', () => page.getByRole('button', { name: 'Import handoff', exact: true }).click());
  assert.equal(loaded.snapshot.handoff.provenance, packet.provenance);
  assert.equal(loaded.snapshot.handoff.currentCommit, packet.revisions.find(row => row.id === packet.currentRevisionRef).commit);
  const suppliedTimes = new Set([...packet.revisions, ...packet.ci, ...packet.releases].map(row => row.observedAt));
  assert(loaded.snapshot.sources.every(row => suppliedTimes.has(row.observedAt)), 'Import changed original observation times.');
  const reviewed = await requestAction(id + '-review', '/api/answer', () => page.getByRole('button', { name: 'Review question', exact: true }).click());
  assert.equal(reviewed.metrics.providerAttempts, 0); await scroll('.answer-panel'); return reviewed;
}
let passed = false, failure = null;
try {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Evidence review', exact: true }).waitFor();
  await beat('01-overview', 'real-product', 'A release claim needs current, inspectable observations.', 6);
  await beat('02-old-review', 'actual-stale-local-observations', 'Unchanged old local packet: original times are stale, so readiness is withheld.', 12, async () => {
    const result = await importReview('old', old.value, old.bytes.toString('utf8'));
    assert.equal(result.status, 'abstained'); assert.equal(result.citations.length, 0);
    assert.equal(result.repairPlan.status, 'refresh-needed'); assert(result.repairPlan.items.some(row => row.kind === 'stale'));
  });
  await beat('03-repair-plan', 'actual-stale-local-observations', 'Next steps preserve old timestamps and request genuine current observations.', 12, async () => {
    await scroll('.repair-plan'); await page.getByRole('heading', { name: 'Next steps', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Import updated evidence', exact: true }).waitFor();
    await pause(4);
    const source = page.locator('.repair-evidence button').first(); assert(await source.count()); await source.click();
    await scroll('.source-detail'); await pause(3); await scroll('.repair-plan');
  });
  await beat('04-fresh-review', 'actual-fresh-local-observations', 'Import the separate actual clean capture. Four citations support readiness within that evidence.', 16, async () => {
    await page.getByRole('link', { name: 'Import updated evidence', exact: true }).click();
    const result = await importReview('fresh', fresh.value, fresh.bytes.toString('utf8'));
    assert.equal(result.reason, 'release-ready-within-imported-evidence'); assert.equal(result.releaseDecision, 'ready');
    assert.equal(result.citations.length, 4); assert.equal(result.repairPlan.status, 'complete'); assert.equal(result.repairPlan.items.length, 0);
  });
  await beat('05-citation-audit', 'actual-fresh-local-observations', 'Inspect exact test observation, then actual retained reference-memory audit.', 16, async () => {
    await page.getByRole('button', { name: 'CI tests observation', exact: true }).first().click(); await scroll('.source-detail'); await pause(6);
    await scroll('.answer-panel'); const memory = page.locator('summary').filter({ hasText: 'Recalled memory' });
    assert.equal(await memory.count(), 1); await memory.click();
    await page.getByRole('button', { name: 'Inspect memory audit' }).first().click();
    await page.locator('.audit-output').waitFor(); await scroll('.audit-output');
  });
  await beat('06-context', 'actual-fresh-local-observations', 'Payload bytes include overhead; no provider request or actual token measurement.', 8, async () => scroll('.inspector'));
  await beat('07-synthetic-failure', 'synthetic-replay', 'Invented failure replay: actual product HOLD and bounded source-fix guidance.', 14, async () => {
    const result = await importReview('synthetic-failure', synthetic('failure'));
    assert.equal(result.releaseDecision, 'hold'); assert.equal(result.repairPlan.status, 'blocked');
  });
  await beat('08-synthetic-missing', 'synthetic-replay', 'Invented missing-build replay: actual product abstention and capture guidance.', 14, async () => {
    const result = await importReview('synthetic-missing', synthetic('missing'));
    assert.equal(result.status, 'abstained'); assert.equal(result.reason, 'missing-required-artifact');
    assert(result.repairPlan.items.some(row => row.kind === 'missing' && row.fact === 'build'));
  });
  await beat('09-limits', 'synthetic-replay-background', 'Local imports, not live sponsor evidence. No CI authentication, deployment authority or submission claim.', 8, async () => scroll('.connections'));
  assert.equal(blocked.length, 0); assert.equal(pageErrors.length, 0); passed = true;
} catch {
  failure = 'ACTUAL_REPAIR_WORKFLOW_UNCONFIRMED'; await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  const duration = elapsed(); await context.close(); if (video) await video.saveAs(path.join(out, 'raw.webm')); await browser.close();
  const manifest = { format: 'qarinah-repair-recording-v1', capturedAt: new Date().toISOString(), origin, probe, passed, failure,
    ...(failure ? { failedBeat: activeBeat } : {}),
    duration, viewport: { width: 1600, height: 900 }, events, actions, responses, blocked, pageErrors,
    old: { packet: path.relative(root, old.file), sha256: old.sha256, commit: old.revision.commit, unmodified: true },
    fresh: { packet: path.relative(root, fresh.file), sha256: fresh.sha256, commit: fresh.revision.commit, captureSha256: sha(captureBytes), unmodified: true },
    productMatchesFreshRevision: true, recorderCommit: git('rev-parse', 'HEAD'),
    notes: ['Ephemeral headless browser, localhost only; no OS or authentication recording.',
      'Actual application responses; no response substitution, provider query, generation or CI execution.',
      'Actual source observations retain original times; only explicitly synthetic copies have invented times/outcomes.',
      'Local imports do not independently authenticate CI, prove sponsor use or authorize deployment.'] };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ passed, probe, output: out, duration, failure }));
}
if (!passed) process.exitCode = 1;
