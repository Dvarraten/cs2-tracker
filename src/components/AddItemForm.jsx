import React from 'react';

export default function AddItemForm({ formData, setFormData, handleAddItem, t }) {
  return (
    <div className={`${t.panel} backdrop-blur-sm rounded-xl p-6 border ${t.panelBorder}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Add New Item</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-300 mb-2 text-sm font-medium">Item Name</label>
          <input
            type="text"
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            className={`w-full ${t.input} rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none transition-colors border`}
            placeholder="-"
          />
        </div>
        
        <div>
          <label className="block text-slate-300 mb-2 text-sm font-medium">Purchase Price ($)</label>
          <input
            type="number"
            step="1"
            value={formData.purchasePrice}
            onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 transition-colors"
            placeholder="-"
          />
        </div>
        
        <div>
          <label className="block text-slate-300 mb-2 text-sm font-medium">Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormData({ ...formData, quantity: Math.max(1, (parseInt(formData.quantity) || 1) - 1) })}
              className={`${t.card} hover:bg-white/10 text-white w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-colors flex-shrink-0 border ${t.cardBorder}`}
            >−</button>
            <input
              type="number"
              min="1"
              max="999"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-center placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <button
              onClick={() => setFormData({ ...formData, quantity: (parseInt(formData.quantity) || 1) + 1 })}
              className={`${t.card} hover:bg-white/10 text-white w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-colors flex-shrink-0 border ${t.cardBorder}`}
            >+</button>
          </div>
          {formData.quantity > 1 && (
            <p className="text-xs text-indigo-400 mt-1.5">
              Adding {formData.quantity} items · Total: ${formData.purchasePrice ? (parseFloat(formData.purchasePrice) * formData.quantity).toFixed(2) : '0.00'}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-slate-300 mb-2 text-sm font-medium">Platform</label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className={`w-full ${t.input} rounded-lg px-4 py-2 text-white focus:outline-none transition-colors border`}
          >
            <option value="csfloat" className="bg-slate-900">CSFloat</option>
            <option value="csmoney" className="bg-slate-900">CS.MONEY</option>
            <option value="gamerpay" className="bg-slate-900">GamerPay</option>
            <option value="skinswap" className="bg-slate-900">SkinSwap</option>
            <option value="dmarket" className="bg-slate-900">DMarket</option>
            <option value="tradeit" className="bg-slate-900">Tradeit</option>
            <option value="facebook" className="bg-slate-900">Facebook</option>
            <option value="youpin" className="bg-slate-900">Youpin</option>
            <option value="other" className="bg-slate-900">Other</option>
          </select>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-slate-300 mb-2 text-sm font-medium">Notes</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 transition-colors"
            placeholder="-"
          />
        </div>
      </div>
      
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleAddItem}
          className={`${t.accentBg} text-white px-8 py-2 rounded-lg transition-all font-medium`}
        >
          {formData.quantity > 1 ? `Add ${formData.quantity} Items` : 'Add Item'}
        </button>
      </div>
    </div>
  );
}