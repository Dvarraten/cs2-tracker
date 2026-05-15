# SkinROI

A personal Profit/Loss tracker for buying and selling **Counter-Strike 2** skins across multiple third-party markets in different regions (CSFloat, Buff163, YouPin, CSMoney Market).

It connects to your Steam inventory to detect incoming and outgoing items automatically, lets you log purchases that are still on trade hold, and gives you analytics on realised profit by day, week, and month.

---

## Features

- **Item tracker** — log every purchase with platform, price (USD or CNY), and notes. Mark items as sold and the app computes profit after platform fees.
- **Steam inventory sync** — a small backend polls your public Steam inventory every 5 minutes and surfaces incoming and outgoing items in a "Handle Items" modal. No Steam Web API key required.
- **Pending Purchases** — items you've bought but haven't yet received (7-day trade hold) get their own tab, with a countdown and a one-click "Mark received" when Steam finally shows them.
- **Tag-based skin autocomplete** — type "but dop fn" → tags resolve to *Butterfly Knife · Doppler · Factory New*. Backed by the [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API) dataset (~14 000 entries).
- **Item thumbnails** — every card shows the actual Steam icon for the item, pulled from the synced inventory or looked up against the catalog.
- **Currency converter** — live USD ⇄ CNY conversion is wired into both the Add Item form and the Handle Items modal so you can enter prices in whichever currency you actually paid in.
- **Bulk delete** — select-mode toggle for trimming the list when you migrate or clean up.
- **Analytics** — line chart of profit over time, weekly + monthly summaries, and a 90-day daily P&L heatmap (GitHub-contribution style).
- **Theme picker** — Midnight Blue (default), Arctic, Deep Teal, Indigo, Soft Lavender, SAP Fiori, Graphite, Olive.
- **Persistence** — items live in `localStorage`; Steam-sync state lives in Upstash Redis (in production) or a JSON file (locally).

---

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│  React frontend      │  /api   │  Vercel Functions    │
│  (CRA + Tailwind)    │ ───────▶│  (api/inventory/*)   │
│                      │         │                      │
│  • items.json (CDN)  │         │  • Steam fetcher     │
│  • localStorage data │         │  • Diff + state      │
└──────────────────────┘         └──────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │  Upstash Redis        │
                                │  (snapshot + pending) │
                                └───────────┬───────────┘
                                            │
                                ┌───────────▼───────────┐
                                │  steamcommunity.com   │
                                │  /inventory/{id}/730  │
                                └───────────────────────┘
```

For local development the Vercel functions are replaced by a tiny Express server under `server/` that persists state to `server/data/state.json`.

---

## Tech stack

- **React 19** with Create React App (`react-scripts 5`)
- **Tailwind CSS 3** (with a small safelist for dynamic theme classes)
- **Recharts** for line charts (heatmap is hand-rolled SVG)
- **Lucide** icons
- **Express 4** (local dev backend only)
- **Upstash Redis** via `@upstash/redis` (production state)
- **Vercel** functions + hosting

---

## Local setup

### 1. Frontend + items dataset

```bash
git clone https://github.com/Dvarraten/skinroi.git
cd skinroi
npm install

# Pull the latest CS2 skin list (~22 MB) into public/items.json
npm run items:update

# Start the React dev server
npm start
```

The site runs on **http://localhost:3000**. The Steam-sync features will be inactive until step 2.

### 2. Steam-sync backend (optional but recommended)

The frontend talks to `/api/inventory/*`. In dev, CRA proxies that path to the local Express server.

```bash
# One-time
npm run server:install

# Configure your Steam ID
cp server/.env.example server/.env
# Open server/.env and set STEAM_ID=<your 17-digit SteamID64>

# Start the server in another terminal
npm run server
```

Your Steam inventory must be set to **Public** for the sync to work.

### 3. Verifying it works

- Open `http://localhost:3001/` — you should see a JSON status page from the backend.
- Open the React app, click **Handle Items** in the header. The status strip should say "Last sync: …".
- After the first sync, future inventory changes appear as pending events in the modal.

---

## Production deploy (Vercel)

Vercel hosts both the static React build and the `api/` serverless functions in one project.

### 1. Set up state storage

In the Vercel dashboard for your project: **Storage → Create database → Upstash Redis**, free tier. Click *Connect to project*. Vercel injects these env vars automatically:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

(The code also reads `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` if those names are present.)

### 2. Set the Steam ID

**Settings → Environment Variables**, scope **Production + Preview + Development**:

| Key        | Value                          |
|------------|--------------------------------|
| `STEAM_ID` | your 17-digit SteamID64        |

**Never** put the Steam ID (or any secret) in a `REACT_APP_*` variable — those are baked into the JS bundle and become public on deploy.

### 3. Production branch

In **Settings → Git**, make sure *Production Branch* matches your default GitHub branch (`main`). Vercel only auto-deploys pushes to that branch.

### 4. Push

```bash
git push
```

Vercel builds and deploys. Verify by hitting `https://<your-app>.vercel.app/api/inventory/state` — should return JSON with `lastSync` populated after a few seconds.

---

## Useful endpoints

In production (and via the local Express backend, which mimics the same API):

| Method | Path                                       | Purpose                                                  |
|--------|--------------------------------------------|----------------------------------------------------------|
| GET    | `/api/inventory/state`                     | Current pending list + last sync metadata. Lazy-syncs if stale. |
| POST   | `/api/inventory/sync`                      | Force a fresh sync now.                                  |
| POST   | `/api/inventory/dismiss`                   | Body `{ assetid, type? }` — remove an entry from pending.|
| POST   | `/api/inventory/seed-pending?confirm=yes`  | Bulk-import all current inventory items as candidates.   |
| POST   | `/api/inventory/reset?confirm=yes`         | Wipe snapshot + pending (next sync re-baselines).        |
| GET    | `/api/inventory/debug?confirm=yes`         | Raw Steam response counts and tradability breakdown.     |

---

## Why no Steam Web API key?

The CS2 inventory endpoint at `steamcommunity.com/inventory/{steamid}/730/2` is publicly readable without authentication, as long as the user's inventory privacy is set to "Public". This means:

- **No API key to manage.** Steam Web API keys are tied to your Steam account and would need to be stored, rotated, and protected from leaks.
- **Smaller attack surface.** The only secret in the system is the Upstash credential, which only grants access to a single Redis key holding the inventory snapshot.
- **Trade-protected items are invisible.** Items in the 7-day Steam Trade Protection window do not appear in the public endpoint. The Pending Purchases feature is designed precisely to bridge that gap — log them when you buy, promote them when Steam finally exposes them.

---

## Security notes

The repo is public. A few things worth knowing:

- **`server/.env` is gitignored** along with `server/data/` (the local snapshot). The committed `server/.env.example` only contains a placeholder.
- **No secrets in the bundle.** Frontend code reads no `REACT_APP_*` secrets. The `useSteamSync` hook calls relative paths that go to either the local Express server or a Vercel function.
- **Backend listens on 127.0.0.1 only** locally — it is not exposed to other devices on your network.
- **CORS is scoped to localhost:3000** in the local server. Production functions are same-origin so CORS doesn't apply.
- **No user-input proxy.** The Steam ID is read once from env, never from a request body, so the backend can't be repurposed as an open inventory-scraping proxy if the port leaks.

If you fork this for your own use, replace the SteamID in `server/.env.example` with yours (it is publicly visible in any Steam profile URL anyway, but still personal data).

---

## Project structure

```
skinroi/
├── api/                       # Vercel functions (production backend)
│   ├── _lib/
│   │   ├── state.js           # Upstash Redis adapter
│   │   ├── steam.js           # Steam fetcher + diff
│   │   └── sync.js            # Sync orchestration with soft lock
│   └── inventory/
│       ├── state.js           # GET — pending list + lazy sync
│       ├── sync.js            # POST — force sync
│       ├── dismiss.js         # POST — remove a pending event
│       ├── seed-pending.js    # POST — seed pending from inventory
│       ├── reset.js           # POST — wipe state for re-baseline
│       └── debug.js           # GET — raw Steam diagnostics
│
├── server/                    # Local-only Express backend (dev convenience)
│   ├── index.js
│   ├── package.json
│   └── .env.example
│
├── public/
│   ├── items.json             # CS2 skin catalogue (refreshed via npm script)
│   └── …
│
├── scripts/
│   └── fetch-items.js         # `npm run items:update` — pulls ByMykel data
│
├── src/
│   ├── App.js                 # Top-level routing + state wiring
│   ├── components/            # React components
│   ├── hooks/                 # useItems, useSteamSync, useExchangeRate, …
│   ├── themes/themes.js       # Theme palette definitions
│   └── utils/                 # platformFees, exportCSV, itemImages, …
│
└── vercel.json                # Function maxDuration config (30 s)
```

---

## Scripts

| Command                  | Purpose                                              |
|--------------------------|------------------------------------------------------|
| `npm start`              | CRA dev server (http://localhost:3000)               |
| `npm run build`          | Production build to `build/`                         |
| `npm run server:install` | Install backend dependencies                         |
| `npm run server`         | Start local Express backend on port 3001             |
| `npm run items:update`   | Refresh `public/items.json` from ByMykel/CSGO-API    |

---

## Credits

- Skin metadata via [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API)
- Icons via [Lucide](https://lucide.dev)
- Item images served from Steam's CDN

This is a personal project. Counter-Strike, CS2, CS:GO, and Steam are trademarks of Valve Corporation; this app is not affiliated with or endorsed by Valve.
