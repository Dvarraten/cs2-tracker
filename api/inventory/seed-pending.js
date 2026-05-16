// POST /api/inventory/seed-pending?confirm=yes
//
// One-shot helper: seeds pending from current inventory + InEscrow trades.
// Useful for first-time setup or after a reset.

import { loadState, saveState } from '../_lib/state.js';
import {
  fetchInventory,
  buildSnapshotFromInventory,
  fetchTradeHistory,
  fetchAssetClassInfo,
} from '../_lib/steam.js';
import { getSessionSteamId } from '../_lib/auth.js';
import { getAccessToken } from '../_lib/steam-session.js';

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

  const steamId = getSessionSteamId(req) || null;
  const effectiveSteamId = steamId || process.env.STEAM_ID;

  try {
    const state = await loadState(steamId);
    const detectedAt = new Date().toISOString();
    const now = Math.floor(Date.now() / 1000);
    const apiKey = process.env.STEAM_API_KEY;
    const accessToken = await getAccessToken(effectiveSteamId);

    const [data, tradeResp] = await Promise.all([
      fetchInventory(effectiveSteamId),
      fetchTradeHistory(accessToken, apiKey).catch(() => null),
    ]);

    const snapshot = buildSnapshotFromInventory(data);

    const inventoryClassIds = new Set();
    for (const d of data.descriptions || []) {
      inventoryClassIds.add(`${d.classid}_${d.instanceid}`);
    }

    const seen = new Set(state.pending.map((p) => `${p.type}:${p.assetid}`));
    const append = [];

    // 1. All items currently visible in inventory.
    for (const [assetid, info] of Object.entries(snapshot)) {
      const key = `incoming:${assetid}`;
      if (seen.has(key)) continue;
      append.push({ type: 'incoming', detectedAt, assetid, ...info });
      seen.add(key);
    }

    // 2. InEscrow trades (k_ETradeStatus_InEscrow = 10) — items in hold,
    //    not yet in inventory.
    if (tradeResp) {
      const descIndex = new Map();
      for (const d of tradeResp.descriptions || []) {
        descIndex.set(`${d.classid}_${d.instanceid}`, d);
      }

      const escrowTrades = (tradeResp.trades || []).filter(t => t.status === 10);
      const candidates = [];
      for (const trade of escrowTrades) {
        for (const asset of trade.assets_received || []) {
          if (Number(asset.appid) !== 730) continue;
          if (String(asset.contextid) !== '2') continue;
          const ck = `${asset.classid}_${asset.instanceid}`;
          if (inventoryClassIds.has(ck)) continue; // already in inventory
          candidates.push(asset);
        }
      }

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
        const assetid = asset.new_assetid || asset.assetid;
        const key = `incoming:${assetid}`;
        if (seen.has(key)) continue;
        const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`)
          || descIndex.get(`${asset.classid}_0`);
        if (!desc || !desc.market_hash_name) continue;
        append.push({
          type: 'incoming',
          detectedAt,
          assetid,
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
      lastTradeTime: now,
      syncLockAt: Date.now(),
    };
    await saveState(next, steamId);

    return res.status(200).json({
      ok: true,
      seeded: append.length,
      totalPending: next.pending.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
