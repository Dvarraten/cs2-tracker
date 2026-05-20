// Steam username/password login flow for obtaining a mobile refresh token.
// Uses a module-level session cache so the LoginSession survives between the
// credentials POST and the guard-code confirm POST within the same container.
import { LoginSession, EAuthTokenPlatformType } from 'steam-session';
import { getSessionSteamId } from '../_lib/auth.js';
import { storeTokens } from '../_lib/steam-session.js';

// Module-level cache — survives warm Vercel container reuse (up to ~5 min TTL).
const pendingSessions = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of pendingSessions) {
    if (v.expires < now) pendingSessions.delete(k);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const steamId = getSessionSteamId(req);
  if (!steamId) return res.status(401).json({ error: 'Not logged in' });

  const { action, username, password, sessionKey, code } = req.body || {};
  pruneExpired();

  // ── Step 1: start login ───────────────────────────────────────────────────
  if (action === 'start') {
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const session = new LoginSession(EAuthTokenPlatformType.MobileApp);
    session.loginTimeout = 30000;

    try {
      const result = await session.startWithCredentials({ accountName: username, password });

      if (!result.actionRequired) {
        // No guard needed — wait for token
        const token = await new Promise((resolve, reject) => {
          session.on('authenticated', () => resolve(session.refreshToken));
          session.on('error', reject);
          setTimeout(() => reject(new Error('Timed out waiting for authentication')), 15000);
        });
        await storeTokens(steamId, { refreshToken: token });
        return res.status(200).json({ ok: true, needsGuard: false });
      }

      // Guard required — cache session object
      const key = `${steamId}_${Date.now()}`;
      pendingSessions.set(key, { session, expires: Date.now() + 5 * 60 * 1000 });

      return res.status(200).json({
        ok: true,
        needsGuard: true,
        guardType: result.actionType, // 2=email, 3=device authenticator
        sessionKey: key,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Login failed' });
    }
  }

  // ── Step 2: submit guard code ─────────────────────────────────────────────
  if (action === 'confirm') {
    if (!sessionKey || !code) return res.status(400).json({ error: 'Session key and code required' });

    const cached = pendingSessions.get(sessionKey);
    if (!cached) return res.status(400).json({ error: 'Session expired. Please start over.' });

    try {
      // If the session was already authenticated via mobile approval, refreshToken
      // is already set and submitSteamGuardCode throws "DuplicateRequest".
      if (cached.session.refreshToken) {
        await storeTokens(steamId, { refreshToken: cached.session.refreshToken });
        pendingSessions.delete(sessionKey);
        return res.status(200).json({ ok: true });
      }

      await cached.session.submitSteamGuardCode(code);

      const token = await new Promise((resolve, reject) => {
        cached.session.on('authenticated', () => resolve(cached.session.refreshToken));
        cached.session.on('error', reject);
        setTimeout(() => reject(new Error('Timed out waiting for authentication')), 15000);
      });

      await storeTokens(steamId, { refreshToken: token });
      pendingSessions.delete(sessionKey);
      return res.status(200).json({ ok: true });
    } catch (err) {
      // DuplicateRequest means Steam already authenticated (e.g. mobile approval)
      if (err.message?.includes('DuplicateRequest') && cached?.session?.refreshToken) {
        await storeTokens(steamId, { refreshToken: cached.session.refreshToken });
        pendingSessions.delete(sessionKey);
        return res.status(200).json({ ok: true });
      }
      pendingSessions.delete(sessionKey);
      return res.status(400).json({ error: err.message || 'Invalid code' });
    }
  }

  res.status(400).json({ error: 'Unknown action' });
}
