import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, BarChart3, Download } from 'lucide-react';
import { themes } from './themes/themes';
import './index.css';

import { useItems } from './hooks/useItems';
import { useExchangeRate } from './hooks/useExchangeRate';
import { useChartData } from './hooks/useChartData';
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

export default function CS2TradingTracker() {
  const {
    items, formData, setFormData, sellData, setSellData,
    sellPlatform, setSellPlatform, handleAddItem, handleSellItem, handleDeleteItem
  } = useItems();

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
    if (activeTab === 'active' && (sortBy === 'profit-high' || sortBy === 'profit-low')) {
      setSortBy('newest');
    }
  }, [activeTab, sortBy]);

  const stats = {
    totalActive: items.filter(i => !i.sold).length,
    totalSold: items.filter(i => i.sold).length,
    totalProfit: items.filter(i => i.sold).reduce((sum, i) => sum + i.profit, 0),
    totalInvested: items.filter(i => !i.sold).reduce((sum, i) => sum + i.purchasePrice, 0)
  };

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'active' ? !item.sold : item.sold;
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'newest') return b.id - a.id;
    if (sortBy === 'oldest') return a.id - b.id;
    if (sortBy === 'price-high') return b.purchasePrice - a.purchasePrice;
    if (sortBy === 'price-low') return a.purchasePrice - b.purchasePrice;
    if (sortBy === 'profit-high') return (b.profitPercent ?? -Infinity) - (a.profitPercent ?? -Infinity);
    if (sortBy === 'profit-low') return (a.profitPercent ?? Infinity) - (b.profitPercent ?? Infinity);
    return 0;
  });

  return (
    <div
      className="min-h-screen"
      onClick={() => showThemePicker && setShowThemePicker(false)}
    >
      <div className={`fixed inset-0 -z-10 pointer-events-none ${themeStyles.bg}`} />

      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} theme={themeStyles}>
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
          <StatsCards stats={stats} />
        </div>

        <div id="section-analytics" />
        {showAnalytics && (
          <ProfitChart
            profitChartData={profitChartData}
            chartPeriod={chartPeriod}
            setChartPeriod={setChartPeriod}
            weeklyProfit={weeklyProfit}
            monthlyProfit={monthlyProfit}
            theme={themeStyles}
          />
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <CurrencyConverter
              usdAmount={usdAmount} setUsdAmount={setUsdAmount}
              rmbAmount={rmbAmount} setRmbAmount={setRmbAmount}
              exchangeRate={exchangeRate} lastUpdated={lastUpdated}
              handleUsdChange={handleUsdChange} handleRmbChange={handleRmbChange}
              theme={themeStyles}
            />
            <QuickLinks
              theme={themeStyles}
              setShowQuickLinks={setShowQuickLinks}
              showQuickLinks={showQuickLinks}
            />
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAnalytics(p => !p);
                  setTimeout(() => document.getElementById('section-analytics')?.scrollIntoView({ behavior: 'smooth' }), 50);
                }}
                className={`w-full ${themeStyles.card} hover:bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${themeStyles.cardBorder} text-white transition-all flex items-center gap-3`}
              >
                <BarChart3 size={18} />
                <span className="text-sm">{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
              </button>
              <button
                onClick={() => exportToCSV(items)}
                className="w-full bg-indigo-600/50 hover:bg-indigo-600/85 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all"
              >
                <Download size={18} />
                <span className="text-sm font-medium">Export to CSV</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <div id="section-add" className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              <AddItemForm
                formData={formData} setFormData={setFormData}
                handleAddItem={handleAddItem} theme={themeStyles}
              />
              <RecentSales items={items} theme={themeStyles} />
            </div>

            <div id="section-items" />
            <TabsAndSearchbar
              theme={themeStyles}
              setActiveTab={setActiveTab} activeTab={activeTab}
              stats={stats}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              sortBy={sortBy} setSortBy={setSortBy}
            />

            <ItemGrid
              sellPlatform={sellPlatform} setSellData={setSellData}
              sellData={sellData} setSellPlatform={setSellPlatform}
              handleSellItem={handleSellItem} handleDeleteItem={handleDeleteItem}
              theme={themeStyles} items={items} sortedItems={sortedItems}
              searchTerm={searchTerm} activeTab={activeTab}
              TrendingUp={TrendingUp} Trash2={Trash2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}