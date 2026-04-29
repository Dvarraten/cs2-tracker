// Shared sync orchestration. Used by both the manual sync endpoint and the
// lazy-sync path inside the state endpoint.

import { loadState, saveState, DEFAULT_STATE } from './state.js';
import {
  fetchInventory,
  buildSnapshotFromInventory,
  diffSnapshots,
} from './steam.js';

export const POLL_INTERVAL_MIN = 5;
export const STALE_THRESHOLD_MS = POLL_INTERVAL_MIN * 60 * 1000;

// Soft lock so two concurrent requests (e.g. the every-30s frontend poll
// firing twice) don't both run a full sync. The lock is just a timestamp
// inside the state blob; we treat it as "held" if it's < 90 s old.
const LOCK_TTL_MS = 90 * 1000;

export function isStateStale(state) {
  if (!state.lastSync) return true;
  const ageMs = Date.now() - new Date(state.lastSync).getTime();
  return ageMs > STALE_THRESHOLD_MS;
}

export async function runSync({ force = false } = {}) {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  const state = await loadState();

  // Honour soft lock unless caller asked for force=true (manual sync button).
  if (!force) {
    if (state.syncLockAt && startedAtMs - state.syncLockAt < LOCK_TTL_MS) {
      return { ok: true, skipped: 'locked', state };
    }
  }

  // Take the lock immediately so concurrent requests bow out.
  state.syncLockAt = startedAtMs;
  await saveState(state);

  try {
    const data = await fetchInventory(process.env.STEAM_ID);
    const nextSnapshot = buildSnapshotFromInventory(data);

    if (!state.hasInitialSnapshot) {
      // First sync — seed silently, no events.
      const next = {
        ...state,
        snapshot: nextSnapshot,
        hasInitialSnapshot: true,
        lastSync: startedAt,
        lastSyncOk: true,
        lastError: null,
        syncLockAt: 0,
      };
      await saveState(next);
      return { ok: true, initial: true, state: next };
    }

    const { incoming, outgoing } = diffSnapshots(state.snapshot, nextSnapshot);

    const seen = new Set(state.pending.map((p) => `${p.type}:${p.assetid}`));
    const append = [];
    for (const item of incoming) {
      const key = `incoming:${item.assetid}`;
      if (!seen.has(key)) {
        append.push({ type: 'incoming', detectedAt: startedAt, ...item });
        seen.add(key);
      }
    }
    for (const item of outgoing) {
      const key = `outgoing:${item.assetid}`;
      if (!seen.has(key)) {
        append.push({ type: 'outgoing', detectedAt: startedAt, ...item });
        seen.add(key);
      }
    }

    const next = {
      ...state,
      pending: state.pending.concat(append),
      snapshot: nextSnapshot,
      lastSync: startedAt,
      lastSyncOk: true,
      lastError: null,
      syncLockAt: 0,
    };
    await saveState(next);

    return { ok: true, added: append.length, state: next };
  } catch (err) {
    // Release lock + record the failure so the frontend can show it.
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

// Default export so functions can `import runSync from '../_lib/sync.js'`
// if they prefer that style.
export default runSync;

// Re-export DEFAULT_STATE for convenience.
export { DEFAULT_STATE };
