// GET /api/auth/me — returns { user: { steamId } } or { user: null }.
import { getSessionSteamId } from '../_lib/auth.js';

export default function handler(req, res) {
  const steamId = getSessionSteamId(req);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: steamId ? { steamId } : null });
}
