import React, { useEffect, useMemo, useRef, useState } from 'react';
import { byteLabel, bytes, createReceipt, downloadReceipt, number, request, resultLabel, timeLabel } from './api.js';
import HandoffPanel from './HandoffPanel.jsx';

const cases = [
  { id: 'clean', title: 'Clean evidence', detail: 'One consistent answer' },
  { id: 'conflict', title: 'Conflicting sources', detail: 'Two incompatible values' },
  { id: 'missing', title: 'Missing evidence', detail: 'Withhold the answer' },
];
const queryNames = { probe: 'Connection probe', 'taxi-zones': 'Taxi zones', reasons: 'Source reasons' };

function snapshotLabel(snapshot) {
  if (!snapshot) return 'No snapshot loaded';
  if (snapshot.mode === 'handoff') {
    return snapshot.handoff?.provenance === 'synthetic-replay' ? 'Synthetic handoff replay' : 'Imported handoff observations';
  }
  return snapshot.mode === 'synthetic' ? 'Synthetic replay' : 'Zetaris snapshot';
}

function Icon({ name, size = 18, ...props }) {
  const paths = {
    grid: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 16v5h14v-5',
    refresh: 'M20 7v5h-5 M4 17v-5h5 M6.1 7a7 7 0 0 1 11.5-2L20 8 M4 16l2.4 3a7 7 0 0 0 11.5-2',
    link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
    check: 'M5 12l4 4L19 6',
    clock: 'M12 8v4l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    close: 'M6 6l12 12 M18 6 6 18',
    shield: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
    context: 'M4 5h16 M4 12h12 M4 19h16 M20 9v6',
    chevron: 'M9 5l7 7-7 7',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.file} /></svg>;
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}><span className="badge-dot" aria-hidden="true" />{children}</span>;
}

function Metric({ label, value, note }) {
  return <div className="metric-row"><dt>{label}{note && <small>{note}</small>}</dt><dd>{value}</dd></div>;
}

function ContextInspector({ metrics, runtime, reviewed }) {
  const hasMeasurements = Boolean(reviewed && metrics);
  const m = hasMeasurements ? metrics : null;
  const actual = m?.promptBytes;
  const full = m?.fullContextPromptBytes;
  const usage = m?.providerUsage;
  const rows = [
    ['Available evidence', 'availableEvidenceBytes'], ['Selected evidence', 'selectedEvidenceBytes'],
    ['Recalled memory', 'memoryContextBytes'], ['Instructions', 'instructionBytes'],
    ['Question', 'questionBytes'], ['Selection overhead', 'selectionOverheadBytes'],
    ['Tool definitions', 'toolDefinitionsBytes'],
  ];
  return <section className="panel inspector" aria-labelledby="context-title">
    <div className="section-heading"><h2 id="context-title"><Icon name="context" />Context inspector</h2><span className="unit-label">UTF-8 bytes</span></div>
    <p className="muted">What this review includes, with overhead kept visible.</p>
    {hasMeasurements ? <>
      <div className="request-comparison">
        <div className="comparison-label"><span>Prepared prompt</span><strong>{byteLabel(actual)}</strong></div>
        <div className="comparison-track"><span style={{ width: `${full > 0 ? Math.min(100, actual / full * 100) : 0}%` }} /></div>
        <div className="comparison-label counterfactual"><span>Full-context prompt (counterfactual)</span><strong>{byteLabel(full)}</strong></div>
        <p>The comparison prompt was not sent to a provider.</p>
      </div>
      <dl className="metric-list">{rows.map(([label, key]) => <Metric key={key} label={label} value={byteLabel(m[key])} />)}<Metric label="Sent provider request" value={m.providerAttempts > 0 ? byteLabel(m.requestBytes) : 'Not sent'} /><Metric label="Provider attempts" value={number(m.providerAttempts)} /><Metric label="Source response" value={byteLabel(m.sourceResponseBytes)} /></dl>
    </> : <div className="inspector-empty"><Icon name="context" size={28} /><strong>No review measured yet</strong><p>Load evidence and review a question to inspect the selected payload.</p></div>}
    <div className="token-section"><div className="token-heading"><h3>Provider tokens</h3><strong>{usage ? number(usage.totalTokens) : 'Unknown'}</strong></div>
      {usage ? <dl className="metric-list compact"><Metric label="Input tokens" value={number(usage.promptTokens)} /><Metric label="Output tokens" value={number(usage.completionTokens)} /></dl> : <p>Only a provider usage receipt establishes token counts. Bytes are not token estimates.</p>}
    </div>
    <div className="limit-note"><Icon name="shield" /><span>Configured context limit: <strong>{byteLabel(runtime?.limits?.contextBytes)}</strong></span></div>
  </section>;
}

function Connections({ runtime, loading, onRefresh }) {
  const entries = [
    { title: 'Meterless H-MEM', state: runtime?.memory ? 'Loaded' : 'Unknown', ready: Boolean(runtime?.memory), detail: runtime?.memory ? `${number(runtime.memory.records)} stored records · ${runtime.memory.engine || 'memory engine'}` : 'Waiting for local API status.' },
    { title: 'Zetaris source', state: runtime?.zetaris?.verified ? 'Query verified' : runtime ? (runtime.zetaris?.configured ? 'Configured' : 'Not configured') : 'Unknown', ready: Boolean(runtime?.zetaris?.verified), detail: runtime?.zetaris?.verified ? `A validated query succeeded in this server process${runtime.zetaris.lastVerifiedAt ? ` at ${timeLabel(runtime.zetaris.lastVerifiedAt)}` : ''}.` : runtime?.zetaris?.configured ? 'A successful query is still needed to verify source access.' : 'Local replay remains available without source credentials.' },
    { title: 'NVIDIA Nemotron', state: runtime ? (runtime.nemotron?.configured && runtime.nemotron?.enabled ? 'Enabled' : 'Not enabled') : 'Unknown', ready: false, detail: 'Optional generation. Retrieval works without a model call.' },
  ];
  return <section className="panel connections" id="connections" aria-labelledby="connections-title">
    <div className="section-heading"><h2 id="connections-title">Runtime readiness</h2><button type="button" className="icon-button" onClick={onRefresh} disabled={loading} aria-label="Refresh runtime status"><Icon name="refresh" /></button></div>
    <ul>{entries.map(item => <li key={item.title}><div><strong>{item.title}</strong><Badge tone={item.ready ? 'green' : 'neutral'}>{item.state}</Badge></div><p>{item.detail}</p></li>)}</ul>
    <p className="fine-print">Configuration is not verification. Cursor development evidence is recorded separately from runtime status.</p>
  </section>;
}

export default function App() {
  const [runtime, setRuntime] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [fixture, setFixture] = useState('clean');
  const [queryKey, setQueryKey] = useState('taxi-zones');
  const [snapshot, setSnapshot] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [question, setQuestion] = useState('What is the Atlas upload limit?');
  const [useModel, setUseModel] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [audit, setAudit] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [notice, setNotice] = useState('Choose a local replay or query a configured source to begin.');
  const [now, setNow] = useState(Date.now());
  const detailRef = useRef(null);
  const answerRef = useRef(null);
  const questionRef = useRef(null);

  async function refreshStatus() {
    setStatusLoading(true);
    try { setRuntime(await request('/api/status')); }
    catch (e) { setError(e.message); }
    finally { setStatusLoading(false); }
  }
  useEffect(() => { refreshStatus(); const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  const expired = snapshot ? now >= Date.parse(snapshot.expiresAt) : false;
  const questionLimit = runtime?.limits?.questionBytes ?? 1024;
  const questionBytes = bytes(question);
  const modelReady = Boolean(runtime?.nemotron?.configured && runtime?.nemotron?.enabled);
  const handoffMode = snapshot?.mode === 'handoff';
  const sources = snapshot?.sources || [];
  const selected = sources.find(source => source.id === selectedId);
  const visibleSources = useMemo(() => sources.filter(source => `${source.title} ${source.sourceId} ${source.content}`.toLowerCase().includes(filter.toLowerCase())), [sources, filter]);
  const cited = new Set(answer?.citations?.map(source => source.id) || []);
  const exclusions = new Map(answer?.excluded?.map(source => [source.id, source.reason]) || []);

  async function load(mode) {
    setBusy(mode); setError(''); setAnswer(null); setAudit(null); setReceiptPreview(null);
    try {
      const data = mode === 'fixture' ? await request('/api/demo/load', { case: fixture }) : await request('/api/source/query', { queryKey });
      if (!data.snapshot?.id || !Array.isArray(data.snapshot.sources)) throw new Error('The API returned an incomplete snapshot. Try loading the source again.');
      setSnapshot(data.snapshot); setMetrics(data.metrics || null); setSelectedId(null); setFilter(''); setNow(Date.now());
      setQuestion(mode === 'fixture' ? 'What is the Atlas upload limit?' : queryKey === 'probe' ? 'What did the Zetaris connection probe return?' : queryKey === 'reasons' ? 'Show the returned reason rows.' : 'Show the returned taxi zone rows.');
      setNotice(`${data.snapshot.mode === 'synthetic' ? 'Synthetic replay' : 'Zetaris snapshot'} loaded with ${data.snapshot.sources.length} evidence records. No answer has been reviewed yet.`);
      refreshStatus();
      requestAnimationFrame(() => questionRef.current?.focus());
    } catch (e) { setError(e.message); setNotice('Loading failed. The previous snapshot remains available.'); }
    finally { setBusy(''); }
  }

  async function review(event) {
    event.preventDefault();
    if (!snapshot || expired || !question.trim() || questionBytes > questionLimit || busy) return;
    setBusy('answer'); setError(''); setAudit(null); setReceiptPreview(null);
    try {
      const data = await request('/api/answer', { snapshotId: snapshot.id, question: question.trim(), generate: Boolean(useModel && modelReady && !handoffMode) });
      if (data.snapshotId !== snapshot.id) throw new Error('The answer references another snapshot and cannot be shown here. Reload the source.');
      setAnswer(data); setMetrics(data.metrics || null); setNotice(`${resultLabel(data)}. ${data.citations?.length || 0} cited evidence records.`);
      refreshStatus();
      requestAnimationFrame(() => answerRef.current?.focus());
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function inspect(id) {
    const source = sources.find(item => item.id === id || item.sourceId === id);
    if (!source) return;
    setSelectedId(source.id); setFilter('');
    requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); detailRef.current?.focus({ preventScroll: true }); });
  }

  async function importHandoff(observations) {
    setBusy('handoff');
    setError('');
    setAnswer(null);
    setMetrics(null);
    setAudit(null);
    setReceiptPreview(null);
    try {
      const data = await request('/api/handoff/import', observations);
      if (!data.snapshot?.id || data.snapshot.mode !== 'handoff' || !Array.isArray(data.snapshot.sources)) {
        throw new Error('The API returned an incomplete handoff snapshot. The previous snapshot is unchanged.');
      }
      setSnapshot(data.snapshot);
      setMetrics(data.metrics || null);
      setSelectedId(null);
      setFilter('');
      setNow(Date.now());
      setUseModel(false);
      setQuestion(data.snapshot.handoff?.question || 'What is the current release decision?');
      setNotice(`${snapshotLabel(data.snapshot)} imported. Review the release-decision question to check its cited evidence.`);
      refreshStatus();
      requestAnimationFrame(() => questionRef.current?.focus());
      return data.snapshot.id;
    } finally {
      setBusy('');
    }
  }

  async function inspectAudit(id) {
    setBusy('audit'); setError('');
    try { setAudit({ id, data: await request(`/api/audit/${encodeURIComponent(id)}`) }); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function exportReceipt() {
    if (!snapshot) return;
    const receipt = createReceipt(snapshot, answer, metrics, runtime);
    setReceiptPreview(JSON.stringify(receipt, null, 2));
    try {
      downloadReceipt(receipt);
      setNotice('Receipt download requested. JSON is also available below for inspection and copying. No data was uploaded.');
    } catch {
      setNotice('The download could not be requested. Use the receipt JSON below to inspect or copy it.');
    }
  }

  function changeQuestion(event) {
    setQuestion(event.target.value);
    setAnswer(null); setMetrics(null); setAudit(null); setReceiptPreview(null);
    setNotice('Question changed. Review it to produce a new result and measurements.');
  }

  return <div className="app-shell">
    <a className="skip-link" href="#workbench">Skip to workbench</a>
    <header className="topbar"><a className="brand" href="#workbench" aria-label="Qarinah Evidence Desk home"><span className="brand-mark" aria-hidden="true"><img src="/brand/qarinah-mark.svg" width="34" height="34" alt="" /></span><span>Qarinah<span className="brand-divider">/</span><span className="brand-product">Evidence desk</span></span></a><div className="topbar-right"><span className="workspace-label"><span />Local workspace</span><a className="text-link" href="#connections">Runtime status<Icon name="chevron" size={15} /></a></div></header>
    <aside className="sidebar"><nav aria-label="Workspace"><a className="nav-link active" href="#workbench" aria-current="page"><Icon name="grid" />Review desk</a><a className="nav-link" href="#evidence"><Icon name="file" />Source evidence</a><a className="nav-link" href="#connections"><Icon name="link" />Connections</a></nav><div className="sidebar-note"><Icon name="shield" size={21} /><strong>Evidence before output</strong><p>Sources stay inspectable. Missing or conflicting facts stay visible.</p><span className="local-version">Local prototype · v{runtime?.version || '0.1.0'}</span></div></aside>
    <main id="workbench" className="main-content"><div className="page-heading"><div><p className="page-path">Workspace / Review</p><h1>Evidence review</h1><p className="page-description">Ask a question. Inspect the sources and context behind the result.</p></div><button type="button" className="button secondary export-button" onClick={exportReceipt} disabled={!snapshot || Boolean(busy)}><Icon name="download" />Export receipt</button></div>
      <div className="sr-only" role="status" aria-live="polite">{notice}</div>
      {error && <div className="error-banner" role="alert"><div><strong>Request could not complete</strong><p>{error}</p></div><button type="button" className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" /></button></div>}
      <section className="panel source-loader" aria-labelledby="source-title" aria-busy={busy === 'fixture' || busy === 'source'}><div className="section-heading"><h2 id="source-title">Start with a source</h2><Badge tone={snapshot?.mode === 'synthetic' || snapshot?.handoff?.provenance === 'synthetic-replay' ? 'amber' : 'neutral'}>{snapshotLabel(snapshot)}</Badge></div><div className="loader-layout"><div className="fixture-area"><fieldset disabled={Boolean(busy)}><legend>Local replay</legend><div className="fixture-options">{cases.map(item => <button type="button" key={item.id} className={`fixture-option ${fixture === item.id ? 'selected' : ''}`} aria-pressed={fixture === item.id} onClick={() => setFixture(item.id)}><span className="radio-mark" aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>)}</div></fieldset><div className="fixture-footer"><p>Invented Atlas and Beacon records. No source or model call is made when loading a replay.</p><button type="button" className="button primary" disabled={Boolean(busy)} onClick={() => load('fixture')}>{busy === 'fixture' ? 'Loading replay…' : 'Load replay'}<Icon name="arrow" /></button></div></div><div className="live-area"><div className="live-area-heading"><strong>Zetaris source</strong><Badge tone={runtime?.zetaris?.verified ? 'green' : 'neutral'}>{runtime?.zetaris?.verified ? 'Query verified' : runtime ? (runtime.zetaris?.configured ? 'Configured' : 'Not configured') : 'Unknown'}</Badge></div><label htmlFor="source-query">Approved query</label><div className="source-query-controls"><select id="source-query" value={queryKey} onChange={event => setQueryKey(event.target.value)} disabled={Boolean(busy)}>{Object.entries(queryNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select><button type="button" className="button secondary" disabled={!runtime?.zetaris?.configured || Boolean(busy)} onClick={() => load('source')}>{busy === 'source' ? 'Querying…' : 'Query source'}</button></div><p className="muted">{runtime ? (runtime.zetaris?.configured ? 'Runs the selected read query against the configured source.' : 'Source access is not configured. Local replay is available.') : 'Checking source configuration with the local API.'}</p></div></div></section>
      <HandoffPanel busy={Boolean(busy)} importing={busy === 'handoff'} requestLimit={runtime?.limits?.requestBytes} currentSnapshotId={snapshot?.id} onImport={importHandoff} />
      {snapshot && <div className="snapshot-strip"><span><Icon name="file" size={16} /><strong>{sources.length}</strong> evidence records</span><span><Icon name="clock" size={16} />{expired ? 'Snapshot expired; reload before reviewing' : `Expires ${timeLabel(snapshot.expiresAt)}`}</span><code title={snapshot.id}>{snapshot.id.slice(0, 8)}</code></div>}
      {snapshot?.warnings?.length > 0 && <div className="snapshot-warnings">{snapshot.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</div>}
      <div className="workbench-grid"><div className="review-column"><section className="panel question-panel" aria-labelledby="question-title"><div className="section-heading"><h2 id="question-title">Ask this snapshot</h2><span className="step-label">Evidence-led review</span></div><form onSubmit={review}><label htmlFor="question">Your question</label><textarea ref={questionRef} id="question" name="question" autoComplete="off" value={question} onChange={changeQuestion} rows={3} aria-describedby="question-help question-size" aria-invalid={questionBytes > questionLimit} disabled={Boolean(busy)} /><div className="question-helper"><p id="question-help">Only evidence resolved in the current snapshot can support the result.</p><span id="question-size" className={questionBytes > questionLimit ? 'over-limit' : ''}>{number(questionBytes)} / {number(questionLimit)} B</span></div><div className="review-actions"><label className="model-toggle"><input type="checkbox" name="use-model" autoComplete="off" checked={useModel && modelReady && !handoffMode} onChange={event => setUseModel(event.target.checked)} disabled={handoffMode || !modelReady || Boolean(busy)} /><span>Use Nemotron<span className="muted">{handoffMode ? 'Handoff decisions use deterministic evidence checks' : modelReady ? 'Optional model-assisted review' : 'Not enabled; retrieval remains available'}</span></span></label><button className="button primary" type="submit" disabled={!snapshot || expired || !question.trim() || questionBytes > questionLimit || Boolean(busy)}>{busy === 'answer' ? 'Reviewing evidence…' : 'Review question'}<Icon name="arrow" /></button></div>{useModel && modelReady && !handoffMode && <p className="transmission-notice">Selecting Review question sends your question and selected evidence excerpts to NVIDIA. Enabling this option alone makes no provider request.</p>}{handoffMode && <p className="inline-hint">Supported handoff question: What is the current release decision? This review does not authorize or execute a release.</p>}{!snapshot && <p className="inline-hint">Load a replay, explicit handoff or source snapshot to enable review.</p>}</form></section>
        <section className="panel answer-panel" aria-labelledby="answer-title" aria-busy={busy === 'answer'}><div className="section-heading"><h2 id="answer-title">Review result</h2>{answer && <Badge tone={answer.status === 'abstained' || answer.status === 'unavailable' ? 'amber' : 'green'}>{resultLabel(answer)}</Badge>}</div>{busy === 'answer' ? <div className="answer-skeleton" role="status"><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line short" /><p>Checking the current evidence and assembling bounded context…</p></div> : answer ? <div ref={answerRef} tabIndex={-1} className="answer-result"><p className="answered-question">Reviewed question: {answer.question}</p><p className="answer-text">{answer.answer || answer.reason || 'No supported answer was returned.'}</p><div className="result-meta"><span>{answer.mode === 'nemotron' ? 'Nemotron mode' : 'Retrieval-only mode'}</span><span>{number(answer.citations?.length || 0)} cited records</span><span>{Number.isFinite(metrics?.elapsedMs) ? `${number(metrics.elapsedMs)} ms` : 'Duration unavailable'}</span></div>{answer.claims?.length > 0 && <div className="claims"><h3>Supported claims</h3><ol>{answer.claims.map((claim, i) => <li key={i}><p>{claim.text}</p><div className="citation-list">{claim.citationIds?.map(id => <button type="button" className="citation" key={id} onClick={() => inspect(id)}><Icon name="file" size={13} />{sources.find(source => source.id === id)?.title || id}</button>)}</div></li>)}</ol></div>}{answer.conflicts?.length > 0 && <div className="conflict-box"><h3>Unresolved evidence conflicts</h3>{answer.conflicts.map((conflict, i) => <div key={i}><strong>{conflict.factKey}</strong><div className="citation-list">{conflict.sourceIds.map(id => <button type="button" className="citation" key={id} onClick={() => inspect(id)}>{sources.find(source => source.id === id || source.sourceId === id)?.title || id}</button>)}</div></div>)}</div>}<details className="disclosure"><summary>Selection and exclusion trace<Icon name="chevron" size={15} /></summary><p>{answer.trace?.reason || answer.reason || 'No trace returned.'}</p>{answer.trace?.strategy && <code>{answer.trace.strategy}</code>}{answer.excluded?.length > 0 && <ul className="exclusion-list">{answer.excluded.map((item, i) => <li key={`${item.id}-${i}`}><strong>{sources.find(source => source.id === item.id)?.title || item.id}</strong><span>{item.reason}</span></li>)}</ul>}</details>{answer.memories?.length > 0 && <details className="disclosure"><summary>Recalled memory ({answer.memories.length})<Icon name="chevron" size={15} /></summary><p>Only memory resolvable against this snapshot may enter the answer.</p><ul className="memory-list">{answer.memories.map(memory => <li key={memory.id}><p>{memory.content}</p><small>{memory.source}</small><button type="button" className="text-button" disabled={Boolean(busy)} onClick={() => inspectAudit(memory.id)}>Inspect memory audit<Icon name="chevron" size={13} /></button></li>)}</ul></details>}{audit && <section className="audit-output"><div className="section-heading"><h3>Memory audit</h3><button type="button" className="icon-button" onClick={() => setAudit(null)} aria-label="Close memory audit"><Icon name="close" size={16} /></button></div><code>{audit.id}</code><pre>{JSON.stringify(audit.data, null, 2)}</pre></section>}</div> : <div className="result-empty"><span className="empty-icon"><Icon name="search" size={25} /></span><h3>A result you can inspect</h3><p>Load evidence, then review a question. Citations, conflicts and excluded records will appear here.</p></div>}</section>
        <section className="panel evidence-panel" id="evidence" aria-labelledby="evidence-title"><div className="section-heading"><h2 id="evidence-title">Source evidence<span className="count-tag">{sources.length}</span></h2>{sources.length > 0 && <label className="source-filter"><Icon name="search" size={16} /><input type="search" name="evidence-filter" autoComplete="off" aria-label="Filter visible evidence records" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter sources" /></label>}</div>{sources.length ? <><div className="table-scroll" tabIndex={0} aria-label="Evidence records, scroll horizontally on narrow screens"><table><caption className="sr-only">Evidence in the current snapshot. Selecting a source shows its full text and hash.</caption><thead><tr><th scope="col">Source</th><th scope="col">Observation</th><th scope="col">Review use</th></tr></thead><tbody>{visibleSources.map(source => <tr key={source.id} className={selectedId === source.id ? 'selected-row' : ''}><th scope="row"><button type="button" className="source-button" onClick={() => inspect(source.id)} aria-expanded={selectedId === source.id}>{source.title}<Icon name="chevron" size={14} /></button><code>{source.sourceId}</code></th><td><p className="evidence-excerpt">{source.content}</p><small>{timeLabel(source.observedAt)}</small></td><td><Badge tone={cited.has(source.id) ? 'green' : 'neutral'}>{cited.has(source.id) ? 'Cited' : exclusions.has(source.id) ? 'Excluded' : 'Available'}</Badge></td></tr>)}</tbody></table></div>{visibleSources.length === 0 && <p className="filter-empty">No sources match this filter. <button type="button" className="text-button" onClick={() => setFilter('')}>Clear filter</button></p>}{selected ? <section className="source-detail" ref={detailRef} tabIndex={-1} aria-label={`Source detail: ${selected.title}`}><div className="section-heading"><h3>{selected.title}</h3><button type="button" className="icon-button" onClick={() => setSelectedId(null)} aria-label="Close source detail"><Icon name="close" size={17} /></button></div><p>{selected.content}</p><dl><div><dt>Evidence ID</dt><dd><code>{selected.id}</code></dd></div><div><dt>SHA-256</dt><dd><code>{selected.hash}</code></dd></div><div><dt>Observed</dt><dd>{timeLabel(selected.observedAt)}</dd></div></dl>{exclusions.has(selected.id) && <p className="exclusion-note">Excluded: {exclusions.get(selected.id)}</p>}</section> : <p className="table-help">Select a source to inspect its exact text, observed time and content hash.</p>}</> : <div className="evidence-empty"><Icon name="file" size={24} /><p>No evidence loaded. Choose a replay above or query a configured Zetaris source.</p></div>}</section>
      </div><aside className="inspection-column" aria-label="Context and runtime"><ContextInspector metrics={metrics} runtime={runtime} reviewed={Boolean(answer)} /><Connections runtime={runtime} loading={statusLoading} onRefresh={refreshStatus} /><section className="measurement-note"><Icon name="shield" /><div><strong>Measure the request, keep the evidence.</strong><p>Payload size does not establish answer quality or token savings. Inspect the result and its citations together.</p></div></section></aside></div>{receiptPreview && <details className="panel receipt-preview" open><summary>Receipt JSON</summary><p>Receipt JSON is ready below. Inspect or copy it if your browser did not save a download. Evidence text is included; review it before sharing.</p><label htmlFor="receipt-json">Inspectable local receipt</label><textarea id="receipt-json" readOnly value={receiptPreview} rows={10} spellCheck={false} /></details>}<footer className="desk-footer"><span>Qarinah Evidence Desk</span><span>Local prototype · Replay and provider evidence are kept distinct.</span></footer></main>
  </div>;
}
