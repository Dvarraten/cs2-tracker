// GET /api/inventory/debug?confirm=yes
//
// Hits Steam directly from the Vercel function and returns:
//   - the raw HTTP status
//   - the first 800 chars of the body (so we can see error text)
//   - the parsed asset count + sample
//   - per-tradability counts (helps confirm trade-locked items are present)
//
// Locked behind ?confirm=yes so a random visitor doesn't trigger a Steam
// fetch from your function quota.

import {
  fetchInventory,
  buildSnapshotFromInventory,
} from '../_lib/steam.js';

export default async function handler(req, res) {
  if ((req.query?.confirm || req.query?.CONFIRM) !== 'yes') {
    return res
      .status(400)
      .json({ error: 'add ?confirm=yes to actually hit Steam' });
  }

  const steamId = process.env.STEAM_ID;
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`;

  try {
    const data = await fetchInventory(steamId);
    const snapshot = buildSnapshotFromInventory(data);

    let tradable = 0;
    let nonTradable = 0;
    let marketable = 0;
    let nonMarketable = 0;
    const nonMarketableSamples = [];
    for (const d of data.descriptions || []) {
      if (d.tradable === 1) tradable++;
      else nonTradable++;
      if (d.marketable === 0) {
        nonMarketable++;
        if (nonMarketableSamples.length < 5) {
          nonMarketableSamples.push(
            d.market_hash_name || d.name || '(unknown)'
          );
        }
      } else {
        marketable++;
      }
    }

    // Sample a few non-tradable assets so we can see they actually come
    // through (this is the question the user is asking).
    const tradableByCK = new Map();
    for (const d of data.descriptions || []) {
      tradableByCK.set(`${d.classid}_${d.instanceid}`, d.tradable);
    }
    const sampleLocked = [];
    for (const a of data.assets || []) {
      if (sampleLocked.length >= 5) break;
      const t = tradableByCK.get(`${a.classid}_${a.instanceid}`);
      if (t === 0) {
        const desc = (data.descriptions || []).find(
          (d) => d.classid === a.classid && d.instanceid === a.instanceid
        );
        sampleLocked.push({
          assetid: a.assetid,
          name: desc?.market_hash_name || desc?.name || '(unknown)',
          tradable: t,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      url,
      assetCount: (data.assets || []).length,
      descriptionCount: (data.descriptions || []).length,
      uniqueSnapshotItems: Object.keys(snapshot).length,
      tradableDescriptions: tradable,
      nonTradableDescriptions: nonTradable,
      marketableDescriptions: marketable,
      nonMarketableDescriptions: nonMarketable,
      sampleNonMarketableItems: nonMarketableSamples,
      sampleNonTradableItems: sampleLocked,
      success: data.success,
      totalInventoryCount: data.total_inventory_count,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      url,
      error: err.message || String(err),
    });
  }
}
