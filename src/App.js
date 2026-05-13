import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, BarChart3, Download } from 'lucide-react';
import { themes } from './themes/themes';
import './index.css';

import { useAuth } from './hooks/useAuth';
import { useItems } from './hooks/useItems';
import { useExchangeRate } from './hooks/useExchangeRate';
import { useChartData } from './hooks/useChartData';
import { useSteamSync } from './hooks/useSteamSync';
import { exportToCSV } from './utils/exportCSV';

import StatsCards from './components/StatsCards';
import ItemGrid from './components/ItemGrid';
import AddItemForm from './components/AddItemForm';
import RecentSales from './components/RecentSales';
import ProfitChart from './components/ProfitChart';
import CurrencyConverter from './components/Sidebar/CurrencyConverter';
import QuickLinks from './components/Sidebar/QuickLinks';
import ThemePicker from './components/ThemePicker';
import TabsAndSearchbar from './components/TabsAndSearchbar';
import Header from './components/Header';
import HandleItemsModal from './components/HandleItemsModal';

export default function CS2TradingTracker() {
  const { user, loading: authLoading, login, logout } = useAuth();

  const {
    items, formData, setFormData, sellData, setSellData,
    sellPlatform, setSellPlatform, handleAddItem, handleSellItem, handleDeleteItem,
    addItemDirect, sellItemDirect, promotePendingItem, handleBulkDelete,
  } = useItems(user?.steamId);

  const steamSync = useSteamSync();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const scrollToHandleItems = () => {
    const el = document.getElementById('section-handle');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const {
    usdAmount, setUsdAmount, rmbAmount, setRmbAmount,
    exchangeRate, lastUpdated, handleUsdChange, handleRmbChange
  } = useExchangeRate();

  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('30d');
  const [theme, setTheme] = useState(() => localStorage.getItem('cs2-theme') || 'default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);

  const themeStyles = themes[theme];
  const { weeklyProfit, monthlyProfit, profitChartData } = useChartData(items, chartPeriod);

  useEffect(() => { localStorage.setItem('cs2-theme', theme); }, [theme]);

  useEffect(() => {
    if (
      activeTab === 'active' &&
      (sortBy === 'profit-high' ||
        sortBy === 'profit-low' ||
        sortBy === 'profit-dollar-high' ||
        sortBy === 'profit-dollar-low')
    ) {
      setSortBy('newest');
    }
  }, [activeTab, sortBy]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showAnalytics ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAnalytics]);

  const stats = {
    totalActive: items.filter(i => !i.sold && !i.pending).length,
    totalPending: items.filter(i => !i.sold && i.pending).length,
    totalSold: items.filter(i => i.sold).length,
    totalProfit: items.filter(i => i.sold).reduce((sum, i) => sum + i.profit, 0),
    totalInvested: items.filter(i => !i.sold && !i.pending).reduce((sum, i) => sum + i.purchasePrice, 0),
  };

  const filteredItems = items.filter(item => {
    const matchesTab =
      activeTab === 'active' ? (!item.sold && !item.pending)
      : activeTab === 'pending' ? (!item.sold && !!item.pending)
      : item.sold;
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // For the Sold tab, "newest"/"oldest" means most recently *sold* (not bought).
  const soldTime = (it) =>
    it.soldAt ?? (it.dateSold ? new Date(it.dateSold).getTime() : 0);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'newest') {
      return activeTab === 'sold'
        ? soldTime(b) - soldTime(a) || (b.id - a.id)
        : b.id - a.id;
    }
    if (sortBy === 'oldest') {
      return activeTab === 'sold'
        ? soldTime(a) - soldTime(b) || (a.id - b.id)
        : a.id - b.id;
    }
    if (sortBy === 'price-high') return b.purchasePrice - a.purchasePrice;
    if (sortBy === 'price-low') return a.purchasePrice - b.purchasePrice;
    if (sortBy === 'profit-high') return (b.profitPercent ?? -Infinity) - (a.profitPercent ?? -Infinity);
    if (sortBy === 'profit-low') return (a.profitPercent ?? Infinity) - (b.profitPercent ?? Infinity);
    if (sortBy === 'profit-dollar-high') return (b.profit ?? -Infinity) - (a.profit ?? -Infinity);
    if (sortBy === 'profit-dollar-low') return (a.profit ?? Infinity) - (b.profit ?? Infinity);
    if (sortBy === 'delivery-soon') return (a.expectedDelivery ?? Infinity) - (b.expectedDelivery ?? Infinity);
    if (sortBy === 'delivery-late') return (b.expectedDelivery ?? -Infinity) - (a.expectedDelivery ?? -Infinity);
    return 0;
  });

  // Selection helpers (used by bulk-delete toolbar)
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelectMode = () => {
    setSelectMode(false);
    clearSelection();
  };
  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) return;
    handleBulkDelete([...selectedIds]);
    exitSelectMode();
  };

  return (
    <div
      className="min-h-screen"
      onClick={() => showThemePicker && setShowThemePicker(false)}
    >
      <div className={`fixed inset-0 -z-10 pointer-events-none ${themeStyles.bg}`} />

      {/* Analytics modal */}
      {showAnalytics && (
        <ProfitChart
          profitChartData={profitChartData}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          weeklyProfit={weeklyProfit}
          monthlyProfit={monthlyProfit}
          theme={themeStyles}
          items={items}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Handle Items lives inline next to AddItemForm now (see below).
          The modal mode is no longer mounted at the page root — header
          button just scrolls to the inline panel. */}

      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        theme={themeStyles}
        onAnalyticsClick={() => setShowAnalytics(true)}
        onHandleItemsClick={scrollToHandleItems}
        pendingCount={steamSync.pendingCount}
        user={user}
        onLogin={login}
        onLogout={logout}
      >
        <div onClick={e => e.stopPropagation()}>
          <ThemePicker
            themeStyles={themeStyles}
            setShowThemePicker={setShowThemePicker}
            showThemePicker={showThemePicker}
            setTheme={setTheme}
            theme={theme}
            themes={themes}
          />
        </div>
      </Header>

      <div className="max-w-[1800px] mx-auto p-6">
        <div className="mb-6">
          <StatsCards stats={stats} theme={themeStyles} />
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-8">
          {/* Left Sidebar */}
          <div className="space-y-2">
            <CurrencyConverter
              usdAmount={usdAmount} setUsdAmount={setUsdAmount}
              rmbAmount={rmbAmount} setRmbAmount={setRmbAmount}
              exchangeRate={exchangeRate} lastUpdated={lastUpdated}
              handleUsdChange={handleUsdChange} handleRmbChange={handleRmbChange}
              theme={themeStyles}
            />
            <RecentSales items={items} theme={themeStyles} />
            <QuickLinks
              theme={themeStyles}
              setShowQuickLinks={setShowQuickLinks}
              showQuickLinks={showQuickLinks}
            />
            <div className="space-y-2">
              <button
                onClick={() => setShowAnalytics(true)}
                className={`w-full ${themeStyles.card} hover:bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${themeStyles.cardBorder} text-white transition-all flex items-center gap-3`}
              >
                <BarChart3 size={18} />
                <span className="text-sm">Show Analytics</span>
              </button>
              <button
                onClick={() => exportToCSV(items)}
                className={`w-full ${themeStyles.card} hover:bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${themeStyles.cardBorder} text-white transition-all flex items-center gap-3`}
              >
                <Download size={18} />
                <span className="text-sm">Export to CSV</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-2">
            <div id="section-add" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AddItemForm
                formData={formData} setFormData={setFormData}
                handleAddItem={handleAddItem} theme={themeStyles}
              />
              {/* On lg+, AddItemForm dictates the row height — HandleItems
                  is absolutely positioned inside its cell so its content
                  can grow without pushing the row taller. Internal body
                  scrolls instead. On smaller screens the grid collapses
                  to a single column and HandleItems renders normally. */}
              <div className="relative lg:min-h-0">
                <div className="lg:absolute lg:inset-0">
                  <HandleItemsModal
                    embedded
                    open
                    onClose={() => {}}
                    theme={themeStyles}
                    items={items}
                    addItemDirect={addItemDirect}
                    sellItemDirect={sellItemDirect}
                    promotePendingItem={promotePendingItem}
                    exchangeRate={exchangeRate}
                    {...steamSync}
                    onSync={steamSync.sync}
                    onDismiss={steamSync.dismiss}
                  />
                </div>
              </div>
            </div>

            <div id="section-items" />
            <TabsAndSearchbar
              theme={themeStyles}
              setActiveTab={setActiveTab} activeTab={activeTab}
              stats={stats}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              sortBy={sortBy} setSortBy={setSortBy}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onEnterSelectMode={() => setSelectMode(true)}
              onCancelSelectMode={exitSelectMode}
              onConfirmBulkDelete={confirmBulkDelete}
            />

            <ItemGrid
              sellPlatform={sellPlatform} setSellData={setSellData}
              sellData={sellData} setSellPlatform={setSellPlatform}
              handleSellItem={handleSellItem} handleDeleteItem={handleDeleteItem}
              promotePendingItem={promotePendingItem}
              theme={themeStyles} items={items} sortedItems={sortedItems}
              searchTerm={searchTerm} activeTab={activeTab}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              TrendingUp={TrendingUp} Trash2={Trash2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}