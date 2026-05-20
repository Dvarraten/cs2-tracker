// Linked USD ↔ [display currency] input pair with currency picker and
// copy buttons. Display currency is persisted and shared across all
// price pair inputs in the app.
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { CURRENCIES } from "../../hooks/useExchangeRate";

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
  displayCurrency, setDisplayCurrency, currencySymbol,
}) {
  return (
    <div className="space-y-2">
      {/* Currency picker */}
      <div className="flex flex-wrap gap-1">
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            onClick={() => setDisplayCurrency(c.code)}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              displayCurrency === c.code
                ? `${theme.accentBg} text-white border-transparent`
                : `${theme.subtext} border ${theme.cardBorder} ${theme.itemHoverBg}`
            }`}
          >
            {c.code}
          </button>
        ))}
      </div>

      {/* USD input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono pointer-events-none">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={usdAmount}
          onChange={(e) => handleUsdChange(e.target.value)}
          placeholder="USD"
          className={`w-full ${theme.input} pl-7 pr-8 py-2 rounded-lg text-sm font-mono ${theme.textSecondary} placeholder-slate-600 focus:outline-none transition-colors border`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <CopyButton value={usdAmount} />
        </div>
      </div>

      {/* Display currency input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono pointer-events-none">{currencySymbol}</span>
        <input
          type="text"
          inputMode="decimal"
          value={rmbAmount}
          onChange={(e) => handleRmbChange(e.target.value)}
          placeholder={displayCurrency}
          disabled={!exchangeRate}
          className={`w-full ${theme.input} pl-7 pr-8 py-2 rounded-lg text-sm font-mono ${theme.textSecondary} placeholder-slate-600 focus:outline-none transition-colors border ${!exchangeRate ? 'opacity-50' : ''}`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <CopyButton value={rmbAmount} />
        </div>
      </div>

      {exchangeRate && (
        <p className="text-xs text-slate-500 text-center">
          1 USD ≈ {exchangeRate.toFixed(2)} {displayCurrency}
        </p>
      )}
    </div>
  );
}
