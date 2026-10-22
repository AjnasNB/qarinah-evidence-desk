const base = (import.meta.env?.VITE_API_BASE || '').replace(/\/$/, '');

export async function request(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let value;
    try { value = await response.json(); }
    catch { throw new Error('The local API did not return JSON. Check that the desk server is running.'); }
    if (!response.ok) throw new Error(value?.error?.message || `The request failed (${response.status}).`);
    return value;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Your current snapshot is unchanged. Try again when the source is available.');
    if (error instanceof TypeError) throw new Error('Cannot reach the local API. Check the server connection, then try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export const bytes = (value) => new TextEncoder().encode(value).length;
export const number = (value) => Number.isFinite(value) ? new Intl.NumberFormat().format(value) : 'Unknown';
export const byteLabel = (value) => Number.isFinite(value) ? `${number(value)} B` : 'Not measured';
export function timeLabel(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return 'Unknown time';
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown time' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(date);
  } catch {
    return 'Unknown time';
  }
}

export function resultLabel(result) {
  if (result?.status === 'answered') {
    if (result.mode === 'retrieval-only' && ['ready', 'hold'].includes(result.releaseDecision)) return 'Deterministic release review';
    return result.mode === 'nemotron' ? 'Model-assisted answer' : 'Evidence review';
  }
  return { retrieved: 'Retrieved evidence', abstained: 'Answer withheld', unavailable: 'Provider unavailable' }[result?.status] || 'Review complete';
}

export function createReceipt(snapshot, answer, metrics, runtime) {
  return {
    schema: 'qarinah.evidence-desk.receipt.v1',
    exportedAt: new Date().toISOString(),
    snapshot,
    answer,
    metrics,
    runtime: runtime ? { memory: runtime.memory, zetaris: runtime.zetaris, nemotron: runtime.nemotron, limits: runtime.limits } : null,
    notes: [
      'Synthetic mode is a local replay; it is not a verified sponsor or model call.',
      'Imported handoff statements are supplied evidence, not independent CI verification or authorization to release.',
      'Byte metrics measure serialized UTF-8 payloads. They are not provider token estimates.',
      'Full-context metrics are counterfactual comparisons, not a second executed request.',
      'Only a provider usage receipt establishes actual token counts. Configured does not mean verified.',
    ],
  };
}

export function downloadReceipt(receipt) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `qarinah-evidence-${receipt.snapshot.id}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
