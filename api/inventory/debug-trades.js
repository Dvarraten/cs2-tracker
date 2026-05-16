// GET /api/inventory/debug-trades?confirm=yes
// Diagnostic: shows GetTradeHistory response so we can verify
// InEscrow (status 10) trades and item descriptions are resolving.

import { fetchTradeHistory, fetchAssetClassInfo } from '../_lib/steam.js';

export default async function handler(req, res) {
  if ((req.query?.confirm || req.query?.CONFIRM) !== 'yes') {
    return res.status(400).json({ error: 'add ?confirm=yes' });
  }

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'STEAM_API_KEY not set' });
  }

  try {
    const { trades, descriptions } = await fetchTradeHistory(apiKey, 0);

    const descIndex = new Map();
    for (const d of descriptions) {
      descIndex.set(`${d.classid}_${d.instanceid}`, d);
    }

    const statusBreakdown = trades.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    // k_ETradeStatus_InEscrow = 10
    const escrowTrades = trades.filter(t => t.status === 10);
    const escrowItems = escrowTrades.flatMap(t =>
      (t.assets_received || [])
        .filter(a => Number(a.appid) === 730)
        .map(a => {
          const desc = descIndex.get(`${a.classid}_${a.instanceid}`);
          return {
            assetid: a.new_assetid || a.assetid,
            classid: a.classid,
            instanceid: a.instanceid,
            hasDesc: !!desc,
            marketHashName: desc?.market_hash_name || null,
          };
        })
    );

    // Summary of all trades
    const tradeSummary = trades.map(t => ({
      tradeid: t.tradeid,
      status: t.status,
      timeInit: t.time_init ? new Date(t.time_init * 1000).toISOString() : null,
      itemsReceived: (t.assets_received || []).filter(a => Number(a.appid) === 730).length,
      itemsGiven: (t.assets_given || []).filter(a => Number(a.appid) === 730).length,
    }));

    // Test GetAssetClassInfo on the first 3 escrow items without descriptions.
    const needsLookup = escrowItems.filter(i => !i.hasDesc).slice(0, 3);
    let classInfoTest = null;
    if (needsLookup.length) {
      const fallback = await fetchAssetClassInfo(apiKey, needsLookup);
      classInfoTest = {
        looked_up: needsLookup.length,
        resolved: fallback.size,
        names: [...fallback.values()].map(v => v.market_hash_name),
      };
    }

    return res.status(200).json({
      totalTrades: trades.length,
      descriptionCount: descriptions.length,
      statusBreakdown,
      escrowTradeCount: escrowTrades.length,
      escrowItems,
      tradeSummary,
      classInfoTest,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
