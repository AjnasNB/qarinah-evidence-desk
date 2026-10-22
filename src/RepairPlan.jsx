import React from 'react';
import './repair-plan.css';

const facts = { revision: 'Source revision', tests: 'Tests', build: 'Build', release: 'Release recommendation', evidence: 'Evidence packet' };
export default function RepairPlan({ plan, snapshot, busy, sourceConfigured, historical, onRefresh, onInspect }) {
  if (!plan || !['complete', 'refresh-needed', 'blocked'].includes(plan.status) || !Array.isArray(plan.items)) return null;
  const reread = plan.refresh === 'reread-current-release' && snapshot?.transport?.provider === 'zetaris' && snapshot.transport.queryKey === 'current-release';
  const ids = new Set(snapshot?.sources?.map(source => source.id) || []);
  const label = historical ? 'Historical plan' : plan.status === 'complete' ? 'Evidence complete' : plan.status === 'blocked' ? 'Source work needed' : 'Updated evidence needed';
  return <section className="repair-plan" aria-labelledby="repair-plan-title">
    <div className="repair-plan-heading"><h3 id="repair-plan-title">Next steps</h3><span className={`badge badge-${!historical && plan.status === 'complete' ? 'green' : 'amber'}`}>{label}</span></div>
    <p>{historical ? 'This plan describes the earlier review. Read or import current evidence before acting on it.' : plan.summary}</p>
    {plan.items.length > 0 && <ol>{plan.items.slice(0, 6).map((item, index) => <li key={`${item.fact}-${item.kind}-${index}`}>
      <div className="repair-item-heading"><strong>{facts[item.fact] || 'Evidence packet'}</strong><span>{item.kind}</span></div>
      <p>{item.action}</p>
      <div className="repair-evidence">{Array.isArray(item.evidenceIds) && item.evidenceIds.filter(id => ids.has(id)).slice(0, 6).map(id => <button key={id} type="button" className="citation" disabled={busy} onClick={() => onInspect(id)} aria-label={`Inspect repair evidence ${id}`}><code>{id}</code></button>)}</div>
    </li>)}</ol>}
    <div className="repair-plan-action">{reread ? <><button type="button" className="button button-secondary" disabled={busy || !sourceConfigured} onClick={onRefresh}>Read current release evidence</button><p>A reread only retrieves observations. Failed checks and working-tree changes require real work and new results at their source.</p>{!sourceConfigured && <p>The approved current-release source must be configured before it can be read.</p>}</> : <><a className="text-button" href="#handoff-json">Import updated evidence</a><p>Capture genuine observations at their source, then use Developer handoff above to import them. Importing evidence does not run CI or deploy a release.</p></>}</div>
  </section>;
}
