import React from "react";

export default function ItemGrid ({
  sellPlatform, setSellData, sellData, setSellPlatform,
  handleSellItem, handleDeleteItem,
  t, items, sortedItems, searchTerm, 
  activeTab, TrendingUp, Trash2
  }) {
    return (
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
    );
}