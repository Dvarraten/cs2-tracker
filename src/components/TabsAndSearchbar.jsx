import React from "react";
import { Search } from "lucide-react";

const SORTS = {
  active: [
    { label: 'Date',     desc: 'newest',        asc: 'oldest'        },
    { label: 'Price',    desc: 'price-high',    asc: 'price-low'     },
    { label: 'Delivery', desc: 'delivery-late', asc: 'delivery-soon' },
  ],
  pending: [
    { label: 'Date',     desc: 'newest',          asc: 'oldest'           },
    { label: 'Price',    desc: 'price-high',      asc: 'price-low'        },
    { label: 'Delivery', desc: 'delivery-late',   asc: 'delivery-soon'    },
  ],
  sold: [
    { label: 'Date',     desc: 'newest',              asc: 'oldest'             },
    { label: 'Price',    desc: 'price-high',           asc: 'price-low'          },
    { label: 'Profit $', desc: 'profit-dollar-high',   asc: 'profit-dollar-low'  },
    { label: 'Profit %', desc: 'profit-high',          asc: 'profit-low'         },
  ],
};

function TabButton({ label, count, isActive, onClick, theme, accentClass, badgeClass }) {
  return (
    <button
      onClick={onClick}
      className={`relative pl-5 pr-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 overflow-hidden ${
        isActive
          ? `${theme.card} ${theme.cardBorder} text-white`
          : `bg-transparent ${theme.cardBorder} ${theme.subtext} hover:text-white hover:bg-white/5`
      }`}
    >
      {isActive && <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${accentClass}`} />}
      <span>{label}</span>
      <span className={`text-xs font-semibold font-mono rounded-full px-1.5 py-0.5 ${badgeClass}`}>
        {count}
      </span>
    </button>
  );
}

export default function TabsAndSearchbar({
  theme, setActiveTab, activeTab, stats, searchTerm, setSearchTerm, sortBy, setSortBy,
  selectMode, selectedIds, onEnterSelectMode, onCancelSelectMode, onConfirmBulkDelete,
}) {
  const sorts = SORTS[activeTab] ?? SORTS.active;

  const isSortActive = (sort) => sortBy === sort.desc || sortBy === sort.asc;

  const handleSortClick = (sort) => {
    if (sortBy === sort.desc) setSortBy(sort.asc);
    else if (sortBy === sort.asc) setSortBy(sort.desc);
    else setSortBy(sort.desc);
  };

  const sortArrow = (sort) => {
    if (sortBy === sort.desc) return ' ↓';
    if (sortBy === sort.asc)  return ' ↑';
    return '';
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSortBy('newest');
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <TabButton
          label="Active" count={stats.totalActive}
          isActive={activeTab === 'active'} onClick={() => switchTab('active')}
          theme={theme} accentClass="bg-blue-500"
          badgeClass={activeTab === 'active' ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-500'}
        />
        <TabButton
          label="Pending" count={stats.totalPending}
          isActive={activeTab === 'pending'} onClick={() => switchTab('pending')}
          theme={theme} accentClass="bg-warn"
          badgeClass={
            stats.totalPending > 0
              ? 'bg-warn/20 text-warn'
              : activeTab === 'pending' ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-500'
          }
        />
        <TabButton
          label="Sold" count={stats.totalSold}
          isActive={activeTab === 'sold'} onClick={() => switchTab('sold')}
          theme={theme} accentClass="bg-profit"
          badgeClass={activeTab === 'sold' ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-500'}
        />
      </div>

      {/* Search + sort + bulk */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search with icon */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items…"
            className={`w-full pl-8 pr-3 py-2 ${theme.input} rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition-colors border`}
          />
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          {sorts.map(sort => (
            <button
              key={sort.label}
              onClick={() => handleSortClick(sort)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isSortActive(sort)
                  ? `${theme.card} border ${theme.cardBorder} text-slate-200`
                  : `text-slate-600 hover:text-slate-300 hover:bg-white/5`
              }`}
            >
              {sort.label}{sortArrow(sort)}
            </button>
          ))}
        </div>

        {/* Bulk select */}
        {!selectMode ? (
          <button
            onClick={onEnterSelectMode}
            className={`text-xs px-3 py-2 rounded-lg border ${theme.cardBorder} ${theme.subtext} hover:text-white transition-colors`}
          >
            Select
          </button>
        ) : (
          <>
            <span className={`text-xs ${theme.subtext}`}>{selectedIds?.size || 0} selected</span>
            <button
              onClick={onConfirmBulkDelete}
              disabled={!selectedIds || selectedIds.size === 0}
              className="text-xs px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-40 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={onCancelSelectMode}
              className={`text-xs px-3 py-2 rounded-lg border ${theme.cardBorder} ${theme.subtext} hover:text-white transition-colors`}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
