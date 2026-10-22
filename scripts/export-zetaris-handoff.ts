import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { importHandoff } from '../server/handoff.ts';

// Local preparation only. This never opens a provider, uploads or executes SQL.
const root = fileURLToPath(new URL('..', import.meta.url));
const inputs = process.argv.slice(2);
if (!inputs.length || inputs.length > 2 || inputs.some(value => !path.isAbsolute(value))) {
  throw new Error('Pass one or two absolute paths to actual handoff packet JSON files.');
}
const rows: { capturedAt: string; encoded: string; sha256: string; commit: string }[] = [];
for (const file of inputs) {
  if ((await fs.stat(file)).size > 16_384) throw new Error('Packet exceeds the 16 KiB input limit.');
  const raw = await fs.readFile(file);
  const packet = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(raw));
  const validated = importHandoff(packet, Date.now());
  if (packet.provenance !== 'local-observation') throw new Error('Only explicitly declared local observations may enter this actual-source export.');
  const bytes = Buffer.from(JSON.stringify(packet));
  if (bytes.length > 16_384) throw new Error('Canonical packet exceeds the 16 KiB limit.');
  const capturedAt = packet.revisions.find((revision: { id: string }) => revision.id === packet.currentRevisionRef).observedAt;
  if (rows.some(row => row.capturedAt === capturedAt)) throw new Error('Distinct observation times are required for deterministic latest-row selection.');
  rows.push({ capturedAt, encoded: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex'), commit: validated.handoff!.currentCommit });
}
rows.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
const directory = path.join(root, '.local', 'zetaris-source', new Date().toISOString().replace(/[^0-9TZ]/g, ''));
await fs.mkdir(directory, { recursive: true });
const csv = 'captured_at,packet_base64\n' + rows.map(row => row.capturedAt + ',' + row.encoded).join('\n') + '\n';
const csvPath = path.join(directory, 'handoffs.csv');
await fs.writeFile(csvPath, csv, { flag: 'wx' });
const manifest = { format: 'qarinah.zetaris-source.v1', createdAt: new Date().toISOString(), rows: rows.map(({ encoded: _, ...row }) => row), csvSha256: createHash('sha256').update(csv).digest('hex'), csvBytes: Buffer.byteLength(csv), notes: ['Local preparation only; no Zetaris query or upload has occurred.', 'Base64 is plain-text encoding, adds approximately one third to size, and provides no confidentiality.', 'Original observations and timestamps are preserved. Caller-declared observations are not independently authenticated CI.', 'Review packet detail text before copying this source into any shared runtime.'] };
await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ csv: csvPath, ...manifest }));
