// Pulls the latest CS2 skin list from ByMykel/CSGO-API and rewrites
// public/items.json in the shape the autocomplete already understands.
//
// Run with:  npm run items:update
//
// Source repo: https://github.com/ByMykel/CSGO-API
// Endpoint:    https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins_not_grouped.json
//   - This is the "ungrouped" variant — one entry per (skin × wear × stattrak)
//     combination, which matches our existing key-by-full-name layout.
//   - We pull from the raw GitHub URL because bymykel.github.io was retired.

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en';
const OUT_PATH = path.join(__dirname, '..', 'public', 'items.json');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

(async () => {
  const [skins, agents] = await Promise.all([
    fetchJson(`${BASE_URL}/skins_not_grouped.json`),
    fetchJson(`${BASE_URL}/agents.json`).catch(() => []),
  ]);

  console.log(`[items] skins: ${skins.length}, agents: ${agents.length}`);

  const out = {};
  let skipped = 0;

  for (const item of skins) {
    const fullName = item.name || item.market_hash_name;
    if (!fullName) { skipped++; continue; }

    let baseName = fullName;
    if (item.wear && item.wear.name) {
      const suffix = ` (${item.wear.name})`;
      if (fullName.endsWith(suffix)) baseName = fullName.slice(0, fullName.length - suffix.length);
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

  for (const agent of agents) {
    const fullName = agent.name;
    if (!fullName) { skipped++; continue; }
    out[fullName] = {
      'full-name': fullName,
      name: fullName,
      type: 'Normal',
      exterior: null,
      weapon: null,
      finish: null,
      rarity: agent.rarity ? agent.rarity.name : null,
      color: agent.rarity ? agent.rarity.color : null,
      image: agent.image || '',
      stattrak: false,
      souvenir: false,
      'float-caps': null,
    };
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));

  const sizeMb = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(
    `[items] wrote ${OUT_PATH} — ${sizeMb} MB, ${Object.keys(out).length} items` +
      (skipped ? `, skipped ${skipped}` : '')
  );

  // Quick sanity probe so you can see at a glance that new skins came through,
  // including the categories the old (Feb 2024) dataset was missing.
  const probes = [
    'Sport Gloves',
    'Butterfly Knife',
    'Michael Syfers',
    'FBI Sniper',
    'Pandora',
    'Vice',
  ];
  for (const probe of probes) {
    const hits = Object.keys(out).filter((k) => k.includes(probe)).length;
    console.log(`[items]   contains "${probe}": ${hits} entries`);
  }
})().catch((err) => {
  console.error('[items] fatal:', err);
  process.exit(1);
});
