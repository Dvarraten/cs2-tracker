import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import SteamQRSetup from './SteamQRSetup';

import PricePair from './PricePair';
import PlatformPicker from './PlatformPicker';
import { PLATFORMS } from '../utils/platforms';

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

// Steam names follow "<weapon> | <skin> (<wear>)". The skin part is the
// distinguishing piece — matching on it avoids "AK-47 | Asiimov" being
// scored as a hit against every AK-47 in the tracker.
function getSkinPart(name) {
  if (!name) return null;
  // Strip the trailing "(Wear)" suffix.
  const stripped = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const pipeIdx = stripped.indexOf('|');
  if (pipeIdx === -1) return null; // no skin segment
  return stripped.slice(pipeIdx + 1).trim();
}

// Returns a score in [0, 1] expressing how well `trackerName` lines up with
// `steamName`. The score is the fraction of *Steam skin* tokens that appear
// somewhere in the tracker name — that way "Asiimov" or "AK-47 Asiimov" or
// "AK-47 | Asiimov" all match an outgoing AK-47 | Asiimov, but a tracker
// item called "AK-47 | Redline" does NOT match (it'd score 0/1 = 0).
const WEAR_LEVELS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
function getWearLevel(name) {
  return WEAR_LEVELS.find(w => (name || '').includes(w)) ?? null;
}

function nameMatchScore(steamName, trackerName) {
  // Wear levels must match when both names specify one — MW ≠ BS even if the skin name is identical.
  const sw = getWearLevel(steamName);
  const tw = getWearLevel(trackerName);
  if (sw && tw && sw !== tw) return 0;

  const steamSkin = getSkinPart(steamName);

  if (steamSkin) {
    const steamSkinTokens = tokenizeName(steamSkin);
    if (steamSkinTokens.length === 0) return 0;
    // Compare against the tracker's skin part if it has one, otherwise the
    // whole tracker name (so a user who typed just "Asiimov" still matches).
    const trackerCmp = getSkinPart(trackerName) ?? trackerName;
    const trackerTokens = new Set(tokenizeName(trackerCmp));
    if (trackerTokens.size === 0) return 0;
    const matched = steamSkinTokens.filter((t) => trackerTokens.has(t)).length;
    return matched / steamSkinTokens.length;
  }

  // Steam name has no skin segment (vanilla knives, agents, stickers …).
  // Fall back to whole-name comparison.
  const steamTokens = new Set(tokenizeName(steamName));
  const trackerTokens = tokenizeName(trackerName);
  if (trackerTokens.length === 0 || steamTokens.size === 0) return 0;
  const matched = trackerTokens.filter((t) => steamTokens.has(t)).length;
  return matched / trackerTokens.length;
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

function IncomingRow({ entry, onAdd, onDismiss, theme, exchangeRate, currencySymbol, displayCurrency, pendingMatch, onPromotePending }) {
  const [usdPrice, setUsdPrice] = useState('');
  const [cnyPrice, setCnyPrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [customFee, setCustomFee] = useState('');
  const [onHold, setOnHold] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const submit = () => {
    const v = parseFloat(usdPrice);
    if (!v || v <= 0) return;
    setConfirming(true);
    const expectedDelivery = onHold
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    onAdd({
      itemName: entry.marketHashName,
      purchasePrice: v,
      platform,
      pending: onHold,
      expectedDelivery,
      notes,
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
          <div className={`text-sm font-semibold ${theme.text} truncate`}>
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
            <div className="text-warn/80 truncate">
              "{pendingMatch.item.itemName}" — paid <span className="font-mono">${pendingMatch.item.purchasePrice.toFixed(2)}</span>
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
              className={`text-xs px-2 py-1 rounded ${theme.subtext} ${theme.textHover}`}
            >
              Not this one
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <PricePair
            usdValue={usdPrice}
            cnyValue={cnyPrice}
            onChange={({ usd, cny }) => { setUsdPrice(usd); setCnyPrice(cny); }}
            onCnyTyped={() => setPlatform('youpin')}
            exchangeRate={exchangeRate}
            theme={theme}
            currencySymbol={currencySymbol}
            displayCurrency={displayCurrency}
          />
          <div className="flex gap-2">
            <PlatformPicker
              value={platform}
              onChange={(val) => { setPlatform(val); setCustomFee(val === 'other' ? '0' : ''); }}
              theme={theme}
              platforms={PLATFORMS}
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes…"
              className={`flex-1 h-9 ${theme.input} rounded-lg px-3 text-sm ${theme.text} placeholder-slate-600 focus:outline-none border`}
            />
          </div>
          {platform === 'other' && (
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" max="100" step="0.1"
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                placeholder="Fee %"
                className={`w-24 h-9 ${theme.input} rounded-lg px-3 ${theme.text} text-sm focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              <span className={`text-sm ${theme.subtext}`}>%</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOnHold(h => !h)}
              className={`relative group flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium border transition-all
                ${theme.card} ${theme.cardBorder}
                ${onHold ? 'text-warn' : `${theme.subtext} ${theme.textHover}`}`}
            >
              <Clock size={15} />
              Protected
              <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 bg-warn ${onHold ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </button>
            <button
              type="button"
              disabled={confirming || !parseFloat(usdPrice)}
              onClick={submit}
              className={`relative group flex items-center gap-2 px-5 h-9 rounded-lg text-sm font-medium border transition-all duration-200
                ${theme.card} ${theme.cardBorder} ${confirming ? 'text-profit' : theme.text}
                disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {confirming ? <><CheckCircle size={15} /> Added!</> : onHold ? 'Add as protected' : 'Add to tracker'}
              <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${confirming ? 'w-full bg-profit' : `w-0 group-hover:w-full ${theme.dot}`}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupedIncomingRow({ entries, onAddAll, onDismissAll, theme, exchangeRate, currencySymbol, displayCurrency }) {
  const [usdPrice, setUsdPrice] = useState('');
  const [cnyPrice, setCnyPrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [customFee, setCustomFee] = useState('');
  const [onHold, setOnHold] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const rep = entries[0];
  const count = entries.length;

  const submitAll = () => {
    const v = parseFloat(usdPrice);
    if (!v || v <= 0) return;
    setConfirming(true);
    const expectedDelivery = onHold
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    onAddAll({
      itemName: rep.marketHashName,
      purchasePrice: v,
      platform,
      pending: onHold,
      expectedDelivery,
      notes,
      iconUrl: rep.iconUrl
        ? `https://community.akamai.steamstatic.com/economy/image/${rep.iconUrl}/96fx96f`
        : null,
    });
  };

  return (
    <div className={`flex flex-col gap-3 p-3 rounded-lg ${theme.card} border ${theme.cardBorder}`}>
      <div className="flex items-start gap-3">
        <ItemImage iconUrl={rep.iconUrl} alt={rep.marketHashName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={`text-sm font-semibold ${theme.text} truncate`}>{rep.marketHashName}</div>
            <span className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${theme.accentBg} text-white`}>×{count}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {count} items — set one price to add all
          </div>
        </div>
        <button
          type="button"
          onClick={onDismissAll}
          className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-white/5"
          title="Dismiss all"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <PricePair
          usdValue={usdPrice}
          cnyValue={cnyPrice}
          onChange={({ usd, cny }) => { setUsdPrice(usd); setCnyPrice(cny); }}
          onCnyTyped={() => setPlatform('youpin')}
          exchangeRate={exchangeRate}
          theme={theme}
          currencySymbol={currencySymbol}
          displayCurrency={displayCurrency}
        />
        <div className="flex gap-2">
          <PlatformPicker
            value={platform}
            onChange={(val) => { setPlatform(val); setCustomFee(val === 'other' ? '0' : ''); }}
            theme={theme}
            platforms={PLATFORMS}
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            className={`flex-1 h-9 ${theme.input} rounded-lg px-3 text-sm ${theme.text} placeholder-slate-600 focus:outline-none border`}
          />
        </div>
        {platform === 'other' && (
          <div className="flex items-center gap-1.5">
            <input
              type="number" min="0" max="100" step="0.1"
              value={customFee}
              onChange={(e) => setCustomFee(e.target.value)}
              placeholder="Fee %"
              className={`w-24 h-9 ${theme.input} rounded-lg px-3 ${theme.text} text-sm focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <span className={`text-sm ${theme.subtext}`}>%</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOnHold(h => !h)}
            className={`relative group flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium border transition-all
              ${theme.card} ${theme.cardBorder}
              ${onHold ? 'text-warn' : `${theme.subtext} ${theme.textHover}`}`}
          >
            <Clock size={15} />
            Protected
            <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 bg-warn ${onHold ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </button>
          <button
            type="button"
            disabled={confirming || !parseFloat(usdPrice)}
            onClick={submitAll}
            className={`relative group flex items-center gap-2 px-5 h-9 rounded-lg text-sm font-medium border transition-all duration-200
              ${theme.card} ${theme.cardBorder} ${confirming ? 'text-profit' : theme.text}
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirming
              ? <><CheckCircle size={15} /> Added!</>
              : onHold ? `Add ${count} as protected` : `Add all ${count}`}
            <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${confirming ? 'w-full bg-profit' : `w-0 group-hover:w-full ${theme.dot}`}`} />
          </button>
        </div>
      </div>
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

function OutgoingRow({ entry, candidates, allActiveItems, onMatch, onDismiss, theme, exchangeRate, currencySymbol, displayCurrency }) {
  const [browseAll, setBrowseAll] = useState(candidates.length === 0);
  const [browseQuery, setBrowseQuery] = useState('');
  const [selectedId, setSelectedId] = useState(
    candidates[0]?.id ? String(candidates[0].id) : ''
  );
  const [usdSalePrice, setUsdSalePrice] = useState('');
  const [cnySalePrice, setCnySalePrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [customFee, setCustomFee] = useState('');
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
    onMatch({ trackedId: id, salePrice: v, platform, customFee: customFee || undefined, assetid: entry.assetid });
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
          <div className={`text-sm font-semibold ${theme.text} truncate`}>
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
        <div className="text-[11px] text-warn bg-warn/10 rounded-md px-2 py-1">
          No exact match — these are near-matches only. Use "Browse all" to confirm the right item before marking sold.
        </div>
      )}

      {browseAll && (
        <input
          type="text"
          value={browseQuery}
          onChange={(e) => setBrowseQuery(e.target.value)}
          placeholder={`Search active items (${(allActiveItems || []).length} total)…`}
          className={`w-full ${theme.input} rounded-md px-3 py-1.5 ${theme.text} text-sm placeholder-slate-500 focus:outline-none border`}
        />
      )}

      {visibleCandidates.length === 0 ? (
        <div className="text-xs text-warn bg-warn/10 rounded-md px-2 py-1.5">
          {browseAll
            ? "No active items match that search. Try a different word, or dismiss if it wasn't a tracked sale."
            : 'No tracked item matches this name. Use "Browse all" to pick one manually, or dismiss.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`w-full ${theme.input} rounded-md px-2 py-1.5 ${theme.text} text-sm focus:outline-none border`}
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
            onCnyTyped={() => setPlatform('youpin')}
            exchangeRate={exchangeRate}
            theme={theme}
            currencySymbol={currencySymbol}
            displayCurrency={displayCurrency}
          />
          <PlatformPicker
            value={platform}
            onChange={(val) => { setPlatform(val); setCustomFee(val === 'other' ? '0' : ''); }}
            theme={theme}
            platforms={PLATFORMS}
          />
          {platform === 'other' && (
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" max="100" step="0.1"
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                placeholder="Fee %"
                className={`w-24 h-9 ${theme.input} rounded-lg px-3 ${theme.text} text-sm focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              <span className={`text-sm ${theme.subtext}`}>%</span>
            </div>
          )}
          <button
            type="button"
            disabled={confirming || !parseFloat(usdSalePrice) || !selectedId || isFuzzyOnly}
            onClick={submit}
            title={isFuzzyOnly ? 'No confident match — use "Browse all" to pick the item manually' : undefined}
            className={`relative group w-full flex items-center justify-center gap-2 px-5 h-9 rounded-lg text-sm font-medium border transition-all duration-200 ${theme.card} ${theme.cardBorder} ${confirming ? 'text-profit' : theme.text} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirming ? <><CheckCircle size={15} /> Marked sold!</> : 'Mark sold'}
            <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${confirming ? 'w-full bg-profit' : 'w-0 group-hover:w-full ' + theme.dot}`} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setBrowseAll((prev) => !prev);
          setBrowseQuery('');
        }}
        className={`self-start text-[11px] underline-offset-2 hover:underline ${theme.subtext} ${theme.textHover}`}
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
  currencySymbol = '¥',
  displayCurrency = 'CNY',
  usdAmount,
  rmbAmount,
  handleUsdChange,
  handleRmbChange,
  embedded = false,
  hasTokenSetup = null,
  tokenExpired = false,
  hasRefreshToken = false,
  refreshTokenExp = null,
  refreshTokenStatus,
  tradeHoldDismissed = false,
  onDismissTradeHold,
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
      if (score >= 0.9) scored.push({ ...it, matchType: 'fuzzy', matchScore: score });
    }
    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, 10);
  };

  if (!embedded && !open) return null;


  const incomingCount = incoming.length;
  const outgoingCount = outgoing.length;

  // The actual UI — header, status, tabs, body — captured as a single JSX
  // tree so we can wrap it in either a modal frame or an inline panel.
  const innerUi = (
    <>
      {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.panelBorder || theme.cardBorder} shrink-0`}>
          <h3 className={`font-semibold ${theme.text}`}>Handle Items</h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-600">
              {hasInitialSnapshot && lastSync
                ? `Last Sync: ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : !hasInitialSnapshot ? 'No snapshot yet' : ''}
            </span>
            <button
              type="button"
              onClick={onSync}
              disabled={busy}
              className={`relative group flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border transition-all
                ${theme.card} ${theme.cardBorder} ${busy ? theme.text : `${theme.subtext} ${theme.textHover}`}
                disabled:opacity-50`}
            >
              <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
              {busy ? 'Syncing…' : 'Sync Inventory'}
              <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${theme.dot} ${busy ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </button>
            {!embedded && (
              <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
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

        {/* Token setup — shown when no refresh token and not dismissed */}
        {!hasRefreshToken && !tradeHoldDismissed && (
          <div className="px-4 py-3 border-b" style={{borderColor: 'inherit'}}>
            <SteamQRSetup theme={theme} onComplete={refreshTokenStatus} expired={false} hasRefreshToken={false} refreshTokenExp={null} />
            <button
              type="button"
              onClick={onDismissTradeHold}
              className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-transparent">
          <button
            type="button"
            onClick={() => setTab('incoming')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === 'incoming'
                ? `${theme.text} bg-white/5 border-b-2 border-profit`
                : `text-slate-400 ${theme.textHover}`
            }`}
          >
            <ArrowDownCircle size={14} className="text-profit" />
            Incoming
            {incomingCount > 0 && (
              <span className="bg-profit/20 text-profit text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {incomingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('outgoing')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === 'outgoing'
                ? `${theme.text} bg-white/5 border-b-2 border-loss`
                : `text-slate-400 ${theme.textHover}`
            }`}
          >
            <ArrowUpCircle size={14} className="text-loss" />
            Outgoing
            {outgoingCount > 0 && (
              <span className="bg-loss/20 text-loss text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {outgoingCount}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'incoming' && (
            <>
              {incoming.length === 0 ? (
                <EmptyState
                  theme={theme}
                  text="No new items detected. You're all caught up."
                />
              ) : (() => {
                // Group incoming by marketHashName so duplicate items render as one row
                const groups = [];
                const seen = new Map();
                for (const entry of incoming) {
                  const k = entry.marketHashName;
                  if (!seen.has(k)) { seen.set(k, []); groups.push(seen.get(k)); }
                  seen.get(k).push(entry);
                }
                return groups.map(group => group.length === 1 ? (
                  <IncomingRow
                    key={`in-${group[0].assetid}`}
                    entry={group[0]}
                    theme={theme}
                    exchangeRate={exchangeRate}
                    currencySymbol={currencySymbol}
                    displayCurrency={displayCurrency}
                    pendingMatch={findPendingMatch(group[0])}
                    onPromotePending={promotePendingItem}
                    onAdd={(payload) => {
                      addItemDirect(payload);
                      onDismiss(group[0].assetid, 'incoming');
                    }}
                    onDismiss={onDismiss}
                  />
                ) : (
                  <GroupedIncomingRow
                    key={`group-${group[0].marketHashName}`}
                    entries={group}
                    theme={theme}
                    exchangeRate={exchangeRate}
                    currencySymbol={currencySymbol}
                    displayCurrency={displayCurrency}
                    onAddAll={(payload) => {
                      group.forEach(() => addItemDirect(payload));
                      onDismiss(group.map(e => e.assetid), 'incoming');
                    }}
                    onDismissAll={() => onDismiss(group.map(e => e.assetid), 'incoming')}
                  />
                ));
              })()}
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
                  currencySymbol={currencySymbol}
                  displayCurrency={displayCurrency}
                  onMatch={({ trackedId, salePrice, platform, customFee, assetid }) => {
                    const ok = sellItemDirect(trackedId, salePrice, platform, customFee);
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
        className={`relative w-full min-h-[480px] ${theme.panel} ${theme.panelBorder} rounded-xl border shadow-lg flex flex-col overflow-hidden`}
      >
        {innerUi}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { e.currentTarget.dataset.closeIntent = e.target === e.currentTarget ? '1' : '0'; }}
      onClick={(e) => { if (e.currentTarget.dataset.closeIntent === '1') onClose(); }}
    >
      <div
        className={`relative w-full max-w-3xl h-[85vh] overflow-hidden ${theme.panel || theme.card} ${theme.cardBorder} rounded-2xl border shadow-2xl flex flex-col`}
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
