import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r5-repair');
const timeline = JSON.parse(await fs.readFile(path.join(out, 'voice/timeline.json'), 'utf8'));
function balanced(words) {
  const text = words.map(w => w.text).join(' '); if (text.length <= 32) return text;
  const choices = [];
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).map(w => w.text).join(' '), b = words.slice(i).map(w => w.text).join(' ');
    if (a.length <= 32 && b.length <= 32) choices.push({ text: a + '\n' + b, cost: Math.abs(a.length - b.length) });
  }
  return choices.sort((a, b) => a.cost - b.cost)[0]?.text;
}
const cues = [];
for (const line of timeline.lines) {
  const words = line.words, dp = Array(words.length + 1).fill(null); dp[words.length] = { cost: 0, cues: [] };
  for (let i = words.length - 1; i >= 0; i--) for (let j = i + 1; j <= Math.min(words.length, i + 8); j++) {
    if (!dp[j]) continue;
    const selected = words.slice(i, j), text = balanced(selected), seconds = words[j - 1].end - words[i].start;
    const chars = selected.map(w => w.text).join(' ').length, cps = chars / seconds;
    if (!text || seconds < .7 || seconds > 5.5 || cps > 20) continue;
    const cost = dp[j].cost + 10 + Math.abs(selected.length - 6) * .2;
    if (!dp[i] || cost < dp[i].cost) dp[i] = { cost, cues: [{ start: words[i].start, end: words[j - 1].end, text }, ...dp[j].cues] };
  }
  assert(dp[0], `Cannot create readable exact-word captions for ${line.id}`); cues.push(...dp[0].cues);
}
const time = seconds => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3_600_000)).padStart(2, '0')}:${String(Math.floor(ms / 60_000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const file = path.join(out, 'qarinah-evidence-r5.srt');
await fs.writeFile(file, cues.map((cue, i) => `${i + 1}\n${time(cue.start)} --> ${time(cue.end)}\n${cue.text}\n`).join('\n'));
const written = (await fs.readFile(file, 'utf8')).replace(/^\d+\r?$/gm, '').replace(/^.*-->.*$/gm, '').replace(/\s+/g, ' ').trim();
assert.equal(written, timeline.lines.map(line => line.text).join(' '), 'Caption output differs from actual speech text');
const summary = { cues: cues.length, minimumSeconds: Math.min(...cues.map(c => c.end - c.start)),
  maximumCharactersPerLine: Math.max(...cues.flatMap(c => c.text.split('\n').map(s => s.length))),
  maximumCharactersPerSecond: Math.max(...cues.map(c => c.text.replace('\n', ' ').length / (c.end - c.start))),
  exactModelWordBoundaries: true, exactSpeechText: true, speechUnchanged: true, videoUnchanged: true };
await fs.writeFile(path.join(out, 'caption-qa.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
