import fs from 'node:fs';
import path from 'node:path';
import { HMEM } from '../vendor/meterless-hmem/src/index.ts';
import { demo, digest, emptyMetrics, jsonBytes, utf8 } from './evidence.ts';
import { generate, modelBody, queryZetaris, SYSTEM, zetarisConfigured } from './providers.ts';
import { DeskError, HMEM_COMMIT, LIMITS, type Answer, type AppConfig, type DemoCase, type EvidenceRecord, type QueryKey, type Snapshot } from './types.ts';
import { assessRelease, importHandoff, RELEASE_QUESTION } from './handoff.ts';

const fileBytes = (file: string) => fs.existsSync(file) ? fs.statSync(file).size : 0;
const sourceKey = (record: EvidenceRecord) => 'evidence:' + digest({ sourceId: record.sourceId, content: record.content, subject: record.subject ?? '', factKey: record.factKey ?? '', value: record.value ?? '', ...(record.handoff ? { handoff: record.handoff } : {}) });
const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const ownKeys = (value: unknown, keys: string[]) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
export function questionIntent(question: string): { subject?: string; factKey?: string } {
  const subject = /\batlas\b/i.test(question) ? 'atlas' : /\bbeacon\b/i.test(question) ? 'beacon' : undefined;
  const factKey = /\bupload\b|\bfile.*\blimit\b/i.test(question) ? 'upload_limit_mb' : /\bretention\b|\bkeep.*\bdays\b/i.test(question) ? 'retention_days' : /\bsupport\b|\bresponse.*\btarget\b/i.test(question) ? 'support_response_hours' : /\bprobe\b|\bconnection\b|\bselect\s*1\b/i.test(question) ? 'probe' : /\brows?\b|\bresults?\b|\bsample\b|\breasons?\b|\bzones?\b/i.test(question) ? 'rows' : undefined;
  return { subject, factKey };
}

export class EvidenceDesk {
  readonly hmem: HMEM;
  readonly directory: string;
  private snapshots = new Map<string, Snapshot>();
  private chain: Promise<unknown> = Promise.resolve();
  private budget: { day: string; attempts: number };
  private lastZetarisRead?: string;
  constructor(readonly config: AppConfig, readonly fetcher: typeof fetch = fetch, readonly clock = Date.now) {
    this.directory = path.join(config.dataDir, digest(path.resolve(config.workspace)).slice(0, 24));
    fs.mkdirSync(this.directory, { recursive: true });
    this.storageRoom();
    try { this.hmem = new HMEM({ persistDir: this.directory, clock, actor: 'qarinah-evidence-desk' }); }
    catch { throw new DeskError(503, 'MEMORY_UNAVAILABLE', 'Local memory could not be opened. Preserve the existing files for review.'); }
    if (this.hmem.store.all().length > LIMITS.memories) throw new DeskError(503, 'MEMORY_CAPACITY', 'Local memory exceeds the supported record bound.');
    this.budget = { day: new Date(clock()).toISOString().slice(0, 10), attempts: 0 };
    const budgetFile = path.join(this.directory, 'provider-budget.json');
    if (fs.existsSync(budgetFile)) {
      try { const value = JSON.parse(fs.readFileSync(budgetFile, 'utf8')); if (typeof value.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.day) || !Number.isSafeInteger(value.attempts) || value.attempts < 0) throw new Error(); this.budget = value; }
      catch { throw new DeskError(503, 'BUDGET_UNAVAILABLE', 'The local provider budget cannot be verified. No model request is allowed.'); }
    }
  }
  private serial<T>(action: () => Promise<T> | T): Promise<T> {
    const next = this.chain.then(action, action); this.chain = next.catch(() => {}); return next;
  }
  private storageRoom() {
    for (const [name, maximum] of [['state.json', LIMITS.stateBytes], ['ledger.jsonl', LIMITS.journalBytes]] as const) {
      if (fileBytes(path.join(this.directory, name)) + LIMITS.storageReserveBytes > maximum) throw new DeskError(409, 'MEMORY_CAPACITY', 'The bounded local memory or audit journal is full. No history was deleted.');
    }
  }
  private reserveProvider() {
    const day = new Date(this.clock()).toISOString().slice(0, 10);
    if (this.budget.day !== day) this.budget = { day, attempts: 0 };
    if (this.budget.attempts >= LIMITS.maxProviderCallsPerDay) throw new DeskError(429, 'PROVIDER_BUDGET', 'The local daily model-attempt limit has been reached.');
    const next = { day, attempts: this.budget.attempts + 1 };
    const file = path.join(this.directory, 'provider-budget.json');
    try { fs.writeFileSync(file + '.next', JSON.stringify(next), { mode: 0o600 }); fs.renameSync(file + '.next', file); this.budget = next; }
    catch { throw new DeskError(503, 'BUDGET_UNAVAILABLE', 'The model-attempt reservation could not be stored. No model request was made.'); }
  }
  status() {
    return { name: 'Qarinah Evidence Desk', version: '0.1.0', memory: { engine: 'Meterless H-MEM reference', commit: HMEM_COMMIT, embedding: 'deterministic 64-dimensional hash reference (not learned embeddings)', records: this.hmem.store.all().length, maxRecords: LIMITS.memories }, zetaris: { configured: zetarisConfigured(this.config), verified: Boolean(this.lastZetarisRead), lastVerifiedAt: this.lastZetarisRead }, nemotron: { configured: Boolean(this.config.nemotronKey), enabled: this.config.allowNemotron && Boolean(this.config.nemotronKey), model: this.config.nemotronModel }, handoff: { format: 'qarinah-handoff-v1', question: RELEASE_QUESTION, maxRevisions: 3, maxCI: 6, maxReleases: 3, localOnly: true }, limits: LIMITS };
  }
  private save(snapshot: Snapshot): Snapshot {
    this.storageRoom();
    const existing = new Set(this.hmem.store.all().map(memory => memory.source));
    const fresh = snapshot.sources.filter(record => !existing.has(sourceKey(record)));
    if (existing.size + fresh.length > LIMITS.memories) throw new DeskError(409, 'MEMORY_CAPACITY', 'The bounded memory record limit was reached. No old source was removed.');
    for (const record of fresh) {
      const added = this.hmem.add({ content: record.content, source: sourceKey(record), type: 'factual', layer: 'working', confidence: 1, provenance: { origin: 'document', learnedAt: this.clock(), label: record.sourceId, refs: [record.id, record.hash] }, tags: ['evidence', 'project:' + (record.subject ?? 'source')] });
      // Imported detail text must not create an implicit supersession through
      // upstream correction-language heuristics. Only validated refs may do so.
      if (record.handoff && added.supersedes) this.hmem.store.update(added.id, { supersedes: undefined });
    }
    if (snapshot.mode === 'handoff') {
      const bySource = new Map(this.hmem.store.all().map(memory => [memory.source, memory]));
      for (const record of snapshot.sources) {
        const successor = bySource.get(sourceKey(record))!;
        const predecessors = (record.handoff?.supersedes ?? []).map(id => snapshot.sources.find(source => source.handoff?.observationId === id)!).map(source => bySource.get(sourceKey(source))!);
        if (predecessors.length) {
          if (successor.supersedes !== predecessors[0].id) this.hmem.store.update(successor.id, { supersedes: predecessors[0].id, derivedFrom: predecessors.map(memory => memory.id) });
          for (const prior of predecessors) if (prior.supersededBy !== successor.id) this.hmem.store.update(prior.id, { supersededBy: successor.id });
        }
      }
    }
    snapshot.memoryCount = this.hmem.store.all().length;
    this.snapshots.set(snapshot.id, snapshot);
    while (this.snapshots.size > LIMITS.snapshotCount) this.snapshots.delete(this.snapshots.keys().next().value!);
    return structuredClone(snapshot);
  }
  async loadDemo(input: unknown) {
    if (!ownKeys(input, ['case']) || !['clean', 'conflict', 'missing'].includes((input as { case: string }).case)) throw new DeskError(400, 'DEMO_CASE', 'Choose clean, conflict, or missing demo evidence.');
    return this.serial(() => { const start = performance.now(); const value = this.save(demo((input as { case: DemoCase }).case, this.clock())); const metrics = emptyMetrics(value.sourceResponseBytes); metrics.availableEvidenceBytes = jsonBytes(value.sources); metrics.elapsedMs = Math.round(performance.now() - start); return { snapshot: value, metrics }; });
  }
  async querySource(input: unknown) {
    if (!ownKeys(input, ['queryKey']) || !['probe', 'taxi-zones', 'reasons'].includes((input as { queryKey: string }).queryKey)) throw new DeskError(400, 'QUERY_KEY', 'Choose a supported fixed read-only query.');
    return this.serial(async () => { this.storageRoom(); const start = performance.now(); const value = this.save(await queryZetaris(this.config, (input as { queryKey: QueryKey }).queryKey, this.clock(), this.fetcher)); this.lastZetarisRead = value.createdAt; const metrics = emptyMetrics(value.sourceResponseBytes, 1); metrics.availableEvidenceBytes = jsonBytes(value.sources); metrics.elapsedMs = Math.round(performance.now() - start); return { snapshot: value, metrics }; });
  }
  async importHandoff(input: unknown) {
    return this.serial(() => { const start = performance.now(); const value = this.save(importHandoff(input, this.clock())); const metrics = emptyMetrics(value.sourceResponseBytes); metrics.availableEvidenceBytes = jsonBytes(value.sources); metrics.elapsedMs = Math.round(performance.now() - start); return { snapshot: value, metrics }; });
  }
  async answer(input: unknown): Promise<Answer> {
    if (!ownKeys(input, ['snapshotId', 'question', 'generate'])) throw new DeskError(400, 'ANSWER_INPUT', 'Use a snapshot, question and optional generation flag.');
    const { snapshotId, question, generate: wantsModel = false } = input as { snapshotId: unknown; question: unknown; generate?: unknown };
    if (typeof snapshotId !== 'string' || typeof question !== 'string' || !question.trim() || utf8(question) > LIMITS.questionBytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(question) || typeof wantsModel !== 'boolean') throw new DeskError(400, 'ANSWER_INPUT', 'Choose a snapshot and enter a question of at most 1024 UTF-8 bytes.');
    return this.serial(async () => {
      const start = performance.now(), now = this.clock();
      const snapshot = this.snapshots.get(snapshotId);
      if (!snapshot) throw new DeskError(404, 'SNAPSHOT_NOT_FOUND', 'The snapshot is unavailable or was evicted. Load a fresh source set.');
      const metrics = emptyMetrics(snapshot.sourceResponseBytes);
      metrics.availableEvidenceBytes = jsonBytes(snapshot.sources); metrics.instructionBytes = utf8(SYSTEM); metrics.questionBytes = utf8(question);
      const result: Answer = { status: 'abstained', mode: 'retrieval-only', snapshotId, question, answer: '', claims: [], citations: [], excluded: [], conflicts: [], memories: [], trace: { strategy: 'withheld', reason: '' }, metrics };
      const finish = (reason: string, message: string, status: Answer['status'] = 'abstained') => { result.status = status; result.reason = reason; result.answer = message; result.trace.reason = reason; metrics.selectionOverheadBytes = jsonBytes({ selectedIds: result.citations.map(record => record.id), excluded: result.excluded, conflicts: result.conflicts }); metrics.elapsedMs = Math.round(performance.now() - start); return result; };
      if (Date.parse(snapshot.expiresAt) <= now) { result.excluded = snapshot.sources.map(record => ({ id: record.id, reason: 'stale-snapshot' })); return finish('stale-snapshot', 'This source snapshot expired. Refresh the evidence before answering.'); }
      this.storageRoom();
      if (snapshot.mode === 'handoff') {
        const review = assessRelease(snapshot, question, now);
        result.excluded = review.excluded; result.conflicts = review.conflicts;
        result.trace.strategy = 'deterministic release rules + Meterless source resolution; no model';
        const retrieval = review.selected.length ? this.hmem.query(question, { topN: LIMITS.memories, threshold: 0 }) : undefined;
        const bySource = new Map(retrieval?.memories.map(item => [item.memory.source, item]) ?? []);
        for (const record of review.selected) {
          const found = bySource.get(sourceKey(record));
          if (!found || found.memory.content !== record.content) return finish('unresolvable-handoff-memory', 'Abstained: a required source could not be resolved through this workspace memory.');
          result.memories.push({ id: found.memory.id, content: found.memory.content, source: record.sourceId, relevance: Number(found.relevance.toFixed(4)) });
        }
        if (review.selected.length > LIMITS.recalledMemories || jsonBytes(review.selected) > LIMITS.contextBytes) return finish('handoff-context-bound', 'Abstained: required release evidence does not fit the bounded packet.');
        result.citations = review.selected;
        const selectedBody = modelBody(question, review.selected, this.config.nemotronModel), fullBody = modelBody(question, snapshot.sources, this.config.nemotronModel);
        metrics.selectedEvidenceBytes = jsonBytes(review.selected); metrics.memoryContextBytes = jsonBytes(JSON.parse(selectedBody.messages[1].content).evidence); metrics.promptBytes = jsonBytes(selectedBody.messages); metrics.fullContextPromptBytes = jsonBytes(fullBody.messages); metrics.fullContextRequestBytes = jsonBytes(fullBody);
        if (!review.decision) return finish(review.reason, review.message);
        result.releaseDecision = review.decision;
        result.claims = [{ text: review.message, citationIds: review.selected.map(record => record.id) }];
        return finish(review.reason, review.message, 'answered');
      }
      const intent = questionIntent(question);
      const current = snapshot.sources.filter(record => {
        const { id, hash, ...original } = record;
        const valid = digest(original) === hash && id === 'ev-' + hash.slice(0, 24) && Date.parse(record.observedAt) >= now - LIMITS.snapshotAgeMs && Date.parse(record.observedAt) <= now + 60_000;
        if (!valid) result.excluded.push({ id, reason: 'unresolvable-or-stale-source' });
        return valid;
      });
      const groups = new Map<string, EvidenceRecord[]>();
      // A collection contains different rows by design. Only singleton facts
      // (for example one product's upload limit) participate in value conflicts.
      for (const record of current) { if (record.factKey && record.factKey !== 'rows' && record.subject && record.value !== undefined) { const key = record.subject + ':' + record.factKey; groups.set(key, [...(groups.get(key) ?? []), record]); } }
      const blocked = new Set<string>();
      for (const [factKey, records] of groups) if (new Set(records.map(record => normalize(record.value!))).size > 1) { result.conflicts.push({ factKey, sourceIds: records.map(record => record.sourceId) }); records.forEach(record => blocked.add(record.id)); }
      const eligible = current.filter(record => {
        const reason = blocked.has(record.id) ? 'unresolved-conflict' : !intent.factKey ? 'unsupported-question' : intent.subject && record.subject !== intent.subject || record.factKey !== intent.factKey ? 'outside-question-scope' : undefined;
        if (reason) result.excluded.push({ id: record.id, reason });
        return !reason;
      });
      metrics.selectionOverheadBytes = jsonBytes({ eligibleIds: eligible.map(record => record.id), excluded: result.excluded, conflicts: result.conflicts });
      if (!eligible.length) return finish(!intent.factKey ? 'unsupported-question' : current.some(record => blocked.has(record.id) && record.factKey === intent.factKey && (!intent.subject || record.subject === intent.subject)) ? 'conflicting-evidence' : 'missing-evidence', 'No consistent, in-scope source supports this question. Review the excluded evidence.');
      const retrieval = this.hmem.query(question, { topN: LIMITS.memories, threshold: 0.1 });
      const bySource = new Map(eligible.map(record => [sourceKey(record), record]));
      const selected: EvidenceRecord[] = [];
      for (const item of retrieval.memories) {
        const record = bySource.get(item.memory.source);
        if (!record || item.memory.content !== record.content || item.memory.supersededBy) continue;
        const candidate = [...selected, record];
        if (candidate.length > LIMITS.recalledMemories || jsonBytes(candidate) > LIMITS.contextBytes) { result.excluded.push({ id: record.id, reason: 'context-byte-or-item-bound' }); continue; }
        selected.push(record); result.memories.push({ id: item.memory.id, content: item.memory.content, source: record.sourceId, relevance: Number(item.relevance.toFixed(4)) });
      }
      for (const record of eligible) if (!selected.some(item => item.id === record.id) && !result.excluded.some(item => item.id === record.id)) result.excluded.push({ id: record.id, reason: 'below-retrieval-threshold' });
      result.trace.strategy = retrieval.trace.strategy + '; local deterministic hash retrieval';
      if (!selected.length) return finish('insufficient-retrieval', 'The bounded memory lookup did not recover a resolvable source. No answer was inferred.');
      const selectedBody = modelBody(question, selected, this.config.nemotronModel), fullBody = modelBody(question, current, this.config.nemotronModel);
      // Component byte measurements overlap the full prompt; they are not token
      // estimates or additive billing totals. The comparison is counterfactual.
      metrics.selectedEvidenceBytes = jsonBytes(selected); metrics.memoryContextBytes = jsonBytes(JSON.parse(selectedBody.messages[1].content).evidence); metrics.promptBytes = jsonBytes(selectedBody.messages); metrics.fullContextPromptBytes = jsonBytes(fullBody.messages); metrics.fullContextRequestBytes = jsonBytes(fullBody);
      result.citations = selected;
      if (!wantsModel) { result.claims = selected.map(record => ({ text: record.content, citationIds: [record.id] })); return finish('retrieval-only', result.claims.map(claim => claim.text).join('\n\n'), 'retrieved'); }
      if (!this.config.allowNemotron || !this.config.nemotronKey) return finish('nemotron-not-enabled', 'Nemotron is not enabled with existing credentials. The cited local evidence is available; no model call was made.', 'unavailable');
      try {
        this.reserveProvider(); metrics.providerAttempts = 1; metrics.requestBytes = jsonBytes(selectedBody); result.mode = 'nemotron';
        const generated = await generate(this.config, question, selected, this.fetcher);
        metrics.providerUsage = generated.usage;
        if (!generated.claims.length) return finish('model-abstained', 'Nemotron selected no supported excerpts. Inspect the cited evidence.');
        result.claims = generated.claims;
        return finish('validated-excerpts', generated.claims.map(claim => claim.text).join('\n\n'), 'answered');
      } catch (error) { if (error instanceof DeskError) metrics.providerUsage = error.usage; return finish(error instanceof DeskError ? error.code.toLowerCase().replaceAll('_', '-') : 'provider-unavailable', 'The model did not return validated cited excerpts. No generated answer was accepted.', 'unavailable'); }
    });
  }
  audit(id: string) {
    if (!/^mem-\d{1,8}$/.test(id)) throw new DeskError(400, 'MEMORY_ID', 'Use a valid memory identifier.');
    const memory = this.hmem.store.get(id);
    if (!memory) throw new DeskError(404, 'MEMORY_NOT_FOUND', 'That memory was not found in this workspace.');
    const history = this.hmem.ledger.history(id), entries = [];
    for (const entry of history.slice(-50)) { const safe = { action: entry.action, actor: entry.actor, timestamp: entry.timestamp, details: entry.details, previousState: entry.previousState ? { confidence: entry.previousState.confidence, source: entry.previousState.source } : undefined, newState: entry.newState ? { confidence: entry.newState.confidence, source: entry.newState.source, content: entry.newState.content, provenance: entry.newState.provenance } : undefined }; if (jsonBytes([...entries, safe]) > 32_768) break; entries.push(safe); }
    return { memory: { id, content: memory.content, source: memory.source, provenance: memory.provenance }, entries, truncated: history.length > entries.length };
  }
}
