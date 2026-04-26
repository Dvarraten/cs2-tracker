import { useState, useEffect } from 'react';

export const useExchangeRate = () => {
  const [usdAmount, setUsdAmount] = useState('');
  const [rmbAmount, setRmbAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  return {
    usdAmount,
    setUsdAmount,
    rmbAmount,
    setRmbAmount,
    exchangeRate,
    lastUpdated,
    handleUsdChange,
    handleRmbChange
  };
};