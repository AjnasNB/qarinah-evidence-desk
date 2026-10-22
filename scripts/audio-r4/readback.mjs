import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r4-narrated');
const timeline = JSON.parse(await fs.readFile(path.join(out, 'voice/timeline.json'), 'utf8'));
const files = ['voice/whisper-readback.json', 'mix-whisper-readback.json', 'intro-mix-whisper-readback.json'];
const asr = await Promise.all(files.map(async file => JSON.parse(await fs.readFile(path.join(out, file), 'utf8'))));
// Explicit equivalences preserve the original transcripts, rather than concealing ASR differences.
const normalize = text => text.toLowerCase().replace(/\btime stamp\b/g, 'timestamp')
  .replace(/\b(carina|karina)\b/g, 'qarinah').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const expected = normalize(timeline.lines.map(l => l.text).join(' '));
assert.equal(normalize(asr[0].text), expected, 'Dry ASR has an unexpected speech difference');
assert.equal(normalize(asr[2].text + ' ' + asr[1].text), expected, 'Mixed ASR has an unexpected speech difference');
const audit = { checked: true, engine: 'installed faster-whisper small.en', dryStemMatches: true,
  mixPlusSeparateIntroMatches: true, files,
  aliases: ['Carina/Karina -> Qarinah (phonetic respelling)', 'time stamp -> timestamp'],
  qualification: 'Full-mix VAD omitted the intro. A separate 0-6s no-VAD decode recovered it. No human listening or pronunciation approval is claimed.' };
await fs.writeFile(path.join(out, 'readback-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit, null, 2));
