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
      className={`p-1.5 rounded-md transition-all shrink-0 ${
        copied
          ? "text-profit bg-profit/10"
          : "text-slate-600 hover:text-slate-300 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function CurrencyConverter({
  usdAmount, rmbAmount,
  exchangeRate, lastUpdated,
  handleUsdChange, handleRmbChange, theme,
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono pointer-events-none">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={usdAmount}
          onChange={(e) => handleUsdChange(e.target.value)}
          placeholder="USD"
          className={`w-full ${theme.input} pl-7 pr-8 py-2 rounded-lg text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none transition-colors border`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <CopyButton value={usdAmount} />
        </div>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono pointer-events-none">¥</span>
        <input
          type="text"
          inputMode="decimal"
          value={rmbAmount}
          onChange={(e) => handleRmbChange(e.target.value)}
          placeholder="RMB"
          className={`w-full ${theme.input} pl-7 pr-8 py-2 rounded-lg text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none transition-colors border`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <CopyButton value={rmbAmount} />
        </div>
      </div>
      {exchangeRate && (
        <p className="text-xs text-slate-700 text-center">1 USD ≈ {exchangeRate.toFixed(2)} CNY</p>
      )}
    </div>
  );
}
