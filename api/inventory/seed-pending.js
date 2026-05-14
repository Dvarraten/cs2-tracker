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
  fetchRecentReceivedOffers,
  fetchAssetClassInfo,
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

    // Fetch current inventory and recent received trade offers in parallel.
    // Trade-hold items are hidden from the public inventory API but appear
    // in accepted (state 3) or escrow (state 11) offers from the last 7 days.
    const apiKey = process.env.STEAM_API_KEY;
    const [data, tradeResp] = await Promise.all([
      fetchInventory(process.env.STEAM_ID),
      apiKey ? fetchRecentReceivedOffers(apiKey) : Promise.resolve(null),
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

    // Add items from recent trade offers not already captured by the inventory.
    // State 3 = Accepted (item delivered but may be on trade hold, hidden from
    // public inventory). State 11 = InEscrow (not yet delivered).
    // Steam often omits descriptions for historical offers, so we fall back to
    // GetAssetClassInfo for any items without a name.
    let tradeSeeded = 0;
    if (tradeResp) {
      const descIndex = new Map();
      for (const d of tradeResp.descriptions || []) {
        descIndex.set(`${d.classid}_${d.instanceid}`, d);
      }

      const recentOffers = (tradeResp.trade_offers_received || []).filter(
        (o) => o.trade_offer_state === 3 || o.trade_offer_state === 11
      );
      const cs2Assets = recentOffers.flatMap(o =>
        (o.items_to_receive || []).filter(
          a => Number(a.appid) === 730 && String(a.contextid) === '2'
        )
      );

      // Fetch descriptions for any items Steam didn't include in the response.
      const missing = cs2Assets.filter(
        a => !descIndex.has(`${a.classid}_${a.instanceid}`)
      );
      if (missing.length && apiKey) {
        const fallback = await fetchAssetClassInfo(apiKey, missing.map(a => ({
          classid: a.classid,
          instanceid: a.instanceid,
        })));
        for (const [k, v] of fallback) descIndex.set(k, v);
      }

      for (const asset of cs2Assets) {
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
          iconUrl: desc.icon_url || desc.icon_url_large || '',
        });
        seen.add(key);
        tradeSeeded++;
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

    // Debug block — remove once trade-hold seeding is confirmed working.
    const _debug = tradeResp ? (() => {
      const recentOffers = (tradeResp.trade_offers_received || []).filter(
        o => o.trade_offer_state === 3 || o.trade_offer_state === 11
      );
      const allAssets = recentOffers.flatMap(o => o.items_to_receive || []);
      const cs2 = allAssets.filter(a => Number(a.appid) === 730);
      const stateBreakdown = (tradeResp.trade_offers_received || []).reduce((acc, o) => {
        acc[o.trade_offer_state] = (acc[o.trade_offer_state] || 0) + 1; return acc;
      }, {});
      return {
        totalReceived: (tradeResp.trade_offers_received || []).length,
        stateBreakdown,
        recentOffersCount: recentOffers.length,
        totalAssetsInRecentOffers: allAssets.length,
        cs2AssetsCount: cs2.length,
        descriptionCount: (tradeResp.descriptions || []).length,
        sampleCs2Assets: cs2.slice(0, 3).map(a => ({
          assetid: a.assetid, appid: a.appid, classid: a.classid, instanceid: a.instanceid,
          alreadyInPending: seen.has(`incoming:${a.assetid}`),
        })),
      };
    })() : null;

    return res.status(200).json({
      ok: true,
      seeded: append.length,
      fromInventory: append.length - tradeSeeded,
      fromTrades: tradeSeeded,
      totalPending: next.pending.length,
      _debug,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err.message || String(err) });
  }
}
