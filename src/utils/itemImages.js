// Shared item-image lookup. We already fetch /items.json for the
// AddItemForm autocomplete; reuse the same cache here so manually-added
// items can render a thumbnail by looking up their market_hash_name.
//
// Lookup order:
//   1. Direct iconUrl on the entity (Steam-sync items always have one)
//   2. Exact key match in items.json
//   3. Token-based fuzzy match against all keys ("Quick Silver" →
//      "Charm | Quick Silver (some wear)") so manually-typed short names
//      still resolve to a thumbnail.

import { useEffect, useState } from "react";

const ITEMS_URL = `${process.env.PUBLIC_URL || ""}/items.json`;

let _cache = null;
let _loadPromise = null;
let _tokenIndex = null;       // [{ key, tokens: Set<string> }] — built lazily
const _fuzzyCache = new Map(); // name → imageUrl | null

function loadItems() {
  if (_cache) return Promise.resolve(_cache);
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch(ITEMS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      _cache = data;
      return data;
    })
    .catch((err) => {
      _loadPromise = null; // allow retry next mount
      console.warn("[items] load failed:", err);
      return null;
    });
  return _loadPromise;
}

// ─── Fuzzy match helpers ────────────────────────────────────────────────────
const NAME_STOPWORDS = new Set([
  "stattrak", "souvenir", "the",
  "factory", "new", "minimal", "wear", "field", "tested", "well", "worn",
  "battle", "scarred",
]);

function tokenizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/★/g, " ")
    .replace(/™/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[|/\-.,:'"]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !NAME_STOPWORDS.has(t));
}

function buildTokenIndex(data) {
  if (_tokenIndex) return _tokenIndex;
  const out = [];
  for (const key of Object.keys(data)) {
    out.push({ key, tokens: new Set(tokenizeName(key)) });
  }
  _tokenIndex = out;
  return out;
}

function fuzzyLookup(data, name) {
  if (_fuzzyCache.has(name)) return _fuzzyCache.get(name);
  const queryTokens = tokenizeName(name);
  if (queryTokens.length === 0) {
    _fuzzyCache.set(name, null);
    return null;
  }
  const index = buildTokenIndex(data);

  let bestKey = null;
  let bestScore = 0;
  let bestKeyLength = Infinity;
  for (const { key, tokens } of index) {
    let matched = 0;
    for (const t of queryTokens) if (tokens.has(t)) matched++;
    const score = matched / queryTokens.length;
    if (score < 0.5) continue;
    // Tiebreak: prefer the shortest key (usually the cleanest, most
    // canonical entry) so "Quick Silver" doesn't pick a Souvenir variant
    // when a plain one exists.
    if (
      score > bestScore ||
      (score === bestScore && key.length < bestKeyLength)
    ) {
      bestKey = key;
      bestScore = score;
      bestKeyLength = key.length;
    }
  }

  const url = bestKey && data[bestKey] && data[bestKey].image
    ? data[bestKey].image
    : null;
  _fuzzyCache.set(name, url);
  return url;
}

// Returns an absolute URL for the icon image, or null if we couldn't find
// one. Steam-sync items pass their saved iconUrl as `directIconUrl`. The
// `name` is the market_hash_name to look up if no direct URL is available.
export function useItemImage({ directIconUrl, name }) {
  const [resolved, setResolved] = useState(() => normalize(directIconUrl));

  useEffect(() => {
    const direct = normalize(directIconUrl);
    if (direct) {
      setResolved(direct);
      return;
    }
    if (!name) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    loadItems().then((data) => {
      if (cancelled) return;
      if (!data) {
        setResolved(null);
        return;
      }
      // 1) exact match
      const entry = data[name];
      if (entry && entry.image) {
        setResolved(entry.image);
        return;
      }
      // 2) fuzzy fallback (cached after the first hit per name)
      setResolved(fuzzyLookup(data, name));
    });
    return () => {
      cancelled = true;
    };
  }, [directIconUrl, name]);

  return resolved;
}

// Normalise legacy iconUrl values (Steam icon path) into an absolute URL.
function normalize(maybeUrl) {
  if (!maybeUrl) return null;
  if (/^https?:\/\//.test(maybeUrl)) return maybeUrl;
  // Bare Steam icon path → prepend the CDN base.
  return `https://community.akamai.steamstatic.com/economy/image/${maybeUrl}/96fx96f`;
}
