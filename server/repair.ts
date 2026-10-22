import { digest } from './evidence.ts';
import { assessRelease, RELEASE_QUESTION } from './handoff.ts';
import { LIMITS, type EvidenceRecord, type RepairItem, type RepairPlan, type Snapshot } from './types.ts';

/** Fixed guidance over typed observations. Evidence text never becomes an instruction. */
export function repairPlan(snapshot: Snapshot, reason: string, decision: 'ready' | 'hold' | undefined, now: number): RepairPlan {
  const items: RepairItem[] = [], allIds = new Set(snapshot.sources.map(source => source.id));
  const refresh = snapshot.transport?.provider === 'zetaris' && snapshot.transport.queryKey === 'current-release' ? 'reread-current-release' : 'import-updated';
  const add = (kind: RepairItem['kind'], fact: RepairItem['fact'], action: string, evidence: EvidenceRecord[]) => {
    if (items.length < 6 && !items.some(item => item.kind === kind && item.fact === fact)) items.push({ kind, fact, action, evidenceIds: [...new Set(evidence.map(source => source.id))].filter(id => allIds.has(id) && /^ev-[a-f0-9]{24}$/.test(id)).slice(0, 6) });
  };
  const header = snapshot.handoff;
  const valid = snapshot.sources.filter(source => { const { id, hash, ...original } = source; return source.handoff && digest(original) === hash && id === 'ev-' + hash.slice(0, 24); });
  const current = valid.filter(source => source.handoff!.kind === 'revision' ? source.handoff!.observationId === header?.currentRevisionRef : source.handoff!.revisionRef === header?.currentRevisionRef);
  const expired = Date.parse(snapshot.expiresAt) <= now;
  const fresh = current.filter(source => !expired && Number.isFinite(Date.parse(source.observedAt)) && Date.parse(source.observedAt) >= now - LIMITS.snapshotAgeMs && Date.parse(source.observedAt) <= now + 60_000);
  const superseded = new Set(fresh.flatMap(source => source.handoff!.supersedes ?? []));
  const active = fresh.filter(source => !superseded.has(source.handoff!.observationId));
  const group = (sources: EvidenceRecord[], fact: RepairItem['fact']) => sources.filter(source => fact === 'revision' || fact === 'release' ? source.handoff!.kind === fact : source.handoff!.kind === 'ci' && source.handoff!.check === fact);
  const release = group(active, 'release').sort((a, b) => b.observedAt.localeCompare(a.observedAt) || a.id.localeCompare(b.id))[0];
  for (const fact of ['revision', 'tests', 'build', 'release'] as const) {
    const evidence = group(active, fact), older = group(current, fact);
    const label = fact === 'revision' ? 'source revision' : fact === 'release' ? 'release recommendation' : fact;
    if (!evidence.length) {
      if (older.length) add('stale', fact, `Obtain a current ${label} observation for the intended revision. Preserve the prior observation and its original timestamp.`, older);
      else add('missing', fact, `Capture the missing ${label} observation for the intended revision and include its real references in the handoff.`, []);
      continue;
    }
    if (fact === 'revision') { if (evidence.some(source => source.handoff!.dirty === true)) add('dirty', fact, 'Finish and review the working-tree changes, record the intended clean revision, then run its required checks and capture their actual results.', evidence); continue; }
    const outcomes = evidence.map(source => fact === 'release' ? source.handoff!.decision : source.handoff!.outcome);
    if (new Set(outcomes).size > 1) { add('conflicting', fact, `Review the contradictory ${label} observations at their source. Record explicit same-revision supersession only when a real newer observation justifies it.`, evidence); continue; }
    if (fact !== 'release' && outcomes[0] === 'failed') { add('failed', fact, `Fix the source issue behind the failed ${fact}, then run ${fact} for the intended revision and capture the actual result in a new handoff.`, evidence); continue; }
    if (fact === 'release' && outcomes[0] === 'hold') { add('hold', fact, 'Review the recorded release hold, address its cause at the source and capture a new recommendation when the evidence justifies it.', evidence); continue; }
    if (fact === 'release' ? outcomes[0] !== 'ready' : outcomes[0] !== 'passed') { add('unknown', fact, `Check the actual ${label} outcome at its source and capture a conclusive observation for the intended revision.`, evidence); continue; }
    if (fact !== 'release' && release && !evidence.some(source => release.handoff!.ciRefs?.includes(source.handoff!.observationId) && Date.parse(source.observedAt) <= Date.parse(release.observedAt))) add('missing', fact, `Review the actual ${fact} artifact and capture a release observation that references it for the same revision.`, [...evidence, release]);
  }
  if (reason === 'unsupported-handoff-question') add('unknown', 'evidence', `Review the supported question: ${RELEASE_QUESTION}`, []);
  if (['unresolvable-handoff-memory', 'handoff-context-bound', 'missing-handoff-metadata'].includes(reason) || valid.length !== snapshot.sources.length) add('unresolvable', 'evidence', 'Read or import a bounded, resolvable packet that retains the intended revision, both required checks and their release references.', current);
  const assessed = assessRelease(snapshot, RELEASE_QUESTION, now);
  const complete = decision === 'ready' && assessed.decision === 'ready' && reason === 'release-ready-within-imported-evidence' && !items.length;
  if (!complete && !items.length) add('unresolvable', 'evidence', 'Review the source packet and capture the unresolved facts before reviewing the release again.', current);
  const blocked = items.some(item => ['failed', 'dirty', 'conflicting', 'hold', 'unresolvable'].includes(item.kind)) || reason === 'unsupported-handoff-question';
  return { status: complete ? 'complete' : blocked ? 'blocked' : 'refresh-needed', summary: complete ? 'This packet supports a clean revision, passed required checks and the recorded ready recommendation.' : blocked ? 'Source changes or a reviewed resolution are needed before this handoff can support readiness.' : 'Current, complete observations are needed before the release decision can be checked.', items, refresh };
}
