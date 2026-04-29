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

const STATE_KEY = 'cs2-tracker:state';

export const DEFAULT_STATE = {
  lastSync: null,
  lastSyncOk: null,
  lastError: null,
  hasInitialSnapshot: false,
  snapshot: {},
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

export async function loadState() {
  const client = getClient();
  const raw = await client.get(STATE_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  // @upstash/redis auto-deserialises JSON; older clients return strings.
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { ...DEFAULT_STATE, ...parsed };
}

export async function saveState(state) {
  const client = getClient();
  await client.set(STATE_KEY, state);
}

// Public-facing slice — never leak the snapshot object (it's large) or the
// internal sync lock to the client.
export function publicState(state, extras = {}) {
  return {
    lastSync: state.lastSync,
    lastSyncOk: state.lastSyncOk,
    lastError: state.lastError,
    hasInitialSnapshot: state.hasInitialSnapshot,
    pending: state.pending,
    pollIntervalMin: 5,
    ...extras,
  };
}
