// Steam username/password login flow for obtaining a mobile refresh token.
// Supports DeviceConfirmation (approve via app) and DeviceCode (TOTP entry).
// Uses a module-level session cache so LoginSession survives between requests.
import { LoginSession, EAuthTokenPlatformType } from 'steam-session';
import { getSessionSteamId } from '../_lib/auth.js';
import { storeTokens } from '../_lib/steam-session.js';

// Module-level cache — survives warm Vercel container reuse.
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
        const token = await new Promise((resolve, reject) => {
          session.on('authenticated', () => resolve(session.refreshToken));
          session.on('error', reject);
          setTimeout(() => reject(new Error('Timed out')), 15000);
        });
        await storeTokens(steamId, { refreshToken: token });
        return res.status(200).json({ ok: true, needsGuard: false });
      }

      // Prefer DeviceConfirmation (4) over DeviceCode (3) if both available.
      const actionTypes = result.allowedConfirmations?.map(c => c.confirmation_type) || [result.actionType];
      const guardType = actionTypes.includes(4) ? 4 : (actionTypes[0] ?? result.actionType);

      const key = `${steamId}_${Date.now()}`;
      const entry = { session, expires: Date.now() + 5 * 60 * 1000, authenticated: false, token: null };

      // For app-approval flow, pre-register the event so it fires whenever
      // the user approves — the poll action will pick it up.
      session.on('authenticated', async () => {
        try {
          await storeTokens(steamId, { refreshToken: session.refreshToken });
          entry.token = session.refreshToken;
          entry.authenticated = true; // only mark true AFTER Redis write succeeds
        } catch {}
      });
      session.on('error', () => {});

      pendingSessions.set(key, entry);
      return res.status(200).json({ ok: true, needsGuard: true, guardType, sessionKey: key });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Login failed' });
    }
  }

  // ── Poll: check if app-approval completed ────────────────────────────────
  if (action === 'poll') {
    if (!sessionKey) return res.status(400).json({ error: 'Session key required' });
    const entry = pendingSessions.get(sessionKey);
    if (!entry) return res.status(400).json({ error: 'Session expired. Please start over.' });
    if (entry.authenticated) {
      pendingSessions.delete(sessionKey);
      return res.status(200).json({ ok: true, authenticated: true });
    }
    return res.status(200).json({ ok: true, authenticated: false });
  }

  // ── Step 2: submit guard code (DeviceCode / EmailCode only) ──────────────
  if (action === 'confirm') {
    if (!sessionKey || !code) return res.status(400).json({ error: 'Session key and code required' });

    const entry = pendingSessions.get(sessionKey);
    if (!entry) return res.status(400).json({ error: 'Session expired. Please start over.' });

    try {
      // Already authenticated via app approval
      if (entry.authenticated && entry.token) {
        pendingSessions.delete(sessionKey);
        return res.status(200).json({ ok: true });
      }

      await entry.session.submitSteamGuardCode(code);

      const token = await new Promise((resolve, reject) => {
        entry.session.on('authenticated', () => resolve(entry.session.refreshToken));
        entry.session.on('error', reject);
        setTimeout(() => reject(new Error('Timed out')), 15000);
      });

      await storeTokens(steamId, { refreshToken: token });
      pendingSessions.delete(sessionKey);
      return res.status(200).json({ ok: true });
    } catch (err) {
      if ((err.message?.includes('DuplicateRequest') || entry.authenticated) && entry.token) {
        pendingSessions.delete(sessionKey);
        return res.status(200).json({ ok: true });
      }
      pendingSessions.delete(sessionKey);
      return res.status(400).json({ error: err.message || 'Invalid code' });
    }
  }

  res.status(400).json({ error: 'Unknown action' });
}
