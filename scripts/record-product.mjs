import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Browser-only recording: fresh ephemeral context, no desktop, login, or external origin.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const probe = process.argv.includes('--probe');
const arg = name => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const packetPath = path.resolve(root, arg('--packet') || '.local/handoff/20261022T072947054Z/packet.json');
assert(packetPath.startsWith(root + path.sep), 'Packet must be inside this exact project.');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const app = 'http://127.0.0.1:5183';
const out = path.join(root, '.local/video', new Date().toISOString().replace(/[-:.]/g, ''));
await fs.mkdir(out, { recursive: true });
const rawPacket = await fs.readFile(packetPath, 'utf8');
const real = JSON.parse(rawPacket);
assert.equal(real.provenance, 'local-observation');
assert.equal(real.revisions[0].dirty, false);
assert.equal(real.releases[0].decision, 'ready');
assert(real.ci.every(item => item.outcome === 'passed'));
const packetHash = createHash('sha256').update(rawPacket).digest('hex');

function synthetic(kind) {
  const value = structuredClone(real);
  value.provenance = 'synthetic-replay';
  value.project = `synthetic-${kind}-demonstration`;
  // Copy only for a behavior demonstration. Never carry actual CI claims or hashes forward.
  value.revisions[0].commit = 'f'.repeat(40);
  value.revisions[0].observedAt = new Date().toISOString();
  for (const item of value.ci) {
    item.observedAt = new Date().toISOString();
    item.detail = 'SYNTHETIC invented CI observation for product recording; no command was run.';
  }
  if (kind === 'failure') value.ci[0].outcome = 'failed';
  if (kind === 'missing') {
    value.ci = value.ci.filter(item => item.check !== 'build');
    value.releases[0].ciRefs = value.ci.map(item => item.id);
  }
  value.releases[0].observedAt = new Date().toISOString();
  value.releases[0].detail = 'SYNTHETIC invented release recommendation, not real CI or approval.';
  return value;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1, colorScheme: 'light', locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block',
  ...(probe ? {} : { recordVideo: { dir: out, size: { width: 1600, height: 900 } } }) });
const blocked = [];
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  const allowed = url.protocol === 'http:' && url.hostname === '127.0.0.1' && ['5183', '4318'].includes(url.port);
  if (allowed) return route.continue();
  blocked.push(url.origin); return route.abort('blockedbyclient');
});
await context.routeWebSocket('**/*', socket => {
  const url = new URL(socket.url());
  if (url.protocol === 'ws:' && url.hostname === '127.0.0.1' && ['5183', '4318'].includes(url.port)) socket.connectToServer();
  else { blocked.push(url.origin); socket.close(); }
});
const page = await context.newPage();
const video = page.video();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const events = [], responses = [];
page.on('response', async response => {
  if (response.url().startsWith(app + '/api/')) {
    const body = await response.json().catch(() => null);
    responses.push({ route: new URL(response.url()).pathname, status: response.status(),
      ...(body?.releaseDecision ? { releaseDecision: body.releaseDecision } : {}),
      ...(body?.reason ? { reason: body.reason } : {}),
      ...(body?.citations ? { citations: body.citations.length, memories: body.memories?.length || 0 } : {}) });
  }
});
const start = performance.now();
const elapsed = () => Number(((performance.now() - start) / 1000).toFixed(3));
const scroll = async selector => {
  await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  await page.waitForTimeout(750);
};
async function beat(id, caption, seconds, action) {
  const begin = elapsed();
  if (action) await action();
  await page.screenshot({ path: path.join(out, id + '.png') });
  const remaining = seconds * 1000 - (performance.now() - start - begin * 1000);
  if (!probe && remaining > 0) await page.waitForTimeout(remaining);
  events.push({ id, start: begin, end: elapsed(), caption });
  console.log(JSON.stringify({ beat: id, at: elapsed() }));
}
async function importAndReview(packet, expected) {
  await scroll('.handoff-panel');
  await page.getByLabel('Observations you chose to share').fill(JSON.stringify(packet, null, 2));
  await page.waitForTimeout(probe ? 40 : 1100);
  const imported = page.waitForResponse(r => r.url() === app + '/api/handoff/import' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Import handoff', exact: true }).click();
  assert.equal((await imported).status(), 200);
  const reviewed = page.waitForResponse(r => r.url() === app + '/api/answer' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Review question', exact: true }).click();
  const result = await (await reviewed).json();
  assert.equal(result.reason, expected);
  await scroll('.answer-panel');
  return result;
}
let failure;
try {
  await page.goto(app, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Evidence review', exact: true }).waitFor();
  await beat('01-overview', 'Qarinah Evidence Desk: inspect the evidence behind a release handoff.', 7);
  await beat('02-real-input', 'REAL local packet: recorded tests and build at commit ' + real.revisions[0].commit.slice(0, 7) + '.', 10, async () => {
    await scroll('.handoff-panel');
    await page.getByLabel('Observations you chose to share').fill(rawPacket);
  });
  await beat('03-real-review', 'Import only chosen observations. Ready within imported evidence is a review, not approval.', 13, async () => {
    const result = await importAndReview(real, 'release-ready-within-imported-evidence');
    assert.equal(result.citations.length, 4);
    assert.equal(result.metrics.providerAttempts, 0);
  });
  await beat('04-citation', 'Open a citation: inspect the exact observation, observed time and SHA-256.', 12, async () => {
    await page.getByRole('button', { name: 'CI tests observation', exact: true }).first().click();
    await page.getByRole('region', { name: 'Source detail: CI tests observation', exact: true }).waitFor();
    await scroll('.source-detail');
  });
  await beat('05-trace-audit', 'Trace selection and inspect the retained H-MEM audit lineage.', 12, async () => {
    await scroll('.answer-panel');
    await page.getByText('Selection and exclusion trace', { exact: true }).click();
    const memory = page.locator('summary').filter({ hasText: 'Recalled memory' });
    assert.equal(await memory.count(), 1, 'Recording requires inspectable H-MEM memory.');
    await memory.click();
    await page.getByRole('button', { name: 'Inspect memory audit' }).first().click();
    await page.locator('.audit-output').waitFor();
    await scroll('.audit-output');
  });
  await beat('06-context', 'Actual UTF-8 bytes include overhead. Provider tokens remain unknown; no model request was sent.', 10, async () => { await scroll('.inspector'); });
  await beat('07-synthetic-failure', 'SYNTHETIC failure scenario: invented failed tests override a ready recommendation. The desk holds.', 17, async () => {
    const result = await importAndReview(synthetic('failure'), 'release-held');
    assert.equal(result.releaseDecision, 'hold');
  });
  await beat('08-synthetic-missing', 'SYNTHETIC missing scenario: remove the build artifact. The desk abstains rather than inferring readiness.', 17, async () => {
    const result = await importAndReview(synthetic('missing'), 'missing-required-artifact');
    assert.equal(result.status, 'abstained');
    await page.getByText('Selection and exclusion trace', { exact: true }).click();
  });
  await beat('09-limits', 'Local prototype. Zetaris live-query and Cursor evidence are pending. No sponsor verification or submission claimed.', 10, async () => { await scroll('.connections'); });
} catch (error) {
  failure = error;
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  const duration = elapsed();
  await context.close();
  if (video) await video.saveAs(path.join(out, 'raw.webm'));
  await browser.close();
  const manifest = { format: 'qarinah-product-recording-v1', probe, capturedAt: new Date().toISOString(),
    origin: app, viewport: { width: 1600, height: 900 }, packet: path.relative(root, packetPath), packetHash,
    capturedCommit: real.revisions[0].commit, realPacketUnmodified: true,
    syntheticModes: ['failure', 'missing'], duration, events, responses, blocked, pageErrors: errors,
    ...(failure ? { failure: failure.message } : {}),
    limits: ['Browser-only localhost capture; no OS interaction or persistent profile.', 'Caller-declared imported observations, not authenticated CI.', 'No sponsor query, generation, deployment, approval, or publication.'] };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, duration, passed: !failure && !errors.length && !blocked.length }));
}
if (failure) throw failure;
assert.equal(errors.length, 0, 'Page errors occurred. Inspect local manifest.');
assert.equal(blocked.length, 0, 'Non-local requests were blocked. Inspect local manifest.');
