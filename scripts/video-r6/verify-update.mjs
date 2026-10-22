import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const old = path.join(root, '.local/video/r5-repair'), out = path.join(root, '.local/video/r6-entry');
const sha = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 10e6 });
  assert.equal(result.status, 0, result.stderr?.slice(-1200) || result.error?.message);
  return result;
};
const source = await json(path.join(out, 'update-source.json'));
assert.equal(await sha(path.join(root, source.original)), source.originalSha256, 'Original r5 modified');
assert.equal(await sha(path.join(old, 'edl.json')), source.sourceEdlSha256);
for (const clip of source.unchangedClips) {
  assert.equal(await sha(path.join(old, clip.file)), clip.sha256);
  assert.equal(await sha(path.join(out, clip.file)), clip.sha256, 'First-90s clip changed');
}
const a = await json(path.join(old, 'voice/timeline.json')), b = await json(path.join(out, 'voice/timeline.json'));
for (let i = 0; i < 11; i++) {
  assert.equal(a.lines[i].text, b.lines[i].text);
  assert.equal(a.lines[i].start, b.lines[i].start);
  assert.deepEqual(a.lines[i].words, b.lines[i].words);
  assert.equal(await sha(path.join(old, 'voice', a.lines[i].file)), await sha(path.join(out, 'voice', b.lines[i].file)));
}
assert.equal(b.lines[11].text, 'Cursor validation is founder-reported. These are local source observations.');
assert.equal(b.lines[11].start, 90.4);
assert(b.lines[11].speech_end < 95.5);
const prefixHash = file => run(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-i', file, '-t', '90', '-map', '0:v:0', '-an', '-f', 'hash', '-hash', 'sha256', '-']).stdout.trim();
const final = path.join(out, 'qarinah-evidence-r6.mp4');
const prefix = { original: prefixHash(path.join(old, 'qarinah-evidence-r5.mp4')), updated: prefixHash(final) };
assert.equal(prefix.original, prefix.updated, 'First 90 seconds decoded picture changed');
const edl = await json(path.join(out, 'edl.json')), originalEdl = await json(path.join(old, 'edl.json'));
assert.deepEqual(edl.scenes.slice(0, 8), originalEdl.scenes.slice(0, 8));
assert.deepEqual(edl.fresh, originalEdl.fresh); assert.deepEqual(edl.live, originalEdl.live);
assert(edl.scenes[8].caption.includes('no new Cursor recording'));
const metadata = JSON.parse(run(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_format', '-of', 'json', final]).stdout);
assert(metadata.format.tags.comment.includes('founder-reported'));
assert(!metadata.format.tags.comment.includes('pending'));
for (const time of [90.5, 93, 95.3]) run(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-y', '-ss', String(time), '-i', final, '-frames:v', '1', path.join(out, `review/outro-${time}.png`)]);
const result = { finalSha256: await sha(final), bytes: (await fs.stat(final)).size, duration: +metadata.format.duration,
  originalR5Unchanged: true, first90SecondsDecodedPictureIdentical: prefix, firstElevenVoiceFilesAndWordTimingsIdentical: true,
  originalScoreSha256: (await json(path.join(out, 'receipt.json'))).scoreSha256,
  first90AudioQualification: 'Original score and eleven speech cues reused; final audio track remastered for the new ending, not asserted bit-identical',
  changedSpeech: b.lines[11], freshSourceIdentityUnchanged: true, newCursorRecording: false, founderReportedClaim: true,
  privacy: 'No new screen capture, account/auth pages, or personal data added. Final editorial disclosure uses generic local speech; unchanged source footage remains from reviewed r5.',
};
await fs.writeFile(path.join(out, 'update-qa.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ sha256: result.finalSha256, bytes: result.bytes, duration: result.duration, prefixIdentical: true, unchangedSpeechCues: 11 }));
