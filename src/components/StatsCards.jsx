import React, { useEffect, useRef, useState } from "react";
import { Package, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

function AnimatedNumber({ value, prefix = "", decimals = 0, color = "text-white" }) {
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

  return (
    <span className={color}>
      {prefix}{typeof display === 'number' && decimals > 0
        ? display.toFixed(decimals)
        : Math.round(display)}
    </span>
  );
}

export default function StatsCards({ stats, theme }) {
  const cards = [
    {
      label: "Active Items",
      icon: <Package size={18} />,
      value: <AnimatedNumber value={stats.totalActive} />,
    },
    {
      label: "Sold Items",
      icon: <TrendingUp size={18} />,
      value: <AnimatedNumber value={stats.totalSold} />,
    },
    {
      label: "Invested",
      icon: <DollarSign size={18} />,
      value: <AnimatedNumber value={stats.totalInvested} prefix="$" decimals={2} />,
    },
    {
      label: "Total Profit",
      icon: <BarChart3 size={18} />,
      value: (
        <AnimatedNumber
          value={stats.totalProfit}
          prefix="$"
          decimals={2}
          color={stats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map(({ label, icon, value }) => (
        <div
          key={label}
          className={`${theme.card} backdrop-blur-sm rounded-xl p-6 border ${theme.cardBorder} ${theme.cardHover} transition-all`}
        >
          <div className={`flex items-center gap-2 ${theme.subtext} text-sm mb-3 font-medium`}>
            {icon}
            {label}
          </div>
          <div className="text-4xl font-bold">{value}</div>
        </div>
      ))}
    </div>
  );
}