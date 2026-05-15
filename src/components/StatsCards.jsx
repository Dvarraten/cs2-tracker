import React, { useEffect, useRef, useState } from "react";
import { Package, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    if (start === end) return;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
        setDisplay(end);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  const formatted = decimals > 0
    ? (typeof display === "number" ? display.toFixed(decimals) : "0.00")
    : Math.round(display);
  return <>{prefix}{formatted}{suffix}</>;
}

export default function StatsCards({ stats, theme }) {
  const profit = stats.totalProfit;
  const isGain = profit >= 0;

  const cards = [
    {
      label: "Active",
      value: <AnimatedNumber value={stats.totalActive} />,
      icon: Package,
      iconColor: "text-slate-400",
      iconBg: "bg-slate-500/10",
      valueColor: "text-white",
    },
    {
      label: "Sold",
      value: <AnimatedNumber value={stats.totalSold} />,
      icon: isGain ? TrendingUp : TrendingDown,
      iconColor: isGain ? "text-profit" : "text-loss",
      iconBg: isGain ? "bg-profit/10" : "bg-loss/10",
      valueColor: "text-white",
    },
    {
      label: "Invested",
      value: <AnimatedNumber value={stats.totalInvested} prefix="$" decimals={2} />,
      icon: DollarSign,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      valueColor: "text-white",
    },
    {
      label: "Profit",
      value: <>{isGain ? "+" : ""}<AnimatedNumber value={profit} prefix="$" decimals={2} /></>,
      icon: isGain ? TrendingUp : TrendingDown,
      iconColor: isGain ? "text-profit" : "text-loss",
      iconBg: isGain ? "bg-profit/10" : "bg-loss/10",
      valueColor: isGain ? "text-profit" : "text-loss",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, value, sub, icon: Icon, iconColor, iconBg, valueColor }) => (
        <div key={label} className={`${theme.card} border ${theme.cardBorder} rounded-xl p-3`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
            <div className={`p-1.5 rounded-lg ${iconBg}`}>
              <Icon size={13} className={iconColor} />
            </div>
          </div>
          <div className={`text-base font-semibold font-mono leading-none ${valueColor}`}>{value}</div>
          {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
        </div>
      ))}
    </div>
  );
}
