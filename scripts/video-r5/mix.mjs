import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r5-repair');
const source = path.join(root, '.local/video/r5-repair/r5-picture.mp4');
const score = path.join(root, '.local/video/r3-20261022/revision-2/assets/original-score-master.wav');
const voice = path.join(out, 'voice/vo.wav');
const timeline = JSON.parse(await fs.readFile(path.join(out, 'voice/timeline.json'), 'utf8'));
const plan = JSON.parse(await fs.readFile(path.join(out, 'edl.json'), 'utf8'));
const script = JSON.parse(await fs.readFile(path.join(root, 'scripts/video-r5/narration.json'), 'utf8'));
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const final = path.join(out, 'qarinah-evidence-r5.mp4');
const pictureReceipt = JSON.parse(await fs.readFile(path.join(out, 'picture-receipt.json'), 'utf8'));
const expectedSourceHash = pictureReceipt.sha256;
const hash = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const run = args => {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 8e6 });
  if (r.status !== 0) throw new Error(`FFmpeg failed: ${r.stderr?.slice(-2500) || r.error?.message}`);
  return r.stderr;
};
await fs.mkdir(out, { recursive: true });
assert.equal(await hash(path.join(out, 'edl.json')), pictureReceipt.edlSha256, 'EDL changed after picture render');
assert.equal(await hash(source), expectedSourceHash, 'Source changed; review the new picture before narrating it');
assert.equal(timeline.lines.length, script.lines.length);
const bounds = [6, 12.2, 18, 30, 35.8, 44, 50.6, 58, 66, 78, 90, 95.5];
const cueReceipt = timeline.lines.map((line, i) => {
  assert.equal(line.text, script.lines[i].text, `Stale speech: ${line.id}`);
  assert.equal(line.start, script.lines[i].at, `Pinned cue moved: ${line.id}`);
  assert(line.end <= bounds[i] - 0.04, `Speech tail exceeds slot: ${line.id}`);
  assert(line.words.every(w => w.start >= line.start && w.end <= line.end), `Invalid word timing: ${line.id}`);
  return { id: line.id, start: line.start, end: line.end, speechEnd: line.speech_end,
    nextBoundary: bounds[i], tailClearance: +(bounds[i] - line.end).toFixed(3),
    speechClearance: +(bounds[i] - line.speech_end).toFixed(3), speed: line.speed };
});

// The beat remains continuous. A 200ms attack and 300ms recovery avoid hard gain jumps.
// Baseline -3dB; another -10dB while speech is active. The source score was -18 LUFS.
const envelopes = timeline.lines.map(l => {
  const s = Math.max(0, l.speech_start - 0.06), e = l.speech_end + 0.15;
  return `if(lt(t,${s - .2}),1,if(lt(t,${s}),1-0.683772*(t-${s - .2})/0.2,if(lt(t,${e}),0.316228,if(lt(t,${e + .3}),0.316228+0.683772*(t-${e})/0.3,1))))`;
});
const gain = `0.707946*${envelopes.reduce((a, e) => `min(${a},${e})`, '1')}`;
const base = `[1:a]apad,atrim=duration=96,aresample=48000[v];[2:a]atrim=duration=96,volume='${gain}':eval=frame[m];[v][m]amix=inputs=2:duration=longest:normalize=0,atrim=duration=96[mix]`;
const filterFile = path.join(out, 'mix-filter.txt');
await fs.writeFile(filterFile, `${base};[mix]loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json[norm]`);
const inputs = ['-i', source, '-i', voice, '-i', score];
const pass1 = run([...inputs, '-filter_complex_script', filterFile, '-map', '[norm]', '-f', 'null', '-']);
await fs.writeFile(path.join(out, 'loudnorm-pass1.log'), pass1);
const measured = JSON.parse(pass1.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] || '{}');
for (const k of ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']) assert(Number.isFinite(+measured[k]), `Missing loudness measure ${k}`);
const norm = `loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=json`;
await fs.writeFile(filterFile, `${base};[mix]${norm},aresample=48000[norm]`);
const renderLog = run(['-y', ...inputs, '-filter_complex_script', filterFile, '-map', '0:v:0', '-map', '[norm]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '48000', '-t', '96',
  '-metadata', 'title=Qarinah Evidence Desk — narrated repair workflow',
  '-metadata', `comment=Generic synthetic Kokoro af_heart narration. Original local score. ${plan.live ? 'Separate verified Zetaris source clip; Cursor evidence pending.' : 'Live sponsor evidence pending.'}`,
  '-movflags', '+faststart', final]);
await fs.writeFile(path.join(out, 'render.log'), renderLog);
await import('./captions.mjs');
await fs.writeFile(path.join(out, 'transcript.txt'), timeline.lines.map(l => l.text).join('\n\n') + '\n');
const receipt = { version: 1, duration: 96, source: path.relative(root, source), sourceSha256: expectedSourceHash,
  final: path.relative(root, final), finalSha256: await hash(final), voice: 'Kokoro af_heart', speed: 1,
  engine: 'local Kokoro-82M v1.0 timestamped fp16', noDownload: true, noHostedInference: true,
  scoreSha256: await hash(score), narrationSha256: await hash(voice), scriptSha256: await hash(path.join(root, 'scripts/video-r5/narration.json')),
  cues: cueReceipt, mix: { musicBaselineDb: -3, speechDuckingDb: -10, attackSeconds: .2, recoverySeconds: .3,
    targetLufs: -14, preEncodeTruePeakTarget: -1.5 },
  liveVerification: plan.live ?? null,
  limits: [`Actual old-to-fresh local repair journey at clean${plan.fresh.commit.slice(0, 7)}`, 'Synthetic replay remains labeled', ...plan.limits,
    'Word times are model-derived, not human listening', 'Built-in Parakeet readback unavailable; separate installed Whisper audit recorded if present'] };
await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ final, sha256: receipt.finalSha256, cues: cueReceipt }, null, 2));
