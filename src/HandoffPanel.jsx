import React, { useMemo, useState } from 'react';
import { byteLabel, bytes, timeLabel } from './api.js';

function inspectInput(text, limit) {
  if (!text.trim()) return { value: null, error: '' };
  if (bytes(text) > limit) return { value: null, error: `Keep pasted JSON within ${byteLabel(limit)}.` };
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { value: null, error: 'Paste one JSON object containing explicit handoff observations.' };
    }
    if (value.format !== 'qarinah-handoff-v1') {
      return { value: null, error: 'The format must be qarinah-handoff-v1.' };
    }
    if (!['local-observation', 'synthetic-replay'].includes(value.provenance)) {
      return { value: null, error: 'Set provenance to local-observation or synthetic-replay.' };
    }
    if (!Array.isArray(value.revisions) || !Array.isArray(value.ci) || !Array.isArray(value.releases)) {
      return { value: null, error: 'Include revisions, ci and releases arrays. Missing observations may leave a decision unsupported.' };
    }
    return { value, error: '' };
  } catch {
    return { value: null, error: 'This is not valid JSON yet. Check quotes, commas and brackets.' };
  }
}

function PreviewValue({ children }) {
  return <code className="handoff-preview-value">{children || 'Not supplied'}</code>;
}

export default function HandoffPanel({ busy, importing, requestLimit, currentSnapshotId, onImport }) {
  const [text, setText] = useState('');
  const [importError, setImportError] = useState('');
  const [imported, setImported] = useState(false);
  const limit = requestLimit || 16_384;
  const parsed = useMemo(() => inspectInput(text, limit), [text, limit]);
  const value = parsed.value;
  const current = value?.revisions.find(item => item?.id === value.currentRevisionRef);
  const inputBytes = bytes(text);

  function updateText(event) {
    setText(event.target.value);
    setImportError('');
    setImported(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (!value || busy) return;
    setImportError('');
    try {
      setImported(await onImport(value));
    } catch (error) {
      setImportError(error.message || 'The handoff could not be imported. Review the observation fields.');
    }
  }

  return (
    <section className="panel handoff-panel" aria-labelledby="handoff-title" aria-busy={importing}>
      <div className="section-heading">
        <div>
          <h2 id="handoff-title">Developer handoff</h2>
          <p className="handoff-description">Review a release statement against its revision and CI evidence.</p>
        </div>
        <span className="badge badge-neutral">Explicit JSON import</span>
      </div>

      <form onSubmit={submit}>
        <div className="handoff-layout">
          <div className="handoff-editor">
            <label htmlFor="handoff-json">Observations you chose to share</label>
            <textarea
              id="handoff-json"
              name="handoff-json"
              autoComplete="off"
              spellCheck={false}
              value={text}
              onChange={updateText}
              rows={7}
              placeholder={'Paste a qarinah-handoff-v1 JSON object here.\nNothing is imported until you select Import handoff.'}
              aria-describedby="handoff-help handoff-size handoff-error"
              aria-invalid={Boolean(parsed.error || importError)}
              disabled={busy}
            />
            <div className="handoff-input-help">
              <p id="handoff-help">No automatic filesystem or chat reads. Import sends this JSON to the local desk and stores bounded observations in its memory.</p>
              <span id="handoff-size" className={inputBytes > limit ? 'over-limit' : ''}>
                {byteLabel(inputBytes)} / {byteLabel(limit)}
              </span>
            </div>
          </div>

          <div className="handoff-preview" aria-label="Pasted handoff preview">
            <div className="handoff-preview-heading">
              <h3>Input preview</h3>
              <span>{value ? 'Parsed · not verified' : 'Nothing imported'}</span>
            </div>
            {value ? (
              <>
                <dl className="handoff-preview-meta">
                  <div><dt>Project</dt><dd><PreviewValue>{typeof value.project === 'string' ? value.project : ''}</PreviewValue></dd></div>
                  <div><dt>Source mode</dt><dd>{value.provenance === 'synthetic-replay' ? 'Synthetic replay' : 'Supplied local observations'}</dd></div>
                  <div><dt>Current revision</dt><dd><PreviewValue>{typeof current?.commit === 'string' ? current.commit : ''}</PreviewValue></dd></div>
                  <div><dt>Working tree</dt><dd>{current?.dirty === true ? 'Changes present' : current?.dirty === false ? 'Reported clean' : 'Unknown'}</dd></div>
                </dl>
                <div className="handoff-observation-group">
                  <h3>CI observations <span>({value.ci.length})</span></h3>
                  {value.ci.length ? (
                    <ul>{value.ci.slice(0, 6).map((item, index) => (
                      <li key={index}>
                        <span>{typeof item?.check === 'string' ? item.check : 'Unknown check'} · <PreviewValue>{typeof item?.revisionRef === 'string' ? item.revisionRef : ''}</PreviewValue></span>
                        <strong className={item?.outcome === 'failed' ? 'handoff-warning' : ''}>{typeof item?.outcome === 'string' ? item.outcome : 'unknown'}</strong>
                      </li>
                    ))}</ul>
                  ) : <p>No CI results supplied.</p>}
                </div>
                <div className="handoff-observation-group">
                  <h3>Release statements <span>({value.releases.length})</span></h3>
                  {value.releases.length ? (
                    <ul>{value.releases.slice(0, 3).map((item, index) => (
                      <li key={index}>
                        <span>{typeof item?.revisionRef === 'string' ? item.revisionRef : 'Unknown revision'}<small>{timeLabel(item?.observedAt)}</small></span>
                        <strong>{typeof item?.decision === 'string' ? item.decision : 'unknown'}</strong>
                      </li>
                    ))}</ul>
                  ) : <p>No release statement supplied.</p>}
                </div>
                <p className="handoff-preview-note">These are supplied statements, not independently verified CI results or permission to release. References, freshness and conflicts are checked after import.</p>
              </>
            ) : (
              <p className="handoff-preview-empty">Paste JSON to inspect its current revision, CI outcomes and release statements before importing.</p>
            )}
          </div>
        </div>

        <div id="handoff-error" className="handoff-input-error" role={importError ? 'alert' : undefined}>
          {importError || parsed.error}
        </div>
        <div className="handoff-footer">
          <p role="status">{imported && imported === currentSnapshotId ? 'Imported. Review the release-decision question below to inspect citations or an abstention.' : imported ? 'This input was imported earlier. The active snapshot has changed; import again to make this handoff current.' : 'Import creates a separate evidence snapshot. Editing or clearing this input does not change the active snapshot. The desk never approves or executes a release.'}</p>
          <div className="handoff-buttons">
            <button type="button" className="text-button" disabled={!text || busy} onClick={() => { setText(''); setImportError(''); setImported(false); }}>Clear input</button>
            <button type="submit" className="button primary" disabled={!value || busy}>{importing ? 'Importing…' : 'Import handoff'}</button>
          </div>
        </div>
      </form>
    </section>
  );
}
