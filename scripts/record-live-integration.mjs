import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const input = process.argv.slice(2);
if (input.includes('--help')) {
  console.log('node scripts/record-live-integration.mjs --probe | --packet=<absolute actual packet.json>');
  process.exit(0);
}
const probe = input.length === 1 && input[0] === '--probe';
assert(probe || input.length === 1 && input[0].startsWith('--packet='), 'Use --probe or one explicit packet path.');
const packetPath = probe ? null : path.resolve(input[0].slice('--packet='.length));
if (packetPath) assert(path.relative(root, packetPath).startsWith('.local' + path.sep) && path.basename(packetPath) === 'packet.json', 'Use a packet inside this exact project’s ignored local captures.');
const packetBytes = packetPath ? await fs.readFile(packetPath) : null;
if (packetBytes) assert(packetBytes.length <= 16_384);
const packet = packetBytes ? JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(packetBytes)) : null;
if (packet) assert(packet.provenance === 'local-observation' && packet.revisions.find(row => row.id === packet.currentRevisionRef)?.dirty === false, 'Use an actual clean capture.');
const expectedCommit = packet?.revisions.find(row => row.id === packet.currentRevisionRef)?.commit;
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5183';
const out = path.join(root, '.local', 'video', 'live-' + new Date().toISOString().replace(/[^0-9TZ]/g, ''));
await fs.mkdir(out, { recursive: false });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block', ...(probe ? {} : { recordVideo: { dir: out, size: { width: 1600, height: 900 } } }) });
const blocked = [], pageErrors = [], events = [], responses = [];
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && ['5183', '4318'].includes(url.port)) return route.continue();
  blocked.push(url.origin); return route.abort();
});
await context.routeWebSocket('**/*', socket => {
  const url = new URL(socket.url());
  if (url.protocol === 'ws:' && url.hostname === '127.0.0.1' && ['5183', '4318'].includes(url.port)) socket.connectToServer();
  else { blocked.push(url.origin); socket.close(); }
});
const page = await context.newPage(), video = page.video();
page.on('pageerror', () => pageErrors.push('PAGE_ERROR'));
const began = performance.now();
const elapsed = () => Number(((performance.now() - began) / 1000).toFixed(3));
const pause = seconds => page.waitForTimeout(seconds * 1000);
const scroll = async selector => { await page.locator(selector).scrollIntoViewIfNeeded(); await pause(0.6); };
async function action(id, route, perform) {
  events.push({ id, start: elapsed() });
  const waiting = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === route, { timeout: 35_000 });
  await perform();
  const response = await waiting;
  responses.push({ route, status: response.status() });
  assert(response.ok(), 'Actual local workflow request did not succeed.');
  return response.json();
}
let passed = false, failure = null;
try {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Investigate handoff', exact: true }).waitFor();
  if (probe) {
    assert(await page.getByRole('button', { name: 'Investigate handoff', exact: true }).isEnabled(), 'Source configuration is unavailable.');
  } else {
    const status = await (await fetch('http://127.0.0.1:4318/api/status', { signal: AbortSignal.timeout(5_000) })).json();
    assert(status.zetaris?.currentRelease?.verified, 'Run actual source verification before recording.');
    await pause(2);
    const loaded = await action('01-live-source', '/api/source/query', () => page.getByRole('button', { name: 'Investigate handoff', exact: true }).click());
    assert(loaded.snapshot?.transport?.provider === 'zetaris' && loaded.snapshot.transport.queryKey === 'current-release' && loaded.snapshot.transport.cleanup === 'confirmed' && loaded.snapshot.handoff?.currentCommit === expectedCommit, 'Recorded source did not match verified prepared evidence.');
    await pause(3);
    const answer = await action('02-release-assessment', '/api/answer', () => page.getByRole('button', { name: 'Review question', exact: true }).click());
    assert(answer.status === 'answered' && answer.releaseDecision === 'ready' && answer.citations.length === 4 && answer.metrics.providerAttempts === 0, 'Fresh recorded release assessment did not match the actual evidence.');
    await scroll('.answer-panel'); await pause(6);
    events.push({ id: '03-source-citation', start: elapsed() });
    await page.getByRole('button', { name: 'CI tests observation', exact: true }).first().click();
    await scroll('.source-detail'); await pause(5);
    events.push({ id: '04-meterless-audit', start: elapsed() });
    await scroll('.answer-panel');
    await page.locator('summary').filter({ hasText: 'Recalled memory' }).click();
    await page.getByRole('button', { name: 'Inspect memory audit' }).first().click();
    await page.locator('.audit-output').waitFor(); await scroll('.audit-output'); await pause(5);
    events.push({ id: '05-runtime-status', start: elapsed() });
    await scroll('.connections'); await pause(4);
  }
  assert.equal(blocked.length, 0); assert.equal(pageErrors.length, 0); passed = true;
} catch { failure = 'ACTUAL_LIVE_RECORDING_UNCONFIRMED'; await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); }
finally {
  const duration = elapsed();
  await context.close();
  if (video) await video.saveAs(path.join(out, 'raw.webm'));
  await browser.close();
  const manifest = { format: 'qarinah-live-recording-v1', capturedAt: new Date().toISOString(), probe, passed, failure, origin, duration, capturedCommit: expectedCommit ?? null, packetSha256: packetBytes ? createHash('sha256').update(packetBytes).digest('hex') : null, events, responses, blocked, pageErrors, notes: ['Fresh ephemeral browser; localhost only, no desktop or authentication recording.', 'Actual UI requests only; no intercepted/fabricated application responses.', 'Source transport does not independently authenticate CI or authorize deployment.', 'Raw footage requires editing and review before publication.'] };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ passed, probe, output: out, duration, failure }));
}
if (!passed) process.exitCode = 1;
