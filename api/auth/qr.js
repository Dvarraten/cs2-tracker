// GET  /api/auth/qr          → { hasToken: bool }
// POST /api/auth/qr  { action: 'start' }              → { clientId, requestId, challengeUrl, pollInterval }
// POST /api/auth/qr  { action: 'poll', clientId, requestId } → { done: bool }

import { getSessionSteamId } from '../_lib/auth.js';
import { hasRefreshToken, storeTokens } from '../_lib/steam-session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // GET — return whether the logged-in user has a stored refresh token.
  if (req.method === 'GET' || req.method === 'HEAD') {
    const steamId = getSessionSteamId(req);
    if (!steamId) return res.status(200).json({ hasToken: false });
    try {
      const hasToken = await hasRefreshToken(steamId);
      return res.status(200).json({ hasToken });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const steamId = getSessionSteamId(req);
  if (!steamId) return res.status(401).json({ error: 'not logged in' });

  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })();

  const { action } = body;

  // POST action=start — begin a QR auth session.
  if (action === 'start') {
    try {
      const params = new URLSearchParams({
        input_json: JSON.stringify({
          device_details: {
            device_friendly_name: 'SkinROI',
            platform_type: 2,
            os_type: -500,
          },
          website_id: 'Unknown',
        }),
      });
      const r = await fetch(
        'https://api.steampowered.com/IAuthenticationService/BeginAuthSessionViaQR/v1/',
        { method: 'POST', body: params }
      );
      if (!r.ok) throw new Error(`Steam API HTTP ${r.status}`);
      const data = await r.json();
      const { client_id, request_id, challenge_url, interval } = data.response || {};
      if (!client_id || !request_id || !challenge_url) {
        throw new Error('Unexpected Steam response: ' + JSON.stringify(data.response));
      }
      return res.status(200).json({
        clientId: client_id,
        requestId: request_id,
        challengeUrl: challenge_url,
        pollInterval: interval ?? 5,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  // POST action=poll — check if the user approved the QR session.
  if (action === 'poll') {
    const { clientId, requestId } = body;
    if (!clientId || !requestId) {
      return res.status(400).json({ error: 'clientId and requestId are required' });
    }
    try {
      const params = new URLSearchParams({
        input_json: JSON.stringify({ client_id: clientId, request_id: requestId }),
      });
      const r = await fetch(
        'https://api.steampowered.com/IAuthenticationService/PollAuthSessionStatus/v1/',
        { method: 'POST', body: params }
      );
      if (!r.ok) throw new Error(`Steam API HTTP ${r.status}`);
      const data = await r.json();
      const { refresh_token, access_token } = data.response || {};
      if (refresh_token) {
        await storeTokens(steamId, { refreshToken: refresh_token, accessToken: access_token });
        return res.status(200).json({ done: true });
      }
      return res.status(200).json({ done: false });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  return res.status(400).json({ error: 'action must be start or poll' });
}
