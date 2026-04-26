import React from "react";
import { TrendingUp } from "lucide-react";

export default function RecentSales({ items, theme }) {
  return (
    <div
      className={`${theme.panel} backdrop-blur-sm rounded-xl p-5 border ${theme.panelBorder} h-full`}
    >
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-emerald-400" />
        Recent Sales
      </h3>
      <div className="space-y-3">
        {items
          .filter((i) => i.sold)
          .sort((a, b) => {
            const aDate = a.dateSold ? new Date(a.dateSold).getTime() : 0;
            const bDate = b.dateSold ? new Date(b.dateSold).getTime() : 0;
            return bDate - aDate;
          })
          .slice(0, 5)
          .map((item) => (
            <div
              key={item.id}
              className={`${theme.soldCard} rounded-lg p-3 border`}
            >
              <div className="text-sm font-medium text-white truncate mb-1">
                {item.itemName}
              </div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">
                  ${item.purchasePrice.toFixed(2)} → $
                  {item.salePrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className={`font-semibold text-sm ${item.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {item.profit >= 0 ? "+" : ""}${item.profit.toFixed(2)} (
                  {item.profit >= 0 ? "+" : ""}
                  {item.profitPercent.toFixed(1)}%)
                </span>
                {item.dateSold && (
                  <span className="text-xs text-slate-500">
                    {new Date(item.dateSold).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        {items.filter((i) => i.sold).length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sales yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
