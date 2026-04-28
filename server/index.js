// Local Steam inventory proxy for the cs2-tracker frontend.
//
// Responsibilities:
//   1. Periodically fetch the user's public CS2 inventory from
//      steamcommunity.com (no API key required for public inventories).
//   2. Diff the new snapshot against the previous one to detect
//      incoming and outgoing assetids.
//   3. Persist last snapshot + pending events to disk so we don't
//      lose state on restart.
//   4. Expose a tiny HTTP API to the React frontend (CORS scoped
//      to localhost:3000 by default).
//
// Security notes:
//   - This server is intended to run on the user's local machine.
//   - It does NOT expose a SteamID-as-input endpoint to the world.
//     The SteamID is read once from .env and never accepted from
//     a request — that prevents accidentally turning this into an
//     open inventory-scraping proxy if the port is exposed.
//   - No Steam Web API key is used. If you ever add one, keep it
//     in .env, never in code, never in a REACT_APP_* variable.

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ─── Config ─────────────────────────────────────────────────────────────────
const STEAM_ID = (process.env.STEAM_ID || '').trim();
const PORT = parseInt(process.env.PORT || '3001', 10);
const POLL_INTERVAL_MIN = Math.max(
  1,
  parseInt(process.env.POLL_INTERVAL_MIN || '5', 10)
);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const DATA_DIR = path.join(__dirname, 'data');
const STATE_PATH = path.join(DATA_DIR, 'state.json');

if (!STEAM_ID || !/^\d{17}$/.test(STEAM_ID)) {
  console.error(
    '[fatal] STEAM_ID is missing or malformed in server/.env. ' +
      'Expected a 17-digit SteamID64. Aborting.'
  );
  process.exit(1);
}

// ─── State persistence ──────────────────────────────────────────────────────
const DEFAULT_STATE = {
  lastSync: null,
  lastSyncOk: null,
  lastError: null,
  hasInitialSnapshot: false,
  // assetid -> { marketHashName, iconUrl }
  snapshot: {},
  // [{ type: 'incoming'|'outgoing', assetid, marketHashName, iconUrl, detectedAt }]
  pending: [],
};

let state = { ...DEFAULT_STATE };
let writeQueue = Promise.resolve();

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function loadState() {
  try {
    const raw = await fsp.readFile(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    state = { ...DEFAULT_STATE, ...parsed };
    console.log(
      `[state] loaded — pending=${state.pending.length}, snapshot=${
        Object.keys(state.snapshot).length
      } items, lastSync=${state.lastSync || 'never'}`
    );
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[state] no existing state file, starting fresh');
    } else {
      console.warn('[state] failed to load, starting fresh:', err.message);
    }
    state = { ...DEFAULT_STATE };
  }
}

function persistState() {
  // Serialise writes so concurrent syncs don't race.
  writeQueue = writeQueue.then(async () => {
    try {
      const tmp = `${STATE_PATH}.tmp`;
      await fsp.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
      await fsp.rename(tmp, STATE_PATH);
    } catch (err) {
      console.error('[state] write failed:', err.message);
    }
  });
  return writeQueue;
}

// ─── Steam fetcher ──────────────────────────────────────────────────────────
async function fetchInventory() {
  const url = `https://steamcommunity.com/inventory/${STEAM_ID}/730/2?l=english&count=5000`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Steam's CDN can be picky without a UA.
        'User-Agent': 'cs2-tracker-local/0.1 (+local)',
        Accept: 'application/json',
      },
    });
    if (res.status === 403) {
      throw new Error('inventory is private (HTTP 403)');
    }
    if (res.status === 429) {
      throw new Error('rate-limited by Steam (HTTP 429)');
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    if (!text) {
      // Steam returns empty body when inventory is private/hidden in some cases.
      throw new Error('empty response (inventory may be private)');
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('non-JSON response from Steam');
    }
    if (!data || !data.success) {
      throw new Error('Steam returned success=0 (inventory private?)');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function buildSnapshotFromInventory(data) {
  const descIndex = new Map();
  for (const d of data.descriptions || []) {
    descIndex.set(`${d.classid}_${d.instanceid}`, d);
  }
  const snapshot = {};
  for (const a of data.assets || []) {
    const desc = descIndex.get(`${a.classid}_${a.instanceid}`);
    if (!desc) continue;
    snapshot[a.assetid] = {
      marketHashName: desc.market_hash_name || desc.name || '(unknown)',
      iconUrl: desc.icon_url || '',
    };
  }
  return snapshot;
}

// ─── Diff + state update ───────────────────────────────────────────────────
function diffSnapshots(prev, next) {
  const incoming = [];
  const outgoing = [];
  for (const [assetid, info] of Object.entries(next)) {
    if (!prev[assetid]) incoming.push({ assetid, ...info });
  }
  for (const [assetid, info] of Object.entries(prev)) {
    if (!next[assetid]) outgoing.push({ assetid, ...info });
  }
  return { incoming, outgoing };
}

let syncInFlight = null;

async function runSync() {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const startedAt = new Date().toISOString();
    try {
      const data = await fetchInventory();
      const nextSnapshot = buildSnapshotFromInventory(data);

      if (!state.hasInitialSnapshot) {
        // First successful sync — seed snapshot, do NOT generate events
        // (otherwise everything you already own would flood the modal).
        state.snapshot = nextSnapshot;
        state.hasInitialSnapshot = true;
        state.lastSync = startedAt;
        state.lastSyncOk = true;
        state.lastError = null;
        await persistState();
        console.log(
          `[sync] initial snapshot taken — ${Object.keys(nextSnapshot).length} items`
        );
        return { ok: true, initial: true };
      }

      const { incoming, outgoing } = diffSnapshots(state.snapshot, nextSnapshot);

      // Append new pending events, dedup by (type, assetid).
      const seen = new Set(
        state.pending.map((p) => `${p.type}:${p.assetid}`)
      );
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

      state.pending = state.pending.concat(append);
      state.snapshot = nextSnapshot;
      state.lastSync = startedAt;
      state.lastSyncOk = true;
      state.lastError = null;
      await persistState();

      if (append.length) {
        console.log(
          `[sync] ${incoming.length} incoming, ${outgoing.length} outgoing (added ${append.length} pending)`
        );
      } else {
        console.log('[sync] no changes');
      }
      return { ok: true, added: append.length };
    } catch (err) {
      state.lastSync = startedAt;
      state.lastSyncOk = false;
      state.lastError = err.message || String(err);
      await persistState();
      console.warn('[sync] failed:', state.lastError);
      return { ok: false, error: state.lastError };
    }
  })();
  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

// ─── HTTP API ───────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '64kb' }));

// Light request log
app.use((req, _res, next) => {
  console.log(`[http] ${req.method} ${req.url}`);
  next();
});

// Friendly root + /api index so opening localhost:3001 in a browser
// confirms the server is alive instead of returning a confusing 404.
function buildStatusPayload() {
  return {
    ok: true,
    service: 'cs2-tracker local Steam sync',
    steamIdConfigured: Boolean(STEAM_ID),
    pollIntervalMin: POLL_INTERVAL_MIN,
    lastSync: state.lastSync,
    lastSyncOk: state.lastSyncOk,
    lastError: state.lastError,
    hasInitialSnapshot: state.hasInitialSnapshot,
    pendingCount: state.pending.length,
    endpoints: [
      'GET  /api/inventory/state    → current pending list + sync status',
      'POST /api/inventory/sync     → trigger sync now',
      'POST /api/inventory/dismiss  → body { assetid, type? } to dismiss',
    ],
  };
}

app.get('/', (_req, res) => res.json(buildStatusPayload()));
app.get('/api', (_req, res) => res.json(buildStatusPayload()));

app.get('/api/inventory/state', (_req, res) => {
  res.json({
    lastSync: state.lastSync,
    lastSyncOk: state.lastSyncOk,
    lastError: state.lastError,
    hasInitialSnapshot: state.hasInitialSnapshot,
    pending: state.pending,
    pollIntervalMin: POLL_INTERVAL_MIN,
  });
});

app.post('/api/inventory/sync', async (_req, res) => {
  const result = await runSync();
  res.json({
    ...result,
    state: {
      lastSync: state.lastSync,
      lastSyncOk: state.lastSyncOk,
      lastError: state.lastError,
      pending: state.pending,
    },
  });
});

app.post('/api/inventory/dismiss', async (req, res) => {
  const { assetid, type } = req.body || {};
  if (typeof assetid !== 'string' || !assetid) {
    return res.status(400).json({ error: 'assetid (string) required' });
  }
  const before = state.pending.length;
  state.pending = state.pending.filter((p) =>
    type ? !(p.assetid === assetid && p.type === type) : p.assetid !== assetid
  );
  const removed = before - state.pending.length;
  await persistState();
  res.json({ ok: true, removed, pending: state.pending });
});

// 404 — JSON, not HTML
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

// ─── Boot ──────────────────────────────────────────────────────────────────
(async () => {
  await ensureDataDir();
  await loadState();

  app.listen(PORT, '127.0.0.1', () => {
    console.log(
      `[boot] cs2-tracker server listening on http://127.0.0.1:${PORT}`
    );
    console.log(
      `[boot] polling Steam every ${POLL_INTERVAL_MIN} min for SteamID ${STEAM_ID.slice(0, 7)}…`
    );
  });

  // Kick off first sync after a short delay so log output is readable.
  setTimeout(() => { runSync(); }, 2000);
  setInterval(() => { runSync(); }, POLL_INTERVAL_MIN * 60 * 1000);
})();
