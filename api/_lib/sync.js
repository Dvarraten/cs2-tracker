import { loadState, saveState, DEFAULT_STATE } from './state.js';
import {
  fetchTradeOffers,
  fetchInventory,
  buildSnapshotFromInventory,
  diffSnapshots,
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

    // Run trade offer check and inventory fetch in parallel.
    const [response, inventoryData] = await Promise.all([
      fetchTradeOffers(apiKey, state.lastTradeTime || 0),
      steamId ? fetchInventory(steamId).catch(() => null) : Promise.resolve(null),
    ]);

    const descIndex = buildDescIndex(response.descriptions);

    // Steam often omits descriptions for historical offers — resolve any gaps
    // via GetAssetClassInfo so items without names aren't silently dropped.
    const VALID_STATES = new Set([3, 11]);
    const received = (response.trade_offers_received || []).filter(o => VALID_STATES.has(o.trade_offer_state));
    const sent = (response.trade_offers_sent || []).filter(o => VALID_STATES.has(o.trade_offer_state));

    const allAssets = [
      ...received.flatMap(o => o.items_to_receive || []),
      ...sent.flatMap(o => o.items_to_give || []),
    ].filter(a => Number(a.appid) === 730 && String(a.contextid) === '2');

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
    const append = [];
    let maxTime = state.lastTradeTime || 0;

    const addAssets = (assets, type, timeUpdated) => {
      for (const asset of assets || []) {
        if (Number(asset.appid) !== 730) continue;
        if (String(asset.contextid) !== '2') continue;
        const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`)
          || descIndex.get(`${asset.classid}_0`);
        if (!desc || !desc.market_hash_name) continue;
        const assetid = asset.assetid;
        const key = `${type}:${assetid}`;
        if (seen.has(key)) continue;
        append.push({
          type,
          assetid,
          marketHashName: desc.market_hash_name || desc.name || '(unknown)',
          iconUrl: desc.icon_url || '',
          detectedAt: new Date((timeUpdated || 0) * 1000).toISOString(),
        });
        seen.add(key);
      }
    };

    for (const offer of received) {
      maxTime = Math.max(maxTime, offer.time_updated || offer.time_created || 0);
      addAssets(offer.items_to_receive, 'incoming', offer.time_updated || offer.time_created);
    }
    for (const offer of sent) {
      maxTime = Math.max(maxTime, offer.time_updated || offer.time_created || 0);
      addAssets(offer.items_to_give, 'outgoing', offer.time_updated || offer.time_created);
    }

    // Inventory snapshot diff — catches items from Steam Market purchases
    // that don't create trade offers (they land directly in inventory with
    // a market_tradable_restriction hold).
    let newSnapshot = state.snapshot ?? null;
    if (inventoryData) {
      newSnapshot = buildSnapshotFromInventory(inventoryData);
      if (state.snapshot != null) {
        const { incoming: newItems } = diffSnapshots(state.snapshot, newSnapshot);
        for (const item of newItems) {
          const key = `incoming:${item.assetid}`;
          if (seen.has(key)) continue;
          append.push({
            type: 'incoming',
            assetid: item.assetid,
            marketHashName: item.marketHashName,
            iconUrl: item.iconUrl,
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
