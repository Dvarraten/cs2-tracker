import { useCallback, useEffect, useRef, useState } from 'react';

// Steam-sync API base URL.
//
// Resolution order:
//   1. REACT_APP_STEAM_SYNC_URL — explicit override (dev)
//   2. '' (empty) — use relative paths /api/inventory/* which works in:
//        • Vercel dev / production (functions live under /api)
//        • CRA dev when proxying via package.json "proxy" field
//
// IMPORTANT: never put secrets in REACT_APP_* variables — they are baked
// into the JS bundle. STEAM_ID and KV credentials live only in Vercel's
// server-side env store.
const BASE = process.env.REACT_APP_STEAM_SYNC_URL || '';

const FRONTEND_POLL_MS = 30 * 1000; // how often we re-pull state for the badge

const EMPTY_STATE = {
  lastSync: null,
  lastSyncOk: null,
  lastError: null,
  hasInitialSnapshot: false,
  pending: [],
  pollIntervalMin: 5,
};

export function useSteamSync() {
  const [state, setState] = useState(EMPTY_STATE);
  const [reachable, setReachable] = useState(null); // null = unknown, false = down, true = up
  const [busy, setBusy] = useState(false);
  const aliveRef = useRef(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/inventory/state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!aliveRef.current) return;
      setState((prev) => ({ ...prev, ...data }));
      setReachable(true);
    } catch (err) {
      if (!aliveRef.current) return;
      setReachable(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BASE}/api/inventory/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.state) {
        setState((prev) => ({ ...prev, ...data.state }));
      } else {
        await fetchState();
      }
      setReachable(true);
    } catch (err) {
      setReachable(false);
    } finally {
      setBusy(false);
    }
  }, [fetchState]);

  const dismiss = useCallback(async (assetid, type) => {
    // Optimistic update so the modal feels snappy.
    setState((prev) => ({
      ...prev,
      pending: prev.pending.filter(
        (p) => !(p.assetid === assetid && (!type || p.type === type))
      ),
    }));
    try {
      await fetch(`${BASE}/api/inventory/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetid, type }),
      });
    } catch (err) {
      // Best-effort: re-pull authoritative state if the call failed.
      fetchState();
    }
  }, [fetchState]);

  useEffect(() => {
    aliveRef.current = true;
    fetchState();
    const id = setInterval(fetchState, FRONTEND_POLL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [fetchState]);

  return {
    pending: state.pending,
    pendingCount: state.pending.length,
    incoming: state.pending.filter((p) => p.type === 'incoming'),
    outgoing: state.pending.filter((p) => p.type === 'outgoing'),
    lastSync: state.lastSync,
    lastSyncOk: state.lastSyncOk,
    lastError: state.lastError,
    hasInitialSnapshot: state.hasInitialSnapshot,
    pollIntervalMin: state.pollIntervalMin,
    reachable,
    busy,
    sync,
    dismiss,
  };
}
