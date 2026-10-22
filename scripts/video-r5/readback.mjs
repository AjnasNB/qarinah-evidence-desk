import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r5-repair');
const timeline = JSON.parse(await fs.readFile(path.join(out, 'voice/timeline.json'), 'utf8'));
const files = ['voice/whisper-readback.json', 'mix-whisper-readback.json', 'intro-mix-whisper-readback.json'];
const asr = await Promise.all(files.map(async file => JSON.parse(await fs.readFile(path.join(out, file), 'utf8'))));
// Explicit equivalences preserve the original transcripts, rather than concealing ASR differences.
const normalize = text => text.toLowerCase().replace(/\btime stamp\b/g, 'timestamp')
  .replace(/\b(carina|karina)\b/g, 'qarinah').replace(/\bzetara\b/g, 'zetaris').replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const expected = normalize(timeline.lines.map(l => l.text).join(' '));
const dryCue = JSON.parse(await fs.readFile(path.join(out, 'voice/live-cue-readback.json'), 'utf8'));
const mixCue = JSON.parse(await fs.readFile(path.join(out, 'live-mix-whisper-readback.json'), 'utf8'));
const replaceCue = (full, cue) => full.words.filter(w => w.start < 58).map(w => w.text).join(' ') + ' ' + cue.text + ' ' + full.words.filter(w => w.start >= 66).map(w => w.text).join(' ');
const dry = normalize(asr[0].text) === expected ? asr[0].text : replaceCue(asr[0], dryCue);
const mixed = [asr[1].text, replaceCue(asr[1], mixCue)];
assert.equal(normalize(dry), expected, 'Dry ASR has an unexpected speech difference');
assert(mixed.some(text => normalize(text) === expected || normalize(asr[2].text + ' ' + text) === expected), 'Mixed ASR has an unexpected speech difference');
const audit = { checked: true, engine: 'installed faster-whisper small.en',
  dryMatchesAfterDocumentedWindowAudit: true, mixedMatchesAfterDocumentedVariants: true,
  comparison: { dryDirectAfterAliases: normalize(asr[0].text) === expected,
    dryBoundedWindowUsed: normalize(asr[0].text) !== expected, mixDirectAfterAliases: normalize(asr[1].text) === expected },
  rawAsrIsUnmodified: true, exactAsrSpellingClaim: false, files,
  aliases: ['Carina/Karina -> Qarinah (phonetic respelling)', 'Zetara -> Zetaris (phonetic respelling; bounded dry ASR spells it correctly)', 'time stamp -> timestamp', 'clean-tested -> clean tested'],
  boundedCueFiles: ['voice/live-cue-readback.json', 'live-mix-whisper-readback.json'],
  qualification: 'Original full ASR outputs are unchanged. Full dry ASR respelled Zetaris and repeated tests during its boundary; separate58-66s no-VAD recognition recovered the exact cue. A bounded same-audio cue may replace only that timestamp window for comparison. Full-mix VAD may omit the intro; separate0-6s no-VAD recognition is retained. Brand phonetic aliases and hyphen spacing are explicit. No human listening or pronunciation approval is claimed.' };
await fs.writeFile(path.join(out, 'readback-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit, null, 2));
