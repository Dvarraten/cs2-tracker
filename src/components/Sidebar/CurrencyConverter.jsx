import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      disabled={!value}
      title="Copy value"
      className={`p-1.5 rounded-md transition-all
        ${copied
          ? "text-emerald-400 bg-emerald-400/10"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
        }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function CurrencyConverter({
  usdAmount, rmbAmount,
  exchangeRate, lastUpdated,
  handleUsdChange, handleRmbChange, theme
}) {
  return (
    <div className={`${theme.card} backdrop-blur-sm rounded-xl p-5 border ${theme.cardBorder}`}>
      <h3 className="text-base font-semibold text-slate-200 mb-4">Currency Converter</h3>
      <div className="space-y-3">
        <div>
          <label className={`block ${theme.subtext} text-xs mb-1.5`}>USD</label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={usdAmount}
              onChange={(e) => handleUsdChange(e.target.value)}
              className={`w-full ${theme.input} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border`}
              placeholder="-"
            />
            <CopyButton value={usdAmount} />
          </div>
        </div>
        <div>
          <label className={`block ${theme.subtext} text-xs mb-1.5`}>RMB (CNY)</label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={rmbAmount}
              onChange={(e) => handleRmbChange(e.target.value)}
              className={`w-full ${theme.input} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border`}
              placeholder="-"
            />
            <CopyButton value={rmbAmount} />
          </div>
        </div>
      </div>
      {exchangeRate && (
        <div className={`mt-3 pt-3 border-t ${theme.cardBorder}`}>
          <p className={`${theme.subtext} text-xs`}>
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