// POST /api/inventory/seed-pending?confirm=yes
//
// One-shot helper that takes the *current* Steam inventory and pushes EVERY
// asset into the pending list as an "incoming" entry. Useful for first-time
// setup or after a fresh reset, when you want to bulk-pick which items to
// track instead of typing them in by hand.
//
// Note: this can produce a long pending list (one entry per asset in your
// inventory). The frontend modal lets you dismiss in batches.
//
// Like /reset, this is gated by ?confirm=yes to dodge accidental hits.

import { loadState, saveState } from '../_lib/state.js';
import {
  fetchInventory,
  buildSnapshotFromInventory,
} from '../_lib/steam.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if ((req.query?.confirm || req.query?.CONFIRM) !== 'yes') {
    return res.status(400).json({
      error: 'add ?confirm=yes to the URL to actually seed pending',
    });
  }

  try {
    const state = await loadState();
    const data = await fetchInventory(process.env.STEAM_ID);
    const snapshot = buildSnapshotFromInventory(data);
    const detectedAt = new Date().toISOString();

    // Dedupe against anything already pending so re-running the seed
    // doesn't duplicate entries.
    const seen = new Set(
      state.pending.map((p) => `${p.type}:${p.assetid}`)
    );
    const append = [];
    for (const [assetid, info] of Object.entries(snapshot)) {
      const key = `incoming:${assetid}`;
      if (seen.has(key)) continue;
      append.push({
        type: 'incoming',
        detectedAt,
        assetid,
        ...info,
      });
      seen.add(key);
    }

    const next = {
      ...state,
      // Update snapshot too so subsequent normal syncs only surface NEW
      // items (otherwise the next diff would also try to add everything).
      snapshot,
      hasInitialSnapshot: true,
      pending: state.pending.concat(append),
      lastSync: detectedAt,
      lastSyncOk: true,
      lastError: null,
      syncLockAt: 0,
    };
    await saveState(next);

    return res.status(200).json({
      ok: true,
      seeded: append.length,
      totalPending: next.pending.length,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err.message || String(err) });
  }
}
