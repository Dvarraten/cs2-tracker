import React, { useMemo } from "react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProfitChart({
  profitChartData,
  chartPeriod,
  setChartPeriod,
  stats = {},
  theme,
  onClose,
  items = [],
}) {
  const totalInvested = stats?.totalInvested ?? 0;
  const totalProfit = stats?.totalProfit ?? 0;
  // Cumulative profit over the filtered period
  const cumulativeData = useMemo(
    () =>
      profitChartData.reduce((acc, d) => {
        const prev = acc[acc.length - 1]?.cumulative ?? 0;
        return [
          ...acc,
          { ...d, cumulative: Math.round((prev + d.profit) * 100) / 100 },
        ];
      }, []),
    [profitChartData],
  );

  const totalInPeriod = profitChartData.reduce((s, d) => s + d.profit, 0);

  // Win rate
  const soldItems = items.filter((i) => i.sold);
  const winRate =
    soldItems.length > 0
      ? `${Math.round((soldItems.filter((i) => i.profit > 0).length / soldItems.length) * 100)}%`
      : "—";

  // Heatmap — last 90 days from items directly
  const heatmapDays = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!it.sold || !it.dateSold) continue;
      const key = it.dateSold.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + (it.profit ?? 0));
    }
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split("T")[0];
      return { date: key, profit: map.get(key) ?? 0 };
    });
  }, [items]);

  const maxAbs = Math.max(...heatmapDays.map((d) => Math.abs(d.profit)), 0.01);

  const summaryCards = [
    {
      label: "Invested",
      value: `$${totalInvested.toFixed(2)}`,
      colored: false,
    },
    {
      label: "Total Profit",
      value: `${totalProfit >= 0 ? "+" : ""}$${totalProfit.toFixed(2)}`,
      colored: true,
      val: totalProfit,
    },
    {
      label: "Profit Rate",
      value: winRate,
      colored: false,
    },
  ];

  const PERIODS = [
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
    { key: "all", label: "All time" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col ${theme.panel} border ${theme.panelBorder} rounded-2xl shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${theme.panelBorder} shrink-0`}
        >
          <h2 className="font-semibold text-slate-100">Profit Analytics</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Period selector + total in period */}
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setChartPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  chartPeriod === p.key
                    ? `${theme.accentBg} text-white`
                    : `${theme.subtext} hover:text-slate-300 bg-white/5`
                }`}
              >
                {p.label}
              </button>
            ))}
            <span
              className={`ml-auto text-sm font-mono font-semibold ${totalInPeriod >= 0 ? "text-profit" : "text-loss"}`}
            >
              {totalInPeriod >= 0 ? "+" : ""}${totalInPeriod.toFixed(2)}
            </span>
          </div>

          {/* Cumulative line chart */}
          <div className="h-52">
            {cumulativeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.chartGrid}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.chartTooltipBg,
                      border: `1px solid ${theme.chartTooltipBorder}`,
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: 12 }}
                    formatter={(v) => [
                      `$${parseFloat(v).toFixed(2)}`,
                      "Cumulative",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke={theme.chartLine}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: theme.chartLine }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={`${theme.card} border ${theme.cardBorder} rounded-xl p-4 text-center`}
              >
                <p className="text-xs text-slate-600 mb-1.5">{card.label}</p>
                <p
                  className={`text-base font-mono font-semibold ${
                    card.colored
                      ? (card.val ?? 0) >= 0
                        ? "text-profit"
                        : "text-loss"
                      : "text-slate-200"
                  }`}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Daily P&L heatmap */}
          <div>
            <p className="text-xs text-slate-600 mb-3 uppercase tracking-wide">
              Daily P&L — Last 30 days
            </p>
            <div className="flex flex-wrap gap-1">
              {heatmapDays.map((d) => {
                const intensity =
                  d.profit === 0 ? 0 : Math.min(Math.abs(d.profit) / maxAbs, 1);
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.profit >= 0 ? "+" : ""}$${d.profit.toFixed(2)}`}
                    className="w-4 h-4 rounded-sm"
                    style={{
                      backgroundColor:
                        d.profit === 0
                          ? theme.chartGrid
                          : d.profit > 0
                            ? `rgba(34,197,94,${0.15 + intensity * 0.85})`
                            : `rgba(239,68,68,${0.15 + intensity * 0.85})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
