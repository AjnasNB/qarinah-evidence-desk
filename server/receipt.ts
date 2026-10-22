import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EvidenceDesk } from './desk.ts';
import { canonical, jsonBytes } from './evidence.ts';
import { importHandoff, RELEASE_QUESTION } from './handoff.ts';
import { DeskError, LIMITS, REVIEW_POLICY, type Answer, type Snapshot } from './types.ts';

export const RECEIPT_BYTES = 131_072;
const fail = (code: string, message: string): never => { throw new DeskError(400, code, message); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('RECEIPT_SHAPE', 'Use a complete exported release-review receipt.');
  return value as Record<string, unknown>;
}
function time(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) return fail('RECEIPT_TIME', 'The receipt needs valid original UTC creation, review and export times.');
  return Date.parse(value);
}
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function conclusion(value: Record<string, unknown> | Answer) {
  return { status: value.status, mode: value.mode, releaseDecision: value.releaseDecision ?? null, reason: value.reason ?? null, answer: value.answer, claims: value.claims, citations: value.citations, excluded: value.excluded, conflicts: value.conflicts };
}

/** Replay consistency, not a signature or proof that the historical source/CI ran. */
export async function verifyReceipt(input: unknown, now = Date.now()) {
  let size: number;
  try { size = jsonBytes(input); } catch { return fail('RECEIPT_SIZE', 'The receipt cannot be safely serialized within its supported bound.'); }
  if (size > RECEIPT_BYTES) return fail('RECEIPT_SIZE', 'The receipt exceeds 128 KiB.');
  const receipt = object(input);
  if (receipt.schema !== 'qarinah.evidence-desk.receipt.v2' || receipt.reviewPolicy !== REVIEW_POLICY) return fail('RECEIPT_VERSION', 'Use a v2 handoff receipt with the supported review policy. Legacy timestamps are never inferred.');
  const saved = object(receipt.snapshot), answer = object(receipt.answer);
  if (saved.mode !== 'handoff' || !saved.handoffPacket) return fail('RECEIPT_MODE', 'Only developer-handoff receipts with their validated packet can be replayed.');
  const createdAt = time(saved.createdAt), reviewedAt = time(answer.reviewedAt), exportedAt = time(receipt.exportedAt);
  if (!Number.isFinite(now) || createdAt > reviewedAt || reviewedAt > exportedAt || exportedAt > now + 60_000 || time(saved.expiresAt) !== createdAt + LIMITS.snapshotAgeMs) return fail('RECEIPT_TIME', 'Receipt times are inconsistent or too far in the future.');
  if (typeof saved.id !== 'string' || !saved.id || answer.snapshotId !== saved.id || typeof answer.question !== 'string' || answer.question.trim().toLowerCase() !== RELEASE_QUESTION.toLowerCase()) return fail('RECEIPT_BINDING', 'The answer must reference this handoff snapshot and its supported release question.');
  const regenerated = importHandoff(saved.handoffPacket, createdAt);
  if (!same(saved.handoff, regenerated.handoff) || !same(saved.sources, regenerated.sources) || !same(saved.handoffPacket, regenerated.handoffPacket)) return fail('RECEIPT_SOURCES', 'The validated packet, source records and handoff header do not agree.');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qarinah-receipt-'));
  let clock = createdAt, providerCalls = 0;
  try {
    const desk = new EvidenceDesk({ workspace: directory, dataDir: directory, distDir: path.join(directory, 'dist'), allowNemotron: false, nemotronModel: 'disabled' }, (async () => { providerCalls++; throw new Error('Offline verification cannot contact providers.'); }) as typeof fetch, () => clock);
    const loaded = await desk.importHandoff(saved.handoffPacket);
    clock = reviewedAt;
    const replay = await desk.answer({ snapshotId: loaded.snapshot.id, question: answer.question, generate: false });
    if (!same(conclusion(answer), conclusion(replay))) return fail('RECEIPT_DECISION', 'The saved decision, claims, citations or exclusions do not match an isolated replay.');
    clock = now;
    const current = await desk.answer({ snapshotId: loaded.snapshot.id, question: answer.question, generate: false });
    if (providerCalls) return fail('RECEIPT_PROVIDER', 'Offline verification unexpectedly attempted a provider call.');
    return {
      status: 'consistent' as const, reviewPolicy: REVIEW_POLICY, checkedAt: new Date(now).toISOString(),
      reviewedAt: answer.reviewedAt, exportedAt: receipt.exportedAt, sourceRecordsChecked: regenerated.sources.length,
      recorded: { status: replay.status, decision: replay.releaseDecision ?? null, reason: replay.reason },
      current: { status: current.status, decision: current.releaseDecision ?? null, reason: current.reason },
      snapshotExpiredNow: now >= createdAt + LIMITS.snapshotAgeMs,
      provenance: (regenerated as Snapshot).handoff!.provenance,
      sourceAuthentication: 'not independently authenticated', providerCalls,
      limits: [
        'Consistency reproduces a decision from supplied observations; it does not establish that CI or the historical memory lookup ran.',
        'Hashes are not signatures. A fully rewritten, internally consistent receipt can pass without a separately trusted file digest or producer signature.',
        'The current assessment uses the same saved packet, without rereading external sources. Neither result authorizes a release.',
        'Runtime flags, provider usage, latency, byte counters, historical memory IDs, repair guidance and sponsor transport metadata are not verified.',
      ],
    };
  } finally {
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('qarinah-receipt-')) throw new Error('Unexpected temporary receipt directory.');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
