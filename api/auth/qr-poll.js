// POST /api/auth/qr-poll   body: { clientId, requestId }
//
// Polls Steam to see whether the user has approved the QR session.
// When approved, stores the refresh + access tokens and returns { done: true }.

import { getSessionSteamId } from '../_lib/auth.js';
import { storeTokens } from '../_lib/steam-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const steamId = getSessionSteamId(req);
  if (!steamId) {
    return res.status(401).json({ error: 'not logged in' });
  }

  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })();

  const { clientId, requestId } = body;
  if (!clientId || !requestId) {
    return res.status(400).json({ error: 'clientId and requestId are required' });
  }

  try {
    const pollBody = new URLSearchParams({ client_id: clientId, request_id: requestId });
    const steamRes = await fetch(
      'https://api.steampowered.com/IAuthenticationService/PollAuthSessionStatus/v1/',
      { method: 'POST', body: pollBody }
    );
    if (!steamRes.ok) {
      throw new Error(`Steam API HTTP ${steamRes.status}`);
    }
    const data = await steamRes.json();
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
