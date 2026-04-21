import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, Package, Link as LinkIcon, Gem, Target, DollarSign, BarChart3, MessageSquare, Calendar, TrendingDown, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { themes } from './themes/themes';
import './index.css'
import StatsCards from './components/StatsCards';
import AddItemForm from './components/AddItemForm';
import RecentSales from './components/RecentSales';

export default function CS2TradingTracker() {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    purchasePrice: '',
    notes: '',
    platform: 'csfloat',
    quantity: 1
  });
  const [sellData, setSellData] = useState({});
  const [sellPlatform, setSellPlatform] = useState({});
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [usdAmount, setUsdAmount] = useState('');
  const [rmbAmount, setRmbAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('30d');
  const [theme, setTheme] = useState(() => localStorage.getItem('cs2-theme') || 'default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);

  const t = themes[theme];

  useEffect(() => {
    localStorage.setItem('cs2-theme', theme);
  }, [theme]);

  // Reset sort to newest when switching to active tab if profit sort is selected
  useEffect(() => {
    if (activeTab === 'active' && (sortBy === 'profit-high' || sortBy === 'profit-low')) {
      setSortBy('newest');
    }
  }, [activeTab, sortBy]);

  // Load items from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cs2-trading-items');
      const backup = sessionStorage.getItem('cs2-trading-backup');
      
      if (saved) {
        const parsed = JSON.parse(saved);
        setItems(parsed);
        console.log('Data loaded from localStorage:', parsed.length, 'items');
      } else if (backup) {
        const parsed = JSON.parse(backup);
        setItems(parsed);
        console.log('Data recovered from session backup:', parsed.length, 'items');
      } else {
        console.log('No saved data found - starting fresh');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setIsLoaded(true);
  }, []);

  // Fetch exchange rate on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        const rate = data.rates.CNY;
        setExchangeRate(rate);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        setExchangeRate(7.15);
      }
    };
    
    fetchExchangeRate();
  }, []);

  // Save items to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem('cs2-trading-items', JSON.stringify(items));
      console.log('Data saved to localStorage:', items.length, 'items');
      
      sessionStorage.setItem('cs2-trading-backup', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save data:', error);
      alert('Warning: Unable to save data. Your browser may be blocking localStorage.');
    }
  }, [items, isLoaded]);

  const handleAddItem = () => {
    if (!formData.itemName || !formData.purchasePrice) return;

    const purchaseDate = new Date();
    const quantity = Math.max(1, parseInt(formData.quantity) || 1);
    
    const newItems = Array.from({ length: quantity }, (_, i) => ({
      id: Date.now() + i,
      itemName: formData.itemName,
      purchasePrice: parseFloat(formData.purchasePrice),
      notes: formData.notes,
      datePurchased: purchaseDate.toISOString().split('T')[0],
      sold: false,
      salePrice: null,
      platform: formData.platform,
      profit: null,
      profitPercent: null
    }));
    
    setItems([...newItems, ...items]);
    setFormData({ itemName: '', purchasePrice: '', notes: '', platform: 'csfloat', quantity: 1 });
  };
  

  const handleSellItem = (id, sellPlatform) => {
    const salePrice = parseFloat(sellData[id]);
    if (!salePrice || salePrice <= 0) return;

    setItems(items.map(item => {
      if (item.id === id) {
        // Fee structure for different platforms
        let fee;
        switch(sellPlatform) {
          case 'csfloat':
            fee = 0.02;
            break;
          case 'csmoney':
          case 'gamerpay':
          case 'skinswap':
          case 'dmarket':
          case 'tradeit':
            fee = 0.05;
            break;
          case 'facebook':
            fee = 0;
            break;
          case 'youpin':
            fee = 0.005;
            break;
          default:
            fee = 0.005;
        }
        
        const netSalePrice = salePrice * (1 - fee);
        const profit = netSalePrice - item.purchasePrice;
        const profitPercent = (profit / item.purchasePrice) * 100;
        
        return {
          ...item,
          sold: true,
          salePrice: salePrice,
          soldPlatform: sellPlatform,
          profit: profit,
          profitPercent: profitPercent,
          dateSold: new Date().toISOString().split('T')[0] // Add sale date
        };
      }
      return item;
    }));
    
    setSellData({ ...sellData, [id]: '' });
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const exportToCSV = () => {
    // CSV Headers
    const headers = [
      'Skin Name',
      'Purchase Date',
      'Website Bought On',
      'Purchase Price',
      'Sold Date',
      'Website Sold On',
      'Sold Price',
      'Profit $',
      'Profit %'
    ];

    // Function to format number with comma as decimal separator (European format)
    const formatNumber = (num) => {
      if (num === null || num === undefined || num === '') return '';
      return num.toFixed(2).replace('.', ',');
    };

    // Function to properly escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const stringValue = String(value);
      
      // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Convert items to CSV rows
    const rows = items.map(item => [
      escapeCSV(item.itemName),
      escapeCSV(item.datePurchased),
      escapeCSV(item.platform || ''),
      formatNumber(item.purchasePrice),
      escapeCSV(item.dateSold || ''),
      escapeCSV(item.soldPlatform || ''),
      item.salePrice ? formatNumber(item.salePrice) : '',
      item.profit !== null ? formatNumber(item.profit) : '',
      item.profitPercent !== null ? formatNumber(item.profitPercent) : ''
    ]);

    // Use semicolon as separator (European CSV standard)
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `cs2-trading-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUsdChange = (value) => {
    setUsdAmount(value);
    if (exchangeRate && value && !isNaN(value)) {
      const rmb = (parseFloat(value) * exchangeRate).toFixed(2);
      setRmbAmount(rmb);
    } else if (!value) {
      setRmbAmount('');
    }
  };

  const handleRmbChange = (value) => {
    setRmbAmount(value);
    if (exchangeRate && value && !isNaN(value)) {
      const usd = (parseFloat(value) / exchangeRate).toFixed(2);
      setUsdAmount(usd);
    } else if (!value) {
      setUsdAmount('');
    }
  };

  const stats = {
    totalActive: items.filter(i => !i.sold).length,
    totalSold: items.filter(i => i.sold).length,
    totalProfit: items.filter(i => i.sold).reduce((sum, i) => sum + i.profit, 0),
    totalInvested: items.filter(i => !i.sold).reduce((sum, i) => sum + i.purchasePrice, 0)
  };

  // Calculate weekly and monthly profit
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const soldItems = items.filter(i => i.sold);
  
  const weeklyProfit = soldItems
    .filter(i => {
      const saleDate = i.dateSold ? new Date(i.dateSold) : new Date(i.datePurchased);
      return saleDate >= oneWeekAgo;
    })
    .reduce((sum, i) => sum + i.profit, 0);
  
  const monthlyProfit = soldItems
    .filter(i => {
      const saleDate = i.dateSold ? new Date(i.dateSold) : new Date(i.datePurchased);
      return saleDate >= oneMonthAgo;
    })
    .reduce((sum, i) => sum + i.profit, 0);

  // Prepare chart data - group by sale date, filtered by selected period
  const chartCutoff = chartPeriod === '7d'
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : chartPeriod === '30d'
    ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    : null;

  const chartData = soldItems
    .filter(item => {
      if (!chartCutoff) return true;
      const d = item.dateSold ? new Date(item.dateSold) : new Date(item.datePurchased);
      return d >= chartCutoff;
    })
    .reduce((acc, item) => {
      const date = item.dateSold || item.datePurchased;
      if (!acc[date]) {
        acc[date] = { date, profit: 0, count: 0 };
      }
      acc[date].profit += item.profit;
      acc[date].count += 1;
      return acc;
    }, {});

  const profitChartData = Object.values(chartData)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      profit: parseFloat(item.profit.toFixed(2)),
      count: item.count
    }));

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'active' ? !item.sold : item.sold;
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.id - a.id;
    } else if (sortBy === 'oldest') {
      return a.id - b.id;
    } else if (sortBy === 'price-high') {
      return b.purchasePrice - a.purchasePrice;
    } else if (sortBy === 'price-low') {
      return a.purchasePrice - b.purchasePrice;
    } else if (sortBy === 'profit-high') {
      // Sort by profit percentage, handling null values
      const aProfitPercent = a.profitPercent ?? -Infinity;
      const bProfitPercent = b.profitPercent ?? -Infinity;
      return bProfitPercent - aProfitPercent;
    } else if (sortBy === 'profit-low') {
      // Sort by profit percentage, handling null values
      const aProfitPercent = a.profitPercent ?? Infinity;
      const bProfitPercent = b.profitPercent ?? Infinity;
      return aProfitPercent - bProfitPercent;
    }
    return 0;
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg} p-6`} onClick={() => showThemePicker && setShowThemePicker(false)}>
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8 relative">
          <h1 className="text-5xl font-bold text-white mb-2 text-center tracking-tight">CS2 Trading Tracker</h1>
          <p className={`text-base ${t.subtext} text-center`}>Made by Dvichen</p>

          {/* Theme Picker */}
          <div className="absolute top-0 right-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowThemePicker(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t.cardBorder} ${t.card} backdrop-blur-sm text-white text-sm hover:border-white/20 transition-all`}
            >
              <span className={`w-3 h-3 rounded-full ${t.dot}`} />
              <span className="hidden sm:inline">{t.name}</span>
              <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showThemePicker && (
              <div className={`absolute right-0 mt-2 w-52 ${t.panel} border ${t.panelBorder} rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm`}>
                <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest ${t.subtext} border-b ${t.panelBorder}`}>
                  Choose Theme
                </div>
                {Object.entries(themes).map(([key, th]) => (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setShowThemePicker(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-all ${
                      theme === key
                        ? "text-white bg-white/10"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${th.dot}`} />
                    <span>{th.name}</span>
                    {theme === key && (
                      <svg className="w-4 h-4 ml-auto text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <StatsCards stats={stats} />

        {/* Profit Chart & Summary - Collapsible */}
        {showAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Profit Chart - Takes 2 columns */}
            <div className={`lg:col-span-2 ${t.card} backdrop-blur-sm rounded-xl p-6 border ${t.cardBorder}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Profit Over Time</h3>
                <div className={`flex gap-1 p-1 rounded-lg ${t.card} border ${t.cardBorder}`}>
                  {[['7d', '7 Days'], ['30d', '30 Days'], ['all', 'All Time']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setChartPeriod(val)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        chartPeriod === val
                          ? t.tabActive
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {profitChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={profitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                    <XAxis 
                      dataKey="date" 
                      stroke={t.chartAxis}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke={t.chartAxis}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: t.chartTooltipBg, 
                        border: `1px solid ${t.chartTooltipBorder}`,
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => [`$${value}`, 'Profit']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke={t.chartLine} 
                      strokeWidth={2}
                      dot={{ fill: t.chartLine, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No sales data yet</p>
                    <p className="text-sm mt-1">Sell your first item to see the chart</p>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly/Monthly Summary - Takes 1 column */}
            <div className="space-y-4">
              <div className={`${t.card} backdrop-blur-sm rounded-xl p-6 border ${t.cardBorder}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={20} className="text-blue-400" />
                  <h3 className="text-base font-semibold text-white">Weekly Summary</h3>
                </div>
                <div className={`text-3xl font-bold mb-2 ${weeklyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${weeklyProfit.toFixed(2)}
                </div>
                <p className="text-sm text-slate-400">Last 7 days</p>
                {weeklyProfit >= 0 ? (
                  <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                    <TrendingUp size={16} />
                    <span>Profitable week</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
                    <TrendingDown size={16} />
                    <span>Loss this week</span>
                  </div>
                )}
              </div>

              <div className={`${t.card} backdrop-blur-sm rounded-xl p-6 border ${t.cardBorder}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={20} className="text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Monthly Summary</h3>
                </div>
                <div className={`text-3xl font-bold mb-2 ${monthlyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${monthlyProfit.toFixed(2)}
                </div>
                <p className="text-sm text-slate-400">Last 30 days</p>
                {monthlyProfit >= 0 ? (
                  <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                    <TrendingUp size={16} />
                    <span>Profitable month</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-red-400 text-sm">
                    <TrendingDown size={16} />
                    <span>Loss this month</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Layout with Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar - Currency Converter & Quick Links */}
          <div className="space-y-6">
            {/* Currency Converter - Now on top */}
            <div className={`${t.card} backdrop-blur-sm rounded-xl p-5 border ${t.cardBorder}`}>
              <h3 className="text-base font-semibold text-slate-200 mb-12">USD ⇄ RMB</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">USD</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={usdAmount}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">RMB (CNY)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rmbAmount}
                    onChange={(e) => handleRmbChange(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="715.50"
                  />
                </div>
              </div>
              {exchangeRate && (
                <div className={`mt-3 pt-3 border-t ${t.cardBorder}`}>
                  <p className="text-slate-400 text-xs">
                    Rate: 1 USD = {exchangeRate.toFixed(4)} CNY
                  </p>
                  {lastUpdated && (
                    <p className="text-slate-500 text-xs mt-1">
                      Updated: {lastUpdated}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Quick Links Sidebar - Now below, taller to match form height */}
            <div className={`${t.card} backdrop-blur-sm rounded-xl border ${t.cardBorder} overflow-hidden`}>
              <button
                onClick={() => setShowQuickLinks(p => !p)}
                className="w-full flex items-center justify-between px-5 py-4 text-white hover:bg-white/5 transition-colors"
              >
                <span className="text-base font-semibold flex items-center gap-2">
                  <LinkIcon size={18} />
                  Quick Links
                </span>
                <svg
                  className={`w-4 h-4 text-white/50 transition-transform duration-200 ${showQuickLinks ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showQuickLinks && (
                <div className={`px-5 pb-5 space-y-2 border-t ${t.cardBorder}`} style={{paddingTop: '12px'}}>
                  <a 
                    href="https://steamcommunity.com/id/dvichen/inventory" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${t.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
                  >
                    <Package size={18} />
                    <span>Inventory</span>
                  </a>
                  <a 
                    href="https://steamcommunity.com/tradeoffer/new/?partner=173276083&token=pnIzDPno" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${t.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
                  >
                    <LinkIcon size={18} />
                    <span>Trade Link</span>
                  </a>
                  <a 
                    href="https://csfloat.com/stall/76561198133541811" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-900/30 hover:bg-blue-800/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/50 text-sm text-blue-200 hover:text-white transition-all hover:border-blue-600 flex items-center gap-3 w-full"
                  >
                    <Gem size={18} />
                    <span>CSFloat</span>
                  </a>
                  <a 
                    href="https://gamerpay.gg/sell" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-900/30 hover:bg-blue-800/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/50 text-sm text-blue-200 hover:text-white transition-all hover:border-blue-600 flex items-center gap-3 w-full"
                  >
                    <Target size={18} />
                    <span>GamerPay</span>
                  </a>
                  <a 
                    href="https://cs.money/market/sell" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-900/30 hover:bg-blue-800/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/50 text-sm text-blue-200 hover:text-white transition-all hover:border-blue-600 flex items-center gap-3 w-full"
                  >
                    <DollarSign size={18} />
                    <span>CS.MONEY</span>
                  </a>
                  <a 
                    href="https://pricempire.com/app/comparison?min_price=10&max_price=9000&blacklist=case,capsule,sticker,&from_provider=csfloat&to_provider=youpin&volume=0&min_roi=5&max_roi=100&liquidity=70&price_age=10" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${t.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
                  >
                    <BarChart3 size={18} />
                    <span>Pricempire</span>
                  </a>
                  <a
                    href="https://steamcommunity.com/id/dvichen/posthistory/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${t.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
                  >
                    <MessageSquare size={18} />
                    <span>Trading Forum</span>
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-6">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`w-full ${t.card} hover:bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border ${t.cardBorder} text-white transition-all flex items-center gap-3`}
              >
                <BarChart3 size={18} />
                <span className="text-sm">{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
              </button>
              
              <button
                onClick={exportToCSV}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all"
              >
                <Download size={18} />
                <span className="text-sm font-medium">Export to CSV</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              <AddItemForm
                formData={formData}
                setFormData={setFormData}
                handleAddItem={handleAddItem}
                t={t}
              />
              <RecentSales
                items={items}
                t={t}
              />
            </div>

        {/* Tabs and Search */}
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

        {/* Items List - Compact View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map(item => (
            <div key={item.id} className={`${t.panel} backdrop-blur-sm rounded-xl p-4 border ${t.cardBorder} hover:border-white/20 transition-all`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-base font-semibold text-white flex-1 pr-2">{item.itemName}</h3>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-400 hover:text-red-300 p-1 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="text-sm text-slate-400 space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="text-white font-semibold">${item.purchasePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bought:</span>
                  <span className="text-slate-300">{item.datePurchased}</span>
                </div>
                {item.platform && (
                  <div className="flex justify-between">
                    <span>Platform:</span>
                    <span className="text-blue-300 text-xs uppercase">{item.platform}</span>
                  </div>
                )}
              </div>
              
              {item.notes && (
                <p className="text-amber-300 text-xs mb-3 line-clamp-2">Notes: {item.notes}</p>
              )}

              {!item.sold ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.01"
                    value={sellData[item.id] || ''}
                    onChange={(e) => setSellData({ ...sellData, [item.id]: e.target.value })}
                    className={`w-full ${t.inputSell} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border`}
                    placeholder="Sale price..."
                  />
                  <div className="flex gap-2">
                    <select
                      value={sellPlatform[item.id] || 'csfloat'}
                      onChange={(e) => setSellPlatform({ ...sellPlatform, [item.id]: e.target.value })}
                      className={`flex-1 ${t.inputSell} rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors border`}
                    >
                      <option value="csfloat" className="bg-slate-900">CSFloat (2%)</option>
                      <option value="csmoney" className="bg-slate-900">CS.MONEY (5%)</option>
                      <option value="gamerpay" className="bg-slate-900">GamerPay (5%)</option>
                      <option value="skinswap" className="bg-slate-900">SkinSwap (5%)</option>
                      <option value="dmarket" className="bg-slate-900">DMarket (5%)</option>
                      <option value="tradeit" className="bg-slate-900">Tradeit (5%)</option>
                      <option value="facebook" className="bg-slate-900">Facebook (0%)</option>
                      <option value="youpin" className="bg-slate-900">Youpin (0.5%)</option>
                    </select>
                    <button
                      onClick={() => handleSellItem(item.id, sellPlatform[item.id] || 'csfloat')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap font-medium"
                    >
                      Sell
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`${t.soldCard} rounded-lg p-3 border`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className={item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                    <span className="text-white font-semibold text-sm">SOLD</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sale:</span>
                      <span className="text-white font-semibold">${item.salePrice.toFixed(2)}</span>
                    </div>
                    {item.soldPlatform && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sold on:</span>
                        <span className="text-blue-300 uppercase">{item.soldPlatform}</span>
                      </div>
                    )}
                    {item.dateSold && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sold date:</span>
                        <span className="text-slate-300">{item.dateSold}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">After fees:</span>
                      <span className="text-white font-semibold">
                        ${(() => {
                          let fee;
                          switch(item.soldPlatform) {
                            case 'csfloat': fee = 0.02; break;
                            case 'csmoney':
                            case 'gamerpay':
                            case 'skinswap':
                            case 'dmarket':
                            case 'tradeit':
                              fee = 0.05; break;
                            case 'facebook': fee = 0; break;
                            case 'youpin': fee = 0.005; break;
                            default: fee = 0.005;
                          }
                          return (item.salePrice * (1 - fee)).toFixed(2);
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Profit:</span>
                      <span className={`font-semibold ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${item.profit.toFixed(2)} ({item.profitPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {sortedItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <p className="text-lg">
                {searchTerm 
                  ? 'No items match your search.'
                  : activeTab === 'active'
                  ? 'No active items. Add your first purchase!'
                  : 'No sold items yet.'}
              </p>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}