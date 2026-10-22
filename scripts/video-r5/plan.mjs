import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const value = name => process.argv.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1);
assert(value('--recording'), 'Supply the actual recording directory with --recording=<path>.');
const source = await fs.realpath(path.resolve(root, value('--recording')));
const relative = path.relative(path.join(root, '.local/video'), source);
assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Recording must be project-local.');
const out = path.join(root, '.local/video/r5-repair');
const bytes = await fs.readFile(path.join(source, 'manifest.json'));
const manifest = JSON.parse(bytes);
const rawSha256 = createHash('sha256').update(await fs.readFile(path.join(source, 'raw.webm'))).digest('hex');
assert.equal(manifest.format, 'qarinah-repair-recording-v1');
assert(manifest.passed && !manifest.probe && !manifest.failure && !manifest.blocked.length && !manifest.pageErrors.length);
assert.equal(manifest.events.length, 9); assert(manifest.old.unmodified && manifest.fresh.unmodified);
for (const id of ['old-review', 'fresh-review', 'synthetic-failure-review', 'synthetic-missing-review']) {
  const response = manifest.responses.find(row => row.id === id); assert(response && response.status === 200 && response.providerAttempts === 0);
}
assert.equal(manifest.responses.find(row => row.id === 'old-review').citations, 0);
assert.equal(manifest.responses.find(row => row.id === 'fresh-review').citations, 4);
const durations = [6, 12, 12, 14, 14, 8, 12, 12, 6];
const names = ['THE CLAIM', 'THE OLD PACKET', 'BOUNDED NEXT STEPS', 'THE FRESH CAPTURE', 'THE RECEIPTS', 'THE MEASUREMENT', 'FAILURE / REPLAY', 'MISSING / REPLAY', 'THE LIMITS'];
const cues = ['A release claim needs receipts.', 'Old observations stay old.', 'Next steps you can inspect.', 'Fresh evidence. Four citations.',
  'Exact source. Retained lineage.', 'Bytes measured. Tokens unknown.', 'Failed tests → hold.', 'Missing build → abstain.', 'Local proof. Honest limits.'];
const captions = [
  'Actual local product footage. Review a claim against explicit source observations.',
  `Unchanged old ${manifest.old.commit.slice(0, 7)} packet. Original observations have expired; readiness is withheld.`,
  'The actual repair plan requests current observations and preserves the old timestamps.',
  `Separate actual tests/build capture at clean ${manifest.fresh.commit.slice(0, 7)}. Ready only within this evidence; not deployment authority.`,
  'Inspect exact observation text, time and SHA-256, then actual Meterless H-MEM reference provenance.',
  'UTF-8 bytes include overhead. No model request was sent; provider tokens remain unknown.',
  'Invented failed tests override an invented ready recommendation. Actual product HOLD and source-fix guidance.',
  'Remove an invented build artifact. Actual product abstention requests the missing evidence.',
  'Live Zetaris and actual Cursor evidence remain pending. No competition submission or CI authentication claimed.'
];
const reviewIds = { 1: 'old-review', 3: 'fresh-review', 6: 'synthetic-failure-review', 7: 'synthetic-missing-review' };
let start = 0;
const scenes = manifest.events.map((event, index) => {
  const action = manifest.actions.find(row => row.id === reviewIds[index]);
  const gate = action ? Math.max(0, action.responseAt - event.start + .75) : 0;
  const scene = { index, id: event.id, source: path.relative(root, path.join(source, 'raw.webm')), sourceSha256: rawSha256, sourceStart: event.start,
    duration: durations[index], start, gate: +gate.toFixed(3), name: names[index], cue: cues[index], caption: captions[index],
    synthetic: index === 6 || index === 7, provenance: event.provenance,
    crop: { x: 220, y: [0, 180, 0, 180, 0, 0, 180, 180, 0][index], width: 1360, height: 680 } };
  assert(event.end - event.start >= scene.duration, 'Excerpt exceeds the actual recorded beat.');
  assert(scene.gate < scene.duration - 3, 'Result has insufficient visible reading time.');
  start += scene.duration; return scene;
});
assert.equal(start, 96); await fs.mkdir(path.join(out, 'review'), { recursive: true });
const edl = { version: 1, duration: 96, fps: 30, bpm: 120, sourceManifest: path.relative(root, path.join(source, 'manifest.json')),
  sourceManifestSha256: createHash('sha256').update(bytes).digest('hex'), old: manifest.old, fresh: manifest.fresh, scenes,
  limits: ['Actual local imports, not a live sponsor query', 'Explicitly labeled synthetic copies', 'Not authenticated CI or deployment permission'],
  editorial: 'Chronological real-footage excerpts, bar-aligned cuts, restrained reframes, editorial captions and source-to-review map.' };
await fs.writeFile(path.join(out, 'edl.json'), JSON.stringify(edl, null, 2) + '\n');
console.log(JSON.stringify({ out, source, duration: start, gates: scenes.map(s => ({ id: s.id, at: s.start + s.gate })) }, null, 2));
