import React, { useState, useRef, useCallback } from "react";
import { TrendingUp, Trash2, CheckCircle } from "lucide-react";
import { getPlatformFee } from "../utils/platformFees";

const HOLD_DURATION = 1000;

function HoldToDeleteButton({ onDelete }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const startHold = useCallback((e) => {
    e.preventDefault();
    setHolding(true);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(intervalRef.current);
        setHolding(false);
        setProgress(0);
        onDelete();
      }
    }, 16);
  }, [onDelete]);

  const cancelHold = useCallback(() => {
    clearInterval(intervalRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className="relative overflow-hidden text-red-400 hover:text-red-300 p-1.5 rounded-lg transition-colors select-none"
      title="Hold to delete"
    >
      {holding && (
        <span
          className="absolute inset-0 bg-red-500/25 rounded-lg"
          style={{ width: `${progress}%`, transition: 'none' }}
        />
      )}
      <Trash2 size={16} className="relative z-10" />
    </button>
  );
}

export default function ItemGrid({
  sellPlatform, setSellData, sellData, setSellPlatform,
  handleSellItem, handleDeleteItem,
  theme, items, sortedItems, searchTerm, activeTab,
}) {
  const [soldFeedback, setSoldFeedback] = useState({});
  const [deleteFeedback, setDeleteFeedback] = useState({});

  const onSell = (id, platform) => {
    if (!sellData[id] || parseFloat(sellData[id]) <= 0) return;
    setSoldFeedback(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      handleSellItem(id, platform);
      setSoldFeedback(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, 600);
  };

  const onDelete = (id) => {
    setDeleteFeedback(prev => ({ ...prev, [id]: true }));
    setTimeout(() => handleDeleteItem(id), 400);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {sortedItems.map((item, index) => (
        <div
          key={item.id}
          className={`${theme.panel} backdrop-blur-sm rounded-xl p-4 border ${theme.cardBorder}
            hover:border-white/20 transition-all duration-300
            ${deleteFeedback[item.id] ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            ${soldFeedback[item.id] ? 'ring-2 ring-emerald-400/60' : ''}
          `}
          style={{
            animationDelay: `${index * 40}ms`,
            animation: 'fadeSlideIn 0.3s ease both',
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-semibold text-white flex-1 pr-2">{item.itemName}</h3>
            <HoldToDeleteButton onDelete={() => onDelete(item.id)} />
          </div>

          <div className="text-sm text-slate-400 space-y-1 mb-3">
            <div className="flex justify-between">
              <span>Price:</span>
              <span className="text-white font-semibold">${item.purchasePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bought:</span>
              <span className="text-slate-300">{item.datePurchased}</span>
            </div>
            {item.platform && (
              <div className="flex justify-between">
                <span>Platform:</span>
                <span className="text-blue-300 text-xs uppercase">{item.platform}</span>
              </div>
            )}
          </div>

          {item.notes && (
            <p className="text-amber-300 text-xs mb-3 line-clamp-2">Notes: {item.notes}</p>
          )}

          {!item.sold ? (
            <div className="space-y-2">
              <input
                type="number"
                step="0.01"
                value={sellData[item.id] || ''}
                onChange={(e) => setSellData({ ...sellData, [item.id]: e.target.value })}
                className={`w-full ${theme.inputSell} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border`}
                placeholder="Sale price..."
              />
              <div className="flex gap-2">
                <select
                  value={sellPlatform[item.id] || 'csfloat'}
                  onChange={(e) => setSellPlatform({ ...sellPlatform, [item.id]: e.target.value })}
                  className={`flex-1 ${theme.inputSell} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border`}
                >
                  <option value="csfloat" className="bg-slate-900">CSFloat (2%)</option>
                  <option value="csmoney" className="bg-slate-900">CS.MONEY (5%)</option>
                  <option value="gamerpay" className="bg-slate-900">GamerPay (5%)</option>
                  <option value="skinswap" className="bg-slate-900">SkinSwap (5%)</option>
                  <option value="dmarket" className="bg-slate-900">DMarket (5%)</option>
                  <option value="tradeit" className="bg-slate-900">Tradeit (5%)</option>
                  <option value="facebook" className="bg-slate-900">Facebook (0%)</option>
                  <option value="youpin" className="bg-slate-900">Youpin (0.5%)</option>
                </select>
                <button
                  onClick={() => onSell(item.id, sellPlatform[item.id] || 'csfloat')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap active:scale-95
                    ${soldFeedback[item.id]
                      ? 'bg-emerald-400 text-white scale-95'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                >
                  {soldFeedback[item.id]
                    ? <><CheckCircle size={14} /> Sold!</>
                    : 'Sell'
                  }
                </button>
              </div>

              {/* Live profit preview */}
              {sellData[item.id] && parseFloat(sellData[item.id]) > 0 && (() => {
                const fee = getPlatformFee(sellPlatform[item.id] || 'csfloat');
                const net = parseFloat(sellData[item.id]) * (1 - fee);
                const profit = net - item.purchasePrice;
                const profitPct = (profit / item.purchasePrice) * 100;
                return (
                  <div className={`text-xs rounded-lg px-3 py-2 flex justify-between items-center transition-all
                    ${profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span>Est. profit</span>
                    <span className="font-semibold">
                      {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className={`${theme.soldCard} rounded-lg p-3 border`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className={item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <span className="text-white font-semibold text-sm">SOLD</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sale:</span>
                  <span className="text-white font-semibold">${item.salePrice.toFixed(2)}</span>
                </div>
                {item.soldPlatform && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sold on:</span>
                    <span className="text-blue-300 uppercase">{item.soldPlatform}</span>
                  </div>
                )}
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
      ))}

      {sortedItems.length === 0 && (
        <div className="col-span-full text-center py-12 text-slate-400">
          <p className="text-lg">
            {searchTerm
              ? 'No items match your search.'
              : activeTab === 'active'
              ? 'No active items. Add your first purchase!'
              : 'No sold items yet.'}
          </p>
        </div>
      )}
    </div>
  );
}