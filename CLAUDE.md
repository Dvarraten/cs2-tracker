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

| Key | Contents |
|-----|----------|
| `skinroi:items:{steamId}` | Portfolio item array |
| `skinroi:sync:{steamId}:state` | Sync state (snapshot, pending, lock) |
| `skinroi:session:{steamId}:access_token` | Cached Steam access token |
| `skinroi:session:{steamId}:access_exp` | Access token expiry (Unix seconds) |
| `skinroi:session:{steamId}:refresh_token` | Long-lived Steam refresh token |
| `skinroi:profile:{steamId}` | Cached Steam display name + avatar (24h TTL) |
