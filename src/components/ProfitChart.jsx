import React from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfitChart({ profitChartData, chartPeriod, setChartPeriod, weeklyProfit, monthlyProfit, t }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Profit Chart - Takes 2 columns */}
      <div className={`lg:col-span-2 ${t.card} backdrop-blur-sm rounded-xl p-6 border ${t.cardBorder}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Profit Over Time</h3>
          <select
            value={chartPeriod}
            onChange={(e) => setChartPeriod(e.target.value)}
            className={`${t.input} rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none transition-colors border`}
          >
            <option value="7days" className="bg-slate-900">Last 7 days</option>
            <option value="30days" className="bg-slate-900">Last 30 days</option>
            <option value="3months" className="bg-slate-900">Last 3 months</option>
            <option value="all" className="bg-slate-900">All time</option>
          </select>
        </div>
        {profitChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={profitChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
              <XAxis 
                dataKey="date" 
                stroke={t.chartAxis}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke={t.chartAxis}
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: t.chartTooltipBg, 
                  border: `1px solid ${t.chartTooltipBorder}`,
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => [`$${value}`, 'Profit']}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke={t.chartLine} 
                strokeWidth={2}
                dot={{ fill: t.chartLine, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            <div className="text-center">
              <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
              <p>No sales data yet</p>
              <p className="text-sm mt-1">Sell your first item to see the chart</p>
            </div>
          </div>
        )}
      </div>

      {/* Weekly/Monthly Summary - Takes 1 column */}
      <div className="space-y-4">
        <div className={`${t.card} backdrop-blur-sm rounded-xl p-6 border ${t.cardBorder}`}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={20} className="text-blue-400" />
            <h3 className="text-base font-semibold text-white">Weekly Summary</h3>
          </div>
          <div className={`text-3xl font-bold mb-2 ${weeklyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${weeklyProfit.toFixed(2)}
          </div>
          <p className="text-sm text-slate-400">Last 7 days</p>
          {weeklyProfit >= 0 ? (
            <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
              <TrendingUp size={16} />
              <span>Profitable week</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
              <TrendingDown size={16} />
              <span>Loss this week</span>
            </div>
          )}
        </div>

        <div className={`${t.card} backdrop-blur-sm rounded-xl p-6 border ${t.cardBorder}`}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={20} className="text-purple-400" />
            <h3 className="text-base font-semibold text-white">Monthly Summary</h3>
          </div>
          <div className={`text-3xl font-bold mb-2 ${monthlyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${monthlyProfit.toFixed(2)}
          </div>
          <p className="text-sm text-slate-400">Last 30 days</p>
          {monthlyProfit >= 0 ? (
            <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
              <TrendingUp size={16} />
              <span>Profitable month</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
              <TrendingDown size={16} />
              <span>Loss this month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}