// GET /api/auth/qr-status
//
// Returns { hasToken: bool } indicating whether the logged-in user has a
// stored Steam refresh token. Returns { hasToken: false } if not logged in.

import { getSessionSteamId } from '../_lib/auth.js';
import { hasRefreshToken } from '../_lib/steam-session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const steamId = getSessionSteamId(req);
  if (!steamId) {
    return res.status(200).json({ hasToken: false });
  }

  try {
    const hasToken = await hasRefreshToken(steamId);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ hasToken });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
