const parseNumber = (str) => {
  if (!str || str.trim() === '') return null;
  return parseFloat(str.replace(',', '.'));
};

export const importFromCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Skip header row
  const rows = lines.slice(1);

  return rows
    .map((line, i) => {
      // Respect quoted fields (fields containing semicolons)
      const cols = [];
      let current = '';
      let inQuotes = false;
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (ch === '"') {
          if (inQuotes && line[ci + 1] === '"') { current += '"'; ci++; }
          else inQuotes = !inQuotes;
        } else if (ch === ';' && !inQuotes) {
          cols.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      cols.push(current);

      const [
        itemName, datePurchased, platform, purchasePriceRaw,
        dateSold, soldPlatform, salePriceRaw, profitRaw, profitPercentRaw,
      ] = cols;

      if (!itemName || !itemName.trim()) return null;

      const purchasePrice = parseNumber(purchasePriceRaw);
      const salePrice = parseNumber(salePriceRaw);
      const profit = parseNumber(profitRaw);
      const profitPercent = parseNumber(profitPercentRaw);
      const isSold = !!(dateSold && dateSold.trim());

      return {
        id: Date.now() + i,
        itemName: itemName.trim(),
        datePurchased: datePurchased ? datePurchased.trim() : new Date().toISOString().split('T')[0],
        platform: platform ? platform.trim() : 'csfloat',
        purchasePrice: purchasePrice ?? 0,
        sold: isSold,
        dateSold: isSold ? dateSold.trim() : null,
        soldPlatform: soldPlatform ? soldPlatform.trim() : null,
        salePrice: salePrice,
        profit: isSold ? profit : null,
        profitPercent: isSold ? profitPercent : null,
        notes: '',
        pending: false,
        expectedDelivery: null,
        iconUrl: null,
      };
    })
    .filter(Boolean);
};
