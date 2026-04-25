import React from "react";

export default function TabsAndSearchbar({
    t, setActiveTab, activeTab, stats, searchTerm, setSearchTerm, sortBy, setSortBy
}) {
    return (
        <div className="mb-6">
          <div className="flex gap-3 mb-4 flex-wrap">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'active' ? t.tabActive : t.tabInactive
              }`}
            >
              Active Items ({stats.totalActive})
            </button>
            <button
              onClick={() => setActiveTab('sold')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'sold' ? t.tabActive : t.tabInactive
              }`}
            >
              Sold Items ({stats.totalSold})
            </button>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className={`flex-1 min-w-[250px] ${t.input} rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none transition-colors border`}
            />
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`${t.input} rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors border`}
            >
              <option value="newest" className="bg-slate-900">Newest First</option>
              <option value="oldest" className="bg-slate-900">Oldest First</option>
              <option value="price-high" className="bg-slate-900">Price: High to Low</option>
              <option value="price-low" className="bg-slate-900">Price: Low to High</option>
              {activeTab === 'sold' && (
                <>
                  <option value="profit-high" className="bg-slate-900">Profit %: High to Low</option>
                  <option value="profit-low" className="bg-slate-900">Profit %: Low to High</option>
                </>
              )}
            </select>
          </div>
        </div>
    );
}