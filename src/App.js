import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, BarChart3, X } from 'lucide-react';
import { themes } from './themes/themes';
import './index.css';

import { useAuth } from './hooks/useAuth';
import WelcomeModal from './components/WelcomeModal';
import { useItems } from './hooks/useItems';
import { useExchangeRate } from './hooks/useExchangeRate';
import { useChartData } from './hooks/useChartData';
import { useSteamSync } from './hooks/useSteamSync';
import { exportToCSV } from './utils/exportCSV';
import { importFromCSV } from './utils/importCSV';

import StatsCards from './components/StatsCards';
import ItemGrid from './components/ItemGrid';
import AddItemForm from './components/AddItemForm';
import RecentSales from './components/RecentSales';
import ProfitChart from './components/ProfitChart';
import CurrencyConverter from './components/Sidebar/CurrencyConverter';
import ThemePicker from './components/ThemePicker';
import TabsAndSearchbar from './components/TabsAndSearchbar';
import Header from './components/Header';
import HandleItemsModal from './components/HandleItemsModal';
import AboutModal from './components/AboutModal';

export default function CS2TradingTracker() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [authDismissed, setAuthDismissed] = useState(
    () => !!localStorage.getItem('cs2-auth-dismissed')
  );
  const showWelcome = !authLoading && !user && !authDismissed;

  const {
    items, setItems, formData, setFormData, sellData, setSellData,
    sellPlatform, setSellPlatform, handleAddItem, handleSellItem, handleDeleteItem,
    addItemDirect, sellItemDirect, promotePendingItem, handleBulkDelete,
  } = useItems(user?.steamId);

  const handleImportCSV = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const imported = importFromCSV(e.target.result);
      if (imported.length === 0) return;
      setItems(prev => [...imported, ...prev]);
    };
    reader.readAsText(file);
  };

  const steamSync = useSteamSync();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const {
    usdAmount, rmbAmount,
    exchangeRate, sidebarRate, lastUpdated, handleUsdChange, handleRmbChange,
    currency1, setCurrency1, currency1Symbol,
    displayCurrency, setDisplayCurrency, currencySymbol,
  } = useExchangeRate();

  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [activeModal, setActiveModal] = useState(null); // null | 'analytics' | 'addItem' | 'handleItems' | 'about'
  const [chartPeriod, setChartPeriod] = useState('30d');
  const [theme, setTheme] = useState(() => { const t = localStorage.getItem('cs2-theme'); return t === 'v2' ? 'dark' : (t || 'default'); });
  const [showThemePicker, setShowThemePicker] = useState(false);

  const showAnalytics  = activeModal === 'analytics';
  const showAddItem    = activeModal === 'addItem';
  const showHandleItems = activeModal === 'handleItems';
  const showAbout      = activeModal === 'about';
  const openModal  = (name) => setActiveModal(prev => prev === name ? null : name);
  const closeModal = () => setActiveModal(null);

  const themeStyles = themes[theme];
  const { profitChartData } = useChartData(items, chartPeriod);

  useEffect(() => { localStorage.setItem('cs2-theme', theme); }, [theme]);

  useEffect(() => {
    if (
      activeTab === 'active' &&
      (sortBy === 'profit-high' || sortBy === 'profit-low' ||
        sortBy === 'profit-dollar-high' || sortBy === 'profit-dollar-low')
    ) {
      setSortBy('newest');
    }
  }, [activeTab, sortBy]);

  useEffect(() => {
    document.body.style.overflow = showAnalytics ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAnalytics]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-promote pending items whose trade hold has expired
  useEffect(() => {
    const now = Date.now();
    items
      .filter(i => i.pending && !i.sold && i.expectedDelivery)
      .forEach(i => {
        const ts = typeof i.expectedDelivery === 'string'
          ? new Date(i.expectedDelivery).getTime()
          : i.expectedDelivery;
        if (!isNaN(ts) && ts <= now) promotePendingItem(i.id);
      });
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = {
    totalActive: items.filter(i => !i.sold).reduce((sum, i) => sum + i.purchasePrice, 0),
    totalActiveCount: items.filter(i => !i.sold).length,
    totalPending: items.filter(i => !i.sold && i.pending).length,
    totalSold: items.filter(i => i.sold).reduce((sum, i) => sum + i.purchasePrice + i.profit, 0),
    totalSoldCount: items.filter(i => i.sold).length,
    totalProfit: items.filter(i => i.sold).reduce((sum, i) => sum + i.profit, 0),
    totalInvested: items.reduce((sum, i) => sum + i.purchasePrice, 0),
  };

  const filteredItems = items.filter(item => {
    const matchesTab =
      activeTab === 'active' ? !item.sold
      : activeTab === 'pending' ? (!item.sold && !!item.pending)
      : item.sold;
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const soldTime = (it) =>
    it.soldAt ?? (it.dateSold ? new Date(it.dateSold).getTime() : 0);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'newest') return activeTab === 'sold' ? soldTime(b) - soldTime(a) || (b.id - a.id) : b.id - a.id;
    if (sortBy === 'oldest') return activeTab === 'sold' ? soldTime(a) - soldTime(b) || (a.id - b.id) : a.id - b.id;
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

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelectMode = () => { setSelectMode(false); clearSelection(); };
  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) return;
    handleBulkDelete([...selectedIds]);
    exitSelectMode();
  };

  return (
    <div className="min-h-screen" onClick={() => showThemePicker && setShowThemePicker(false)}>
      <div className={`fixed inset-0 -z-10 pointer-events-none ${themeStyles.bg}`} />

      {showWelcome && (
        <WelcomeModal
          onLogin={login}
          onContinue={() => {
            localStorage.setItem('cs2-auth-dismissed', '1');
            setAuthDismissed(true);
          }}
          theme={themeStyles}
        />
      )}

      {showAnalytics && (
        <ProfitChart
          profitChartData={profitChartData}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          theme={themeStyles}
          items={items}
          onClose={closeModal}
        />
      )}

      <Header
        theme={themeStyles}
        onAnalyticsClick={() => openModal('analytics')}
        onAddItemClick={() => openModal('addItem')}
        onHandleItemsClick={() => openModal('handleItems')}
        onAboutClick={() => openModal('about')}
        showAddItem={showAddItem}
        showHandleItems={showHandleItems}
        pendingCount={steamSync.pendingCount}
        user={user}
        onLogin={login}
        onLogout={logout}
        onExportCSV={() => exportToCSV(items)}
        onImportCSV={handleImportCSV}
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

      <div className="flex gap-6 p-6 items-start">

        {/* Sidebar */}
        <aside className="w-[360px] shrink-0 flex flex-col gap-4 sticky top-[80px] max-h-[calc(100vh-5.5rem)] overflow-y-auto pb-4">

          {/* Overview */}
          <div className={`${themeStyles.panel} border ${themeStyles.panelBorder} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overview</h3>
              <button
                onClick={() => openModal('analytics')}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/8 transition-colors"
                title="View analytics"
              >
                <BarChart3 size={14} />
              </button>
            </div>
            <StatsCards stats={stats} theme={themeStyles} />
          </div>

          {/* Recent Sales */}
          <div className={`${themeStyles.panel} border ${themeStyles.panelBorder} rounded-2xl p-4`}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Sales</h3>
            <RecentSales items={items} theme={themeStyles} />
          </div>

          {/* Currency Converter */}
          <div className={`${themeStyles.panel} border ${themeStyles.panelBorder} rounded-2xl p-4`}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Currency Converter</h3>
            <CurrencyConverter
              usdAmount={usdAmount}
              rmbAmount={rmbAmount}
              sidebarRate={sidebarRate}
              lastUpdated={lastUpdated}
              handleUsdChange={handleUsdChange}
              handleRmbChange={handleRmbChange}
              theme={themeStyles}
              currency1={currency1}
              setCurrency1={setCurrency1}
              currency1Symbol={currency1Symbol}
              displayCurrency={displayCurrency}
              setDisplayCurrency={setDisplayCurrency}
              currencySymbol={currencySymbol}
            />
          </div>

        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">

          <div className={`sticky top-[72px] z-40 ${themeStyles.bg} -mx-1 px-1 pb-2`}>
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
          </div>

          <div className="isolate">
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
              exchangeRate={exchangeRate}
              currencySymbol={currencySymbol}
              displayCurrency={displayCurrency}
            />
          </div>
        </main>
      </div>

      {/* Add Item modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeModal}>
          <div
            className={`relative w-full max-w-xl max-h-[85vh] flex flex-col ${themeStyles.panel} border ${themeStyles.panelBorder} rounded-2xl shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${themeStyles.panelBorder} shrink-0`}>
              <h2 className={`font-semibold ${themeStyles.text}`}>Add New Item</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <AddItemForm
                formData={formData} setFormData={setFormData}
                handleAddItem={handleAddItem} theme={themeStyles}
                exchangeRate={exchangeRate} currencySymbol={currencySymbol} displayCurrency={displayCurrency} bare
              />
            </div>
          </div>
        </div>
      )}

      {showAbout && <AboutModal onClose={closeModal} theme={themeStyles} />}

      {/* Handle Items modal */}
      {showHandleItems && (
        <HandleItemsModal
          open={showHandleItems}
          onClose={closeModal}
          theme={themeStyles}
          items={items}
          addItemDirect={addItemDirect}
          sellItemDirect={sellItemDirect}
          promotePendingItem={promotePendingItem}
          exchangeRate={exchangeRate}
          currencySymbol={currencySymbol}
          displayCurrency={displayCurrency}
          usdAmount={usdAmount}
          rmbAmount={rmbAmount}
          handleUsdChange={handleUsdChange}
          handleRmbChange={handleRmbChange}
          {...steamSync}
          onSync={steamSync.sync}
          onDismiss={steamSync.dismiss}
        />
      )}
    </div>
  );
}
