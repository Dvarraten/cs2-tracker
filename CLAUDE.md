# SkinROI — Claude Code Guide

Personal CS2 skin investment tracker. React CRA frontend deployed on Vercel with
file-based serverless API functions and Upstash Redis for persistence.

## Architecture

```
skinroi/
├── api/                  Vercel serverless functions (production backend)
│   ├── _lib/             Shared server-side utilities (not exposed as routes)
│   │   ├── auth.js       HMAC session cookie — reads/writes steamId
│   │   ├── profile.js    Steam display name + avatar (cached in Redis 24h)
│   │   ├── state.js      Redis adapter for sync state (snapshot, pending list)
│   │   ├── steam.js      Steam API calls — inventory fetch, trade history
│   │   ├── steam-session.js  JWT token store + auto-refresh via GenerateAccessTokenForApp
│   │   └── sync.js       Core inventory diff + trade detection logic
│   ├── auth/             Steam OpenID login flow + session management
│   │   ├── steam.js      Initiates OpenID redirect
│   │   ├── callback.js   Validates OpenID response, sets session cookie
│   │   ├── me.js         Returns current session user
│   │   ├── logout.js     Clears session cookie
│   │   └── token.js      GET/POST Steam access token (webapi_token or refresh token)
│   ├── inventory/        Sync state endpoints
│   │   ├── state.js      GET — returns current pending list + sync metadata
│   │   ├── sync.js       POST — triggers an immediate sync (user-facing)
│   │   ├── dismiss.js    POST — removes a pending item + tombstones its assetid
│   │   ├── reset.js      POST — wipes sync state for a fresh baseline
│   │   └── seed-pending.js  POST — one-shot seed from current inventory
│   └── items/
│       └── index.js      GET/POST — load and save the tracked item portfolio
├── src/
│   ├── App.js            Root component — wires all hooks and renders the layout
│   ├── components/       UI components (see headers in each file)
│   │   └── Sidebar/      Sidebar-specific components (CurrencyConverter)
│   ├── hooks/            Custom React hooks
│   │   ├── useAuth.js        Steam session state + login/logout
│   │   ├── useItems.js       Portfolio CRUD + form state + persistence
│   │   ├── useExchangeRate.js  Live USD/CNY rate + linked input handlers
│   │   ├── useChartData.js   Derives chart series from sold items
│   │   └── useSteamSync.js   Polls sync state, auto-syncs on mount, token status
│   ├── utils/
│   │   ├── itemImages.js     Resolves skin thumbnail URL from /public/items.json
│   │   ├── platformFees.js   Fee fraction per platform (e.g. CSFloat = 2%)
│   │   ├── exportCSV.js      Serialises items to CSV download
│   │   └── importCSV.js      Parses CSV upload back into items
│   └── themes/themes.js  All visual theme definitions
├── scripts/
│   ├── fetch-items.js        Pulls latest CS2 skin list → public/items.json
│   └── get-refresh-token.mjs  One-time script: authenticates with Steam and
│                               outputs a mobile refresh token (~6 month TTL)
└── server/               Local Express dev server (not deployed to Vercel)
```

## Key Data Flows

**Steam login**: `GET /api/auth/steam` → Steam OpenID → `GET /api/auth/callback`
→ sets `cs2-session` HMAC cookie containing steamId.

**Sync**: Client mounts → `GET /api/inventory/state` (reads Redis) → if stale,
client calls `POST /api/inventory/sync` → `runSync()` fetches trade history +
inventory diff → saves updated state to Redis.

**Token auth**: User pastes a token into the UI → `POST /api/auth/token` → backend
decodes JWT `aud` claim: `web:store` → stored as short-lived access token;
`mobile` → stored as long-lived refresh token. `getAccessToken()` auto-refreshes
via `IAuthenticationService/GenerateAccessTokenForApp` when the access token is
within 5 minutes of expiry.

**Item persistence**: Logged-in users → `GET/POST /api/items` backed by Redis.
Guest users → `localStorage` key `cs2-trading-items`.

## Development

```bash
npm install          # install frontend + devDependencies (includes steam-session)
npm start            # CRA dev server on :3000, proxies /api/* to :3001
npm run server       # local Express API server on :3001
npm run items:update # refresh public/items.json from ByMykel/CSGO-API
```

Copy `server/.env.example` → `server/.env` and fill in:

- `STEAM_ID` — your 17-digit Steam ID
- `STEAM_API_KEY` — from steamcommunity.com/dev/apikey
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Upstash console
- `SESSION_SECRET` — random 32-byte hex string
- `APP_URL` — `http://localhost:3000` for local dev

## Common Operations

**Get a long-lived Steam refresh token (~6 months):**

```bash
node scripts/get-refresh-token.mjs
# paste the output into the "Connect Steam account" box on the site
```

**Reset sync state (fresh snapshot on next sync):**

```
POST /api/inventory/reset?confirm=yes
```

**Update the skin autocomplete list:**

```bash
npm run items:update
```

## Redis Key Namespace

| Key                                       | Contents                                     |
| ----------------------------------------- | -------------------------------------------- |
| `skinroi:items:{steamId}`                 | Portfolio item array                         |
| `skinroi:sync:{steamId}:state`            | Sync state (snapshot, pending, lock)         |
| `skinroi:session:{steamId}:access_token`  | Cached Steam access token                    |
| `skinroi:session:{steamId}:access_exp`    | Access token expiry (Unix seconds)           |
| `skinroi:session:{steamId}:refresh_token` | Long-lived Steam refresh token               |
| `skinroi:profile:{steamId}`               | Cached Steam display name + avatar (24h TTL) |

## Hard Project Rules

Never commit secrets. Always pass linting before committing or pushing. Run:

```bash
npx eslint src/ --max-warnings=0
```

Fix every error and warning before proceeding. CI treats warnings as errors (`CI=true`), so a clean local lint means a clean Vercel build.

Never hardcode color hex strings in components. Use the exported constants from
`src/themes/themes.js` instead:

- `PROFIT_COLOR` — green (`#22c55e`), matches Tailwind `text-profit`
- `LOSS_COLOR`   — red (`#ef4444`), matches Tailwind `text-loss`
- `WARN_COLOR`   — amber (`#f59e0b`), matches Tailwind `text-warn`
- `theme.dotColor` — the active theme's accent hex (use for inline `style={{ backgroundColor }}`)
- `SAP_CHART_COLORS` — named chart palette (use for chart series, not UI chrome)

## Known Caveats & Gotchas

### 1. CRLF line endings in HandleItemsModal.jsx
`src/components/HandleItemsModal.jsx` has Windows CRLF line endings. The Edit
tool fails silently or produces broken diffs on this file. Always use a Bash
Python one-liner instead:

```bash
python -c "
import re, pathlib
p = pathlib.Path('src/components/HandleItemsModal.jsx')
src = p.read_text(encoding='utf-8')
src = src.replace('OLD', 'NEW')
p.write_text(src, encoding='utf-8')
"
```

### 2. Tailwind JIT — never use dynamic theme class strings for colors
Dynamic template literals like `` className={`${theme.dot}`} `` are not reliably
picked up by the Tailwind JIT compiler; the CSS class may never be generated.

**Wrong:**
```jsx
<span className={`h-2 w-2 rounded-full ${theme.dot}`} />
```

**Right — use inline style with the hex value:**
```jsx
<span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.dotColor }} />
```

This applies to any color-bearing theme token used dynamically (backgrounds,
borders, text). Static strings like `className="bg-blue-500"` are fine.

### 3. Theme system — two color fields per theme
Every theme in `src/themes/themes.js` has two representations of its accent color:

- `dot` — a Tailwind bg-class string (e.g. `"bg-amber-500"`). Only safe to use
  in static/predictable class positions where Tailwind will detect it at build time.
- `dotColor` — the raw hex string (e.g. `"#f59e0b"`). Use this for all dynamic
  or conditional color application via `style={{ backgroundColor: dotColor }}`.

When adding a new theme, always set both fields.

### 4. Deployment
Pushing to `main` triggers an automatic Vercel production deploy — no manual
step required. To deploy manually:

```bash
vercel --prod
```

Environment variables (Redis, Steam keys, session secret) live in the Vercel
project settings and are never committed.

### 5. Steam sync detection quirks
Two paths detect new items; each has a hard cutoff:

- **Trade history path** (`sync.js` ~line 166): ignores trades older than 8 days.
  Items bought more than 8 days ago will never surface here.
- **Inventory snapshot diff** (~line 195): only surfaces items with
  `market_tradable_restriction > 0` (still on hold). Fully tradeable items that
  predate the snapshot are intentionally skipped to avoid false positives.

If old items unexpectedly appear in Handle Items, the most likely cause is that
the sync snapshot was reset (Redis key wiped or `POST /api/inventory/reset`
called), triggering a fresh baseline that re-detects currently-held items.
