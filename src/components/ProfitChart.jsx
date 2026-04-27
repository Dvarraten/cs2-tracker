import React from 'react';
import { TrendingUp, TrendingDown, Calendar, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfitChart({ profitChartData, chartPeriod, setChartPeriod, weeklyProfit, monthlyProfit, theme, onClose }) {
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
      </div>
    </div>
  );
}