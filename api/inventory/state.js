// GET /api/inventory/state
//
// Returns the current pending list + sync metadata. Performs a *lazy* sync
// inline if the snapshot is older than 5 minutes — this is how we avoid
// needing a Vercel cron job (which the Hobby plan throttles to once/day).
// The lazy path holds a soft lock so concurrent requests don't double-sync.

import { loadState, publicState } from '../_lib/state.js';
import { runSync, isStateStale } from '../_lib/sync.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    let state = await loadState();

    if (isStateStale(state)) {
      const result = await runSync();
      if (result.state) state = result.state;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(publicState(state));
  } catch (err) {
    return res.status(500).json({
      error: err.message || String(err),
      hint: 'Check that STEAM_ID and KV_REST_API_* env vars are set in Vercel',
    });
  }
}
