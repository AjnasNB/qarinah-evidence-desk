import fs from 'node:fs';
import { createHash } from 'node:crypto';

const base = new URL('../vendor/meterless-hmem/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('UPSTREAM.json', base), 'utf8'));
for (const [file, expected] of Object.entries(manifest.gitBlobSha1)) {
  if (!/^[A-Za-z]+\.ts$/.test(file)) throw new Error('Unexpected manifest path');
  const content = fs.readFileSync(new URL(`src/${file}`, base));
  const actual = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
  if (actual !== expected) throw new Error(`Vendor mismatch: ${file}`);
}
console.log(`Verified ${Object.keys(manifest.gitBlobSha1).length} pinned Meterless source blobs at ${manifest.commit}`);
