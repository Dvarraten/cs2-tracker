// GET  /api/auth/qr               → { hasToken: bool, tokenExpired: bool }
// POST /api/auth/qr { action: 'save', token: string } → { ok: bool }

import { getSessionSteamId } from '../_lib/auth.js';
import { storeTokens } from '../_lib/steam-session.js';
import { Redis } from '@upstash/redis';

function getClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.STORAGE_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis env vars missing');
  return new Redis({ url, token });
}

const KEY_ACCESS = (id) => `skinroi:session:${id}:access_token`;
const KEY_EXP    = (id) => `skinroi:session:${id}:access_exp`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const steamId = getSessionSteamId(req);

  // GET — return token status for the logged-in user.
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!steamId) return res.status(200).json({ hasToken: false, tokenExpired: false });
    try {
      const client = getClient();
      const [token, exp] = await Promise.all([
        client.get(KEY_ACCESS(steamId)),
        client.get(KEY_EXP(steamId)),
      ]);
      const hasToken = !!token;
      const tokenExpired = hasToken && exp
        ? Number(exp) < Math.floor(Date.now() / 1000)
        : false;
      return res.status(200).json({ hasToken, tokenExpired });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  if (!steamId) return res.status(401).json({ error: 'not logged in' });

  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })();

  // POST action=save — store a manually obtained webapi_token.
  if (body.action === 'save') {
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) return res.status(400).json({ error: 'token is required' });
    try {
      await storeTokens(steamId, { accessToken: token });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  return res.status(400).json({ error: 'action must be save' });
}
