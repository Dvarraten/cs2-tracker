import { loadState, saveState, DEFAULT_STATE } from './state.js';
import {
  fetchTradeHistory,
  fetchInventory,
  buildSnapshotFromInventory,
  fetchAssetClassInfo,
} from './steam.js';

export const POLL_INTERVAL_MIN = 5;
export const STALE_THRESHOLD_MS = POLL_INTERVAL_MIN * 60 * 1000;
const LOCK_TTL_MS = 90 * 1000;

export function isStateStale(state) {
  if (!state.lastSync) return true;
  return Date.now() - new Date(state.lastSync).getTime() > STALE_THRESHOLD_MS;
}

function buildDescIndex(descriptions = []) {
  const index = new Map();
  for (const d of descriptions) index.set(`${d.classid}_${d.instanceid}`, d);
  return index;
}

export async function runSync({ force = false } = {}) {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const state = await loadState();

  if (!force && state.syncLockAt && startedAtMs - state.syncLockAt < LOCK_TTL_MS) {
    return { ok: true, skipped: 'locked', state };
  }

  state.syncLockAt = startedAtMs;
  await saveState(state);

  try {
    const apiKey = process.env.STEAM_API_KEY;
    const steamId = process.env.STEAM_ID;

    // First run (or after a reset): take inventory snapshot as baseline and
    // immediately surface any items that are on a trade/market hold — these
    // are definitively new acquisitions that haven't been tracked yet.
    if (!state.hasInitialSnapshot) {
      let snapshot = state.snapshot ?? null;
      const firstRunPending = [];
      if (steamId) {
        try {
          const data = await fetchInventory(steamId);
          snapshot = buildSnapshotFromInventory(data);
          const descIndex = new Map();
          for (const d of data.descriptions || []) {
            descIndex.set(`${d.classid}_${d.instanceid}`, d);
          }
          const alreadyPending = new Set(state.pending.map(p => p.assetid));
          for (const asset of data.assets || []) {
            if (Number(asset.appid) !== 730 || String(asset.contextid) !== '2') continue;
            const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`);
            if (!desc || !(desc.market_tradable_restriction > 0)) continue;
            if (alreadyPending.has(asset.assetid)) continue;
            firstRunPending.push({
              type: 'incoming',
              assetid: asset.assetid,
              marketHashName: desc.market_hash_name || desc.name || '(unknown)',
              iconUrl: desc.icon_url || '',
              detectedAt: startedAt,
            });
          }
        } catch { /* leave snapshot null */ }
      }
      const next = {
        ...state,
        hasInitialSnapshot: true,
        snapshot,
        pending: state.pending.concat(firstRunPending),
        lastTradeTime: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
        lastSync: startedAt,
        lastSyncOk: true,
        lastError: null,
        syncLockAt: 0,
      };
      await saveState(next);
      return { ok: true, initial: true, added: firstRunPending.length, state: next };
    }

    // Run trade history check and inventory fetch in parallel.
    const [response, inventoryData] = await Promise.all([
      fetchTradeHistory(apiKey),
      steamId ? fetchInventory(steamId).catch(() => null) : Promise.resolve(null),
    ]);

    const descIndex = buildDescIndex(response.descriptions);

    // k_ETradeStatus: 2=Committed, 3=Complete, 10=InEscrow
    const RELEVANT_STATUSES = new Set([2, 3, 10]);
    const trades = (response.trades || []).filter(t => RELEVANT_STATUSES.has(t.status));

    // Resolve missing descriptions via GetAssetClassInfo.
    const allAssets = trades.flatMap(t => [
      ...(t.assets_received || []),
      ...(t.assets_given || []),
    ]).filter(a => Number(a.appid) === 730 && String(a.contextid) === '2');

    const missingDescs = allAssets.filter(
      a => !descIndex.has(`${a.classid}_${a.instanceid}`)
    );
    if (missingDescs.length && apiKey) {
      const fallback = await fetchAssetClassInfo(apiKey, missingDescs.map(a => ({
        classid: a.classid,
        instanceid: a.instanceid,
      })));
      for (const [k, v] of fallback) descIndex.set(k, v);
    }

    const seen = new Set(state.pending.map(p => `${p.type}:${p.assetid}`));
    const processedTrades = new Set(state.processedTradeIds || []);
    const append = [];
    const newTradeIds = [];
    let maxTime = state.lastTradeTime || 0;

    for (const trade of trades) {
      maxTime = Math.max(maxTime, trade.time_init || 0);
      if (processedTrades.has(trade.tradeid)) continue;

      const addAssets = (assets, type) => {
        for (const asset of assets || []) {
          if (Number(asset.appid) !== 730) continue;
          if (String(asset.contextid) !== '2') continue;
          const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`)
            || descIndex.get(`${asset.classid}_0`);
          if (!desc || !desc.market_hash_name) continue;
          const assetid = asset.new_assetid || asset.assetid;
          const key = `${type}:${assetid}`;
          if (seen.has(key)) continue;
          append.push({
            type,
            assetid,
            tradeid: trade.tradeid,
            marketHashName: desc.market_hash_name || desc.name || '(unknown)',
            iconUrl: desc.icon_url || '',
            detectedAt: new Date((trade.time_init || 0) * 1000).toISOString(),
          });
          seen.add(key);
        }
      };

      addAssets(trade.assets_received, 'incoming');
      addAssets(trade.assets_given, 'outgoing');
      newTradeIds.push(trade.tradeid);
      processedTrades.add(trade.tradeid);
    }

    // Inventory snapshot diff — catches items from marketplace trades or Steam
    // Market purchases where GetTradeOffers is delayed or returns no state 11.
    // Only items with an active hold (market_tradable_restriction > 0) are
    // surfaced: those are definitively recent acquisitions. Fully tradable
    // items are skipped to avoid flagging pre-existing stock that predates
    // the snapshot baseline.
    let newSnapshot = state.snapshot ?? null;
    if (inventoryData) {
      newSnapshot = buildSnapshotFromInventory(inventoryData);
      if (state.snapshot != null) {
        const prevAssetids = new Set(Object.keys(state.snapshot));
        const invDescIndex = new Map();
        for (const d of inventoryData.descriptions || []) {
          invDescIndex.set(`${d.classid}_${d.instanceid}`, d);
        }
        for (const asset of inventoryData.assets || []) {
          if (Number(asset.appid) !== 730 || String(asset.contextid) !== '2') continue;
          if (prevAssetids.has(asset.assetid)) continue;
          const desc = invDescIndex.get(`${asset.classid}_${asset.instanceid}`);
          if (!desc || !(desc.market_tradable_restriction > 0)) continue;
          const key = `incoming:${asset.assetid}`;
          if (seen.has(key)) continue;
          append.push({
            type: 'incoming',
            assetid: asset.assetid,
            marketHashName: desc.market_hash_name || desc.name || '(unknown)',
            iconUrl: desc.icon_url || '',
            detectedAt: startedAt,
          });
          seen.add(key);
        }
      }
    }

    const next = {
      ...state,
      pending: state.pending.concat(append),
      snapshot: newSnapshot !== null ? newSnapshot : state.snapshot,
      processedTradeIds: [...processedTrades].slice(-500),
      lastTradeTime: maxTime,
      lastSync: startedAt,
      lastSyncOk: true,
      lastError: null,
      syncLockAt: 0,
    };
    await saveState(next);
    return { ok: true, added: append.length, state: next };

  } catch (err) {
    const failed = {
      ...state,
      lastSync: startedAt,
      lastSyncOk: false,
      lastError: err.message || String(err),
      syncLockAt: 0,
    };
    await saveState(failed);
    return { ok: false, error: failed.lastError, state: failed };
  }
}

export default runSync;
export { DEFAULT_STATE };
