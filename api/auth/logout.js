// POST /api/auth/logout — clears the session cookie.
import { clearSessionCookie } from '../_lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  clearSessionCookie(res);
  res.json({ ok: true });
}
