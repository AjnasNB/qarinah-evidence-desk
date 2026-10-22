import { DeskError, LIMITS, type EvidenceRecord, type Snapshot } from './types.ts';
import { digest, jsonBytes, record, snapshot, utf8 } from './evidence.ts';

export const RELEASE_QUESTION = 'What is the current release decision?';
type Revision = { id: string; commit: string; dirty: boolean; observedAt: string };
type CI = { id: string; revisionRef: string; check: 'tests' | 'build'; outcome: 'passed' | 'failed' | 'cancelled' | 'unknown'; observedAt: string; detail: string; supersedes?: string[] };
type Release = { id: string; revisionRef: string; decision: 'ready' | 'hold' | 'unknown'; requiredChecks: ('tests' | 'build')[]; ciRefs: string[]; observedAt: string; detail: string; supersedes?: string[] };
export type Packet = { format: 'qarinah-handoff-v1'; provenance: 'local-observation' | 'synthetic-replay'; project: string; currentRevisionRef: string; revisions: Revision[]; ci: CI[]; releases: Release[] };
const invalid = (code: string, message: string): never => { throw new DeskError(400, code, message); };
const object = (value: unknown, keys: string[]): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) return invalid('HANDOFF_SCHEMA', 'Handoff JSON contains an unsupported object or unknown field.');
  return value as Record<string, unknown>;
};
const id = (value: unknown): string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(value) ? value : invalid('HANDOFF_ID', 'Observation identifiers must use 1–40 letters, digits, dots, underscores or hyphens.');
const timestamp = (value: unknown, now: number): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || Date.parse(value) > now + 60_000 || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)) return invalid('HANDOFF_TIME', 'Use valid UTC observation times; future observations are not accepted.');
  return new Date(value).toISOString();
};
const detail = (value: unknown): string => typeof value === 'string' && utf8(value) <= 512 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ? value : invalid('HANDOFF_DETAIL', 'Observation detail must be text of at most 512 UTF-8 bytes.');
const refs = (value: unknown, maximum: number): string[] => {
  if (!Array.isArray(value) || value.length > maximum) return invalid('HANDOFF_REFS', 'The handoff contains too many or unsupported references.');
  const result = value.map(id); if (new Set(result).size !== result.length) return invalid('HANDOFF_REFS', 'References must be unique.'); return result;
};
const list = (value: unknown, maximum: number): unknown[] => Array.isArray(value) && value.length <= maximum ? value : invalid('HANDOFF_LIMIT', 'The handoff exceeds its bounded observation count.');
function parse(input: unknown, now: number): Packet {
  if (jsonBytes(input) > LIMITS.requestBytes) return invalid('HANDOFF_SIZE', 'Handoff JSON exceeds 16 KiB.');
  const body = object(input, ['format', 'provenance', 'project', 'currentRevisionRef', 'revisions', 'ci', 'releases']);
  if (body.format !== 'qarinah-handoff-v1' || typeof body.provenance !== 'string' || !['local-observation', 'synthetic-replay'].includes(body.provenance)) return invalid('HANDOFF_FORMAT', 'Use qarinah-handoff-v1 with explicit local-observation or synthetic-replay provenance.');
  if (typeof body.project !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,59}$/.test(body.project)) return invalid('HANDOFF_PROJECT', 'Use a public-safe project slug of at most 60 characters.');
  const revisions: Revision[] = list(body.revisions, 3).map(value => {
    const item = object(value, ['id', 'commit', 'dirty', 'observedAt']);
    if (typeof item.commit !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(item.commit) || typeof item.dirty !== 'boolean') return invalid('HANDOFF_REVISION', 'Each revision requires an exact lowercase Git hash and dirty boolean.');
    return { id: id(item.id), commit: item.commit, dirty: item.dirty, observedAt: timestamp(item.observedAt, now) };
  });
  if (!revisions.length) return invalid('HANDOFF_REVISION', 'At least one source revision observation is required.');
  const ci: CI[] = list(body.ci, 6).map(value => {
    const item = object(value, ['id', 'revisionRef', 'check', 'outcome', 'observedAt', 'detail', 'supersedes']);
    if (typeof item.check !== 'string' || !['tests', 'build'].includes(item.check) || typeof item.outcome !== 'string' || !['passed', 'failed', 'cancelled', 'unknown'].includes(item.outcome)) return invalid('HANDOFF_CI', 'CI observations require a tests/build check and an explicit supported outcome.');
    return { id: id(item.id), revisionRef: id(item.revisionRef), check: item.check as CI['check'], outcome: item.outcome as CI['outcome'], observedAt: timestamp(item.observedAt, now), detail: detail(item.detail), ...(item.supersedes !== undefined ? { supersedes: refs(item.supersedes, 2) } : {}) };
  });
  const releases: Release[] = list(body.releases, 3).map(value => {
    const item = object(value, ['id', 'revisionRef', 'decision', 'requiredChecks', 'ciRefs', 'observedAt', 'detail', 'supersedes']);
    if (typeof item.decision !== 'string' || !['ready', 'hold', 'unknown'].includes(item.decision) || !Array.isArray(item.requiredChecks) || item.requiredChecks.length !== 2 || new Set(item.requiredChecks).size !== 2 || !item.requiredChecks.includes('tests') || !item.requiredChecks.includes('build')) return invalid('HANDOFF_RELEASE', 'Release observations require ready/hold/unknown and both required checks: tests and build.');
    return { id: id(item.id), revisionRef: id(item.revisionRef), decision: item.decision as Release['decision'], requiredChecks: ['tests', 'build'], ciRefs: refs(item.ciRefs, 6), observedAt: timestamp(item.observedAt, now), detail: detail(item.detail), ...(item.supersedes !== undefined ? { supersedes: refs(item.supersedes, 2) } : {}) };
  });
  const all = [...revisions, ...ci, ...releases];
  if (new Set(all.map(item => item.id)).size !== all.length) return invalid('HANDOFF_ID', 'Observation identifiers must be unique across the packet.');
  const revisionIds = new Set(revisions.map(item => item.id)), currentRevisionRef = id(body.currentRevisionRef);
  if (!revisionIds.has(currentRevisionRef)) return invalid('HANDOFF_REFERENCE', 'The current revision reference does not resolve.');
  for (const item of [...ci, ...releases]) if (!revisionIds.has(item.revisionRef)) return invalid('HANDOFF_REFERENCE', 'An observation references a missing source revision.');
  for (const release of releases) for (const ref of release.ciRefs) { const observation = ci.find(item => item.id === ref); if (!observation || observation.revisionRef !== release.revisionRef) return invalid('HANDOFF_REFERENCE', 'Release CI references must resolve to observations of the same revision.'); }
  for (const group of [ci, releases]) {
    const byId = new Map(group.map(item => [item.id, item]));
    for (const item of group) for (const ref of item.supersedes ?? []) {
      const prior = byId.get(ref);
      if (!prior || prior.id === item.id || prior.revisionRef !== item.revisionRef || ('check' in item && (!('check' in prior) || item.check !== prior.check)) || Date.parse(item.observedAt) < Date.parse(prior.observedAt)) return invalid('HANDOFF_SUPERSESSION', 'Supersession must point to an earlier observation of the same kind, revision and CI check.');
    }
    const visited = new Set<string>(), active = new Set<string>();
    const visit = (key: string) => { if (active.has(key)) return invalid('HANDOFF_SUPERSESSION', 'Supersession cycles are not allowed.'); if (visited.has(key)) return; active.add(key); for (const ref of byId.get(key)?.supersedes ?? []) visit(ref); active.delete(key); visited.add(key); };
    group.forEach(item => visit(item.id));
  }
  return { format: 'qarinah-handoff-v1', provenance: body.provenance as Packet['provenance'], project: body.project, currentRevisionRef, revisions, ci, releases };
}
export function importHandoff(input: unknown, now: number): Snapshot {
  const packet = parse(input, now), current = packet.revisions.find(item => item.id === packet.currentRevisionRef)!;
  const sources: EvidenceRecord[] = [];
  const sourceId = (id: string) => `handoff:${packet.project}:${id}`;
  for (const item of packet.revisions) sources.push(record({ sourceId: sourceId(item.id), title: 'Source revision observation', content: `Project ${packet.project}; revision ${item.id}; commit ${item.commit}; working tree ${item.dirty ? 'dirty' : 'clean'}.`, observedAt: item.observedAt, subject: packet.project, factKey: 'source_revision:' + item.id, value: item.commit, handoff: { kind: 'revision', observationId: item.id, commit: item.commit, dirty: item.dirty } }));
  for (const item of packet.ci) sources.push(record({ sourceId: sourceId(item.id), title: 'CI ' + item.check + ' observation', content: `Project ${packet.project}; CI ${item.check} observation ${item.id}; revision ${item.revisionRef}; outcome ${item.outcome}. Detail (untrusted data): ${item.detail}`, observedAt: item.observedAt, subject: packet.project, factKey: 'ci:' + item.check + ':' + item.revisionRef, value: item.outcome, handoff: { kind: 'ci', observationId: item.id, revisionRef: item.revisionRef, check: item.check, outcome: item.outcome, supersedes: item.supersedes ?? [] } }));
  for (const item of packet.releases) sources.push(record({ sourceId: sourceId(item.id), title: 'Release recommendation observation', content: `Project ${packet.project}; release observation ${item.id}; revision ${item.revisionRef}; recommendation ${item.decision}; required tests and build; CI references ${item.ciRefs.join(', ') || '(none)'}. Detail (untrusted data): ${item.detail}`, observedAt: item.observedAt, subject: packet.project, factKey: 'release_decision:' + item.revisionRef, value: item.decision, handoff: { kind: 'release', observationId: item.id, revisionRef: item.revisionRef, decision: item.decision, requiredChecks: item.requiredChecks, ciRefs: item.ciRefs, supersedes: item.supersedes ?? [] } }));
  return snapshot('handoff', sources, now, { sourceResponseBytes: jsonBytes(input), handoffPacket: packet, handoff: { project: packet.project, currentRevisionRef: current.id, currentCommit: current.commit, provenance: packet.provenance, question: RELEASE_QUESTION }, warnings: [packet.provenance === 'local-observation' ? 'Imported local observations: provenance is caller-declared, not independently authenticated.' : 'Synthetic developer handoff replay. These are invented observations.', 'Only the current release decision question is supported. Readiness requires a clean revision, explicit recommendation and current referenced tests/build observations.', 'No repository, chat history, command, URL or provider is opened or executed by import or release review.'] });
}

export type ReleaseAssessment = { selected: EvidenceRecord[]; excluded: { id: string; reason: string }[]; conflicts: { factKey: string; sourceIds: string[] }[]; reason: string; message: string; decision?: 'ready' | 'hold' };
export function assessRelease(snapshot: Snapshot, question: string, now: number): ReleaseAssessment {
  const result: ReleaseAssessment = { selected: [], excluded: [], conflicts: [], reason: '', message: '' };
  const stop = (reason: string, message: string) => ({ ...result, reason, message });
  if (question.trim().toLowerCase() !== RELEASE_QUESTION.toLowerCase()) return stop('unsupported-handoff-question', `Supported question: ${RELEASE_QUESTION}`);
  const header = snapshot.handoff;
  if (!header) return stop('missing-handoff-metadata', 'The developer handoff metadata is unavailable.');
  const valid: EvidenceRecord[] = [];
  for (const source of snapshot.sources) {
    const { id, hash, ...original } = source;
    const reason = digest(original) !== hash || id !== 'ev-' + hash.slice(0, 24) || !source.handoff ? 'unresolvable-source' : Date.parse(source.observedAt) < now - LIMITS.snapshotAgeMs || Date.parse(source.observedAt) > now + 60_000 ? 'stale-source' : source.handoff.kind === 'revision' ? source.handoff.observationId !== header.currentRevisionRef ? 'different-revision' : undefined : source.handoff.revisionRef !== header.currentRevisionRef ? 'different-revision' : undefined;
    if (reason) result.excluded.push({ id: source.id, reason }); else valid.push(source);
  }
  const superseded = new Set(valid.flatMap(source => source.handoff!.supersedes ?? []));
  const current = valid.filter(source => { if (superseded.has(source.handoff!.observationId)) { result.excluded.push({ id: source.id, reason: 'explicitly-superseded' }); return false; } return true; });
  const revision = current.find(source => source.handoff!.kind === 'revision');
  if (!revision || revision.handoff!.commit !== header.currentCommit) return stop('missing-current-revision', 'Abstained: the current revision observation is missing, stale or inconsistent.');
  result.selected.push(revision);
  const releases = current.filter(source => source.handoff!.kind === 'release');
  const ci = current.filter(source => source.handoff!.kind === 'ci');
  for (const check of ['tests', 'build', 'release'] as const) {
    const group = check === 'release' ? releases : ci.filter(source => source.handoff!.check === check);
    if (new Set(group.map(source => source.handoff![check === 'release' ? 'decision' : 'outcome'])).size > 1) {
      result.conflicts.push({ factKey: check, sourceIds: group.map(source => source.sourceId) });
      group.forEach(source => result.excluded.push({ id: source.id, reason: 'unresolved-conflict' }));
    }
  }
  if (result.conflicts.length) return stop('conflicting-handoff-evidence', 'Abstained: current observations disagree. Import an explicit same-revision supersession or review the conflict.');
  if (!releases.length) return stop('missing-release-observation', 'Abstained: no current release recommendation observation is available.');
  const release = [...releases].sort((a, b) => b.observedAt.localeCompare(a.observedAt) || a.id.localeCompare(b.id))[0];
  result.selected.push(release);
  for (const check of ['tests', 'build'] as const) {
    const candidates = ci.filter(source => source.handoff!.check === check && release.handoff!.ciRefs?.includes(source.handoff!.observationId) && Date.parse(source.observedAt) <= Date.parse(release.observedAt));
    if (!candidates.length) return stop('missing-required-artifact', `Abstained: a current, unsuperseded ${check} artifact referenced by the release observation is missing.`);
    result.selected.push([...candidates].sort((a, b) => b.observedAt.localeCompare(a.observedAt) || a.id.localeCompare(b.id))[0]);
  }
  const requiredCI = result.selected.filter(source => source.handoff!.kind === 'ci');
  if (requiredCI.some(source => ['unknown', 'cancelled'].includes(source.handoff!.outcome!)) || release.handoff!.decision === 'unknown') return stop('incomplete-handoff-evidence', 'Abstained: the current CI or release observation has no conclusive outcome.');
  const failed = requiredCI.filter(source => source.handoff!.outcome === 'failed').map(source => source.handoff!.check);
  const decision = revision.handoff!.dirty || failed.length || release.handoff!.decision === 'hold' ? 'hold' : 'ready';
  const why = revision.handoff!.dirty ? 'the current working tree is dirty' : failed.length ? 'required CI failed: ' + failed.join(', ') : release.handoff!.decision === 'hold' ? 'the imported recommendation explicitly says hold' : 'the imported revision is clean, its referenced tests and build passed, and the imported recommendation says ready';
  return { ...result, decision, reason: decision === 'ready' ? 'release-ready-within-imported-evidence' : 'release-held', message: `${decision === 'ready' ? 'Ready within this imported evidence' : 'Hold this release handoff'}: ${why}. Commit ${header.currentCommit}. This is a local review, not deployment authorization or authenticated CI.` };
}
