import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r6-entry');
const read = async name => JSON.parse(await fs.readFile(path.join(out, name), 'utf8'));
const asr = await read('outro-readback.json'), voice = await read('voice/timeline.json');
const expected = voice.lines.at(-1).text;
const normalize = text => text.toLowerCase().replace(/found or reported/g, 'founder reported').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
assert.equal(normalize(asr.text), normalize(expected), 'Outro ASR differs beyond the documented phonetic spacing');
assert.equal(asr.engine, 'faster-whisper'); assert.equal(asr.model, 'small.en');
const result = { engine: 'Existing installed faster-whisper small.en', window: [90, 96],
  expected, rawAsrText: asr.text, rawAsrUnmodified: true, directVerbatimMatch: asr.text === expected,
  matchesAfterDocumentedPhoneticSpacing: true, aliases: ['found or reported -> founder-reported'],
  lastModelWordEnd: voice.lines.at(-1).speech_end,
  qualification: 'Bounded encoded outro only. ASR phonetic word splitting is disclosed; this is not exact-spelling, pronunciation approval or subjective human listening. First eleven source voice files and word timings are checked separately against reviewed r5.' };
await fs.writeFile(path.join(out, 'readback-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
