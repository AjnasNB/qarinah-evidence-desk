import { createHash, randomUUID } from 'node:crypto';
import { DeskError, LIMITS, type DemoCase, type EvidenceRecord, type Metrics, type Snapshot } from './types.ts';

export const utf8 = (value: string) => Buffer.byteLength(value, 'utf8');
export const jsonBytes = (value: unknown) => utf8(JSON.stringify(value));
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function record(input: Omit<EvidenceRecord, 'id' | 'hash'>): EvidenceRecord {
  if (!input.sourceId || !input.content || utf8(input.content) > LIMITS.sourceContentBytes || !Number.isFinite(Date.parse(input.observedAt))) throw new DeskError(502, 'SOURCE_SHAPE', 'A source record is missing, oversized, or incomplete.');
  const hash = digest(input);
  return { ...input, id: 'ev-' + hash.slice(0, 24), hash };
}
export function snapshot(mode: Snapshot['mode'], sources: EvidenceRecord[], now: number, extra: Partial<Snapshot> = {}): Snapshot {
  if (sources.length > LIMITS.sourceRecords) throw new DeskError(502, 'SOURCE_LIMIT', 'The source result exceeds the supported record bound.');
  return { id: randomUUID(), mode, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + LIMITS.snapshotAgeMs).toISOString(), sources, memoryCount: 0, sourceResponseBytes: jsonBytes(sources), warnings: [], ...extra };
}
export function demo(caseName: DemoCase, now: number): Snapshot {
  const observedAt = new Date(now).toISOString();
  const sources: EvidenceRecord[] = [];
  const add = (sourceId: string, subject: string, factKey: string, value: string, content: string) => sources.push(record({ sourceId: 'synthetic:' + sourceId, subject, factKey, value, content, title: sourceId.replaceAll('-', ' '), observedAt }));
  if (caseName !== 'missing') add('atlas-support-guide', 'atlas', 'upload_limit_mb', '25', 'Atlas standard-plan upload limit is 25 MB. This invented support guide is synthetic demo evidence.');
  if (caseName === 'conflict') add('atlas-release-note', 'atlas', 'upload_limit_mb', '50', 'Atlas standard-plan upload limit is 50 MB. This invented release note conflicts with the synthetic support guide.');
  add('atlas-retention-policy', 'atlas', 'retention_days', '30', 'Atlas standard-plan data retention is 30 days. This is synthetic demo evidence.');
  add('atlas-response-policy', 'atlas', 'support_response_hours', '24', 'Atlas standard-plan support response target is 24 hours. This is a target, not a guarantee, in invented demo evidence.');
  add('beacon-upload-guide', 'beacon', 'upload_limit_mb', '100', 'Beacon upload limit is 100 MB. Beacon is a different invented product; do not transfer this limit to Atlas.');
  for (let i = 1; i <= 8; i++) add('unrelated-archive-' + i, 'archive-' + i, 'archive_note', String(i), `Synthetic archive ${i}: ` + 'Historical design discussion about unrelated colors, calendar layouts and delivery checklists. '.repeat(10));
  return snapshot('synthetic', sources, now, { case: caseName, warnings: ['Local synthetic fixture. No Zetaris query or model request was performed to load it.'] });
}
export const emptyMetrics = (sourceResponseBytes = 0, sourceCalls = 0): Metrics => ({ availableEvidenceBytes: 0, selectedEvidenceBytes: 0, memoryContextBytes: 0, instructionBytes: 0, questionBytes: 0, selectionOverheadBytes: 0, promptBytes: 0, fullContextPromptBytes: 0, requestBytes: 0, fullContextRequestBytes: 0, toolDefinitionsBytes: 0, sourceResponseBytes, sourceCalls, providerAttempts: 0, providerUsage: null, elapsedMs: 0 });
