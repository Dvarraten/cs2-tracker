import { Redis } from '@upstash/redis';

const PROFILE_TTL = 86400; // 24 hours

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function fetchFromSteam(steamId) {
  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const xml = await res.text();
    const avatarMatch = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);
    const nameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
    return {
      avatarUrl: avatarMatch?.[1] || null,
      personaName: nameMatch?.[1] || null,
    };
  } catch {
    return { avatarUrl: null, personaName: null };
  }
}

export async function getProfile(steamId) {
  const redis = getRedis();
  const key = `skinroi:profile:${steamId}`;

  if (redis) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) return cached;
  }

  const profile = await fetchFromSteam(steamId);

  if (redis && profile.avatarUrl) {
    redis.set(key, profile, { ex: PROFILE_TTL }).catch(() => {});
  }

  return profile;
}
