// GET /api/items  — load items for the authenticated user
// POST /api/items — save (replace) items for the authenticated user
import { getSessionSteamId } from '../_lib/auth.js';
import { Redis } from '@upstash/redis';

function getClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Upstash Redis env vars missing');
  return new Redis({ url, token });
}

function itemsKey(steamId) {
  return `skinroi:items:${steamId}`;
}

export default async function handler(req, res) {
  const steamId = getSessionSteamId(req);
  if (!steamId) return res.status(401).json({ error: 'not authenticated' });

  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const client = getClient();
    const items = await client.get(itemsKey(steamId));
    return res.json({ items: Array.isArray(items) ? items : [] });
  }

  if (req.method === 'POST') {
    const { items } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
    const client = getClient();
    await client.set(itemsKey(steamId), items);
    return res.json({ ok: true, count: items.length });
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'method not allowed' });
}
