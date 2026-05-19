// GET  /api/auth/qr  → { hasToken, tokenExpired, hasRefreshToken, refreshTokenExp }
// POST /api/auth/qr { action: 'save', token } → { ok, type: 'refresh'|'access' }
//   Accepts either a webapi_token (expires ~24h) or a mobile refresh token (~6 months).
//   The token type is auto-detected from the JWT aud claim.

import { getSessionSteamId } from '../_lib/auth.js';
import { storeTokens, getRefreshTokenExp } from '../_lib/steam-session.js';
import { Redis } from '@upstash/redis';

function getClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.STORAGE_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis env vars missing');
  return new Redis({ url, token });
}

const KEY_ACCESS = (id) => `skinroi:session:${id}:access_token`;
const KEY_EXP    = (id) => `skinroi:session:${id}:access_exp`;

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const steamId = getSessionSteamId(req);

  // GET — return token status for the logged-in user.
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!steamId) return res.status(200).json({ hasToken: false, tokenExpired: false, hasRefreshToken: false, refreshTokenExp: null });
    try {
      const client = getClient();
      const [token, exp] = await Promise.all([
        client.get(KEY_ACCESS(steamId)),
        client.get(KEY_EXP(steamId)),
      ]);
      const nowSec = Math.floor(Date.now() / 1000);
      const refreshTokenExp = await getRefreshTokenExp(steamId);
      const hasValidRefresh = !!refreshTokenExp && refreshTokenExp > nowSec;

      // A valid refresh token auto-refreshes access tokens — don't surface
      // tokenExpired when one is present or the UI will prompt an unnecessary paste.
      const hasToken = !!token || hasValidRefresh;
      const accessExpired = !!token && !!exp && Number(exp) < nowSec;
      const tokenExpired = accessExpired && !hasValidRefresh;

      return res.status(200).json({
        hasToken,
        tokenExpired,
        hasRefreshToken: hasValidRefresh,
        refreshTokenExp: refreshTokenExp || null,
      });
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

  // POST action=save — store a token. Accepts either:
  //   • webapi_token  (aud: web:store) — stored as access token, expires ~24h
  //   • refresh token (aud: mobile)    — stored as refresh token, expires ~6 months
  if (body.action === 'save') {
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) return res.status(400).json({ error: 'token is required' });
    try {
      const payload = decodeJwtPayload(token);
      const aud = payload?.aud ?? [];
      const audiences = Array.isArray(aud) ? aud : [aud];
      const isRefreshToken = audiences.some(a => String(a).includes('mobile'));
      if (isRefreshToken) {
        await storeTokens(steamId, { refreshToken: token });
        return res.status(200).json({ ok: true, type: 'refresh' });
      }
      await storeTokens(steamId, { accessToken: token });
      return res.status(200).json({ ok: true, type: 'access' });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  return res.status(400).json({ error: 'action must be save' });
}
