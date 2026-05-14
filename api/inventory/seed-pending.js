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
  fetchEscrowOffers,
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
    const detectedAt = new Date().toISOString();

    // Fetch current inventory and escrow offers in parallel.
    const apiKey = process.env.STEAM_API_KEY;
    const [data, tradeResp] = await Promise.all([
      fetchInventory(process.env.STEAM_ID),
      apiKey ? fetchEscrowOffers(apiKey) : Promise.resolve(null),
    ]);

    const snapshot = buildSnapshotFromInventory(data);

    // Dedupe against anything already pending so re-running the seed
    // doesn't duplicate entries.
    const seen = new Set(
      state.pending.map((p) => `${p.type}:${p.assetid}`)
    );
    const append = [];

    for (const [assetid, info] of Object.entries(snapshot)) {
      const key = `incoming:${assetid}`;
      if (seen.has(key)) continue;
      append.push({ type: 'incoming', detectedAt, assetid, ...info });
      seen.add(key);
    }

    // Add items from escrow (trade hold) offers that aren't in the inventory yet.
    let escrowSeeded = 0;
    if (tradeResp) {
      const descIndex = new Map();
      for (const d of tradeResp.descriptions || []) {
        descIndex.set(`${d.classid}_${d.instanceid}`, d);
      }
      // State 11 = InEscrow
      const escrowOffers = (tradeResp.trade_offers_received || []).filter(
        (o) => o.trade_offer_state === 11
      );
      for (const offer of escrowOffers) {
        for (const asset of offer.items_to_receive || []) {
          if (Number(asset.appid) !== 730) continue;
          if (String(asset.contextid) !== '2') continue;
          const key = `incoming:${asset.assetid}`;
          if (seen.has(key)) continue;
          const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`);
          if (!desc || !desc.market_hash_name) continue;
          append.push({
            type: 'incoming',
            detectedAt,
            assetid: asset.assetid,
            marketHashName: desc.market_hash_name || desc.name || '(unknown)',
            iconUrl: desc.icon_url || '',
          });
          seen.add(key);
          escrowSeeded++;
        }
      }
    }

    const next = {
      ...state,
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
      fromInventory: append.length - escrowSeeded,
      fromEscrow: escrowSeeded,
      totalPending: next.pending.length,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err.message || String(err) });
  }
}
