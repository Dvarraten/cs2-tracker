import { useState, useEffect } from 'react';
import { getPlatformFee } from '../utils/platformFees';

export const useItems = () => {
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

  const handleSellItem = (id, platform) => {
    const salePrice = parseFloat(sellData[id]);
    if (!salePrice || salePrice <= 0) return;

    const fee = getPlatformFee(platform);

    setItems(items.map(item => {
      if (item.id === id) {
        const netSalePrice = salePrice * (1 - fee);
        const profit = netSalePrice - item.purchasePrice;
        const profitPercent = (profit / item.purchasePrice) * 100;

        return {
          ...item,
          sold: true,
          salePrice,
          soldPlatform: platform,
          profit,
          profitPercent,
          dateSold: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    }));

    setSellData({ ...sellData, [id]: '' });
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // ── Direct (non-form) helpers used by the Steam-sync "Handle Items" modal.
  // These bypass the controlled formData / sellData state so we can drive
  // them imperatively from outside the form components.
  const addItemDirect = ({ itemName, purchasePrice, platform = 'csfloat', notes = '' }) => {
    if (!itemName || !purchasePrice) return null;
    const newItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      itemName,
      purchasePrice: parseFloat(purchasePrice),
      notes,
      datePurchased: new Date().toISOString().split('T')[0],
      sold: false,
      salePrice: null,
      platform,
      profit: null,
      profitPercent: null,
    };
    setItems(prev => [newItem, ...prev]);
    return newItem.id;
  };

  const sellItemDirect = (id, salePrice, platform = 'csfloat') => {
    const price = parseFloat(salePrice);
    if (!price || price <= 0) return false;
    const fee = getPlatformFee(platform);
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const netSalePrice = price * (1 - fee);
      const profit = netSalePrice - item.purchasePrice;
      const profitPercent = (profit / item.purchasePrice) * 100;
      return {
        ...item,
        sold: true,
        salePrice: price,
        soldPlatform: platform,
        profit,
        profitPercent,
        dateSold: new Date().toISOString().split('T')[0],
      };
    }));
    return true;
  };

  return {
    items,
    formData,
    setFormData,
    sellData,
    setSellData,
    sellPlatform,
    setSellPlatform,
    handleAddItem,
    handleSellItem,
    handleDeleteItem,
    addItemDirect,
    sellItemDirect,
  };
};