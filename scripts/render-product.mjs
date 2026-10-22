import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert(process.argv[2], 'Pass the .local/video/<capture> directory.');
const directory = path.resolve(root, process.argv[2]);
assert(directory.startsWith(path.join(root, '.local/video') + path.sep), 'Only this project video output is accepted.');
const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
assert(!manifest.probe && !manifest.failure && !manifest.blocked.length && !manifest.pageErrors.length);
assert.equal(manifest.events.length, 9);
const begin = manifest.events[0].start, end = manifest.events.at(-1).end;
assert(end - begin >= 90 && end - begin <= 120, 'Expected 90–120 seconds of actual product footage.');
const time = seconds => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3_600_000)).padStart(2, '0')}:${String(Math.floor(ms / 60_000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const assTime = seconds => time(seconds).replace(/^0/, '').replace(',', '.').slice(0, -1);
const wrap = text => {
  const lines = [''];
  for (const word of text.split(' ')) {
    if ((lines.at(-1) + ' ' + word).trim().length > 100) lines.push(word);
    else lines[lines.length - 1] = (lines.at(-1) + ' ' + word).trim();
  }
  assert(lines.length <= 2, 'Captions must fit the dedicated footer.');
  return lines.join('\\N');
};
const label = event => event.id.includes('synthetic') ? 'SYNTHETIC REPLAY · INVENTED OBSERVATIONS' : event.id === '09-limits' ? 'LOCAL PROTOTYPE · SPONSOR EVIDENCE PENDING' : 'REAL LOCAL OBSERVATIONS · NO PROVIDER CALL';
const srt = manifest.events.map((event, i) => `${i + 1}\n${time(event.start - begin)} --> ${time(event.end - begin)}\n${label(event)}\n${event.caption}\n`).join('\n');
await fs.writeFile(path.join(directory, 'captions.srt'), srt);
const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Segoe UI,27,&H00FFFFFF,&H00FFFFFF,&H000E2D25,&H000E2D25,0,0,0,0,100,100,0,0,1,0,0,2,80,80,8,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` + manifest.events.map(event => `Dialogue: 0,${assTime(event.start - begin)},${assTime(event.end - begin)},Caption,,0,0,0,,{\\fs16\\c&H00C2DECA&}${label(event)}\\N{\\fs27\\c&H00FFFFFF&}${wrap(event.caption)}`).join('\n') + '\n';
await fs.writeFile(path.join(directory, 'captions.ass'), ass);

function run(binary, args) {
  const result = spawnSync(binary, args, { cwd: directory, encoding: 'utf8', maxBuffer: 2_000_000 });
  if (result.status !== 0) throw new Error(`${binary} failed: ${result.stderr.slice(-2000)}`);
  return result;
}
// Eased crops of recorded picture only; never transform the separate caption footer.
const motion = [
  { id: '03-real-review', amount: 0.06 },
  { id: '04-citation', amount: 0.08 },
].map(item => ({ ...item, event: manifest.events.find(event => event.id === item.id) }));
let zoom = '1';
for (const { event, amount } of motion.toReversed()) {
  const first = Math.round((event.start - begin) * 30), last = Math.round((event.end - begin) * 30);
  zoom = `if(between(on,${first},${last}),1+${amount}*pow(sin(PI*(on-${first})/${last - first}),2),${zoom})`;
}
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-ss', String(begin), '-i', 'raw.webm', '-t', String(end - begin),
  '-vf', `fps=30,zoompan=z='${zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1760x990:fps=30,pad=1920:1080:80:0:color=0x0E2D25,subtitles=captions.ass`,
  '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'qarinah-product-draft.mp4']);
const metadata = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration,size', '-of', 'json', 'qarinah-product-draft.mp4']).stdout);
const decode = run('ffmpeg', ['-hide_banner', '-v', 'error', '-i', 'qarinah-product-draft.mp4', '-f', 'null', '-']);
const black = run('ffmpeg', ['-hide_banner', '-i', 'qarinah-product-draft.mp4', '-vf', 'blackdetect=d=0.25:pix_th=0.1:pic_th=0.98', '-an', '-f', 'null', '-']);
const intervals = black.stderr.split(/\r?\n/).filter(line => line.includes('black_start:'));
assert.equal(intervals.length, 0, 'Black interval detected.');
await fs.mkdir(path.join(directory, 'keyframes'), { recursive: true });
for (const event of manifest.events) {
  const at = Math.max(0, event.end - begin - 1.5);
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(at), '-i', 'qarinah-product-draft.mp4', '-frames:v', '1', path.join('keyframes', event.id + '.png')]);
}
for (const { id, event } of motion) {
  const at = (event.start + event.end) / 2 - begin;
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(at), '-i', 'qarinah-product-draft.mp4', '-frames:v', '1', path.join('keyframes', id + '-motion-peak.png')]);
}
const output = await fs.readFile(path.join(directory, 'qarinah-product-draft.mp4'));
const validation = { generatedAt: new Date().toISOString(), metadata,
  sha256: createHash('sha256').update(output).digest('hex'), fullFrameDecodeErrors: decode.stderr.trim() || null,
  blackIntervals: intervals, captureAssertions: ['real ready with four citations', 'zero provider attempts', 'synthetic failed tests hold', 'synthetic missing build abstains', 'H-MEM audit inspected', 'localhost-only requests, no page errors'],
  trimStartSeconds: begin, picture: 'Only real browser recording, with 6% and 8% eased centered crops on real result/citation beats, then wide. Separate caption footer. No UI reconstruction or synthetic cursor.',
  editorialMotion: motion.map(({ id, event, amount }) => ({ id, maximumZoom: 1 + amount, start: event.start - begin, end: event.end - begin })),
  visualReview: 'Representative keyframes require human/model inspection; this automated report does not claim manual review of all frames.' };
await fs.writeFile(path.join(directory, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify({ output: path.join(directory, 'qarinah-product-draft.mp4'), validation: path.join(directory, 'validation.json'), duration: metadata.format.duration, bytes: metadata.format.size }));
