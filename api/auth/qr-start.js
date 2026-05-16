// POST /api/auth/qr-start
//
// Initiates a Steam QR-code authentication session for the logged-in user.
// The client_id and request_id returned here must be passed to /api/auth/qr-poll.

import { getSessionSteamId } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const steamId = getSessionSteamId(req);
  if (!steamId) {
    return res.status(401).json({ error: 'not logged in' });
  }

  try {
    const body = new URLSearchParams({
      device_details: JSON.stringify({ device_friendly_name: 'SkinROI', platform_type: 2 }),
    });

    const steamRes = await fetch(
      'https://api.steampowered.com/IAuthenticationService/BeginAuthSessionViaQR/v1/',
      { method: 'POST', body }
    );
    if (!steamRes.ok) {
      throw new Error(`Steam API HTTP ${steamRes.status}`);
    }
    const data = await steamRes.json();
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
