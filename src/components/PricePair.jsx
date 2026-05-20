// Linked USD ↔ CNY price input pair. USD is the source of truth; both
// fields stay in sync via the live exchange rate passed in as a prop.
import React from 'react';

export default function PricePair({ usdValue, cnyValue, onChange, exchangeRate, theme }) {
  const handleUsd = (raw) => {
    const num = parseFloat(raw);
    const cny = isNaN(num) || !exchangeRate ? '' : (num * exchangeRate).toFixed(2);
    onChange({ usd: raw, cny });
  };
  const handleCny = (raw) => {
    const num = parseFloat(raw);
    const usd = isNaN(num) || !exchangeRate ? '' : (num / exchangeRate).toFixed(2);
    onChange({ usd, cny: raw });
  };
  const inputClass = `w-full ${theme.input} rounded-lg pl-6 pr-2 h-9 ${theme.text} text-sm placeholder-slate-500 focus:outline-none border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">$</span>
        <input
          type="number"
          step="0.01"
          value={usdValue}
          onChange={(e) => handleUsd(e.target.value)}
          placeholder="USD"
          className={inputClass}
        />
      </div>
      <div className="relative flex-1">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">¥</span>
        <input
          type="number"
          step="0.01"
          value={cnyValue}
          onChange={(e) => handleCny(e.target.value)}
          placeholder={exchangeRate ? 'CNY' : 'loading…'}
          disabled={!exchangeRate}
          className={`${inputClass} ${!exchangeRate ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );
}
