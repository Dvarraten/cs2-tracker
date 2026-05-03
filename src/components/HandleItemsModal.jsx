import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle, Inbox } from 'lucide-react';

const STEAM_IMG_BASE = 'https://community.akamai.steamstatic.com/economy/image/';

// ─── Name matching ──────────────────────────────────────────────────────────
// Steam ships full names like "Charm | Quick Silver" or "★ StatTrak™ Karambit |
// Fade (Factory New)". Users often track them under shorter handles ("Quick
// Silver", "Karambit Fade", "Fade"). To catch these, tokenise both sides and
// score the overlap.
const NAME_STOPWORDS = new Set([
  'stattrak', 'souvenir', 'the',
  // Wear levels — already pulled out via the (Wear) suffix strip below, but
  // listed here too in case someone writes them inline.
  'factory', 'new', 'minimal', 'wear', 'field', 'tested', 'well', 'worn',
  'battle', 'scarred',
]);

function tokenizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/★/g, ' ')
    .replace(/™/g, ' ')
    .replace(/\([^)]*\)/g, ' ')        // strip "(Field-Tested)" etc.
    .replace(/[|/\-.,:'"]/g, ' ')      // word-breaking punctuation
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !NAME_STOPWORDS.has(t));
}

// Returns a score in [0, 1] expressing how well `trackerName` lines up with
// `steamName`. We measure coverage from the tracker side so that short
// handles ("Quick Silver") still score 1.0 against the fuller market name
// ("Charm | Quick Silver").
function nameMatchScore(steamName, trackerName) {
  const steamTokens = new Set(tokenizeName(steamName));
  const trackerTokens = tokenizeName(trackerName);
  if (trackerTokens.length === 0 || steamTokens.size === 0) return 0;
  const matched = trackerTokens.filter((t) => steamTokens.has(t)).length;
  return matched / trackerTokens.length;
}

// ─── Currency-paired price input ────────────────────────────────────────────
// Two inputs that sync via the live exchange rate. The USD field is the
// "source of truth" — that's what gets stored on the item. Editing either
// field updates the other so users can type in whichever currency they
// actually paid in.
function PricePair({ usdValue, cnyValue, onChange, exchangeRate, theme, label }) {
  const handleUsd = (raw) => {
    const num = parseFloat(raw);
    const cny =
      isNaN(num) || !exchangeRate ? '' : (num * exchangeRate).toFixed(2);
    onChange({ usd: raw, cny });
  };
  const handleCny = (raw) => {
    const num = parseFloat(raw);
    const usd =
      isNaN(num) || !exchangeRate ? '' : (num / exchangeRate).toFixed(2);
    onChange({ usd, cny: raw });
  };
  const inputClass = `w-full ${theme.input} rounded-md pl-6 pr-2 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;
  return (
    <div className="flex items-center gap-1.5 min-w-[220px] flex-1">
      <div className="relative flex-1 min-w-[100px]">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">$</span>
        <input
          type="number"
          step="0.01"
          value={usdValue}
          onChange={(e) => handleUsd(e.target.value)}
          placeholder={label || 'USD'}
          className={inputClass}
        />
      </div>
      <div className="relative flex-1 min-w-[100px]">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">¥</span>
        <input
          type="number"
          step="0.01"
          value={cnyValue}
          onChange={(e) => handleCny(e.target.value)}
          placeholder={exchangeRate ? 'CNY' : 'rate loading…'}
          disabled={!exchangeRate}
          className={`${inputClass} ${!exchangeRate ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );
}

function ItemImage({ iconUrl, alt }) {
  if (!iconUrl) {
    return (
      <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-[10px] text-slate-500">
        ?
      </div>
    );
  }
  return (
    <img
      src={`${STEAM_IMG_BASE}${iconUrl}/96fx96f`}
      alt={alt || ''}
      className="w-12 h-12 rounded bg-white/5 object-contain flex-shrink-0"
      loading="lazy"
    />
  );
}

function IncomingRow({ entry, onAdd, onDismiss, theme, exchangeRate, pendingMatch, onPromotePending }) {
  const [usdPrice, setUsdPrice] = useState('');
  const [cnyPrice, setCnyPrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [confirming, setConfirming] = useState(false);

  const submit = () => {
    const v = parseFloat(usdPrice);
    if (!v || v <= 0) return;
    setConfirming(true);
    onAdd({
      itemName: entry.marketHashName,
      purchasePrice: v,
      platform,
      notes: `From Steam inventory (asset ${entry.assetid})`,
      iconUrl: entry.iconUrl
        ? `https://community.akamai.steamstatic.com/economy/image/${entry.iconUrl}/96fx96f`
        : null,
    });
  };

  const promote = () => {
    if (!pendingMatch) return;
    setConfirming(true);
    const iconUrl = entry.iconUrl
      ? `https://community.akamai.steamstatic.com/economy/image/${entry.iconUrl}/96fx96f`
      : null;
    onPromotePending(pendingMatch.item.id, { iconUrl });
    onDismiss(entry.assetid, 'incoming');
  };

  return (
    <div className={`flex flex-col gap-3 p-3 rounded-lg ${theme.card} border ${theme.cardBorder}`}>
      <div className="flex items-start gap-3">
        <ItemImage iconUrl={entry.iconUrl} alt={entry.marketHashName} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">
            {entry.marketHashName}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Seen {new Date(entry.detectedAt).toLocaleString()}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(entry.assetid, 'incoming')}
          className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-white/5"
          title="Dismiss (don't track)"
        >
          <X size={14} />
        </button>
      </div>

      {pendingMatch ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-md border ${theme.cardBorder} bg-amber-500/10`}
        >
          <div className="text-xs text-amber-200 leading-snug min-w-0">
            <div className="font-semibold">
              Matches a pending purchase
              {pendingMatch.matchType === 'fuzzy' && pendingMatch.matchScore && (
                <span className="opacity-70 font-normal">
                  {' '}
                  ({Math.round(pendingMatch.matchScore * 100)}% match)
                </span>
              )}
            </div>
            <div className="text-amber-300/80 truncate">
              "{pendingMatch.item.itemName}" — paid ${pendingMatch.item.purchasePrice.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={confirming}
              onClick={promote}
              className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-40"
            >
              {confirming ? 'Promoting…' : 'Mark received'}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(entry.assetid, 'incoming')}
              className={`text-xs px-2 py-1 rounded ${theme.subtext} hover:text-white`}
            >
              Not this one
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <PricePair
            usdValue={usdPrice}
            cnyValue={cnyPrice}
            onChange={({ usd, cny }) => { setUsdPrice(usd); setCnyPrice(cny); }}
            exchangeRate={exchangeRate}
            theme={theme}
            label="Purchase price"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={`${theme.input} rounded-md px-2 py-1.5 text-white text-sm focus:outline-none border`}
          >
            <option value="csfloat">CSFloat</option>
            <option value="csmoney">CS.MONEY</option>
            <option value="gamerpay">GamerPay</option>
            <option value="skinswap">SkinSwap</option>
            <option value="dmarket">DMarket</option>
            <option value="youpin">Youpin</option>
            <option value="other">Other</option>
          </select>
          <button
            type="button"
            disabled={confirming || !parseFloat(usdPrice)}
            onClick={submit}
            className={`${theme.accentBg} text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirming ? 'Adding…' : 'Add to tracker'}
          </button>
        </div>
      )}
    </div>
  );
}

function formatCandidateLabel(c) {
  const base = `${c.itemName} · $${c.purchasePrice.toFixed(2)}`;
  if (c.matchType === 'fuzzy' && typeof c.matchScore === 'number') {
    const pct = Math.round(c.matchScore * 100);
    return `${base} (${pct}% match)`;
  }
  return base;
}

function OutgoingRow({ entry, candidates, allActiveItems, onMatch, onDismiss, theme, exchangeRate }) {
  const [browseAll, setBrowseAll] = useState(candidates.length === 0);
  const [browseQuery, setBrowseQuery] = useState('');
  const [selectedId, setSelectedId] = useState(
    candidates[0]?.id ? String(candidates[0].id) : ''
  );
  const [usdSalePrice, setUsdSalePrice] = useState('');
  const [cnySalePrice, setCnySalePrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [confirming, setConfirming] = useState(false);

  // Items the user can pick from. Default = the smart candidates list, but
  // "Browse all" toggles to a free-text search across everything active.
  const browseResults = useMemo(() => {
    const q = browseQuery.toLowerCase().trim();
    const all = allActiveItems || [];
    const filtered = q
      ? all.filter((it) => (it.itemName || '').toLowerCase().includes(q))
      : all;
    return filtered.slice(0, 30).map((it) => ({ ...it, matchType: 'browse' }));
  }, [browseQuery, allActiveItems]);

  const visibleCandidates = browseAll ? browseResults : candidates;

  // Keep selected id valid as the visible list changes.
  useEffect(() => {
    if (visibleCandidates.length === 0) {
      setSelectedId('');
      return;
    }
    if (!visibleCandidates.some((c) => String(c.id) === selectedId)) {
      setSelectedId(String(visibleCandidates[0].id));
    }
  }, [visibleCandidates, selectedId]);

  const submit = () => {
    const id = parseInt(selectedId, 10);
    const v = parseFloat(usdSalePrice);
    if (!id || !v || v <= 0) return;
    setConfirming(true);
    onMatch({ trackedId: id, salePrice: v, platform, assetid: entry.assetid });
  };

  // Are we showing only fuzzy matches (no exacts found)?
  const isFuzzyOnly =
    !browseAll &&
    candidates.length > 0 &&
    candidates.every((c) => c.matchType === 'fuzzy');

  return (
    <div className={`flex flex-col gap-3 p-3 rounded-lg ${theme.card} border ${theme.cardBorder}`}>
      <div className="flex items-start gap-3">
        <ItemImage iconUrl={entry.iconUrl} alt={entry.marketHashName} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">
            {entry.marketHashName}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Gone since {new Date(entry.detectedAt).toLocaleString()}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(entry.assetid, 'outgoing')}
          className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-white/5"
          title="Dismiss (not a sale I track)"
        >
          <X size={14} />
        </button>
      </div>

      {isFuzzyOnly && (
        <div className="text-[11px] text-amber-300/90 bg-amber-500/10 rounded-md px-2 py-1">
          No exact name match — showing fuzzy suggestions. Use "Browse all" if none of these are right.
        </div>
      )}

      {browseAll && (
        <input
          type="text"
          value={browseQuery}
          onChange={(e) => setBrowseQuery(e.target.value)}
          placeholder={`Search active items (${(allActiveItems || []).length} total)…`}
          className={`w-full ${theme.input} rounded-md px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none border`}
        />
      )}

      {visibleCandidates.length === 0 ? (
        <div className="text-xs text-amber-300/90 bg-amber-500/10 rounded-md px-2 py-1.5">
          {browseAll
            ? 'No active items match that search. Try a different word, or dismiss if it wasn\'t a tracked sale.'
            : 'No tracked item matches this name. Use "Browse all" to pick one manually, or dismiss.'}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`flex-1 min-w-[200px] ${theme.input} rounded-md px-2 py-1.5 text-white text-sm focus:outline-none border`}
          >
            {visibleCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCandidateLabel(c)}
              </option>
            ))}
          </select>
          <PricePair
            usdValue={usdSalePrice}
            cnyValue={cnySalePrice}
            onChange={({ usd, cny }) => { setUsdSalePrice(usd); setCnySalePrice(cny); }}
            exchangeRate={exchangeRate}
            theme={theme}
            label="Sale price"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={`${theme.input} rounded-md px-2 py-1.5 text-white text-sm focus:outline-none border`}
          >
            <option value="csfloat">CSFloat</option>
            <option value="csmoney">CS.MONEY</option>
            <option value="gamerpay">GamerPay</option>
            <option value="skinswap">SkinSwap</option>
            <option value="dmarket">DMarket</option>
            <option value="youpin">Youpin</option>
            <option value="other">Other</option>
          </select>
          <button
            type="button"
            disabled={confirming || !parseFloat(usdSalePrice) || !selectedId}
            onClick={submit}
            className={`${theme.accentBg} text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirming ? 'Marking…' : 'Mark sold'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setBrowseAll((prev) => !prev);
          setBrowseQuery('');
        }}
        className={`self-start text-[11px] underline-offset-2 hover:underline ${theme.subtext} hover:text-white`}
      >
        {browseAll ? '← Back to suggestions' : 'Browse all tracked items →'}
      </button>
    </div>
  );
}

export default function HandleItemsModal({
  open,
  onClose,
  theme,
  pending,
  incoming,
  outgoing,
  lastSync,
  lastSyncOk,
  lastError,
  reachable,
  busy,
  hasInitialSnapshot,
  pollIntervalMin,
  onSync,
  onDismiss,
  items,
  addItemDirect,
  sellItemDirect,
  promotePendingItem,
  exchangeRate,
  embedded = false,
}) {
  const [tab, setTab] = useState('incoming');

  // Lock body scroll while open as a modal — never lock when embedded.
  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open, embedded]);

  // Index active (non-pending, non-sold) tracked items by market_hash_name
  // for outgoing matching and the incoming "already tracked" filter.
  const activeByName = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (it.sold || it.pending) continue;
      const key = (it.itemName || '').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.datePurchased || '').localeCompare(b.datePurchased || ''));
    }
    return map;
  }, [items]);

  // Pending purchases — used to surface a "Mark received" shortcut on
  // incoming Steam items that match something the user is waiting for.
  const pendingItems = useMemo(
    () => items.filter((it) => !it.sold && it.pending),
    [items]
  );

  const findPendingMatch = (entry) => {
    const lowerName = (entry.marketHashName || '').toLowerCase();
    // 1) exact lowercase name match
    let exact = pendingItems.find(
      (p) => (p.itemName || '').toLowerCase() === lowerName
    );
    if (exact) return { item: exact, matchType: 'exact' };
    // 2) fuzzy fallback (>= 0.5 score from tracker side)
    let best = null;
    let bestScore = 0;
    for (const p of pendingItems) {
      const score = nameMatchScore(entry.marketHashName, p.itemName);
      if (score > bestScore && score >= 0.5) {
        best = p;
        bestScore = score;
      }
    }
    return best ? { item: best, matchType: 'fuzzy', matchScore: bestScore } : null;
  };

  // Hide incoming entries whose name matches an item already in the tracker
  // (count-aware: if you own 3× "AK-47 | Redline (FT)" in your tracker and
  // Steam shows 5 such assets, the extra 2 still surface as incoming).
  // The "hidden" entries can still be cleaned up from the backend via the
  // bulk-dismiss button below.
  const { visibleIncoming, hiddenIncoming } = useMemo(() => {
    const remaining = new Map();
    for (const [k, arr] of activeByName.entries()) remaining.set(k, arr.length);
    const visible = [];
    const hidden = [];
    for (const entry of incoming) {
      const k = (entry.marketHashName || '').toLowerCase();
      const left = remaining.get(k) || 0;
      if (left > 0) {
        remaining.set(k, left - 1);
        hidden.push(entry);
      } else {
        visible.push(entry);
      }
    }
    return { visibleIncoming: visible, hiddenIncoming: hidden };
  }, [incoming, activeByName]);

  const dismissAllHidden = async () => {
    // Run in parallel — onDismiss is optimistic so the UI updates fast.
    await Promise.all(
      hiddenIncoming.map((entry) => onDismiss(entry.assetid, 'incoming'))
    );
  };

  // Flat list of every active tracked item — used as escape hatch when the
  // user wants to manually pick a match.
  const activeItems = useMemo(
    () =>
      items
        .filter((it) => !it.sold)
        .sort((a, b) =>
          (a.itemName || '').localeCompare(b.itemName || '')
        ),
    [items]
  );

  // Returns suggestion candidates for an outgoing entry:
  //   1. Exact-name matches (current behaviour)
  //   2. If none, falls back to fuzzy token-overlap matches with score >= 0.5
  //
  // Each candidate is `{ ...item, matchType, matchScore? }` so the row can
  // surface why something is being suggested.
  const candidatesFor = (entry) => {
    const key = (entry.marketHashName || '').toLowerCase();
    const exact = activeByName.get(key);
    if (exact && exact.length > 0) {
      return exact.map((it) => ({ ...it, matchType: 'exact' }));
    }
    const scored = [];
    for (const it of activeItems) {
      const score = nameMatchScore(entry.marketHashName, it.itemName);
      if (score >= 0.5) scored.push({ ...it, matchType: 'fuzzy', matchScore: score });
    }
    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, 10);
  };

  if (!embedded && !open) return null;

  const incomingCount = visibleIncoming.length;
  const outgoingCount = outgoing.length;

  // The actual UI — header, status, tabs, body — captured as a single JSX
  // tree so we can wrap it in either a modal frame or an inline panel.
  const innerUi = (
    <>
      {/* Header — title + last-sync timestamp + Sync now button on one row */}
        <div className="flex items-center justify-between p-4 gap-3 border-b border-transparent flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Inbox size={18} className="text-amber-400" />
              Handle Items
            </h3>
            {pending.length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pending.length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              {hasInitialSnapshot && lastSync
                ? <>Last sync: {new Date(lastSync).toLocaleTimeString()}</>
                : !hasInitialSnapshot ? 'No snapshot yet'
                : 'never'}
            </span>
            <button
              type="button"
              onClick={onSync}
              disabled={busy}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs ${theme.card} border ${theme.cardBorder} ${theme.subtext} hover:text-white disabled:opacity-50`}
              title="Sync with Steam now"
            >
              <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
            {!embedded && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-white/5"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Error / unreachable banner — only shown when something's off. */}
        {(reachable === false || lastSyncOk === false) && (
          <div className="px-4 py-2 text-[11px] flex items-center gap-1.5 flex-wrap">
            {reachable === false ? (
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertTriangle size={12} />
                Local backend not reachable on localhost:3001 — start it with{' '}
                <code className="bg-white/5 px-1 rounded">cd server && npm start</code>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-300">
                <AlertTriangle size={12} />
                Sync failed: {lastError}
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-transparent">
          <button
            type="button"
            onClick={() => setTab('incoming')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === 'incoming'
                ? 'text-white bg-white/5 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle size={14} className="text-emerald-400" />
            Incoming
            {incomingCount > 0 && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {incomingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('outgoing')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === 'outgoing'
                ? 'text-white bg-white/5 border-b-2 border-rose-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpCircle size={14} className="text-rose-400" />
            Outgoing
            {outgoingCount > 0 && (
              <span className="bg-rose-500/20 text-rose-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {outgoingCount}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'incoming' && (
            <>
              {hiddenIncoming.length > 0 && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${theme.card} border ${theme.cardBorder} ${theme.subtext}`}
                >
                  <span>
                    Hiding{' '}
                    <span className="text-white font-semibold">
                      {hiddenIncoming.length}
                    </span>{' '}
                    item{hiddenIncoming.length === 1 ? '' : 's'} that match an
                    item already in your tracker.
                  </span>
                  <button
                    type="button"
                    onClick={dismissAllHidden}
                    className={`${theme.accentBg} text-white text-xs font-medium px-2.5 py-1 rounded-md`}
                  >
                    Dismiss them
                  </button>
                </div>
              )}

              {visibleIncoming.length === 0 ? (
                <EmptyState
                  theme={theme}
                  text={
                    hiddenIncoming.length > 0
                      ? "Everything currently incoming is already in your tracker — nothing new to handle."
                      : "No new items detected. You're all caught up."
                  }
                />
              ) : (
                visibleIncoming.map((entry) => (
                  <IncomingRow
                    key={`in-${entry.assetid}`}
                    entry={entry}
                    theme={theme}
                    exchangeRate={exchangeRate}
                    pendingMatch={findPendingMatch(entry)}
                    onPromotePending={promotePendingItem}
                    onAdd={(payload) => {
                      addItemDirect(payload);
                      onDismiss(entry.assetid, 'incoming');
                    }}
                    onDismiss={onDismiss}
                  />
                ))
              )}
            </>
          )}

          {tab === 'outgoing' && (
            outgoing.length === 0 ? (
              <EmptyState theme={theme} text="No items have left your inventory since last sync." />
            ) : (
              outgoing.map((entry) => (
                <OutgoingRow
                  key={`out-${entry.assetid}`}
                  entry={entry}
                  candidates={candidatesFor(entry)}
                  allActiveItems={activeItems}
                  theme={theme}
                  exchangeRate={exchangeRate}
                  onMatch={({ trackedId, salePrice, platform, assetid }) => {
                    const ok = sellItemDirect(trackedId, salePrice, platform);
                    if (ok) onDismiss(assetid, 'outgoing');
                  }}
                  onDismiss={onDismiss}
                />
              ))
            )
          )}
        </div>
    </>
  );

  if (embedded) {
    return (
      <div
        id="section-handle"
        className={`relative w-full h-full ${theme.panel} ${theme.panelBorder} rounded-xl border shadow-lg flex flex-col overflow-hidden`}
      >
        {innerUi}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl max-h-[85vh] overflow-hidden ${theme.panel || theme.card} ${theme.cardBorder} rounded-2xl border shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {innerUi}
      </div>
    </div>
  );
}

function EmptyState({ theme, text }) {
  return (
    <div className={`text-center py-10 text-sm ${theme.subtext || 'text-slate-400'}`}>
      {text}
    </div>
  );
}
