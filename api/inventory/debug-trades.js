// GET /api/inventory/debug-trades
// Returns the raw Steam trade history response for debugging.
import { fetchTradeHistory } from '../_lib/steam.js';

export default async function handler(req, res) {
  try {
    const response = await fetchTradeHistory(process.env.STEAM_API_KEY, 0);
    return res.json({
      tradeCount: (response.trades || []).length,
      statusBreakdown: (response.trades || []).reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1; return acc;
      }, {}),
      trades: (response.trades || []).slice(0, 5).map(t => ({
        tradeid: t.tradeid,
        time_init: t.time_init,
        time_human: new Date(t.time_init * 1000).toISOString(),
        status: t.status,
        assets_received: (t.assets_received || []).map(a => ({
          appid: a.appid,
          contextid: a.contextid,
          assetid: a.assetid,
          classid: a.classid,
        })),
        assets_given: (t.assets_given || []).map(a => ({
          appid: a.appid,
          contextid: a.contextid,
          assetid: a.assetid,
        })),
      })),
      descriptionCount: (response.descriptions || []).length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
