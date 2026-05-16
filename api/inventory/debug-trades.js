// GET /api/inventory/debug-trades?confirm=yes
// Diagnostic: shows trade offers and specifically CS2 escrow holds.
// CS2 P2P trades with a hold show as state 3 + escrow_end_date (not state 11).

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

    const stateBreakdown = received.reduce((acc, o) => {
      acc[o.trade_offer_state] = (acc[o.trade_offer_state] || 0) + 1;
      return acc;
    }, {});

    // CS2 trade holds: state 3 with escrow_end_date set (not state 11)
    const holdOffers = received.filter(
      o => (o.trade_offer_state === 3 && o.escrow_end_date) || o.trade_offer_state === 11
    );

    const holdItems = holdOffers.flatMap(o =>
      (o.items_to_receive || [])
        .filter(a => Number(a.appid) === 730)
        .map(a => ({
          assetid: a.assetid,
          classid: a.classid,
          instanceid: a.instanceid,
          offerState: o.trade_offer_state,
          escrowEndDate: o.escrow_end_date
            ? new Date(o.escrow_end_date * 1000).toISOString()
            : null,
        }))
    );

    // Summary of all state-3 offers with their escrow_end_date
    const state3Summary = received
      .filter(o => o.trade_offer_state === 3)
      .map(o => ({
        tradeofferid: o.tradeofferid,
        timeUpdated: o.time_updated
          ? new Date(o.time_updated * 1000).toISOString()
          : null,
        escrowEndDate: o.escrow_end_date
          ? new Date(o.escrow_end_date * 1000).toISOString()
          : null,
        itemCount: (o.items_to_receive || []).filter(a => Number(a.appid) === 730).length,
      }));

    // Test GetAssetClassInfo on the first 3 hold items
    const testAssets = holdItems.slice(0, 3);
    let classInfoTest = null;
    if (testAssets.length && apiKey) {
      const params = new URLSearchParams({
        key: apiKey,
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
        classInfoTest = {
          httpStatus: r.status,
          resultKeys: Object.keys(raw.result || {}),
          firstItem: Object.values(raw.result || {})[0]?.market_hash_name || null,
        };
      } catch (e) {
        classInfoTest = { error: e.message };
      }
    }

    return res.status(200).json({
      totalReceived: received.length,
      stateBreakdown,
      holdOfferCount: holdOffers.length,
      holdItems,
      state3Summary,
      classInfoTest,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
