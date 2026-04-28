import React, { useState, useRef, useCallback } from "react";
import { TrendingUp, Trash2, CheckCircle } from "lucide-react";
import { getPlatformFee } from "../utils/platformFees";
import { PlatformBadge } from "./PlatformBadge";

import csfloatIcon  from "../assets/platforms/csfloat.webp";
import csmoneyIcon  from "../assets/platforms/csmoney.webp";
import gamerpayIcon from "../assets/platforms/gamerpay.webp";
import skinswapIcon from "../assets/platforms/skinswap.webp";
import youpinIcon   from "../assets/platforms/youpin.webp";
import dmarketIcon  from "../assets/platforms/dmarket.webp";

const SELL_PLATFORMS = [
  { value: "csfloat",  label: "CSFloat",  icon: csfloatIcon,  fee: "2%"   },
  { value: "csmoney",  label: "CS.MONEY", icon: csmoneyIcon,  fee: "5%"   },
  { value: "gamerpay", label: "GamerPay", icon: gamerpayIcon, fee: "5%"   },
  { value: "skinswap", label: "SkinSwap", icon: skinswapIcon, fee: "5%"   },
  { value: "dmarket",  label: "DMarket",  icon: dmarketIcon,  fee: "5%"   },
  { value: "youpin",   label: "Youpin",   icon: youpinIcon,   fee: "0.5%" },
  { value: "tradeit",  label: "Tradeit",  icon: null,         fee: "5%"   },
  { value: "facebook", label: "Facebook", icon: null,         fee: "0%"   },
];

const HOLD_DURATION = 1000;

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

function HoldToDeleteButton({ onDelete, deleteProgress }) {
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const startHold = useCallback((e) => {
    e.preventDefault();
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      onDelete(pct);
      if (pct >= 100) clearInterval(intervalRef.current);
    }, 16);
  }, [onDelete]);

  const cancelHold = useCallback(() => {
    clearInterval(intervalRef.current);
    if (deleteProgress < 100) onDelete(0);
  }, [onDelete, deleteProgress]);

  return (
    <button
      onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
      onTouchStart={startHold} onTouchEnd={cancelHold}
      className="relative overflow-hidden text-red-400 hover:text-red-300 p-1.5 rounded-lg transition-colors select-none"
      title="Hold to delete"
    >
      {deleteProgress > 0 && (
        <span className="absolute inset-0 bg-red-500/25 rounded-lg" style={{ width: `${deleteProgress}%`, transition: 'none' }} />
      )}
      <Trash2 size={16} className="relative z-10" />
    </button>
  );
}

function SellPlatformPicker({ value, onChange, theme }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SELL_PLATFORMS.map((p) => {
        const selected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            title={`${p.label} (${p.fee})`}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-all
              ${selected
                ? `${theme.accentBg} border-transparent text-white`
                : `${theme.card} ${theme.cardBorder} ${theme.subtext} hover:text-white`
              }`}
          >
            {p.icon
              ? <img src={p.icon} alt={p.label} className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0" />
              : <span className="w-3.5 h-3.5 rounded-sm bg-white/10 flex items-center justify-center text-[7px] font-bold flex-shrink-0">{p.label[0]}</span>
            }
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ItemCard({ item, index, theme, accentHex, sellData, setSellData, sellPlatform, setSellPlatform, handleSellItem, handleDeleteItem }) {
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [barColor, setBarColor] = useState(accentHex);
  const [exiting, setExiting] = useState(false);
  const [soldFeedback, setSoldFeedback] = useState(false);
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
      handleSellItem(item.id, sellPlatform[item.id] || 'csfloat');
    });
  };

  const onDeleteProgress = (pct) => {
    setDeleteProgress(pct);
    if (pct === 0) {
      setBarColor(accentHex);
    } else {
      setBarColor(lerpColor(accentHex, '#f53232', pct / 100));
    }
    if (pct >= 100) {
      setExiting(true);
      setTimeout(() => handleDeleteItem(item.id), 400);
    }
  };

  const currentBarColor = item.sold ? soldBarColor : barColor;

  const fee = !item.sold && sellData[item.id] && parseFloat(sellData[item.id]) > 0
    ? getPlatformFee(sellPlatform[item.id] || 'csfloat') : null;
  const estProfit = fee !== null ? parseFloat(sellData[item.id]) * (1 - fee) - item.purchasePrice : null;
  const estProfitPct = estProfit !== null ? (estProfit / item.purchasePrice) * 100 : null;

  return (
    <div
      className={`${theme.panel} backdrop-blur-sm rounded-xl border ${theme.cardBorder}
        hover:border-white/20 transition-all duration-300 overflow-hidden flex
        ${exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        ${soldFeedback && !item.sold ? 'ring-2 ring-emerald-400/60' : ''}
      `}
      style={{ animationDelay: `${index * 40}ms`, animation: 'fadeSlideIn 0.3s ease both' }}
    >
      {/* Colored sidebar */}
      <div
        className="w-1 flex-shrink-0 rounded-l-xl"
        style={{ backgroundColor: currentBarColor, transition: 'background-color 0.1s' }}
      />

      {/* Card content — flex-col so the sell/sold block sticks to the bottom
          via mt-auto, regardless of whether notes are present */}
      <div className="flex-1 p-4 min-w-0 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-semibold text-white flex-1 pr-2 leading-snug">{item.itemName}</h3>
          {!item.sold && (
            <HoldToDeleteButton onDelete={onDeleteProgress} deleteProgress={deleteProgress} />
          )}
        </div>

        <div className="text-sm text-slate-400 space-y-1.5 mb-3">
          <div className="flex justify-between items-center">
            <span>Price:</span>
            <span className="text-white font-semibold">${item.purchasePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Bought:</span>
            <span className="text-slate-300">{item.datePurchased}</span>
          </div>
          {item.platform && (
            <div className="flex justify-between items-center">
              <span>Platform:</span>
              <PlatformBadge platform={item.platform} size="xs" />
            </div>
          )}
        </div>

        {item.notes && (
          <p className="text-amber-300 text-xs mb-3 line-clamp-2">Notes: {item.notes}</p>
        )}

        {/* Bottom-anchored action zone */}
        <div className="mt-auto">
          {!item.sold ? (
            <div className="space-y-2">
              <input
                type="number" step="0.01"
                value={sellData[item.id] || ''}
                onChange={(e) => setSellData(prev => ({ ...prev, [item.id]: e.target.value }))}
                className={`w-full ${theme.inputSell} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                placeholder="Sale price..."
              />

              {/* Platform picker with icons */}
              <SellPlatformPicker
                value={sellPlatform[item.id] || 'csfloat'}
                onChange={(val) => setSellPlatform(prev => ({ ...prev, [item.id]: val }))}
                theme={theme}
              />

              <button
                onClick={onSell}
                className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 active:scale-95
                  ${soldFeedback ? 'bg-emerald-400 text-white scale-95' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                {soldFeedback ? <><CheckCircle size={14} /> Sold!</> : 'Sell'}
              </button>

              {estProfit !== null && (
                <div className={`text-xs rounded-lg px-3 py-2 flex justify-between items-center transition-all
                  ${estProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  <span>Est. profit</span>
                  <span className="font-semibold">
                    {estProfit >= 0 ? '+' : ''}${estProfit.toFixed(2)} ({estProfitPct >= 0 ? '+' : ''}{estProfitPct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className={`${theme.soldCard} rounded-lg p-3 border`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className={item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <span className="text-white font-semibold text-sm">SOLD</span>
                {item.soldPlatform && <PlatformBadge platform={item.soldPlatform} size="xs" />}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sale:</span>
                  <span className="text-white font-semibold">${item.salePrice.toFixed(2)}</span>
                </div>
                {item.dateSold && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sold date:</span>
                    <span className="text-slate-300">{item.dateSold}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">After fees:</span>
                  <span className="text-white font-semibold">
                    ${(item.salePrice * (1 - getPlatformFee(item.soldPlatform))).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit:</span>
                  <span className={`font-semibold ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.profit >= 0 ? '+' : ''}${item.profit.toFixed(2)} ({item.profitPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItemGrid({
  sellPlatform, setSellData, sellData, setSellPlatform,
  handleSellItem, handleDeleteItem,
  theme, sortedItems, searchTerm, activeTab,
}) {
  const accentHex = getThemeAccentHex(theme.accentBg + ' ' + theme.dot);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {sortedItems.map((item, index) => (
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
        />
      ))}

      {sortedItems.length === 0 && (
        <div className="col-span-full text-center py-12 text-slate-400">
          <p className="text-lg">
            {searchTerm ? 'No items match your search.'
              : activeTab === 'active' ? 'No active items. Add your first purchase!'
              : 'No sold items yet.'}
          </p>
        </div>
      )}
    </div>
  );
}