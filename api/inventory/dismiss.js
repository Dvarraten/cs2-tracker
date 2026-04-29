// POST /api/inventory/dismiss   body: { assetid: string, type?: 'incoming'|'outgoing' }
//
// Removes a pending event so it no longer shows in the modal.

import { loadState, saveState } from '../_lib/state.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Vercel Node functions auto-parse JSON, but be defensive.
  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : (() => {
          try { return JSON.parse(req.body || '{}'); } catch { return {}; }
        })();

  const assetid = typeof body.assetid === 'string' ? body.assetid : null;
  const type = body.type === 'incoming' || body.type === 'outgoing' ? body.type : null;

  if (!assetid) {
    return res.status(400).json({ error: 'assetid (string) required' });
  }

  try {
    const state = await loadState();
    const before = state.pending.length;
    const next = {
      ...state,
      pending: state.pending.filter((p) =>
        type ? !(p.assetid === assetid && p.type === type) : p.assetid !== assetid
      ),
    };
    const removed = before - next.pending.length;
    await saveState(next);

    return res.status(200).json({
      ok: true,
      removed,
      pending: next.pending,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
