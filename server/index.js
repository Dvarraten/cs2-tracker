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

const { setSessionCookie, clearSessionCookie, getSessionSteamId } = require('./lib/auth');

// Lazy Redis client (only created when Upstash env vars are present).
let _redis = null;
async function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  _redis = new Redis({ url, token });
  return _redis;
}

function itemsKey(steamId) {
  return `cs2-tracker:items:${steamId}`;
}

async function getSteamProfile(steamId) {
  const redis = await getRedis();
  const key = `cs2-tracker:profile:${steamId}`;
  if (redis) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) return cached;
  }
  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const xml = await res.text();
    const avatarMatch = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);
    const nameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
    const profile = {
      avatarUrl: avatarMatch?.[1] || null,
      personaName: nameMatch?.[1] || null,
    };
    if (redis && profile.avatarUrl) redis.set(key, profile, { ex: 86400 }).catch(() => {});
    return profile;
  } catch {
    return { avatarUrl: null, personaName: null };
  }
}

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
  lastTradeTime: 0,
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
// Steam's public inventory endpoint is finicky:
//   - A custom User-Agent often returns HTTP 400.
//   - count > 2000 returns HTTP 400.
//   - Sometimes the same request that 400s once succeeds a moment later.
// So we mimic a real browser and try a couple of URL variants before giving up.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `https://steamcommunity.com/profiles/${STEAM_ID}/inventory/`,
  Origin: 'https://steamcommunity.com',
};

const FETCH_TIMEOUT_MS = 15000;
const MAX_BODY_SNIPPET = 400;

async function fetchInventoryAttempt(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: BROWSER_HEADERS });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchInventoryPage(startAssetId = null) {
  const cursor = startAssetId ? `&start_assetid=${startAssetId}` : '';
  const variants = [
    `https://steamcommunity.com/inventory/${STEAM_ID}/730/2?l=english&count=2000${cursor}`,
    `https://steamcommunity.com/inventory/${STEAM_ID}/730/2?count=2000${cursor}`,
    `https://steamcommunity.com/inventory/${STEAM_ID}/730/2?l=english&count=1000${cursor}`,
  ];

  let lastErr = null;
  for (const url of variants) {
    try {
      const { status, text } = await fetchInventoryAttempt(url);
      const snippet = (text || '').slice(0, MAX_BODY_SNIPPET);

      if (status === 403) throw new Error(`HTTP 403 (forbidden) — body: ${snippet}`);
      if (status === 429) throw new Error(`HTTP 429 (rate-limited) — body: ${snippet}`);
      if (!text) throw new Error(`HTTP ${status} with empty body`);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${status} non-JSON body: ${snippet}`);
      }

      if (data === null) {
        lastErr = new Error(`HTTP ${status} body=null (inventory hidden or empty context)`);
        continue;
      }
      if (status === 400) {
        lastErr = new Error(`HTTP 400 body: ${snippet}`);
        continue;
      }
      if (!data.success) {
        lastErr = new Error(
          `Steam returned success=${data.success}; Error="${data.Error || ''}" body: ${snippet}`
        );
        continue;
      }

      return data;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('all inventory variants failed');
}

async function fetchInventory() {
  // Follow Steam's pagination so we don't silently miss items past the
  // first page (Steam uses `more_items` + `last_assetid` for cursoring).
  const MAX_PAGES = 6;
  const allAssets = [];
  const descByCK = new Map();
  let cursor = null;
  let firstPage = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchInventoryPage(cursor);
    if (page === 0) firstPage = data;
    for (const a of data.assets || []) allAssets.push(a);
    for (const d of data.descriptions || []) {
      descByCK.set(`${d.classid}_${d.instanceid}`, d);
    }
    if (!data.more_items || !data.last_assetid) break;
    cursor = data.last_assetid;
  }

  return {
    success: 1,
    assets: allAssets,
    descriptions: Array.from(descByCK.values()),
    total_inventory_count: firstPage?.total_inventory_count ?? allAssets.length,
  };
}

// ─── Trade history fetcher ──────────────────────────────────────────────────
async function fetchTradeHistory(afterTime = 0) {
  const apiKey = (process.env.STEAM_API_KEY || '').trim();
  if (!apiKey) throw new Error('STEAM_API_KEY is not set in server/.env');

  const params = new URLSearchParams({
    key: apiKey,
    max_trades: '100',
    include_failed: '0',
    get_descriptions: '1',
    language: 'english',
    navigating_back: '0',
  });
  if (afterTime > 0) params.set('start_after_time', String(afterTime));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(
      `https://api.steampowered.com/IEconService/GetTradeHistory/v1/?${params}`,
      { signal: ctrl.signal }
    );
    if (!res.ok) throw new Error(`Steam API HTTP ${res.status}`);
    const data = await res.json();
    if (!data.response) throw new Error('Steam API returned no response object');
    return data.response;
  } finally {
    clearTimeout(timer);
  }
}

function buildDescIndex(descriptions = []) {
  const index = new Map();
  for (const d of descriptions) index.set(`${d.classid}_${d.instanceid}`, d);
  return index;
}

// ─── Sync ───────────────────────────────────────────────────────────────────
let syncInFlight = null;

async function runSync() {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const startedAt = new Date().toISOString();
    try {
      // First run: record current time, generate no events.
      if (!state.hasInitialSnapshot) {
        state.hasInitialSnapshot = true;
        state.lastTradeTime = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
        state.lastSync = startedAt;
        state.lastSyncOk = true;
        state.lastError = null;
        await persistState();
        console.log('[sync] initialized — tracking trades from now');
        return { ok: true, initial: true };
      }

      const response = await fetchTradeHistory(state.lastTradeTime || 0);

      const descIndex = buildDescIndex(response.descriptions);
      const trades = (response.trades || []).filter(t => t.status === 3 || t.status === 11);
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

      state.pending = state.pending.concat(append);
      state.lastTradeTime = maxTime;
      state.lastSync = startedAt;
      state.lastSyncOk = true;
      state.lastError = null;
      await persistState();

      console.log(append.length ? `[sync] ${append.length} new trade events` : '[sync] no new trades');
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

// ─── Auth routes ────────────────────────────────────────────────────────────
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

app.get('/api/auth/steam', (_req, res) => {
  const returnTo = `${APP_URL}/api/auth/callback`;
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': APP_URL + '/',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  res.redirect(302, `https://steamcommunity.com/openid/login?${params}`);
});

app.get('/api/auth/callback', async (req, res) => {
  const query = req.query || {};
  const verifyParams = new URLSearchParams({ ...query, 'openid.mode': 'check_authentication' });
  let text;
  try {
    const verifyRes = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
    });
    text = await verifyRes.text();
  } catch {
    return res.status(502).send('Could not reach Steam to verify login');
  }
  if (!text.includes('is_valid:true')) return res.status(401).send('Steam login validation failed');

  const claimedId = query['openid.claimed_id'] || '';
  const match = claimedId.match(/\/(\d{17})$/);
  if (!match) return res.status(400).send('Invalid Steam ID');
  const steamId = match[1];

  const allowedId = (process.env.STEAM_ID || '').trim();
  if (allowedId && steamId !== allowedId) return res.status(403).send('This tracker is private');

  setSessionCookie(res, steamId);
  res.redirect(302, APP_URL + '/');
});

app.get('/api/auth/me', async (req, res) => {
  const steamId = getSessionSteamId(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!steamId) return res.json({ user: null });
  const { avatarUrl, personaName } = await getSteamProfile(steamId);
  res.json({ user: { steamId, avatarUrl, personaName } });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ─── Items (cloud storage) ───────────────────────────────────────────────────
app.get('/api/items', async (req, res) => {
  const steamId = getSessionSteamId(req);
  if (!steamId) return res.status(401).json({ error: 'not authenticated' });
  const redis = await getRedis();
  if (!redis) return res.status(503).json({ error: 'Redis not configured' });
  const items = await redis.get(itemsKey(steamId));
  res.setHeader('Cache-Control', 'no-store');
  res.json({ items: Array.isArray(items) ? items : [] });
});

app.post('/api/items', async (req, res) => {
  const steamId = getSessionSteamId(req);
  if (!steamId) return res.status(401).json({ error: 'not authenticated' });
  const { items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  const redis = await getRedis();
  if (!redis) return res.status(503).json({ error: 'Redis not configured' });
  await redis.set(itemsKey(steamId), items);
  res.json({ ok: true, count: items.length });
});

// ─── Status + inventory routes ───────────────────────────────────────────────
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

// Diagnostic — calls Steam directly and returns raw status + body snippet.
// Useful when sync fails so we can see what Steam is actually saying.
app.get('/api/inventory/debug', async (_req, res) => {
  const url = `https://steamcommunity.com/inventory/${STEAM_ID}/730/2?l=english&count=2000`;
  try {
    const { status, text } = await fetchInventoryAttempt(url);
    res.json({
      url,
      status,
      bodyLength: text.length,
      bodySnippet: text.slice(0, 600),
      headers: BROWSER_HEADERS,
    });
  } catch (err) {
    res.status(500).json({ url, error: err.message || String(err) });
  }
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
