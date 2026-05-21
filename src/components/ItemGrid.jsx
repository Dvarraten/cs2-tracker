// The main item list — renders cards for Active, Pending, and Sold tabs.
// Sell form collapses to a single button by default; click to expand.
// Trash icon revealed on card hover. Wear on second line. Notes chip top-left.
import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, CheckCircle, ChevronDown, PackageCheck, ChevronRight, X } from "lucide-react";
import { getPlatformFee } from "../utils/platformFees";
import { PlatformBadge } from "./PlatformBadge";
import { useItemImage } from "../utils/itemImages";
import buff163Icon  from "../assets/platforms/buff163.webp";
import csfloatIcon  from "../assets/platforms/csfloat.webp";
import csmoneyIcon  from "../assets/platforms/csmoney.webp";
import skinswapIcon from "../assets/platforms/skinswap.webp";
import youpinIcon   from "../assets/platforms/youpin.webp";
import dmarketIcon  from "../assets/platforms/dmarket.webp";

// --- helpers ---

const WEAR_SUFFIXES = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

function parseItemName(name) {
  for (const wear of WEAR_SUFFIXES) {
    if (name.endsWith(`(${wear})`)) {
      return { baseName: name.slice(0, -(wear.length + 3)).trim(), wear };
    }
  }
  return { baseName: name, wear: null };
}

function ItemThumbnail({ item }) {
  const url = useItemImage({ directIconUrl: item.iconUrl, name: item.itemName });
  if (!url) return <div className="w-14 h-14 rounded-lg bg-white/5" />;
  return (
    <img src={url} alt="" loading="lazy" className="h-20 w-full object-contain" />
  );
}

function formatDeliveryCountdown(expectedDelivery) {
  if (!expectedDelivery) return null;
  const ts = typeof expectedDelivery === 'string'
    ? new Date(expectedDelivery).getTime()
    : expectedDelivery;
  if (isNaN(ts)) return null;
  const days = Math.round((ts - Date.now()) / (24 * 60 * 60 * 1000));
  if (days > 1) return { label: `${days}d hold`, overdue: false };
  if (days === 1) return { label: '1d hold', overdue: false };
  if (days === 0) return { label: 'Due today', overdue: false };
  return { label: 'Tradeable', overdue: true };
}

const SELL_PLATFORMS = [
  { value: "buff163",  label: "Buff163",  icon: buff163Icon,  fee: "1.5%" },
  { value: "csfloat",  label: "CSFloat",  icon: csfloatIcon,  fee: "2%"   },
  { value: "csmoney",  label: "CS.MONEY", icon: csmoneyIcon,  fee: "5%"   },
  { value: "skinswap", label: "SkinSwap", icon: skinswapIcon, fee: "5%"   },
  { value: "dmarket",  label: "DMarket",  icon: dmarketIcon,  fee: "5%"   },
  { value: "youpin",   label: "Youpin",   icon: youpinIcon,   fee: "0.5%" },
  { value: "other",    label: "Other",    icon: null,         fee: "0%", emoji: "🔧" },
];

function lerpColor(a, b, t) {
  const ah = a.replace('#','');
  const bh = b.replace('#','');
  const ar = parseInt(ah.slice(0,2),16), ag = parseInt(ah.slice(2,4),16), ab = parseInt(ah.slice(4,6),16);
  const br = parseInt(bh.slice(0,2),16), bg = parseInt(bh.slice(2,4),16), bb = parseInt(bh.slice(4,6),16);
  const r = Math.round(ar + (br-ar)*t);
  const g = Math.round(ag + (bg-ag)*t);
  const b2 = Math.round(ab + (bb-ab)*t);
  return `rgb(${r},${g},${b2})`;
}

function getThemeAccentHex(accentClass) {
  const match = accentClass?.match(/#([0-9a-fA-F]{6})/);
  if (match) return `#${match[1]}`;
  const map = {
    'blue-500': '#3b82f6', 'blue-600': '#2563eb',
    'sky-400': '#38bdf8',  'sky-500': '#0ea5e9',
    'teal-500': '#14b8a6', 'violet-500': '#8b5cf6',
    'indigo-500': '#6366f1','lime-500': '#84cc16',
  };
  for (const [k, v] of Object.entries(map)) {
    if (accentClass?.includes(k)) return v;
  }
  return '#3b82f6';
}

// --- sub-components ---

function DeleteButton({ onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const btnRef = useRef(null);

  const reset = () => { clearTimeout(timerRef.current); setConfirming(false); };

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(reset, 2500);
    } else {
      clearTimeout(timerRef.current);
      onDelete();
    }
  };

  useEffect(() => {
    if (!confirming) return;
    const handler = (e) => { if (btnRef.current && !btnRef.current.contains(e.target)) reset(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirming]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      title={confirming ? 'Click again to delete' : 'Delete item'}
      className={`p-1.5 rounded-lg transition-all ${
        confirming
          ? 'text-white bg-red-500 hover:bg-red-400'
          : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'
      }`}
    >
      <Trash2 size={14} />
    </button>
  );
}

function PlatformIcon({ platform, size = 14 }) {
  if (platform.icon) {
    return (
      <img
        src={platform.icon}
        alt={platform.label}
        className="rounded-sm object-contain flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.9 }}
    >
      {platform.emoji || platform.label[0]}
    </span>
  );
}

function SellPlatformPicker({ value, onChange, theme }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = SELL_PLATFORMS.find((p) => p.value === value) || SELL_PLATFORMS[0];
  const ESTIMATED_MENU_H = 9 * 32 + 8;

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUpward = spaceBelow < ESTIMATED_MENU_H && spaceAbove > spaceBelow;
    setPos({ top: openUpward ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, openUpward });
  }, [ESTIMATED_MENU_H]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => { window.removeEventListener("scroll", updatePos, true); window.removeEventListener("resize", updatePos); };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-8 flex items-center gap-1.5 px-2 rounded-lg border text-[10px] font-medium transition-colors ${theme.inputSell} ${theme.text}`}
      >
        <PlatformIcon platform={selected} size={13} />
        <span className="truncate">{selected.label}</span>
        <span className={`${theme.subtext} text-[9px] shrink-0`}>{selected.fee}</span>
        <ChevronDown size={10} className={`text-slate-400 transition-transform ml-auto shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.openUpward ? "auto" : pos.top,
            bottom: pos.openUpward ? window.innerHeight - pos.top : "auto",
            left: pos.left,
            width: pos.width,
            zIndex: 100,
          }}
          className={`${theme.card} border ${theme.cardBorder} rounded-lg shadow-xl max-h-60 overflow-y-auto`}
          role="listbox"
        >
          {SELL_PLATFORMS.map((p) => {
            const isSelected = p.value === value;
            return (
              <button
                key={p.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(p.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors
                  ${isSelected ? `bg-white/10 ${theme.text}` : `${theme.textSecondary} hover:bg-white/10`}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <PlatformIcon platform={p} size={14} />
                  <span className="truncate">{p.label}</span>
                </span>
                <span className={`${theme.subtext} text-[10px] shrink-0`}>{p.fee}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// --- ItemCard ---

function ItemCard({
  item, index, theme, accentHex,
  sellData, setSellData, sellPlatform, setSellPlatform,
  handleSellItem, handleDeleteItem, promotePendingItem,
  selectMode, isSelected, onToggleSelect,
  exchangeRate, currencySymbol, displayCurrency,
}) {
  const [barColor, setBarColor] = useState(accentHex);
  const [localSellAmount, setLocalSellAmount] = useState('');
  const [customFee, setCustomFee] = useState('');
  const [exiting, setExiting] = useState(false);
  const [soldFeedback, setSoldFeedback] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const sellAnimRef = useRef(null);

  const soldBarColor = item.profit >= 0 ? '#30914c' : '#f53232';

  const animateBarTo = (targetColor, duration, onDone) => {
    const start = performance.now();
    const fromColor = barColor;
    cancelAnimationFrame(sellAnimRef.current);
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setBarColor(lerpColor(fromColor, targetColor, t));
      if (t < 1) sellAnimRef.current = requestAnimationFrame(tick);
      else { setBarColor(targetColor); onDone?.(); }
    };
    sellAnimRef.current = requestAnimationFrame(tick);
  };

  const onSell = () => {
    if (!sellData[item.id] || parseFloat(sellData[item.id]) <= 0) return;
    setSoldFeedback(true);
    animateBarTo('#30914c', 500, () => {
      handleSellItem(item.id, sellPlatform[item.id] || 'csfloat', customFee || undefined);
    });
  };

  const onDelete = () => {
    setExiting(true);
    setTimeout(() => handleDeleteItem(item.id), 400);
  };

  const handleSellUsd = (val) => {
    setSellData(prev => ({ ...prev, [item.id]: val }));
    setLocalSellAmount(exchangeRate && val && !isNaN(val)
      ? (parseFloat(val) * exchangeRate).toFixed(2) : '');
  };

  const handleSellLocal = (val) => {
    setLocalSellAmount(val);
    const usd = exchangeRate && val && !isNaN(val)
      ? (parseFloat(val) / exchangeRate).toFixed(2) : '';
    setSellData(prev => ({ ...prev, [item.id]: usd }));
  };

  const countdown = item.pending ? formatDeliveryCountdown(item.expectedDelivery) : null;
  const isOnHold = item.pending && countdown && !countdown.overdue;
  const currentBarColor = item.sold
    ? soldBarColor
    : isOnHold
    ? '#f59e0b'
    : barColor;

  const fee = !item.sold && sellData[item.id] && parseFloat(sellData[item.id]) > 0
    ? getPlatformFee(sellPlatform[item.id] || 'csfloat', customFee || undefined) : null;
  const estProfit = fee !== null ? parseFloat(sellData[item.id]) * (1 - fee) - item.purchasePrice : null;
  const estProfitPct = estProfit !== null ? (estProfit / item.purchasePrice) * 100 : null;

  const { baseName, wear } = parseItemName(item.itemName);

  return (
    <div
      className={`relative group flex flex-col h-full ${theme.panel} backdrop-blur-sm rounded-xl border ${
        selectMode && isSelected ? 'border-red-500 ring-2 ring-red-500/40' : theme.cardBorder
      } transition-all duration-300 overflow-hidden
        ${exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        ${soldFeedback && !item.sold ? 'ring-2 ring-profit/60' : ''}
        ${selectMode ? 'cursor-pointer' : ''}
      `}
      style={{ animationDelay: `${index * 40}ms`, animation: 'fadeSlideIn 0.3s ease both' }}
    >
      {selectMode && (
        <div
          className="absolute inset-0 z-20"
          onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(item.id); }}
          aria-label={isSelected ? 'Deselect item' : 'Select item'}
          role="button"
        />
      )}

      <div className="flex-1 p-3 pb-4 min-w-0 flex flex-col">

        {/* Notes chip — top-left, absolute */}
        {item.notes && !selectMode && (
          <div className="absolute top-1.5 left-1.5 z-10 max-w-[calc(100%-2.5rem)]">
            <span className="text-[9px] font-medium text-warn bg-warn/15 px-1.5 py-0.5 rounded-full truncate block leading-tight">
              {item.notes}
            </span>
          </div>
        )}

        {/* Delete button — revealed on hover only */}
        {!selectMode && (
          <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <DeleteButton onDelete={onDelete} />
          </div>
        )}

        {/* Select checkbox */}
        {selectMode && !item.sold && (
          <div className="absolute top-2 left-3 z-10">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              isSelected ? 'bg-red-500 border-red-500' : 'border-white/30 bg-white/5'
            }`}>
              {isSelected && <CheckCircle size={10} className="text-white" />}
            </div>
          </div>
        )}

        {/* Image area — flush to card edges, no bottom margin (bar sits directly below) */}
        <div className="-mx-3 -mt-3 mb-0 h-24 relative flex justify-center items-center bg-gradient-to-b from-white/[0.06] to-black/25">
          <ItemThumbnail item={item} />
          {item.pending && countdown && (
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                countdown.overdue
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                  : 'bg-warn/20 text-warn border-warn/20'
              }`}>
                {countdown.label}
              </span>
            </div>
          )}
        </div>

        {/* Accent bar — inset from edges, directly under image */}
        <div
          className="mx-4 h-[3px] rounded-full mb-3"
          style={{ backgroundColor: currentBarColor, transition: 'background-color 0.1s' }}
        />

        {/* Name + wear — wear always occupies a line to keep meta row at fixed position */}
        <div className="mb-1.5">
          <h3 className={`text-xs font-medium ${theme.textSecondary} truncate leading-tight`}>
            {baseName}
          </h3>
          <span className={`text-xs ${theme.subtext} opacity-70 font-normal block leading-tight mt-1`}>
            {wear || ' '}
          </span>
        </div>

        {/* Meta row — active/pending only */}
        {!item.sold && (
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] mb-3">
            <span className={`font-mono ${theme.text} font-semibold`}>${item.purchasePrice.toFixed(2)}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">
              {item.datePurchased
                ? new Date(item.datePurchased).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : ''}
            </span>
            {item.platform && (
              <>
                <span className="text-slate-600">·</span>
                <PlatformBadge platform={item.platform} size="xs" />
              </>
            )}
          </div>
        )}

        {/* Action zone */}
        <div className="mt-auto">
          {item.pending && !item.sold ? (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => promotePendingItem && promotePendingItem(item.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium ${theme.card} border ${theme.cardBorder} ${theme.textSecondary} ${theme.textHover} hover:border-white/20 transition-colors`}
              >
                <PackageCheck size={13} />
                Mark received
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Cancel this pending purchase? It will be removed entirely.')) handleDeleteItem(item.id);
                }}
                className={`px-3 h-9 rounded-lg text-xs ${theme.card} border ${theme.cardBorder} text-slate-600 hover:text-slate-300 transition-colors`}
              >
                Cancel
              </button>
            </div>
          ) : !item.sold ? (
            <>
              {/* Collapsed sell trigger */}
              <button
                type="button"
                onClick={() => setSellOpen(true)}
                className={`w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border transition-colors ${theme.card} ${theme.cardBorder} ${theme.textSecondary} ${theme.textHover} hover:border-white/20`}
              >
                Sell
                <ChevronRight size={12} className="opacity-50" />
              </button>

              {/* Sell overlay — absolutely positioned so it never stretches the grid row */}
              {sellOpen && (
                <div className={`absolute inset-0 z-10 flex flex-col p-3 rounded-xl ${theme.panel} border ${theme.cardBorder}`}>
                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => setSellOpen(false)}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors"
                  >
                    <X size={13} />
                  </button>

                  {/* Item name for context */}
                  <div className="mb-auto pr-6">
                    <p className={`text-xs font-medium ${theme.textSecondary} truncate leading-tight`}>{baseName}</p>
                    <span className={`text-xs ${theme.subtext} opacity-70 block leading-tight mt-1`}>{wear || ' '}</span>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-1.5 mt-3">
                    <SellPlatformPicker
                      value={sellPlatform[item.id] || 'csfloat'}
                      onChange={(val) => { setSellPlatform(prev => ({ ...prev, [item.id]: val })); setCustomFee(val === 'other' ? '0' : ''); }}
                      theme={theme}
                    />
                    {(sellPlatform[item.id] || 'csfloat') === 'other' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={customFee}
                          onChange={(e) => setCustomFee(e.target.value)}
                          placeholder="Fee"
                          className={`flex-1 h-7 ${theme.inputSell} rounded-lg px-2 ${theme.text} text-xs font-mono focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                        <span className={`text-xs ${theme.subtext} shrink-0`}>%</span>
                      </div>
                    )}
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto' }}>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono pointer-events-none">$</span>
                        <input
                          type="number" step="0.01"
                          value={sellData[item.id] || ''}
                          onChange={(e) => handleSellUsd(e.target.value)}
                          className={`w-full h-8 ${theme.inputSell} rounded-lg pl-5 pr-2 ${theme.text} text-xs font-mono focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          placeholder="USD"
                          autoFocus
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono pointer-events-none">{currencySymbol}</span>
                        <input
                          type="number" step="0.01"
                          value={localSellAmount}
                          onChange={(e) => handleSellLocal(e.target.value)}
                          disabled={!exchangeRate}
                          className={`w-full h-8 ${theme.inputSell} rounded-lg ${currencySymbol.length > 1 ? 'pl-8' : 'pl-5'} pr-2 ${theme.text} text-xs font-mono focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!exchangeRate ? 'opacity-50' : ''}`}
                          placeholder={displayCurrency || currencySymbol}
                        />
                      </div>
                      <button
                        onClick={onSell}
                        className={`px-2 h-8 rounded-lg text-xs font-medium transition-all duration-300 active:scale-95 flex items-center gap-1
                          ${soldFeedback ? 'bg-profit text-white scale-95' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                      >
                        {soldFeedback ? <><CheckCircle size={12} /> Sold!</> : 'Sell'}
                      </button>
                    </div>
                    {estProfit !== null && (
                      <div className={`rounded-md py-1 px-2 text-xs font-mono font-semibold text-center ${estProfit >= 0 ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
                        {estProfit >= 0 ? '+' : ''}${estProfit.toFixed(2)}
                        <span className="opacity-60 ml-1">({estProfitPct >= 0 ? '+' : ''}{estProfitPct.toFixed(0)}%)</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSellOpen(false)}
                      className={`w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border transition-colors ${theme.card} ${theme.cardBorder} ${theme.textSecondary} ${theme.textHover} hover:border-white/20`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <span className="text-slate-400">${item.purchasePrice.toFixed(2)}</span>
                <span className="text-slate-600">→</span>
                <span className={`${theme.text} font-semibold`}>${(item.purchasePrice + item.profit).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-600">
                  {item.datePurchased ? new Date(item.datePurchased).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
                <span className="text-slate-700">→</span>
                <span className="text-slate-500">
                  {item.dateSold ? new Date(item.dateSold).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                {item.platform ? <PlatformBadge platform={item.platform} size="xs" /> : <span className="text-slate-700">—</span>}
                <span className="text-slate-700">→</span>
                {item.soldPlatform ? <PlatformBadge platform={item.soldPlatform} size="xs" /> : <span className="text-slate-700">—</span>}
              </div>
              <div className={`rounded-md py-1.5 px-2 flex items-center justify-between ${item.profit >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
                <span className={`text-xs font-mono font-semibold ${item.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {item.profit >= 0 ? '+' : ''}${item.profit.toFixed(2)}
                </span>
                <span className={`text-xs font-mono ${item.profit >= 0 ? 'text-profit/70' : 'text-loss/70'}`}>
                  {item.profit >= 0 ? '+' : ''}{item.profitPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- ItemGrid ---

const INITIAL_VISIBLE = 60;
const VISIBLE_STEP = 30;

export default function ItemGrid({
  sellPlatform, setSellData, sellData, setSellPlatform,
  handleSellItem, handleDeleteItem, promotePendingItem,
  theme, sortedItems, searchTerm, activeTab,
  selectMode, selectedIds, onToggleSelect,
  exchangeRate, currencySymbol, displayCurrency,
}) {
  const accentHex = getThemeAccentHex(theme.accentBg + ' ' + theme.dot);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const sentinelRef = useRef(null);

  const listKey = `${activeTab}|${searchTerm}|${sortedItems.length}|${sortedItems[0]?.id ?? ''}`;
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [listKey]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= sortedItems.length) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount(c => Math.min(c + VISIBLE_STEP, sortedItems.length)); },
      { rootMargin: '300px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [visibleCount, sortedItems.length]);

  const visibleItems = sortedItems.slice(0, visibleCount);
  const hasMore = visibleCount < sortedItems.length;

  const emptyText =
    searchTerm ? 'No items match your search.'
    : activeTab === 'active' ? 'No active items. Add your first purchase!'
    : activeTab === 'pending' ? 'No pending purchases.'
    : 'No sold items yet.';

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {visibleItems.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            theme={theme}
            accentHex={accentHex}
            sellData={sellData}
            setSellData={setSellData}
            sellPlatform={sellPlatform}
            setSellPlatform={setSellPlatform}
            handleSellItem={handleSellItem}
            handleDeleteItem={handleDeleteItem}
            promotePendingItem={promotePendingItem}
            selectMode={selectMode}
            isSelected={selectedIds && selectedIds.has(item.id)}
            onToggleSelect={onToggleSelect}
            exchangeRate={exchangeRate}
            currencySymbol={currencySymbol}
            displayCurrency={displayCurrency}
          />
        ))}

        {sortedItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <p className="text-lg">{emptyText}</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="w-full text-center py-6 text-xs text-slate-500">
          Loading more… ({visibleCount} of {sortedItems.length})
        </div>
      )}
      {!hasMore && sortedItems.length > INITIAL_VISIBLE && (
        <div className="w-full text-center py-4 text-xs text-slate-600">
          Showing all {sortedItems.length} items
        </div>
      )}
    </>
  );
}
