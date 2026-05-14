// GET /api/inventory/debug-trades?confirm=yes
// Diagnostic: shows what fetchEscrowOffers returns so we can see
// why trade-hold items are missing from seed-pending.

import { fetchEscrowOffers } from '../_lib/steam.js';

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

    return res.status(200).json({
      totalReceived: received.length,
      descriptionCount: descriptions.length,
      stateBreakdown,
      escrowOfferCount: escrowOffers.length,
      escrowItems,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
