import React, { useState } from 'react';
import { bytes, request, timeLabel } from './api.js';

export default function ReceiptVerifier() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const oversized = bytes(text) > 16_384;
  async function verify(event) {
    event.preventDefault();
    setError(''); setResult(null);
    let receipt;
    try { receipt = JSON.parse(text); } catch { setError('Paste a complete JSON receipt before verifying.'); return; }
    if (oversized || busy) return;
    setBusy(true);
    try { setResult(await request('/api/receipt/verify', receipt)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <details className="panel receipt-preview receipt-verifier">
    <summary>Verify a saved release review</summary>
    <p>Reproduce its decision and citations locally, then assess the same packet at verification time. This does not authenticate CI or reread external sources.</p>
    <form onSubmit={verify} aria-busy={busy}>
      <label htmlFor="verify-receipt-json">Exported v2 handoff receipt</label>
      <textarea id="verify-receipt-json" value={text} onChange={event => { setText(event.target.value); setResult(null); setError(''); }} disabled={busy} rows={5} spellCheck={false} autoComplete="off" aria-describedby="verify-receipt-help verify-receipt-error" aria-invalid={Boolean(error || oversized)} placeholder="Paste an exported developer-handoff receipt. Nothing is checked until you select Verify receipt." />
      <p id="verify-receipt-help">Browser limit: 16 KiB. The offline CLI accepts up to 128 KiB. Legacy exports without the original packet and review time cannot be replayed.</p>
      <p id="verify-receipt-error" role={error || oversized ? 'alert' : undefined}>{oversized ? 'This receipt exceeds 16 KiB. Use the offline CLI for a larger receipt.' : error}</p>
      <button type="submit" className="button secondary" disabled={!text.trim() || oversized || busy}>{busy ? 'Replaying receipt…' : 'Verify receipt'}</button>
    </form>
    {result && <section className="receipt-verification-result" role="status" aria-label="Receipt verification result">
      <h3>Saved decision reproduced</h3>
      <dl className="metric-list">
        <div className="metric-row"><dt>Recorded decision</dt><dd>{result.recorded.decision || result.recorded.status}</dd></div>
        <div className="metric-row"><dt>Packet assessment at check</dt><dd>{result.current.decision || result.current.status}</dd></div>
        <div className="metric-row"><dt>Source records checked</dt><dd>{result.sourceRecordsChecked}</dd></div>
        <div className="metric-row"><dt>Original review</dt><dd>{timeLabel(result.reviewedAt)}</dd></div>
        <div className="metric-row"><dt>Checked at</dt><dd><time dateTime={result.checkedAt} title={result.checkedAt}>{timeLabel(result.checkedAt)}</time></dd></div>
      </dl>
      <p>{result.snapshotExpiredNow ? 'At this check, the snapshot had expired. Historical consistency does not make its old result current.' : 'This dated assessment uses only the saved observations. Verify again to reassess freshness; no new evidence is fetched.'}</p>
      <p>Source provenance: {result.provenance}. Producer identity and historical CI execution are not independently authenticated. A consistently rewritten receipt can pass; hashes are not signatures.</p>
    </section>}
  </details>;
}
