// Upstash Redis adapter for the Steam-sync state.
//
// Single key holds the whole state JSON:
//   {
//     lastSync, lastSyncOk, lastError,
//     hasInitialSnapshot,
//     snapshot:  { [assetid]: { marketHashName, iconUrl } },
//     pending:   [ { type, assetid, marketHashName, iconUrl, detectedAt } ],
//     syncLockAt: epoch ms (used to dedupe concurrent lazy syncs)
//   }
//
// We deliberately keep the whole blob in one key so reads/writes are atomic
// and we don't have to worry about partial state in the diff path. With our
// data sizes (a few hundred items max) this is well under the 1 MB limit.

import { Redis } from '@upstash/redis';

// Per-user state key. Falls back to the legacy shared key when no steamId is given.
const STATE_KEY = (steamId) =>
  steamId ? `skinroi:sync:${steamId}:state` : 'skinroi:state';

// Legacy shared key (kept for migration only).
const LEGACY_SHARED_KEY = 'skinroi:state';

export const DEFAULT_STATE = {
  lastSync: null,
  lastSyncOk: null,
  lastError: null,
  hasInitialSnapshot: false,
  lastTradeTime: 0,
  pending: [],
  syncLockAt: 0,
};

let _client = null;
function getClient() {
  if (_client) return _client;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Upstash Redis env vars missing — expected UPSTASH_REDIS_REST_URL/TOKEN ' +
        'or KV_REST_API_URL/TOKEN. Configure via Vercel → Storage → Upstash.'
    );
  }
  _client = new Redis({ url, token });
  return _client;
}

const LEGACY_CS2_KEY = 'cs2-tracker:state';

export async function loadState(steamId = null) {
  const client = getClient();
  const key = STATE_KEY(steamId);
  const raw = await client.get(key);
  if (raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_STATE, ...parsed };
  }

  // Migration path: if we have a steamId and it matches the env owner,
  // try to migrate from the shared skinroi:state key, then from cs2-tracker:state.
  // We do NOT delete the old keys yet so that a rollback is safe.
  if (steamId && steamId === process.env.STEAM_ID) {
    const shared = await client.get(LEGACY_SHARED_KEY).catch(() => null);
    if (shared) {
      const parsed = typeof shared === 'string' ? JSON.parse(shared) : shared;
      const migrated = { ...DEFAULT_STATE, ...parsed };
      await client.set(key, migrated);
      return migrated;
    }
    const legacy = await client.get(LEGACY_CS2_KEY).catch(() => null);
    if (legacy) {
      const parsed = typeof legacy === 'string' ? JSON.parse(legacy) : legacy;
      const migrated = { ...DEFAULT_STATE, ...parsed };
      await client.set(key, migrated);
      return migrated;
    }
  }

  // Anonymous / no steamId: try the legacy shared key for backward compat.
  if (!steamId) {
    const shared = await client.get(LEGACY_SHARED_KEY).catch(() => null);
    if (shared) {
      const parsed = typeof shared === 'string' ? JSON.parse(shared) : shared;
      return { ...DEFAULT_STATE, ...parsed };
    }
  }

  return { ...DEFAULT_STATE };
}

export async function saveState(state, steamId = null) {
  const client = getClient();
  await client.set(STATE_KEY(steamId), state);
}

// isStateStale is the canonical copy in sync.js; re-exported here as well for
// any callers that import it directly from state.js.
export function isStateStale(state) {
  const STALE_MS = 5 * 60 * 1000;
  if (!state.lastSync) return true;
  return Date.now() - new Date(state.lastSync).getTime() > STALE_MS;
}

// Public-facing slice — never leak the snapshot object (it's large) or the
// internal sync lock to the client.
export function publicState(state, extras = {}) {
  return {
    lastSync: state.lastSync,
    lastSyncOk: state.lastSyncOk,
    lastError: state.lastError,
    hasInitialSnapshot: state.hasInitialSnapshot,
    lastTradeTime: state.lastTradeTime,
    lastTradeTimeHuman: state.lastTradeTime
      ? new Date(state.lastTradeTime * 1000).toISOString()
      : null,
    pending: state.pending,
    pollIntervalMin: 5,
    ...extras,
  };
}
