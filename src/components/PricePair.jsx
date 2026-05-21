// Linked USD ↔ [displayCurrency] price input pair. USD is the source of
// truth; both fields stay in sync via the live exchange rate.
import React from 'react';

function symbolPad(symbol) {
  return symbol.length > 1 ? 'pl-8' : 'pl-6';
}

export default function PricePair({ usdValue, cnyValue, onChange, onCnyTyped, exchangeRate, theme, currencySymbol = '¥', displayCurrency = 'CNY' }) {
  const handleUsd = (raw) => {
    const num = parseFloat(raw);
    const cny = isNaN(num) || !exchangeRate ? '' : (num * exchangeRate).toFixed(2);
    onChange({ usd: raw, cny });
  };
  const handleCny = (raw) => {
    const num = parseFloat(raw);
    const usd = isNaN(num) || !exchangeRate ? '' : (num / exchangeRate).toFixed(2);
    onChange({ usd, cny: raw });
    if (raw && onCnyTyped) onCnyTyped();
  };
  const base = `w-full ${theme.input} rounded-lg h-9 ${theme.text} text-sm placeholder-slate-500 focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">$</span>
        <input
          type="number"
          step="0.01"
          value={usdValue}
          onChange={(e) => handleUsd(e.target.value)}
          onWheel={(e) => e.target.blur()}
          placeholder="USD"
          className={`${base} pl-6 pr-2`}
        />
      </div>
      <div className="relative flex-1">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">{currencySymbol}</span>
        <input
          type="number"
          step="0.01"
          value={cnyValue}
          onChange={(e) => handleCny(e.target.value)}
          onWheel={(e) => e.target.blur()}
          placeholder={exchangeRate ? displayCurrency : 'loading…'}
          disabled={!exchangeRate}
          className={`${base} ${symbolPad(currencySymbol)} pr-2 ${!exchangeRate ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );
}
