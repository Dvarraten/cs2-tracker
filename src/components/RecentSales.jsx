import React from "react";
import { TrendingUp } from "lucide-react";

export default function RecentSales({ items, theme }) {
  const sold = items
    .filter((i) => i.sold)
    .sort((a, b) => {
      const aDate = a.dateSold ? new Date(a.dateSold).getTime() : 0;
      const bDate = b.dateSold ? new Date(b.dateSold).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, 5);

  return (
    <div className={`${theme.panel} backdrop-blur-sm rounded-xl p-5 border ${theme.panelBorder}`}>
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-emerald-400" />
        Recent Sales
      </h3>

      {sold.length === 0 ? (
        <div className="text-center py-6 text-slate-400">
          <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No sales yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sold.map((item) => (
            <div
              key={item.id}
              className={`relative rounded-lg px-3 py-2.5 border ${theme.soldCard} overflow-hidden`}
            >
              {/* colour bar */}
              <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${item.profit >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />

              <div className="pl-2">
                <div className="text-sm font-medium text-white truncate">{item.itemName}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-slate-400 text-xs">
                    ${item.purchasePrice.toFixed(2)} → ${item.salePrice.toFixed(2)}
                  </span>
                  {item.dateSold && (
                    <span className="text-xs text-slate-500">
                      {new Date(item.dateSold).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-semibold ${item.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {item.profit >= 0 ? "+" : ""}${item.profit.toFixed(2)} ({item.profit >= 0 ? "+" : ""}{item.profitPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}