// Free-form currency converter — both fields have their own currency
// selector. The right field's currency also drives the display currency
// used in all price pair inputs across the app.
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

function CurrencySelect({ value, onChange, theme }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${theme.input} text-[10px] font-mono rounded px-1.5 py-0.5 border focus:outline-none ${theme.text} cursor-pointer`}
    >
      {CURRENCIES.map(c => (
        <option key={c.code} value={c.code}>{c.code}</option>
      ))}
    </select>
  );
}

function symbolPad(symbol) {
  return symbol.length > 1 ? 'pl-9' : 'pl-7';
}

export default function CurrencyConverter({
  usdAmount, rmbAmount,
  sidebarRate, lastUpdated,
  handleUsdChange, handleRmbChange, theme,
  currency1, setCurrency1, currency1Symbol,
  displayCurrency, setDisplayCurrency, currencySymbol,
}) {
  return (
    <div className="space-y-2">
      {/* Field 1: currency1 */}
      <div className="relative">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10">
          <span className="text-slate-500 text-xs font-mono">{currency1Symbol}</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={usdAmount}
          onChange={(e) => handleUsdChange(e.target.value)}
          placeholder={currency1}
          className={`w-full ${theme.input} ${symbolPad(currency1Symbol)} pr-20 py-2 rounded-lg text-sm font-mono ${theme.textSecondary} placeholder-slate-600 focus:outline-none transition-colors border`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <CurrencySelect value={currency1} onChange={setCurrency1} theme={theme} />
          <CopyButton value={usdAmount} />
        </div>
      </div>

      {/* Field 2: displayCurrency */}
      <div className="relative">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10">
          <span className="text-slate-500 text-xs font-mono">{currencySymbol}</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={rmbAmount}
          onChange={(e) => handleRmbChange(e.target.value)}
          placeholder={displayCurrency}
          disabled={!sidebarRate}
          className={`w-full ${theme.input} ${symbolPad(currencySymbol)} pr-20 py-2 rounded-lg text-sm font-mono ${theme.textSecondary} placeholder-slate-600 focus:outline-none transition-colors border ${!sidebarRate ? 'opacity-50' : ''}`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <CurrencySelect value={displayCurrency} onChange={setDisplayCurrency} theme={theme} />
          <CopyButton value={rmbAmount} />
        </div>
      </div>

      {sidebarRate && (
        <p className="text-xs text-slate-500 text-center">
          1 {currency1} ≈ {sidebarRate.toFixed(4)} {displayCurrency}
        </p>
      )}
    </div>
  );
}
