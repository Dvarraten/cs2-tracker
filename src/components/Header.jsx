import React, { useRef, useState, useEffect } from "react";
import { BarChart3, LogOut, ExternalLink, Download, User } from "lucide-react";

function SteamIcon({ className }) {
  return (
    <img
      src="https://store.akamai.steamstatic.com/public/shared/images/header/logo_steam.svg"
      alt=""
      className={className}
    />
  );
}

export default function Header({
  searchTerm,
  setSearchTerm,
  theme,
  onAnalyticsClick,
  onHandleItemsClick,
  pendingCount = 0,
  user,
  onLogin,
  onLogout,
  onExportCSV,
  children,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

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
            >
              <span>Handle Items</span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
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

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`hidden md:block border rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors w-52 ${theme?.input || "bg-white/5 border-white/10 text-white placeholder-slate-500"}`}
          />
          {children}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 hover:bg-white/8 rounded-lg p-1 transition-all"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.personaName || ""}
                    className="w-8 h-8 rounded-full ring-1 ring-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={16} className="text-slate-400" />
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-11 w-52 rounded-xl border border-white/10 bg-[#151f35] shadow-xl overflow-hidden z-50">
                  {user.personaName && (
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="text-white text-sm font-medium truncate">{user.personaName}</p>
                      <p className="text-slate-500 text-xs truncate">Steam ID: {user.steamId}</p>
                    </div>
                  )}
                  <div className="py-1">
                    <a
                      href={`https://steamcommunity.com/profiles/${user.steamId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <ExternalLink size={15} />
                      Steam Profile
                    </a>
                    <a
                      href={`https://steamcommunity.com/profiles/${user.steamId}/inventory/#730`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <ExternalLink size={15} />
                      CS2 Inventory
                    </a>
                    {onExportCSV && (
                      <button
                        onClick={() => { onExportCSV(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                      >
                        <Download size={15} />
                        Export CSV
                      </button>
                    )}
                    <button
                      onClick={() => { onAnalyticsClick(); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                    >
                      <BarChart3 size={15} />
                      Analytics
                    </button>
                    <div className="border-t border-white/8 mt-1 pt-1">
                      <button
                        onClick={() => { onLogout(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/8 transition-all"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            >
              <SteamIcon className="h-4 w-4 brightness-0 invert" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
