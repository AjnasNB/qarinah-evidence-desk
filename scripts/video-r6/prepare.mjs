import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Reuse the reviewed r5 renderer, pinned by content; never execute it in its old output folder.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, '.local/video/r5-repair');
const out = path.join(root, '.local/video/r6-entry');
const sha = value => createHash('sha256').update(value).digest('hex');
const fileSha = async file => sha(await fs.readFile(file));
const pins = {
  'edit.mjs': 'bac5b85c9365bec53538a45273790c8370ceb8a61ef34aa0ae43b920d73f4ab0',
  'mix.mjs': '9d2f3eb22f14fc11924eb31cc088f17573ecbf783f09b4767aaba8e8231b64d5',
  'captions.mjs': '12d9d81aeeaf443012322622c122bf787d8e8c6898157cd3f60b64d5719132da',
  'verify.mjs': '5ea11f68a484b690c1e032a5ef022833180a326a19b403c19dac31a26605c12b',
};
const originalSha256 = '9183bb9f53f83b1d31923e1118bbfb3d31488c6fd20485e03c1261cb50f5331a';
assert.equal(await fileSha(path.join(source, 'qarinah-evidence-r5.mp4')), originalSha256);
await fs.mkdir(path.join(out, 'runtime'), { recursive: true });
await fs.mkdir(path.join(out, 'review'), { recursive: true });
const oldPlan = JSON.parse(await fs.readFile(path.join(source, 'edl.json'), 'utf8'));
const plan = structuredClone(oldPlan);
assert.equal(plan.scenes[8].start, 90); assert.equal(plan.scenes[8].duration, 6);
plan.scenes[8].cue = 'Cursor validation: founder-reported.';
plan.scenes[8].caption = 'Founder reports a validation task passed inside Cursor. Source observations retain their original dates; no new Cursor recording.';
plan.limits = plan.limits.map(value => value === 'Cursor development evidence pending'
  ? 'Cursor validation is founder-reported; no new Cursor recording or independently observed Cursor AI session' : value);
assert.deepEqual(plan.scenes.slice(0, 8), oldPlan.scenes.slice(0, 8));
await fs.writeFile(path.join(out, 'edl.json'), JSON.stringify(plan, null, 2) + '\n');
for (const [name, expected] of Object.entries(pins)) {
  let code = await fs.readFile(path.join(root, 'scripts/video-r5', name), 'utf8');
  assert.equal(sha(code), expected, `Reviewed helper changed: ${name}`);
  code = code.replace("const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');", `const root = ${JSON.stringify(root)};`)
    .replaceAll('.local/video/r5-repair', '.local/video/r6-entry')
    .replaceAll('scripts/video-r5/narration.json', 'scripts/video-r6/narration.json')
    .replaceAll('r5-picture.mp4', 'r6-picture.mp4')
    .replaceAll('qarinah-evidence-r5', 'qarinah-evidence-r6')
    .replaceAll('EARLIER SYNTHETIC BACKGROUND / CURSOR PENDING', 'EARLIER SYNTHETIC BACKGROUND / FOUNDER REPORT')
    .replaceAll('Separate verified Zetaris source clip; Cursor evidence pending.', 'Separate verified Zetaris source clip; Cursor validation founder-reported; no new Cursor recording.');
  await fs.writeFile(path.join(out, 'runtime', name), code);
}
const clips = [];
for (let i = 0; i < 8; i++) {
  for (const suffix of ['mp4', 'sha256']) {
    const name = `picture-${i}.${suffix}`;
    await fs.copyFile(path.join(source, name), path.join(out, name));
    clips.push({ file: name, sha256: await fileSha(path.join(source, name)) });
  }
}
await fs.writeFile(path.join(out, 'update-source.json'), JSON.stringify({
  original: '.local/video/r5-repair/qarinah-evidence-r5.mp4', originalSha256,
  sourceEdlSha256: await fileSha(path.join(source, 'edl.json')), helperPins: pins, unchangedClips: clips,
  changedRange: [90, 96], voice: 'Existing local Kokoro af_heart, speed 1.0',
  claimBasis: 'Founder-reported validation task passed inside Cursor, relayed by parent task; not a new recording or independently observed AI session',
  sourceIdentity: 'Original 968764a 46-test capture and original timestamps retained; not a 51-test film',
}, null, 2) + '\n');
console.log(JSON.stringify({ output: out, pictureReusedSeconds: 90, changedSeconds: 6, originalSha256 }));
