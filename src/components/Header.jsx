import React from "react";

export default function Header() {
  return (
    <header className="w-full border-b border-white/10 bg-slate-900/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LEFT: Logo */}
        <div className="flex items-center gap-6">
          <span className="text-white font-semibold text-lg">
            CS2TradingTracker
          </span>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-slate-300 hover:text-white transition">
              Add Item
            </a>
            <a href="#" className="text-slate-300 hover:text-white transition">
              Handle Items
            </a>
            <a href="#" className="text-slate-300 hover:text-white transition">
              Analytics
            </a>
          </nav>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            className="hidden md:block bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none"
          />

          {/* Profile */}
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white">
            L
          </div>
        </div>
      </div>
    </header>
  );
}