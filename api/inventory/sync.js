// POST /api/inventory/sync
//
// Force an immediate sync. Used by the "Sync now" button. Bypasses the
// soft lock so the user always gets fresh data when they ask for it.

import { publicState } from '../_lib/state.js';
import { runSync } from '../_lib/sync.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const result = await runSync({ force: true });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: result.ok,
      initial: !!result.initial,
      added: result.added || 0,
      error: result.error || null,
      state: publicState(result.state || {}),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
