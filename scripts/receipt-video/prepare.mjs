import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const job = path.resolve(root, process.argv[2] || '');
assert(job.startsWith(path.join(root, 'showtime-out') + path.sep));
const latest = JSON.parse(await fs.readFile(path.join(root, '.local/receipt-demo/latest.json'), 'utf8'));
assert(path.resolve(latest.out).startsWith(path.join(root, '.local/receipt-demo') + path.sep));
const capture = JSON.parse(await fs.readFile(path.join(latest.out, 'recording.json'), 'utf8'));
assert.equal(capture.providerCalls, 0); assert.equal(capture.mobileOverflow, false);
assert.deepEqual(capture.pageErrors, []); assert.deepEqual(capture.blocked, []);
const timeline = JSON.parse(await fs.readFile(path.join(job, 'voice/timeline.json'), 'utf8'));
const bounds = [6, 18, 30, 44, 52];
timeline.lines.forEach((line, i) => assert(line.end < bounds[i], 'Narration crosses its demonstrated shot'));
const prior = path.join(root, '.local/video/r6-entry/qarinah-evidence-r6.mp4');
const sha = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
assert.equal(await sha(prior), 'c0bb774c0fe42d50e774a0d12962005d7d5d01b496bcb65be14e2949b7f0dcc8', 'Submitted film must remain unchanged');
await fs.mkdir(path.join(job, 'edit'), { recursive: true });
await fs.mkdir(path.join(job, 'assets'), { recursive: true });
const score = path.join(job, 'assets/original-score.wav');
await fs.copyFile(path.join(root, '.local/video/r3-20261022/revision-2/assets/original-score-master.wav'), score);
await fs.writeFile(score + '.license.json', JSON.stringify({ source: 'project-original', title: 'Qarinah original 120 BPM score', author: 'Qarinah Evidence Desk project', license: 'generated', attribution_required: false, credit: 'Original local composition, reused from the preserved R3 project score.', sha256: await sha(score) }, null, 2));
const rawFile = path.join(latest.out, 'receipt-workflow.webm');
const rawDuration = Number(JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', rawFile], { encoding: 'utf8', windowsHide: true })).format.duration);
assert(rawDuration >= 51.5, 'Recording does not cover the full demonstrated flow');
const rangeEnd = Math.min(52, rawDuration), hold = +(52 - rangeEnd).toFixed(3);
const addon = {
  sources: { recording: rawFile },
  ranges: [{ source: 'recording', start: 0, end: rangeEnd, hold, mute: true }],
  output: { aspect: '1080p', fps: 30, fit: 'contain' }, grade: 'none',
  subtitles: path.join(job, 'voice/vo.srt'),
  audio: { music: { file: score, gain_db: -2, fade_in: 0.3, fade_out: 0.8, loop: true }, tracks: [{ kind: 'voice', id: 'receipt-narration', file: path.join(job, 'voice/vo.wav'), start: 0 }] },
  loudness: { lufs: -14, tp: -1.5 },
};
await fs.writeFile(path.join(job, 'edit/edl.json'), JSON.stringify(addon, null, 2));
const full = {
  sources: { submitted: prior, upgrade: path.join(job, 'receipt-proof.mp4') },
  ranges: [{ source: 'submitted', start: 0, end: 90 }, { source: 'upgrade', start: 0, end: 52 }, { source: 'submitted', start: 90, end: 96 }],
  output: { aspect: '1080p', fps: 30, fit: 'contain' }, grade: 'none', loudness: { lufs: -14, tp: -1.5 },
};
await fs.writeFile(path.join(job, 'edit/full-edl.json'), JSON.stringify(full, null, 2));
await fs.writeFile(path.join(job, 'source-manifest.json'), JSON.stringify({ recordedCommit: capture.sourceCommit, rawFootageSha256: await sha(addon.sources.recording), rawDuration, finalFrameHoldSeconds: hold, originalR6Sha256: await sha(prior), originalR6Preserved: true, supplementalSeconds: 52, fullSeconds: 148, sourceKinds: capture.shots, voice: 'Kokoro af_heart (Apache-2.0)', music: 'Existing original 120 BPM score', reviewScope: 'Local proposed update; no submission or upload', humanListeningReview: false }, null, 2));
console.log(JSON.stringify({ job, raw: addon.sources.recording, recordedCommit: capture.sourceCommit, supplementalSeconds: 52, fullSeconds: 148 }));
