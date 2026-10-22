import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r4-narrated');
const receipt = JSON.parse(await fs.readFile(path.join(out, 'receipt.json'), 'utf8'));
const source = path.join(root, receipt.source), final = path.join(root, receipt.final);
const ffmpeg = process.env.FFMPEG || 'ffmpeg', ffprobe = process.env.FFPROBE || 'ffprobe';
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 12e6 });
  assert.equal(r.status, 0, `${cmd}: ${r.stderr?.slice(-2000) || r.error?.message}`);
  return r;
};
const metadata = JSON.parse(run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', final]).stdout);
const video = metadata.streams.find(s => s.codec_type === 'video'), audio = metadata.streams.find(s => s.codec_type === 'audio');
assert.equal(+metadata.format.duration, 96); assert.equal(+video.nb_read_frames, 2880);
assert.equal(video.width, 1920); assert.equal(video.height, 1080); assert.equal(video.avg_frame_rate, '30/1');
for (const k of ['color_space', 'color_transfer', 'color_primaries']) assert.equal(video[k], 'bt709');
assert.equal(audio.sample_rate, '48000'); assert.equal(audio.channels, 2);
const decodedHash = file => run(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:v:0', '-an', '-f', 'hash', '-hash', 'sha256', '-']).stdout.trim();
const hashes = { source: decodedHash(source), final: decodedHash(final) };
assert.equal(hashes.source, hashes.final, 'Decoded picture changed');
const audioQA = run(ffmpeg, ['-hide_banner', '-nostdin', '-i', final, '-vn', '-af',
  'loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-']).stderr;
await fs.writeFile(path.join(out, 'audio-qa.log'), audioQA);
const loudness = JSON.parse(audioQA.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] || '{}');
assert(Math.abs(+loudness.input_i + 14) <= .6, 'Final loudness outside tolerance');
assert(+loudness.input_tp <= -1, 'Final true peak exceeds -1dBTP');
const decode = run(ffmpeg, ['-v', 'error', '-i', final, '-f', 'null', '-']);
assert(!decode.stderr.trim(), 'Final frame/audio decode reported errors');
const timeline = JSON.parse(await fs.readFile(path.join(out, 'voice/timeline.json'), 'utf8'));
const words = timeline.words;
assert(words.length > 150); assert(Math.max(...words.map(w => w.end)) < 95.5);
assert(words.every(w => w.start >= 0 && w.end > w.start && w.end <= 96));
const srt = await fs.readFile(path.join(out, 'qarinah-evidence-r4-narrated.srt'), 'utf8');
const srtWords = srt.replace(/^\d+\r?$/gm, '').replace(/^.*-->.*$/gm, '').replace(/\s+/g, ' ').trim();
assert.equal(srtWords, timeline.lines.map(l => l.text).join(' '), 'Speech captions differ from script');
const qa = { duration: 96, decodedVideoFrames: +video.nb_read_frames, decodedVideoHash: hashes,
  pictureIdentical: true, fullFrameAndAudioDecodeErrors: 0, color: 'BT.709 / BT.709 / BT.709',
  audio: { integratedLufs: +loudness.input_i, truePeakDbtp: +loudness.input_tp, loudnessRange: +loudness.input_lra,
    sampleRate: audio.sample_rate, channels: audio.channels },
  speechWords: words.length, lastWordEnd: Math.max(...words.map(w => w.end)), captionsMatchScript: true,
  minimumCueTailClearance: Math.min(...receipt.cues.map(c => c.tailClearance)),
  minimumSpokenWordClearance: Math.min(...timeline.lines.map((l, i) => receipt.cues[i].nextBoundary - l.speech_end)),
  limits: ['No subjective listening is claimed by this automated check', 'Whisper is an independent ASR check, not human listening'] };
await fs.writeFile(path.join(out, 'qa.json'), JSON.stringify(qa, null, 2) + '\n');
console.log(JSON.stringify(qa, null, 2));
