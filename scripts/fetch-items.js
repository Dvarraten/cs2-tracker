// Pulls the latest CS2 skin list from ByMykel/CSGO-API and rewrites
// public/items.json in the shape the autocomplete already understands.
//
// Run with:  npm run items:update
//
// Source repo: https://github.com/ByMykel/CSGO-API
// Endpoint:    https://bymykel.github.io/CSGO-API/api/en/skins_not_grouped.json
//   - This is the "ungrouped" variant — one entry per (skin × wear × stattrak)
//     combination, which matches our existing key-by-full-name layout.

const fs = require('fs');
const path = require('path');

const SRC_URL =
  'https://bymykel.github.io/CSGO-API/api/en/skins_not_grouped.json';
const OUT_PATH = path.join(__dirname, '..', 'public', 'items.json');

(async () => {
  console.log(`[items] fetching ${SRC_URL}…`);
  const res = await fetch(SRC_URL);
  if (!res.ok) {
    console.error(`[items] HTTP ${res.status} from ByMykel`);
    process.exit(1);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    console.error('[items] expected an array, got', typeof data);
    process.exit(1);
  }
  console.log(`[items] got ${data.length} entries — transforming…`);

  const out = {};
  let skipped = 0;

  for (const item of data) {
    const fullName = item.name || item.market_hash_name;
    if (!fullName) {
      skipped++;
      continue;
    }

    // Strip trailing " (Wear)" to derive the "base name" we expose to the
    // autocomplete's "Skin" tag. For agents/items without wear, fall back
    // to fullName.
    let baseName = fullName;
    if (item.wear && item.wear.name) {
      const suffix = ` (${item.wear.name})`;
      if (fullName.endsWith(suffix)) {
        baseName = fullName.slice(0, fullName.length - suffix.length);
      }
    }

    out[fullName] = {
      'full-name': fullName,
      name: baseName,
      type: item.stattrak ? 'StatTrak™' : item.souvenir ? 'Souvenir' : 'Normal',
      exterior: item.wear ? item.wear.name : null,
      weapon: item.weapon ? item.weapon.name : null,
      finish: item.pattern ? item.pattern.name : null,
      rarity: item.rarity ? item.rarity.name : null,
      color: item.rarity ? item.rarity.color : null,
      image: item.image || '',
      stattrak: !!item.stattrak,
      souvenir: !!item.souvenir,
      'float-caps':
        [item.min_float, item.max_float].every((v) => typeof v === 'number')
          ? [item.min_float, item.max_float]
          : null,
    };
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));

  const sizeMb = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(
    `[items] wrote ${OUT_PATH} — ${sizeMb} MB, ${Object.keys(out).length} items` +
      (skipped ? `, skipped ${skipped}` : '')
  );

  // Quick sanity probe so you can see at a glance that new skins came through.
  const probes = ['Dead Hand', 'Terminal', 'Sealed', 'Kukri'];
  for (const probe of probes) {
    const hits = Object.keys(out).filter((k) => k.includes(probe)).length;
    console.log(`[items]   contains "${probe}": ${hits} entries`);
  }
})().catch((err) => {
  console.error('[items] fatal:', err);
  process.exit(1);
});
