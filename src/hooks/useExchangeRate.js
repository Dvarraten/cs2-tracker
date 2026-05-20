// Fetches all USD exchange rates on mount. Exposes a selectable display
// currency (persisted to localStorage) so all price pairs across the app
// consistently use the same secondary currency.
import { useState, useEffect, useCallback } from 'react';

export const CURRENCIES = [
  { code: 'CNY', symbol: '¥' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'RUB', symbol: '₽' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'PLN', symbol: 'zł' },
  { code: 'TRY', symbol: '₺' },
  { code: 'KRW', symbol: '₩' },
  { code: 'JPY', symbol: '¥' },
];

export const useExchangeRate = () => {
  const [displayCurrency, setDisplayCurrencyState] = useState(
    () => localStorage.getItem('skinroi-currency') || 'CNY'
  );
  const [usdAmount, setUsdAmount] = useState('');
  const [localAmount, setLocalAmount] = useState('');
  const [allRates, setAllRates] = useState({});
  const [exchangeRate, setExchangeRate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const setDisplayCurrency = useCallback((code) => {
    setDisplayCurrencyState(code);
    localStorage.setItem('skinroi-currency', code);
  }, []);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(data => {
        setAllRates(data.rates);
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .catch(() => {
        setAllRates({ CNY: 7.15, EUR: 0.92, GBP: 0.79, SEK: 10.5, NOK: 10.8,
          RUB: 90, BRL: 5.0, AUD: 1.55, CAD: 1.37, PLN: 4.0, TRY: 32, KRW: 1340, JPY: 155 });
      });
  }, []);

  useEffect(() => {
    const rate = allRates[displayCurrency];
    if (!rate) return;
    setExchangeRate(rate);
    if (usdAmount && !isNaN(parseFloat(usdAmount))) {
      setLocalAmount((parseFloat(usdAmount) * rate).toFixed(2));
    }
  }, [displayCurrency, allRates]); // eslint-disable-line react-hooks/exhaustive-deps

  const currencySymbol = CURRENCIES.find(c => c.code === displayCurrency)?.symbol || displayCurrency;

  const handleUsdChange = useCallback((value) => {
    setUsdAmount(value);
    setLocalAmount(exchangeRate && value && !isNaN(value)
      ? (parseFloat(value) * exchangeRate).toFixed(2) : '');
  }, [exchangeRate]);

  const handleRmbChange = useCallback((value) => {
    setLocalAmount(value);
    setUsdAmount(exchangeRate && value && !isNaN(value)
      ? (parseFloat(value) / exchangeRate).toFixed(2) : '');
  }, [exchangeRate]);

  return {
    usdAmount, rmbAmount: localAmount,
    setUsdAmount, setRmbAmount: setLocalAmount,
    exchangeRate, lastUpdated,
    displayCurrency, setDisplayCurrency, currencySymbol,
    handleUsdChange, handleRmbChange,
  };
};
