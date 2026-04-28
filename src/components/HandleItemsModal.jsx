import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const STEAM_IMG_BASE = 'https://community.akamai.steamstatic.com/economy/image/';

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

function IncomingRow({ entry, onAdd, onDismiss, theme }) {
  const [price, setPrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [confirming, setConfirming] = useState(false);

  const submit = () => {
    const v = parseFloat(price);
    if (!v || v <= 0) return;
    setConfirming(true);
    onAdd({
      itemName: entry.marketHashName,
      purchasePrice: v,
      platform,
      notes: `From Steam inventory (asset ${entry.assetid})`,
    });
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
            asset {entry.assetid} · seen {new Date(entry.detectedAt).toLocaleString()}
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Purchase price ($)"
          className={`flex-1 min-w-[140px] ${theme.input} rounded-md px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
          <option value="tradeit">Tradeit</option>
          <option value="facebook">Facebook</option>
          <option value="other">Other</option>
        </select>
        <button
          type="button"
          disabled={confirming || !parseFloat(price)}
          onClick={submit}
          className={`${theme.accentBg} text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {confirming ? 'Adding…' : 'Add to tracker'}
        </button>
      </div>
    </div>
  );
}

function OutgoingRow({ entry, candidates, onMatch, onDismiss, theme }) {
  const [selectedId, setSelectedId] = useState(
    candidates[0]?.id ? String(candidates[0].id) : ''
  );
  const [salePrice, setSalePrice] = useState('');
  const [platform, setPlatform] = useState('csfloat');
  const [confirming, setConfirming] = useState(false);

  const submit = () => {
    const id = parseInt(selectedId, 10);
    const v = parseFloat(salePrice);
    if (!id || !v || v <= 0) return;
    setConfirming(true);
    onMatch({ trackedId: id, salePrice: v, platform, assetid: entry.assetid });
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
            asset {entry.assetid} · gone since {new Date(entry.detectedAt).toLocaleString()}
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

      {candidates.length === 0 ? (
        <div className="text-xs text-amber-300/90 bg-amber-500/10 rounded-md px-2 py-1.5">
          No active tracked item matches this name. Dismiss if it wasn't a tracked sale.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`flex-1 min-w-[180px] ${theme.input} rounded-md px-2 py-1.5 text-white text-sm focus:outline-none border`}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} · bought ${c.purchasePrice.toFixed(2)} on {c.datePurchased}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="Sale price ($)"
            className={`w-32 ${theme.input} rounded-md px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
            <option value="tradeit">Tradeit</option>
            <option value="facebook">Facebook</option>
            <option value="other">Other</option>
          </select>
          <button
            type="button"
            disabled={confirming || !parseFloat(salePrice)}
            onClick={submit}
            className={`${theme.accentBg} text-white text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {confirming ? 'Marking…' : 'Mark sold'}
          </button>
        </div>
      )}
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
}) {
  const [tab, setTab] = useState('incoming');

  // Lock body scroll while open, like the analytics modal does
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Index active tracked items by market_hash_name for outgoing matching.
  const activeByName = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (it.sold) continue;
      const key = (it.itemName || '').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    // Within each name, sort oldest-first (FIFO default).
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.datePurchased || '').localeCompare(b.datePurchased || ''));
    }
    return map;
  }, [items]);

  const candidatesFor = (entry) =>
    activeByName.get((entry.marketHashName || '').toLowerCase()) || [];

  if (!open) return null;

  const incomingCount = incoming.length;
  const outgoingCount = outgoing.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-3xl max-h-[85vh] overflow-hidden ${theme.panel || theme.card} ${theme.cardBorder} rounded-2xl border shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Handle Items</h2>
            {pending.length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pending.length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-white/5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status strip */}
        <div className="px-4 py-2 text-[11px] text-slate-400 border-b border-white/8 flex items-center gap-3 flex-wrap">
          {reachable === false ? (
            <span className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle size={12} />
              Local backend not reachable on localhost:3001 — start it with{' '}
              <code className="bg-white/5 px-1 rounded">cd server && npm start</code>
            </span>
          ) : !hasInitialSnapshot ? (
            <span>Waiting for first inventory snapshot…</span>
          ) : (
            <>
              <span>
                Last sync:{' '}
                {lastSync ? new Date(lastSync).toLocaleString() : 'never'}{' '}
                {lastSyncOk === false && (
                  <span className="text-red-300 ml-1">(failed: {lastError})</span>
                )}
              </span>
              <span className="opacity-60">· auto-poll every {pollIntervalMin} min</span>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8">
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
            incoming.length === 0 ? (
              <EmptyState theme={theme} text="No new items detected. You're all caught up." />
            ) : (
              incoming.map((entry) => (
                <IncomingRow
                  key={`in-${entry.assetid}`}
                  entry={entry}
                  theme={theme}
                  onAdd={(payload) => {
                    addItemDirect(payload);
                    onDismiss(entry.assetid, 'incoming');
                  }}
                  onDismiss={onDismiss}
                />
              ))
            )
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
                  theme={theme}
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
