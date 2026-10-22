import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
// Read-only evidence adoption. This helper never contacts the app, provider or Docker.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const value = name => process.argv.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1);
assert(value('--recording') && value('--verification'), 'Supply actual --recording=<live directory> and --verification=<passed receipt.json>.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function local(input, folder) {
  const file = await fs.realpath(path.resolve(root, input)), base = await fs.realpath(path.join(root, folder));
  const relative = path.relative(base, file);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Evidence must stay within the project local output folder.'); return file;
}
const recording = await local(value('--recording'), '.local/video');
const verification = await local(value('--verification'), '.local/zetaris-verification');
const manifestBytes = await fs.readFile(path.join(recording, 'manifest.json')), manifest = JSON.parse(manifestBytes);
const receiptBytes = await fs.readFile(verification), receipt = JSON.parse(receiptBytes);
const out = path.join(root, '.local/video/r5-repair'), edlFile = path.join(out, 'edl.json');
const edlBytes = await fs.readFile(edlFile), edl = JSON.parse(edlBytes);
const packetFile = await local(edl.fresh.packet, '.local/handoff');
assert((await fs.stat(packetFile)).size <= 16_384);
const packetBytes = await fs.readFile(packetFile), packet = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(packetBytes));
assert.equal(sha(packetBytes), edl.fresh.sha256, 'Original packet bytes changed.');
const canonicalPacketSha256 = sha(Buffer.from(JSON.stringify(packet)));
// Reuse the installed project loader and production source-ID function, without app/provider calls.
const { tsImport } = await import('tsx/esm/api');
const { importHandoff } = await tsImport('../../server/handoff.ts', import.meta.url);
const expectedSnapshot = importHandoff(packet, Date.now());
const expectedIds = expectedSnapshot.sources.map(row => row.id).sort();
assert.equal(manifest.format, 'qarinah-live-recording-v1');
assert(manifest.passed && !manifest.probe && !manifest.failure && !manifest.blocked.length && !manifest.pageErrors.length);
assert.equal(manifest.packetSha256, edl.fresh.sha256); assert.equal(manifest.capturedCommit, edl.fresh.commit);
assert.equal(receipt.format, 'qarinah.zetaris-local-verification.v1'); assert.equal(receipt.status, 'passed');
assert(!receipt.uncertainties.length && receipt.probe.cleanup === 'confirmed');
assert.equal(receipt.source.packetSha256, canonicalPacketSha256); assert.equal(receipt.source.commit, edl.fresh.commit);
assert.equal(expectedSnapshot.handoff.currentCommit, edl.fresh.commit);
assert.equal(receipt.source.expectedObservations, expectedIds.length);
assert(receipt.application.sourceMatchesPreparedPacket && receipt.application.transport.cleanup === 'confirmed');
assert.equal(receipt.application.answer.releaseDecision, 'ready'); assert.equal(receipt.application.answer.citations.length, 4);
assert.deepEqual([...receipt.application.answer.citations].sort(), expectedIds, 'Verified cited source identities differ from the exact packet.');
assert.equal(receipt.application.answer.providerAttempts, 0);
assert(manifest.responses.some(row => row.route === '/api/source/query' && row.status === 200));
const first = manifest.events.find(row => row.id === '01-live-source');
const second = manifest.events.find(row => row.id === '02-release-assessment');
assert(first && second && second.start > first.start);
// Existing recorder waits three seconds after the actual source response before review.
// Keep the response and review continuous, trimming only preceding waiting time if necessary.
const sourceStart = Math.max(0, first.start - .5, second.start - 5);
assert(sourceStart + 8 <= manifest.duration, 'The real clip is too short for the eight-second excerpt.');
const gate = Math.max(0, second.start - 3 - sourceStart + .75);
assert(gate < 5, 'The source completion is too late in this excerpt.');
const rawSha256 = sha(await fs.readFile(path.join(recording, 'raw.webm')));
await fs.writeFile(path.join(out, 'edl-local.json'), edlBytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
Object.assign(edl.scenes[5], { id: '06-live-source', name: 'SEPARATE SOURCE CHECK', live: true,
  source: path.relative(root, path.join(recording, 'raw.webm')), sourceSha256: rawSha256,
  sourceStart, gate: +gate.toFixed(3), provenance: 'verified-live-source-read', cue: 'Actual Zetaris source read.',
  caption: 'Separate actual Zetaris query. Exact prepared packet and confirmed cleanup. Source transport does not authenticate CI.' });
edl.scenes[8].caption = 'Earlier synthetic background. Actual Cursor evidence remains pending. No CI authentication or competition submission claim.';
edl.limits = ['Main repair journey uses actual local imports', 'Separate verified live Zetaris source read', 'Cursor development evidence pending', 'Not authenticated CI or deployment permission'];
edl.live = { recording: path.relative(root, recording), manifestSha256: sha(manifestBytes), verification: path.relative(root, verification), verificationSha256: sha(receiptBytes),
  originalPacketSha256: sha(packetBytes), canonicalPacketSha256, verifiedSourceIds: expectedIds };
await fs.writeFile(edlFile, JSON.stringify(edl, null, 2) + '\n');
const scriptFile = path.join(root, 'scripts/video-r5/narration.json'), scriptBytes = await fs.readFile(scriptFile);
await fs.writeFile(path.join(root, 'scripts/video-r5/narration-local.json'), scriptBytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
const script = JSON.parse(scriptBytes);
Object.assign(script.lines[8], { id: '06-live-source', text: 'Here is a separate, actual Zetaris source read. Transport does not authenticate the recorded tests.' });
script.lines[11].text = 'Cursor evidence remains pending. No submission is claimed.';
await fs.writeFile(scriptFile, JSON.stringify(script, null, 2) + '\n');
await fs.writeFile(path.join(root, 'scripts/video-r5/lexicon.json'), JSON.stringify({ Qarinah: { say: 'kuh ree nuh' }, Zetaris: { say: 'zet air iss' } }, null, 2) + '\n');
console.log(JSON.stringify({ adopted: true, chapter: '58-66 seconds', sourceStart, gate, duration: 96, providerActions: 0 }));
