import React from "react";

export default function Header({
  searchTerm,
  setSearchTerm,
  theme,
  onAnalyticsClick,
  onHandleItemsClick,
  pendingCount = 0,
  children,
}) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className={`w-full border-b border-white/8 sticky top-0 z-50 ${theme?.header || "bg-[#080e1a]"}`}>
      <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">

        {/* LEFT: Logo + Nav */}
        <div className="flex items-center gap-8">
          <span className="text-white font-semibold text-lg tracking-tight">
            CS2TradingTracker
          </span>
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scrollTo("section-add")}
              className="text-slate-400 hover:text-white hover:bg-white/8 px-3 py-1.5 rounded-lg text-sm transition-all"
            >
              Add Item
            </button>

            <button
              onClick={onHandleItemsClick}
              className="relative text-slate-400 hover:text-white hover:bg-white/8 px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2"
              title="Review incoming/outgoing Steam inventory items"
            >
              <span>Handle Items</span>
              {pendingCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
                  aria-label={`${pendingCount} pending items`}
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={onAnalyticsClick}
              className="text-slate-400 hover:text-white hover:bg-white/8 px-3 py-1.5 rounded-lg text-sm transition-all"
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* RIGHT: Search + ThemePicker */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`hidden md:block border rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors w-52 ${theme?.input || "bg-white/5 border-white/10 text-white placeholder-slate-500"}`}
          />
          {children}
        </div>
      </div>
    </header>
  );
}
