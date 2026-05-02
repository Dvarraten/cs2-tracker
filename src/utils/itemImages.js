// Shared item-image lookup. We already fetch /items.json for the
// AddItemForm autocomplete; reuse the same cache here so manually-added
// items can render a thumbnail by looking up their market_hash_name.
//
// Steam-sync items already carry iconUrl on the entity itself — for those,
// callers can skip the lookup entirely.

import { useEffect, useState } from "react";

const ITEMS_URL = `${process.env.PUBLIC_URL || ""}/items.json`;

let _cache = null;
let _loadPromise = null;

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
      const entry = data[name];
      // ByMykel ships full URLs in `image`. Older datasets stored just the
      // Steam icon path — handle both.
      if (entry && entry.image) {
        setResolved(entry.image);
      } else {
        setResolved(null);
      }
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
