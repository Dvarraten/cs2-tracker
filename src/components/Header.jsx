import React, { useRef, useState, useEffect } from "react";
import {
  BarChart3,
  LogOut,
  ExternalLink,
  Download,
  Upload,
  User,
} from "lucide-react";
import steamLogo from "../assets/platforms/steam.png";
import logoSrc from "../utils/skinroi-logo.svg";

function SteamIcon({ className }) {
  return <img src={steamLogo} alt="" className={className} />;
}

export default function Header({
  theme,
  onAnalyticsClick,
  onAddItemClick,
  onHandleItemsClick,
  onAboutClick,
  showAddItem = false,
  showHandleItems = false,
  pendingCount = 0,
  user,
  onLogin,
  onLogout,
  onExportCSV,
  onImportCSV,
  children,
}) {
  const importInputRef = useRef(null);
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

  const navBtn = (active) =>
    `relative px-1 py-1.5 text-sm font-medium transition-colors group ${
      active ? "text-white" : "text-slate-400 hover:text-white"
    }`;

  return (
    <header className={`w-full sticky top-0 z-50 px-4 pt-3 pb-1 ${theme?.bg || 'bg-[#0c1120]'}`}>
      <div className={`px-5 h-14 flex items-center justify-between rounded-2xl shadow-lg ${theme?.header || "bg-gradient-to-b from-[#0e1a32] to-[#070c16]"}`}>
        {/* LEFT: Logo + Nav */}
        <div className="flex items-center gap-8">
          <img
            src={logoSrc}
            alt="SkinROI"
            style={{ height: "52px", width: "auto" }}
          />
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={onAddItemClick} className={navBtn(showAddItem)}>
              Add Item
              <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${showAddItem ? "w-full bg-[#FBBF24]" : "w-0 bg-[#FBBF24] group-hover:w-full"}`} />
            </button>
            <button
              onClick={onHandleItemsClick}
              className={`flex items-center gap-2 ${navBtn(showHandleItems)}`}
            >
              <span>Handle Items</span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
              <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${showHandleItems ? "w-full bg-[#FBBF24]" : "w-0 bg-[#FBBF24] group-hover:w-full"}`} />
            </button>
            <button onClick={onAnalyticsClick} className={navBtn(false)}>
              Analytics
              <span className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full bg-[#FBBF24] transition-all duration-200 group-hover:w-full" />
            </button>
            <button onClick={onAboutClick} className={navBtn(false)}>
              About
              <span className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full bg-[#FBBF24] transition-all duration-200 group-hover:w-full" />
            </button>
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
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
                      <p className="text-white text-sm font-medium truncate">
                        {user.personaName}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        Steam ID: {user.steamId}
                      </p>
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
                        onClick={() => {
                          onExportCSV();
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                      >
                        <Download size={15} />
                        Export CSV
                      </button>
                    )}
                    {onImportCSV && (
                      <>
                        <input
                          ref={importInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            onImportCSV(e.target.files?.[0]);
                            e.target.value = "";
                            setDropdownOpen(false);
                          }}
                        />
                        <button
                          onClick={() => importInputRef.current?.click()}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                        >
                          <Upload size={15} />
                          Import CSV
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        onAnalyticsClick();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                    >
                      <BarChart3 size={15} />
                      Analytics
                    </button>
                    <div className="border-t border-white/8 mt-1 pt-1">
                      <button
                        onClick={() => {
                          onLogout();
                          setDropdownOpen(false);
                        }}
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
              <SteamIcon className="h-4 w-4" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
