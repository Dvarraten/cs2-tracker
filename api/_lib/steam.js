// Steam inventory fetcher — pure functions, no I/O state. Same behaviour as
// the local server: browser-like headers, count=2000 max, retries across
// URL variants if one returns null/400.

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Vercel Hobby allows up to 60s when maxDuration is set in vercel.json
// (we ask for 30s). 25s gives us a generous window for the Steam call
// without leaving us hanging right at the platform limit.
const FETCH_TIMEOUT_MS = 25000;
const MAX_BODY_SNIPPET = 400;

function browserHeaders(steamId) {
  return {
    'User-Agent': BROWSER_UA,
    Accept:
      'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
    Origin: 'https://steamcommunity.com',
  };
}

async function attempt(url, headers) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

// Single-page fetch with the URL-variant retry. Returns the parsed JSON or
// throws. Used internally by fetchInventory which handles pagination.
async function fetchInventoryPage(steamId, startAssetId = null) {
  const headers = browserHeaders(steamId);
  const cursor = startAssetId ? `&start_assetid=${startAssetId}` : '';
  const variants = [
    `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000${cursor}`,
    `https://steamcommunity.com/inventory/${steamId}/730/2?count=2000${cursor}`,
    `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=1000${cursor}`,
  ];

  let lastErr = null;
  for (const url of variants) {
    try {
      const { status, text } = await attempt(url, headers);
      const snippet = (text || '').slice(0, MAX_BODY_SNIPPET);

      if (status === 403) throw new Error(`HTTP 403 — body: ${snippet}`);
      if (status === 429) throw new Error(`HTTP 429 (rate-limited) — body: ${snippet}`);
      if (!text) throw new Error(`HTTP ${status} empty body`);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${status} non-JSON body: ${snippet}`);
      }

      if (data === null) {
        lastErr = new Error(`HTTP ${status} body=null`);
        continue;
      }
      if (status === 400) {
        lastErr = new Error(`HTTP 400 body: ${snippet}`);
        continue;
      }
      if (!data.success) {
        lastErr = new Error(
          `Steam success=${data.success}; Error="${data.Error || ''}"`
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

export async function fetchInventory(steamId) {
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    throw new Error('STEAM_ID env var missing or malformed (expected 17 digits)');
  }

  // Steam paginates inventory responses. With count=2000 + total ~77 items
  // we'd expect a single page, but in practice Steam sometimes splits
  // across several anyway. Follow `more_items` / `last_assetid` until we
  // exhaust the inventory or hit our page cap.
  const MAX_PAGES = 6;
  const allAssets = [];
  const descByCK = new Map(); // dedupe descriptions across pages
  let cursor = null;
  let firstPage = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchInventoryPage(steamId, cursor);
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

export function buildSnapshotFromInventory(data) {
  const descIndex = new Map();
  for (const d of data.descriptions || []) {
    descIndex.set(`${d.classid}_${d.instanceid}`, d);
  }
  const snapshot = {};
  for (const a of data.assets || []) {
    const desc = descIndex.get(`${a.classid}_${a.instanceid}`);
    if (!desc) continue;

    // Skip permanently non-marketable items (service medals, pins, graffiti,
    // default-grade junk). These never get a market_tradable_restriction.
    //
    // Items on trade hold are temporarily non-marketable but carry a
    // market_tradable_restriction > 0, so we keep them — this is how we
    // detect incoming items before the hold expires.
    if (desc.marketable === 0 && !(desc.market_tradable_restriction > 0)) continue;

    snapshot[a.assetid] = {
      marketHashName: desc.market_hash_name || desc.name || '(unknown)',
      iconUrl: desc.icon_url || '',
    };
  }
  return snapshot;
}


// Fetch item descriptions from Steam when GetTradeOffers doesn't return them.
// classInstances is an array of { classid, instanceid } objects.
// Batches in groups of 25 to stay within Steam's URL length limits.
export async function fetchAssetClassInfo(apiKey, classInstances) {
  if (!classInstances.length) return new Map();
  const BATCH = 25;
  const map = new Map();

  for (let i = 0; i < classInstances.length; i += BATCH) {
    const batch = classInstances.slice(i, i + BATCH);
    const params = new URLSearchParams({
      key: apiKey,
      appid: '730',
      class_count: String(batch.length),
      language: 'english',
    });
    batch.forEach(({ classid, instanceid }, j) => {
      params.set(`classid${j}`, classid);
      if (instanceid && instanceid !== '0') params.set(`instanceid${j}`, instanceid);
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v0001/?${params}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const result = data.result || {};
      batch.forEach(({ classid, instanceid }) => {
        const key = `${classid}_${instanceid || '0'}`;
        const info = result[key] || result[classid];
        if (info && info.market_hash_name) {
          map.set(key, {
            market_hash_name: info.market_hash_name,
            icon_url: info.icon_url || info.icon_url_large || '',
          });
        }
      });
    } catch {
      // skip failed batch, continue with next
    } finally {
      clearTimeout(timer);
    }
  }
  return map;
}

// Fetch the 100 most recent trades from IEconService/GetTradeHistory.
// start_after_time is a backwards pagination cursor (gives trades OLDER than
// the time), so we omit it to always get the most recent 100 trades.
// processedTradeIds in sync state handles deduplication across syncs.
//
// accessToken — per-user JWT access token (preferred); may be empty string.
// apiKey      — STEAM_API_KEY; used as fallback auth and for GetAssetClassInfo.
export async function fetchTradeHistory(accessToken = '', apiKey = '') {
  const params = new URLSearchParams({
    max_trades: '100',
    get_descriptions: '1',
    language: 'english',
    include_failed: '0',
    navigating_back: '0',
  });
  if (accessToken) params.set('access_token', accessToken);
  if (apiKey) params.set('key', apiKey);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(
      `https://api.steampowered.com/IEconService/GetTradeHistory/v1/?${params}`
    );
    if (!res.ok) throw new Error(`Steam API HTTP ${res.status}`);
    const data = await res.json();
    if (!data.response) throw new Error('Steam API returned no response object');
    const resp = data.response;
    return {
      trades: resp.trades || [],
      descriptions: resp.descriptions || [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export function diffSnapshots(prev, next) {
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
