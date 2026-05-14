// GET /api/inventory/debug-trades?confirm=yes
// Diagnostic: shows what fetchEscrowOffers returns so we can see
// why trade-hold items are missing from seed-pending.

import { fetchEscrowOffers, fetchAssetClassInfo } from '../_lib/steam.js';

export default async function handler(req, res) {
  if ((req.query?.confirm || req.query?.CONFIRM) !== 'yes') {
    return res.status(400).json({ error: 'add ?confirm=yes' });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'STEAM_API_KEY not set' });
  }

  try {
    const resp = await fetchEscrowOffers(apiKey);

    const received = resp.trade_offers_received || [];
    const descriptions = resp.descriptions || [];

    const descIndex = new Map();
    for (const d of descriptions) {
      descIndex.set(`${d.classid}_${d.instanceid}`, d);
    }

    const stateBreakdown = received.reduce((acc, o) => {
      acc[o.trade_offer_state] = (acc[o.trade_offer_state] || 0) + 1;
      return acc;
    }, {});

    const escrowOffers = received.filter(o => o.trade_offer_state === 11);
    const escrowItems = escrowOffers.flatMap(o =>
      (o.items_to_receive || []).map(a => {
        const desc = descIndex.get(`${a.classid}_${a.instanceid}`);
        return {
          assetid: a.assetid,
          appid: a.appid,
          classid: a.classid,
          instanceid: a.instanceid,
          hasDesc: !!desc,
          marketHashName: desc?.market_hash_name || null,
        };
      })
    );

    // Test GetAssetClassInfo with the first 3 CS2 classids we found.
    const testAssets = escrowItems.slice(0, 3).length
      ? escrowItems.slice(0, 3)
      : received.filter(o => o.trade_offer_state === 3)
          .flatMap(o => (o.items_to_receive || []).filter(a => Number(a.appid) === 730))
          .slice(0, 3)
          .map(a => ({ classid: a.classid, instanceid: a.instanceid }));

    let classInfoTest = null;
    let classInfoRaw = null;
    if (testAssets.length && process.env.STEAM_API_KEY) {
      const params = new URLSearchParams({
        key: process.env.STEAM_API_KEY,
        appid: '730',
        class_count: String(testAssets.length),
        language: 'english',
      });
      testAssets.forEach((a, i) => {
        params.set(`classid${i}`, a.classid);
        if (a.instanceid && a.instanceid !== '0') params.set(`instanceid${i}`, a.instanceid);
      });
      try {
        const r = await fetch(`https://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v0001/?${params}`);
        const raw = await r.json();
        classInfoRaw = raw;
        classInfoTest = { httpStatus: r.status, resultKeys: Object.keys(raw.result || {}) };
      } catch (e) {
        classInfoTest = { error: e.message };
      }
    }

    return res.status(200).json({
      totalReceived: received.length,
      descriptionCount: descriptions.length,
      stateBreakdown,
      escrowOfferCount: escrowOffers.length,
      escrowItems,
      classInfoTest,
      classInfoRaw,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
