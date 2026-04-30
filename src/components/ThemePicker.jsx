import React from "react";

export default function ThemePicker({
  themeStyles,
  setShowThemePicker,
  showThemePicker,
  setTheme,
  theme,
  themes,
}) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowThemePicker((p) => !p)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${themeStyles.cardBorder} ${themeStyles.card} text-white text-sm hover:border-white/20 transition-all`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${themeStyles.dot}`} />
        <span className="hidden sm:inline">{themeStyles.name}</span>
        <svg
          className="w-3.5 h-3.5 text-white/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {showThemePicker && (
        <div
          className={`absolute right-0 mt-2 w-52 ${themeStyles.panel} border ${themeStyles.panelBorder} rounded-xl shadow-2xl z-50 overflow-hidden`}
        >
          <div
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest ${themeStyles.subtext} border-b ${themeStyles.panelBorder}`}
          >
            Choose Theme
          </div>
          {Object.entries(themes).map(([key, th]) => (
            <button
              key={key}
              onClick={() => {
                setTheme(key);
                setShowThemePicker(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all ${
                theme === key
                  ? "text-white bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${th.dot}`} />
              <span>{th.name}</span>
              {theme === key && (
                <svg
                  className="w-4 h-4 ml-auto text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
