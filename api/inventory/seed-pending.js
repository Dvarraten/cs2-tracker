// POST /api/inventory/seed-pending?confirm=yes
//
// One-shot helper that takes the *current* Steam inventory and pushes EVERY
// asset into the pending list as an "incoming" entry. Useful for first-time
// setup or after a fresh reset, when you want to bulk-pick which items to
// track instead of typing them in by hand.
//
// Trade-hold items (hidden from the public inventory API) are found via
// recent trade offers using this logic:
//   - Offer < 7 days old, item not in inventory → on trade hold, include
//   - Offer 7+ days old, item not in inventory → hold expired, was sold, skip
//   - Item classid+instanceid already in inventory → captured by inventory
//     path already, skip to avoid duplicates
//
// Like /reset, this is gated by ?confirm=yes to dodge accidental hits.

import { loadState, saveState } from '../_lib/state.js';
import {
  fetchInventory,
  buildSnapshotFromInventory,
  fetchRecentReceivedOffers,
  fetchAssetClassInfo,
} from '../_lib/steam.js';

const HOLD_MAX_SECS = 15 * 24 * 60 * 60;

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
    const now = Math.floor(Date.now() / 1000);

    const apiKey = process.env.STEAM_API_KEY;
    const [data, tradeResp] = await Promise.all([
      fetchInventory(process.env.STEAM_ID),
      apiKey ? fetchRecentReceivedOffers(apiKey) : Promise.resolve(null),
    ]);

    const snapshot = buildSnapshotFromInventory(data);

    // Build a set of classid_instanceid from current inventory so we can
    // skip trade-offer items that are already captured by the inventory path.
    const inventoryClassIds = new Set();
    for (const d of data.descriptions || []) {
      inventoryClassIds.add(`${d.classid}_${d.instanceid}`);
    }

    const seen = new Set(state.pending.map((p) => `${p.type}:${p.assetid}`));
    const append = [];

    // 1. All items currently visible in the public inventory.
    for (const [assetid, info] of Object.entries(snapshot)) {
      const key = `incoming:${assetid}`;
      if (seen.has(key)) continue;
      append.push({ type: 'incoming', detectedAt, assetid, ...info });
      seen.add(key);
    }

    // 2. Trade-hold items hidden from the public inventory API.
    if (tradeResp) {
      const descIndex = new Map();
      for (const d of tradeResp.descriptions || []) {
        descIndex.set(`${d.classid}_${d.instanceid}`, d);
      }

      const recentOffers = (tradeResp.trade_offers_received || []).filter(
        (o) => o.trade_offer_state === 3 || o.trade_offer_state === 11
      );

      // Collect only CS2 assets from offers that could contain held items.
      const candidates = [];
      for (const offer of recentOffers) {
        const offerAge = now - (offer.time_updated || offer.time_created || 0);
        for (const asset of offer.items_to_receive || []) {
          if (Number(asset.appid) !== 730) continue;
          if (String(asset.contextid) !== '2') continue;
          const ck = `${asset.classid}_${asset.instanceid}`;
          // Already in inventory (new assetid) — inventory path handles it.
          if (inventoryClassIds.has(ck)) continue;
          // Hold expired and item not in inventory — it was sold.
          if (offerAge > HOLD_MAX_SECS) continue;
          candidates.push(asset);
        }
      }

      // Resolve descriptions via GetAssetClassInfo (Steam omits them for
      // historical offers).
      const missing = candidates.filter(
        a => !descIndex.has(`${a.classid}_${a.instanceid}`)
      );
      if (missing.length && apiKey) {
        const fallback = await fetchAssetClassInfo(apiKey, missing.map(a => ({
          classid: a.classid,
          instanceid: a.instanceid,
        })));
        for (const [k, v] of fallback) descIndex.set(k, v);
      }

      for (const asset of candidates) {
        const key = `incoming:${asset.assetid}`;
        if (seen.has(key)) continue;
        const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`)
          || descIndex.get(`${asset.classid}_0`);
        if (!desc || !desc.market_hash_name) continue;
        append.push({
          type: 'incoming',
          detectedAt,
          assetid: asset.assetid,
          marketHashName: desc.market_hash_name,
          iconUrl: desc.icon_url || '',
        });
        seen.add(key);
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
      // Hold the sync lock briefly so a concurrent lazy-sync triggered by the
      // frontend loading state can't overwrite the freshly seeded pending list.
      syncLockAt: Date.now(),
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
