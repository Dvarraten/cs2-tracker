// GET /api/inventory/debug-trades
import { fetchTradeOffers } from '../_lib/steam.js';

export default async function handler(req, res) {
  try {
    const response = await fetchTradeOffers(process.env.STEAM_API_KEY, 0);
    const received = response.trade_offers_received || [];
    const sent = response.trade_offers_sent || [];
    return res.json({
      receivedCount: received.length,
      sentCount: sent.length,
      descriptionCount: (response.descriptions || []).length,
      stateBreakdown: [...received, ...sent].reduce((acc, o) => {
        acc[o.trade_offer_state] = (acc[o.trade_offer_state] || 0) + 1; return acc;
      }, {}),
      recentReceived: received.slice(0, 3).map(o => ({
        tradeofferid: o.tradeofferid,
        state: o.trade_offer_state,
        time_updated: o.time_updated,
        time_human: new Date((o.time_updated || o.time_created) * 1000).toISOString(),
        items_to_receive: (o.items_to_receive || []).map(a => ({ appid: a.appid, contextid: a.contextid, assetid: a.assetid, classid: a.classid })),
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
