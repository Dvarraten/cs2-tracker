import React, { useState } from "react";
import { CheckCircle } from "lucide-react";
import ItemAutoComplete from "./ItemAutoComplete";
import PasteButton from "./PasteButton";

import csfloatIcon  from "../assets/platforms/csfloat.webp";
import csmoneyIcon  from "../assets/platforms/csmoney.webp";
import gamerpayIcon from "../assets/platforms/gamerpay.webp";
import skinswapIcon from "../assets/platforms/skinswap.webp";
import youpinIcon   from "../assets/platforms/youpin.webp";
import dmarketIcon  from "../assets/platforms/dmarket.webp";

const PLATFORMS = [
  { value: "csfloat",  label: "CSFloat",  icon: csfloatIcon,  fee: "2%" },
  { value: "csmoney",  label: "CS.MONEY", icon: csmoneyIcon,  fee: "5%" },
  { value: "gamerpay", label: "GamerPay", icon: gamerpayIcon, fee: "5%" },
  { value: "skinswap", label: "SkinSwap", icon: skinswapIcon, fee: "5%" },
  { value: "dmarket",  label: "DMarket",  icon: dmarketIcon,  fee: "5%" },
  { value: "youpin",   label: "Youpin",   icon: youpinIcon,   fee: "0.5%" },
  { value: "tradeit",  label: "Tradeit",  icon: null,         fee: "5%" },
  { value: "facebook", label: "Facebook", icon: null,         fee: "0%" },
  { value: "other",    label: "Other",    icon: null,         fee: "?" },
];

export default function AddItemForm({ formData, setFormData, handleAddItem, theme }) {
  const [success, setSuccess] = useState(false);

  const onAdd = () => {
    if (!formData.itemName || !formData.purchasePrice) return;
    handleAddItem();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div id="section-add" className={`${theme.card} ${theme.cardBorder} rounded-xl p-6 border`}>
      <h3 className="text-lg font-semibold text-white mb-4">Add New Item</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Item Name */}
        <div>
          <label className={`block ${theme.subtext} mb-2 text-sm font-medium`}>Item Name</label>
          <ItemAutoComplete
            value={formData.itemName}
            onChange={(val) => setFormData({ ...formData, itemName: val })}
            placeholder="-"
            theme={theme}
          />
        </div>

        {/* Purchase Price */}
        <div>
          <label className={`block ${theme.subtext} mb-2 text-sm font-medium`}>Purchase Price ($)</label>
          <div className="relative">
            <input
              type="number" step="1" value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              className={`w-full ${theme.input} rounded-lg px-4 pr-9 py-2 text-white placeholder-slate-500 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              placeholder="-"
            />
            <PasteButton onPaste={(val) => {
              const num = parseFloat(val);
              if (!isNaN(num)) setFormData({ ...formData, purchasePrice: num });
            }} />
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className={`block ${theme.subtext} mb-2 text-sm font-medium`}>Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormData({ ...formData, quantity: Math.max(1, (parseInt(formData.quantity) || 1) - 1) })}
              className={`${theme.card} hover:bg-white/10 text-white w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-colors flex-shrink-0 border ${theme.cardBorder}`}
            >−</button>
            <input
              type="number" min="1" max="999" value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className={`w-full ${theme.input} rounded-lg px-4 py-2 text-white text-center placeholder-slate-500 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <button
              onClick={() => setFormData({ ...formData, quantity: (parseInt(formData.quantity) || 1) + 1 })}
              className={`${theme.card} hover:bg-white/10 text-white w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-colors flex-shrink-0 border ${theme.cardBorder}`}
            >+</button>
          </div>
          {formData.quantity > 1 && (
            <p className="text-xs text-emerald-400 mt-1.5">
              Total: {formData.quantity} items (${formData.purchasePrice
                ? (parseFloat(formData.purchasePrice) * formData.quantity).toFixed(2) : "0.00"})
            </p>
          )}
        </div>

        {/* Platform picker */}
        <div>
          <label className={`block ${theme.subtext} mb-2 text-sm font-medium`}>Platform</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const selected = formData.platform === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: p.value })}
                  title={`${p.label} (${p.fee})`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${selected
                      ? `${theme.accentBg} border-transparent text-white`
                      : `${theme.card} ${theme.cardBorder} ${theme.subtext} hover:text-white`
                    }`}
                >
                  {p.icon
                    ? <img src={p.icon} alt={p.label} className="w-4 h-4 rounded-sm object-contain" />
                    : <span className="w-4 h-4 rounded-sm bg-white/10 flex items-center justify-center text-[8px] font-bold">{p.label[0]}</span>
                  }
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className={`block ${theme.subtext} mb-2 text-sm font-medium`}>Notes</label>
          <input
            type="text" value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={`w-full ${theme.input} rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none transition-colors border`}
            placeholder="-"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onAdd}
          className={`relative flex items-center gap-2 px-8 py-2 rounded-lg font-medium transition-all duration-300
            ${success ? 'bg-emerald-500 scale-95' : `${theme.accentBg} hover:brightness-110 active:scale-95`} text-white`}
        >
          {success
            ? <><CheckCircle size={16} /><span>Added!</span></>
            : <span>{formData.quantity > 1 ? `Add ${formData.quantity} Items` : "Add Item"}</span>
          }
        </button>
      </div>
    </div>
  );
}