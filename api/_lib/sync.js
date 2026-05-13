import { loadState, saveState, DEFAULT_STATE } from './state.js';
import { fetchTradeHistory } from './steam.js';

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

    // First run: record current time as baseline, generate no events.
    if (!state.hasInitialSnapshot) {
      const next = {
        ...state,
        hasInitialSnapshot: true,
        lastTradeTime: Math.floor(Date.now() / 1000),
        lastSync: startedAt,
        lastSyncOk: true,
        lastError: null,
        syncLockAt: 0,
      };
      await saveState(next);
      return { ok: true, initial: true, state: next };
    }

    const response = await fetchTradeHistory(apiKey, state.lastTradeTime || 0);

    // Descriptions may be top-level or per-trade depending on Steam API version.
    const descIndex = buildDescIndex(response.descriptions);
    const trades = (response.trades || []).filter(t => t.status === 3);
    for (const trade of trades) {
      for (const [k, v] of buildDescIndex(trade.descriptions)) {
        if (!descIndex.has(k)) descIndex.set(k, v);
      }
    }

    const seen = new Set(state.pending.map(p => `${p.type}:${p.assetid}`));
    const append = [];
    let maxTime = state.lastTradeTime || 0;

    for (const trade of trades) {
      maxTime = Math.max(maxTime, trade.time_init || 0);

      const addAssets = (assets, type) => {
        for (const asset of assets || []) {
          if (Number(asset.appid) !== 730) continue;
          if (String(asset.contextid) !== '2') continue;
          const desc = descIndex.get(`${asset.classid}_${asset.instanceid}`);
          if (!desc || !desc.market_hash_name) continue;
          // new_assetid is the item's ID in your inventory after the trade completed.
          const assetid = asset.new_assetid || asset.assetid;
          const key = `${type}:${assetid}`;
          if (seen.has(key)) continue;
          append.push({
            type,
            assetid,
            marketHashName: desc.market_hash_name || desc.name || '(unknown)',
            iconUrl: desc.icon_url || '',
            detectedAt: new Date((trade.time_init || 0) * 1000).toISOString(),
          });
          seen.add(key);
        }
      };

      addAssets(trade.assets_received, 'incoming');
      addAssets(trade.assets_given, 'outgoing');
    }

    const next = {
      ...state,
      pending: state.pending.concat(append),
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
