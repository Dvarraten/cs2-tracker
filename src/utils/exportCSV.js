export const exportToCSV = (items) => {
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

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    return num.toFixed(2).replace('.', ',');
  };

  const escapeCSV = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

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

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

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