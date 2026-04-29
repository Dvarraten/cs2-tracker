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

    // Skip items Steam itself classifies as non-marketable: service medals,
    // pins, graffiti boxes, default-grade items, etc. These have no market
    // price, so tracking them as P&L positions makes no sense.
    //
    // Important: this is NOT the same as `tradable === 0`. Trade-locked
    // skins (e.g. just-purchased items with a 7-day cooldown) keep
    // `marketable: 1` and `market_tradable_restriction: 7`, so they pass
    // through this filter correctly.
    if (desc.marketable === 0) continue;

    snapshot[a.assetid] = {
      marketHashName: desc.market_hash_name || desc.name || '(unknown)',
      iconUrl: desc.icon_url || '',
    };
  }
  return snapshot;
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
