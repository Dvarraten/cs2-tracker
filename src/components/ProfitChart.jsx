import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Build a date → profit map from sold items in the given window (default 90 days).
function buildDailyProfit(items, days = 90) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const dailyMap = new Map(); // 'YYYY-MM-DD' -> { profit, count }
  for (const it of items) {
    if (!it.sold || it.profit == null || !it.dateSold) continue;
    const t = it.soldAt ?? new Date(it.dateSold).getTime();
    if (t < start.getTime() || t > today.getTime()) continue;
    const key = it.dateSold;
    const slot = dailyMap.get(key) || { profit: 0, count: 0 };
    slot.profit += it.profit;
    slot.count += 1;
    dailyMap.set(key, slot);
  }

  // Build full grid of every day in window (so empty days still render).
  const cells = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= today.getTime()) {
    const iso = cursor.toISOString().split('T')[0];
    const slot = dailyMap.get(iso);
    cells.push({
      date: iso,
      dow: cursor.getDay(), // 0 = Sunday
      profit: slot ? slot.profit : 0,
      count: slot ? slot.count : 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

function ProfitHeatmap({ items, theme }) {
  const cells = useMemo(() => buildDailyProfit(items, 90), [items]);
  const [hover, setHover] = useState(null);

  // Normalise colour intensity by max absolute profit in the window.
  const maxAbs = Math.max(1, ...cells.map((c) => Math.abs(c.profit)));

  // Group cells into columns where each column is one week (7 cells).
  // We want most-recent week on the right, so iterate forwards and pad
  // the first column with empties for the leading day-of-week offset.
  const firstDow = cells[0]?.dow ?? 0;
  const padded = [
    ...Array.from({ length: firstDow }, () => null),
    ...cells,
  ];
  const columns = [];
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7));
  }

  const cellSize = 13;
  const gap = 3;
  const width = columns.length * (cellSize + gap);
  const height = 7 * (cellSize + gap);

  const cellColor = (cell) => {
    if (!cell) return 'transparent';
    if (cell.count === 0) return 'rgba(255,255,255,0.04)';
    const intensity = Math.min(1, Math.abs(cell.profit) / maxAbs);
    const alpha = 0.25 + 0.7 * intensity;
    return cell.profit >= 0
      ? `rgba(52, 211, 153, ${alpha})` // emerald-400
      : `rgba(248, 113, 113, ${alpha})`; // red-400
  };

  // Sum stats for caption
  const total = cells.reduce((s, c) => s + c.profit, 0);
  const tradingDays = cells.filter((c) => c.count > 0).length;

  return (
    <div className={`${theme.panel} rounded-xl p-5 border ${theme.panelBorder} relative`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-base font-semibold text-white">Daily P&amp;L · last 90 days</h3>
        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span>{tradingDays} trading days</span>
          <span className={`font-semibold ${total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {total >= 0 ? '+' : ''}${total.toFixed(2)} total
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} style={{ display: 'block' }}>
          {columns.map((col, x) =>
            col.map((cell, y) => (
              <rect
                key={`${x}-${y}`}
                x={x * (cellSize + gap)}
                y={y * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                ry={2}
                fill={cellColor(cell)}
                onMouseEnter={() => cell && setHover({ ...cell, x, y })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: cell ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
              />
            ))
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
        <span>Less</span>
        <span style={{ background: 'rgba(248, 113, 113, 0.95)' }} className="w-3 h-3 rounded-sm" />
        <span style={{ background: 'rgba(248, 113, 113, 0.4)' }} className="w-3 h-3 rounded-sm" />
        <span style={{ background: 'rgba(255,255,255,0.04)' }} className="w-3 h-3 rounded-sm" />
        <span style={{ background: 'rgba(52, 211, 153, 0.4)' }} className="w-3 h-3 rounded-sm" />
        <span style={{ background: 'rgba(52, 211, 153, 0.95)' }} className="w-3 h-3 rounded-sm" />
        <span>More</span>
        <span className="ml-auto">red = loss · green = profit</span>
      </div>

      {hover && (
        <div className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 text-xs text-white rounded-md px-2 py-1.5 shadow-lg z-10"
          style={{
            left: 24 + hover.x * (cellSize + gap),
            top: 60 + hover.y * (cellSize + gap),
          }}
        >
          <div className="font-semibold">{hover.date}</div>
          <div className={hover.profit >= 0 ? 'text-emerald-400' : hover.profit < 0 ? 'text-red-400' : 'text-slate-400'}>
            {hover.count === 0
              ? 'No sales'
              : `${hover.count} sale${hover.count === 1 ? '' : 's'} · ${hover.profit >= 0 ? '+' : ''}$${hover.profit.toFixed(2)}`}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfitChart({ profitChartData, chartPeriod, setChartPeriod, weeklyProfit, monthlyProfit, theme, onClose, items = [] }) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-5xl ${theme.card} border ${theme.cardBorder} rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <TrendingUp size={20} className={theme.accent} />
            Analytics
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart – 2 cols */}
          <div className={`lg:col-span-2 ${theme.panel} rounded-xl p-5 border ${theme.panelBorder}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">Profit Over Time</h3>
              <select
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value)}
                className={`${theme.input} rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none transition-colors border`}
              >
                <option value="7d"  className="bg-slate-900">Last 7 days</option>
                <option value="30d" className="bg-slate-900">Last 30 days</option>
                <option value="all" className="bg-slate-900">All time</option>
              </select>
            </div>

            {profitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
                  <XAxis dataKey="date" stroke={theme.chartAxis} style={{ fontSize: '12px' }} />
                  <YAxis stroke={theme.chartAxis} style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.chartTooltipBg,
                      border: `1px solid ${theme.chartTooltipBorder}`,
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`$${value}`, 'Profit']}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={theme.chartLine}
                    strokeWidth={2}
                    dot={{ fill: theme.chartLine, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto mb-2 opacity-30" />
                  <p>No sales data yet</p>
                  <p className="text-sm mt-1 opacity-60">Sell your first item to see the chart</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary cards – 1 col */}
          <div className="space-y-4">
            {[
              { label: 'Weekly Summary', sub: 'Last 7 days', value: weeklyProfit, color: 'text-blue-400' },
              { label: 'Monthly Summary', sub: 'Last 30 days', value: monthlyProfit, color: 'text-purple-400' },
            ].map(({ label, sub, value, color }) => (
              <div key={label} className={`${theme.panel} rounded-xl p-5 border ${theme.panelBorder}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={18} className={color} />
                  <h3 className="text-sm font-semibold text-white">{label}</h3>
                </div>
                <div className={`text-3xl font-bold mb-1 ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {value >= 0 ? '+' : ''}${value.toFixed(2)}
                </div>
                <p className="text-xs text-slate-400 mb-2">{sub}</p>
                <div className={`flex items-center gap-1 text-xs ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {value >= 0
                    ? <><TrendingUp size={13} /> Profitable</>
                    : <><TrendingDown size={13} /> Loss</>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily P&L heatmap — full width below */}
        <div className="mt-6">
          <ProfitHeatmap items={items} theme={theme} />
        </div>
      </div>
    </div>
  );
}