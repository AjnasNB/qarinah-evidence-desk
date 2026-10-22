import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const job = path.resolve(root, process.argv[2] || '');
assert(job.startsWith(path.join(root, 'showtime-out') + path.sep));
const addon = path.join(job, 'receipt-proof-reviewed.mp4');
const camera = JSON.parse(await fs.readFile(path.join(job, 'camera-treatment.json'), 'utf8'));
const voice = JSON.parse(await fs.readFile(path.join(job, 'closing-voice/timeline.json'), 'utf8'));
assert(voice.lines.at(-1).end < 5.8, 'Closing narration needs room to finish');
const closing = {
  sources: { receipt: path.join(job, 'camera-footage.mp4') },
  ranges: [{ source: 'receipt', start: camera.derivativeDuration - 6, end: camera.derivativeDuration, mute: true }],
  output: { aspect: '1080p', fps: 30, fit: 'contain' }, grade: 'none',
  subtitles: path.join(job, 'closing-voice/vo.srt'),
  audio: {
    music: { file: path.join(job, 'assets/original-score.wav'), gain_db: -2, fade_in: 0.1, fade_out: 1.2 },
    tracks: [{ kind: 'voice', id: 'receipt-closing', file: path.join(job, 'closing-voice/vo.wav'), start: 0 }],
  }, loudness: { lufs: -14, tp: -1.5 },
};
await fs.writeFile(path.join(job, 'edit/closing-edl.json'), JSON.stringify(closing, null, 2));
const full = {
  sources: { original: path.join(job, 'repaired-source-90.mp4'), receipt: addon, closing: path.join(job, 'closing-reviewed-v2.mp4') },
  ranges: [{ source: 'original', start: 0, end: 90 }, { source: 'receipt', start: 0, end: 52 }, { source: 'closing', start: 0, end: 6 }],
  output: { aspect: '1080p', fps: 30, fit: 'contain' }, grade: 'none', loudness: { lufs: -14, tp: -1.5 },
};
await fs.writeFile(path.join(job, 'edit/reviewed-edl.json'), JSON.stringify(full, null, 2));
const seconds = stamp => stamp.split(':').reduce((total, part) => total * 60 + Number(part.replace(',', '.')), 0);
const parse = text => text.trim().split(/\r?\n\r?\n/).map(block => {
  const [, timing, ...lines] = block.split(/\r?\n/);
  const [start, end] = timing.split(' --> ').map(seconds);
  return { start, end, text: lines.join('\n') };
});
const stamp = n => new Date(Math.round(n * 1000)).toISOString().slice(11, 23).replace('.', ',');
const prior = parse(await fs.readFile(path.join(root, '.local/video/r6-entry/qarinah-evidence-r6.srt'), 'utf8')).filter(cue => cue.end <= 90);
const receipt = parse(await fs.readFile(path.join(job, 'voice/vo.srt'), 'utf8')).map(cue => ({ ...cue, start: cue.start + 90, end: cue.end + 90 }));
const ending = parse(await fs.readFile(path.join(job, 'closing-voice/vo.srt'), 'utf8')).map(cue => ({ ...cue, start: cue.start + 142, end: cue.end + 142 }));
const cues = [...prior, ...receipt, ...ending];
assert(cues.at(-1).end < 148);
await fs.writeFile(path.join(job, 'final-r7-reviewed.srt'), cues.map((cue, i) => `${i + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join('\n'));
console.log(JSON.stringify({ fullSeconds: 148, captions: cues.length, lastCaptionEnd: cues.at(-1).end }));
