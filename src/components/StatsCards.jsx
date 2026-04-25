import React from "react";

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border
      border-slate-700/50 hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">
          Active Items
        </div>
        <div className="text-4xl font-bold text-white">{stats.totalActive}</div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50
      hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">
          Sold Items
        </div>
        <div className="text-4xl font-bold text-white">{stats.totalSold}</div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50
      hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">
          Invested
        </div>
        <div className="text-4xl font-bold text-white">
          ${stats.totalInvested.toFixed(2)}
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50
      hover:border-slate-600 transition-all">
        <div className="text-slate-400 text-base mb-3 font-medium">
          Total Profit
        </div>
        <div
          className={`text-4xl font-bold ${stats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          ${stats.totalProfit.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
