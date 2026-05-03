import React from "react";

// Tab button with a card-style background and a flush left-edge bar
// (mirrors the colored sidebar on RecentSales rows). Each tab gets its
// own accent colour: active=blue, pending=amber, sold=emerald.
function TabButton({ label, count, isActive, onClick, theme, accentClass, badgeClass }) {
  return (
    <button
      onClick={onClick}
      className={`relative pl-5 pr-5 py-2.5 rounded-lg font-medium transition-all border flex items-center gap-2 overflow-hidden ${
        isActive
          ? `${theme.card} ${theme.cardBorder} text-white`
          : `bg-transparent ${theme.cardBorder} ${theme.subtext} hover:text-white hover:bg-white/5`
      }`}
    >
      {isActive && (
        <span
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${accentClass}`}
        />
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-xs font-semibold rounded-full px-2 py-0.5 ${badgeClass}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function TabsAndSearchbar({
  theme, setActiveTab, activeTab, stats, searchTerm, setSearchTerm, sortBy, setSortBy,
  selectMode, selectedIds, onEnterSelectMode, onCancelSelectMode, onConfirmBulkDelete,
}) {
  return (
    <div className="mb-6">
      <div className="flex gap-3 mb-4 flex-wrap">
        <TabButton
          label="Active Items"
          count={stats.totalActive}
          isActive={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
          theme={theme}
          accentClass="bg-blue-500"
          badgeClass={
            activeTab === 'active' ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'
          }
        />
        <TabButton
          label="Pending"
          count={stats.totalPending}
          isActive={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          theme={theme}
          accentClass="bg-amber-500"
          badgeClass={
            stats.totalPending > 0
              ? 'bg-amber-500/20 text-amber-300'
              : activeTab === 'pending'
              ? 'bg-white/15 text-white'
              : 'bg-white/5 text-slate-400'
          }
        />
        <TabButton
          label="Sold Items"
          count={stats.totalSold}
          isActive={activeTab === 'sold'}
          onClick={() => setActiveTab('sold')}
          theme={theme}
          accentClass="bg-emerald-500"
          badgeClass={
            activeTab === 'sold' ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'
          }
        />
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search items..."
          className={`flex-1 min-w-[250px] ${theme.input} rounded-lg px-4 py-2.5 text-white
            placeholder-slate-400 focus:outline-none transition-colors border`}
        />

        {/* Bulk-select toolbar — inline with search/sort, available on
            every tab (active / pending / sold). */}
        {!selectMode ? (
          <button
            onClick={onEnterSelectMode}
            className={`text-sm px-3 py-2.5 rounded-lg border ${theme.cardBorder} ${theme.card} ${theme.subtext} hover:text-white transition-colors`}
          >
            Select multiple
          </button>
        ) : (
          <>
            <span className={`text-xs ${theme.subtext}`}>
              {selectedIds?.size || 0} selected
            </span>
            <button
              onClick={onConfirmBulkDelete}
              disabled={!selectedIds || selectedIds.size === 0}
              className="text-sm px-3 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Delete selected
            </button>
            <button
              onClick={onCancelSelectMode}
              className={`text-sm px-3 py-2.5 rounded-lg border ${theme.cardBorder} ${theme.card} ${theme.subtext} hover:text-white transition-colors`}
            >
              Cancel
            </button>
          </>
        )}

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={`${theme.input} rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors border`}
        >
          <option value="newest" className="bg-slate-900">Newest First</option>
          <option value="oldest" className="bg-slate-900">Oldest First</option>
          <option value="price-high" className="bg-slate-900">Price: High to Low</option>
          <option value="price-low" className="bg-slate-900">Price: Low to High</option>
          {activeTab === 'pending' && (
            <>
              <option value="delivery-soon" className="bg-slate-900">Delivery: Soonest First</option>
              <option value="delivery-late" className="bg-slate-900">Delivery: Latest First</option>
            </>
          )}
          {activeTab === 'sold' && (
            <>
              <option value="profit-dollar-high" className="bg-slate-900">Profit $: High to Low</option>
              <option value="profit-dollar-low" className="bg-slate-900">Profit $: Low to High</option>
              <option value="profit-high" className="bg-slate-900">Profit %: High to Low</option>
              <option value="profit-low" className="bg-slate-900">Profit %: Low to High</option>
            </>
          )}
        </select>
      </div>
    </div>
  );
}
