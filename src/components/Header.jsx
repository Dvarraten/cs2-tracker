import React from "react";

export default function Header({ searchTerm, setSearchTerm, theme, children }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className={`w-full border-b border-black/10 sticky top-0 z-50 ${theme?.header || "bg-[#080e1a]"}`}>
      <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">

        {/* LEFT: Logo + Nav */}
        <div className="flex items-center gap-8">
          <span className="text-white font-semibold text-lg tracking-tight">
            CS2TradingTracker
          </span>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Add Item",     id: "section-add" },
              { label: "Handle Items", id: "section-items" },
              { label: "Analytics",    id: "section-analytics" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-slate-400 hover:text-white hover:bg-white/8 px-3 py-1.5 rounded-lg text-sm transition-all"
              >
                {label}
              </button>
            ))}
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