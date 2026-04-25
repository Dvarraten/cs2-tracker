import React, { useState, useEffect, act } from 'react';
import { Trash2, TrendingUp, Package, Link as LinkIcon,
         Gem, Target, DollarSign, BarChart3, MessageSquare,
         Calendar, TrendingDown, Download, 
         Trash
       } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer
       } from 'recharts';
import { themes } from './themes/themes';
import './index.css'
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
  const simpleItems = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Projects", href: "/projects" },
    { label: "Tasks", href: "/tasks" },
    { label: "Reporting", href: "/reporting" },
    { label: "Users", href: "/users" },
  ];
  const subItems = [
    { label: "Overview", href: "/dashboard/overview" },
    { label: "Notifications", href: "/dashboard/notifications" },
    { label: "Analytics", href: "/dashboard/analytics" },
    { label: "Saved reports", href: "/dashboard/saved-reports" },
    { label: "Scheduled reports", href: "/dashboard/scheduled-reports" },
    { label: "User reports", href: "/dashboard/user-reports" },
  ];


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
          <Header />

          {/* Theme Picker */}
          <ThemePicker
            t={t}
            setShowThemePicker={setShowThemePicker}
            showThemePicker={showThemePicker}
            setTheme={setTheme}
            theme={theme}
            themes={themes}
          />
        </div>

        <StatsCards stats={stats} />
        {showAnalytics && (
          <ProfitChart
            profitChartData={profitChartData}
            chartPeriod={chartPeriod}
            setChartPeriod={setChartPeriod}
            weeklyProfit={weeklyProfit}
            monthlyProfit={monthlyProfit}
            t={t}
          />
        )}
        {/* Main Layout with Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar - Currency Converter & Quick Links */}
          <div className="space-y-6">
            {/* Currency Converter */}
            <CurrencyConverter 
              usdAmount={usdAmount}
              setUsdAmount={setUsdAmount}
              rmbAmount={rmbAmount}
              setRmbAmount={setRmbAmount}
              exchangeRate={exchangeRate}
              lastUpdated={lastUpdated}
              handleUsdChange={handleUsdChange}
              handleRmbChange={handleRmbChange}
              t={t}
            />
            {/* Quick Links Sidebar */}
            <QuickLinks
              t={t}
              setShowQuickLinks={setShowQuickLinks}
              showQuickLinks={showQuickLinks}
              Package={Package} 
              LinkIcon={LinkIcon}
              Gem={Gem}
              Target={Target}
              DollarSign={DollarSign}
              BarChart3={BarChart3}
              MessageSquare={MessageSquare}
            />

            {/* Action Buttons */}
            <div className="space-y-3 mt-6">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={
                  `w-full ${t.card}
                hover:bg-white/20
                  backdrop-blur-sm
                  rounded-lg
                  px-4 py-3
                  border ${t.cardBorder}
                  text-white transition-all 
                  flex items-center
                  gap-3`}
              >
                <BarChart3 size={18} />
                <span className="text-sm">{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
              </button>
              
              <button
                onClick={exportToCSV}
                className="w-full bg-indigo-600/50 hover:bg-indigo-600/85
                text-white px-4 py-3 rounded-lg
                flex items-center gap-3 transition-all"
              >
                <Download size={18} />
                <span className="text-sm font-medium">Export to CSV</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-6 mb-12">
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
        {/* Tabs and Searchbar */}
        <TabsAndSearchbar
          t={t}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          stats={stats}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* Items Grid*/}
        <ItemGrid
          sellPlatform={sellPlatform}
          setSellData={setSellData}
          sellData={sellData}
          setSellPlatform={setSellPlatform}
          handleSellItem={handleSellItem}
          handleDeleteItem={handleDeleteItem}
          t={t}
          items={items}
          sortedItems={sortedItems}
          searchTerm={searchTerm}
          activeTab={activeTab}
          TrendingUp={TrendingUp}
          Trash2={Trash2}
        /> 
          </div>
        </div>
      </div>
    </div>
  );
}