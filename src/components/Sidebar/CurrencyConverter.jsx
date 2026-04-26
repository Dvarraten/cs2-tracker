import React from "react";

export default function CurrencyConverter({
  usdAmount, setUsdAmount, rmbAmount, setRmbAmount,
  exchangeRate, lastUpdated,
  handleUsdChange, handleRmbChange, theme }) {
  return (
    <div
      className={`${theme.card} backdrop-blur-sm rounded-xl p-5 border ${theme.cardBorder}`}
    >
      <h3 className="text-base font-semibold text-slate-200 mb-12">Currency Converter</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1.5">USD</label>
          <input
            type="text"
            inputMode="decimal"
            value={usdAmount}
            onChange={(e) => handleUsdChange(e.targetheme.value)}
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40 transition-colors"
            placeholder="-"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1.5">RMB (CNY)</label>
          <input
            type="text"
            inputMode="decimal"
            value={rmbAmount}
            onChange={(e) => handleRmbChange(e.targetheme.value)}
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40 transition-colors"
            placeholder="-"
          />
        </div>
      </div>
      {exchangeRate && (
        <div className={`mt-3 pt-3 border-t ${theme.cardBorder}`}>
          <p className="text-slate-400 text-xs">
            Rate: 1 USD = {exchangeRate.toFixed(4)} CNY
          </p>
          {lastUpdated && (
            <p className="text-slate-500 text-xs mt-1">Updated: {lastUpdated}</p>
          )}
        </div>
      )}
    </div>
  );
}