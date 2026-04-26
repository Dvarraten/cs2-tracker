import React, { useEffect, useRef, useState } from "react";

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
      // ease out cubic
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

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">Active Items</div>
        <div className="text-4xl font-bold">
          <AnimatedNumber value={stats.totalActive} />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">Sold Items</div>
        <div className="text-4xl font-bold">
          <AnimatedNumber value={stats.totalSold} />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">Invested</div>
        <div className="text-4xl font-bold">
          <AnimatedNumber value={stats.totalInvested} prefix="$" decimals={2} />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">Total Profit</div>
        <div className="text-4xl font-bold">
          <AnimatedNumber
            value={stats.totalProfit}
            prefix="$"
            decimals={2}
            color={stats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}
          />
        </div>
      </div>
    </div>
  );
}