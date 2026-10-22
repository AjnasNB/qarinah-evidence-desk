import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const job = path.resolve(root, process.argv[2] || '');
assert(job.startsWith(path.join(root, 'showtime-out') + path.sep));
const source = path.join(job, 'final-r7-reviewed.mp4');
assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), 'd7cb863f3974b6d3fe8119e80c85dd7f20ece039ddb29d76dc32b9d701cb5a61');
const time = seconds => {
  const centiseconds = Math.round(seconds * 100);
  return `${Math.floor(centiseconds / 360000)}:${String(Math.floor(centiseconds / 6000) % 60).padStart(2, '0')}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
};
const events = [];
const event = (start, end, layer, text) => events.push(`Dialogue: ${layer},${time(start)},${time(end)},Default,,0,0,0,,${text}`);
const text = (start, end, value, x, y, size, bold = false, color = 'FFFFFF') => event(start, end, 1, `{\\an7\\pos(${x},${y})\\fs${size}\\b${bold ? 1 : 0}\\c&H${color}&}${value}`);
const panel = (start, end, x, y, width, height) => event(start, end, 0, `{\\an7\\pos(${x},${y})\\p1\\bord0\\shad0\\c&H18210B&}m 0 0 l ${width} 0 l ${width} ${height} l 0 ${height}`);
panel(0, 6, 0, 925, 1920, 155);
text(0, 6, 'Release claims need receipts.', 60, 930, 96, true, 'BDDDA9');
panel(115.23, 120.83, 0, 942, 1920, 100);
text(115.23, 120.83, 'Next: test an expired receipt', 60, 958, 48, true, 'BDDDA9');
panel(142, 148, 0, 640, 1920, 440);
text(142, 148, 'Inspect the source and receipts', 60, 674, 60, true, 'BDDDA9');
text(142, 148, 'github.com/AjnasNB/qarinah-evidence-desk', 60, 755, 44);
text(142, 148, 'Cursor validation: founder-reported', 60, 831, 38, true);
text(142, 148, 'Background: synthetic expiry example. No Cursor recording.', 60, 895, 32);
const srt = await fs.readFile(path.join(job, 'final-r7-reviewed.srt'), 'utf8');
const seconds = stamp => stamp.split(':').reduce((total, part) => total * 60 + Number(part.replace(',', '.')), 0);
for (const block of srt.trim().split(/\r?\n\r?\n/)) {
  const [, timing, ...lines] = block.split(/\r?\n/);
  const [start, end] = timing.split(' --> ').map(seconds);
  // Panels replace these areas, so retain the exact original speech timing/text.
  if (end <= 6) text(start, end, lines.join(' '), 60, 1040, 30);
  if (start >= 142) text(start, end, lines.join(' '), 60, 1010, 36);
}
const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Inter,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,60,60,30,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`;
await fs.writeFile(path.join(job, 'edit/finishing.ass'), ass);
await fs.copyFile(path.join(job, 'final-r7-reviewed.srt'), path.join(job, 'final-r7-ready.srt'));
await fs.writeFile(path.join(job, 'edit/ready-edl.json'), JSON.stringify({
  sources: { reviewed: source }, ranges: [{ source: 'reviewed', start: 0, end: 148 }],
  output: { aspect: '1080p', fps: 30, fit: 'contain' }, grade: 'none',
  subtitles: path.join(job, 'edit/finishing.ass'), loudness: { lufs: -14, tp: -1.5 },
}, null, 2));
console.log(JSON.stringify({ overlays: events.length, sameAudioTimeline: true, sameDurationSeconds: 148 }));
