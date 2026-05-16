// Per-user Steam JWT token management backed by Upstash Redis.
//
// Redis keys:
//   skinroi:session:{steamId}:refresh_token  — long-lived refresh token
//   skinroi:session:{steamId}:access_token   — cached access token string
//   skinroi:session:{steamId}:access_exp     — Unix epoch (seconds) when access token expires

import { Redis } from '@upstash/redis';

let _client = null;
function getClient() {
  if (_client) return _client;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Upstash Redis env vars missing');
  _client = new Redis({ url, token });
  return _client;
}

function parseJwtExp(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).exp;
  } catch {
    return null;
  }
}

const KEY_REFRESH = (steamId) => `skinroi:session:${steamId}:refresh_token`;
const KEY_ACCESS  = (steamId) => `skinroi:session:${steamId}:access_token`;
const KEY_EXP     = (steamId) => `skinroi:session:${steamId}:access_exp`;

export async function hasRefreshToken(steamId) {
  const client = getClient();
  const val = await client.get(KEY_REFRESH(steamId)).catch(() => null);
  return !!val;
}

export async function storeTokens(steamId, { refreshToken, accessToken }) {
  const client = getClient();
  const exp = accessToken ? parseJwtExp(accessToken) : null;

  const pipeline = client.pipeline();
  if (refreshToken) pipeline.set(KEY_REFRESH(steamId), refreshToken);
  if (accessToken)  pipeline.set(KEY_ACCESS(steamId), accessToken);
  if (exp)          pipeline.set(KEY_EXP(steamId), exp);
  await pipeline.exec();
}

// Returns a valid access token for the given steamId.
// Priority:
//   1. Cached access token if it has 5+ minutes remaining
//   2. Refresh the token via GenerateAccessTokenForApp and cache it
//   3. Fall back to STEAM_ACCESS_TOKEN env var
export async function getAccessToken(steamId) {
  if (!steamId) return process.env.STEAM_ACCESS_TOKEN || '';

  const client = getClient();

  try {
    const [cachedToken, expRaw] = await Promise.all([
      client.get(KEY_ACCESS(steamId)),
      client.get(KEY_EXP(steamId)),
    ]);

    const exp = expRaw ? Number(expRaw) : null;
    const nowSec = Math.floor(Date.now() / 1000);
    const FIVE_MIN = 5 * 60;

    if (cachedToken && exp && exp - nowSec > FIVE_MIN) {
      return cachedToken;
    }

    // Try to refresh using the stored refresh token.
    const refreshToken = await client.get(KEY_REFRESH(steamId));
    if (refreshToken) {
      const body = new URLSearchParams({ refresh_token: refreshToken, steamid: steamId });
      const res = await fetch(
        'https://api.steampowered.com/IAuthenticationService/GenerateAccessTokenForApp/v1/',
        { method: 'POST', body }
      );
      if (res.ok) {
        const data = await res.json();
        const newAccess = data?.response?.access_token;
        if (newAccess) {
          await storeTokens(steamId, { accessToken: newAccess });
          return newAccess;
        }
      }
    }
  } catch {
    // Fall through to env var fallback.
  }

  return process.env.STEAM_ACCESS_TOKEN || '';
}
