import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, PackagePlus } from "lucide-react";
import ItemAutoComplete from "./ItemAutoComplete";
import PasteButton from "./PasteButton";
import PlatformPicker from "./PlatformPicker";
import { useItemImage } from "../utils/itemImages";

import csfloatIcon  from "../assets/platforms/csfloat.webp";
import csmoneyIcon  from "../assets/platforms/csmoney.webp";
import gamerpayIcon from "../assets/platforms/gamerpay.webp";
import skinswapIcon from "../assets/platforms/skinswap.webp";
import youpinIcon   from "../assets/platforms/youpin.webp";
import dmarketIcon  from "../assets/platforms/dmarket.webp";

const PLATFORMS = [
  { value: "csfloat",  label: "CSFloat",  icon: csfloatIcon,  fee: "2%" },
  { value: "csmoney",  label: "CS.MONEY", icon: csmoneyIcon,  fee: "5%" },
  { value: "gamerpay", label: "GamerPay", icon: gamerpayIcon, fee: "3%" },
  { value: "skinswap", label: "SkinSwap", icon: skinswapIcon, fee: "5%" },
  { value: "dmarket",  label: "DMarket",  icon: dmarketIcon,  fee: "5%" },
  { value: "youpin",   label: "Youpin",   icon: youpinIcon,   fee: "0.5%" },
  { value: "other",    label: "Other",    icon: null,         fee: "?" },
];

export default function AddItemForm({ formData, setFormData, handleAddItem, theme }) {
  const [success, setSuccess] = useState(false);

  // Resolve the item's icon (from items.json) so we can stash it on the
  // tracked item — gives newly-added cards a thumbnail right away.
  const resolvedIcon = useItemImage({ name: formData.itemName });
  useEffect(() => {
    if (resolvedIcon && resolvedIcon !== formData.iconUrl) {
      setFormData((prev) => ({ ...prev, iconUrl: resolvedIcon }));
    }
    if (!resolvedIcon && formData.iconUrl && !formData.itemName) {
      setFormData((prev) => ({ ...prev, iconUrl: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedIcon, formData.itemName]);

  const onAdd = () => {
    if (!formData.itemName || !formData.purchasePrice) return;
    handleAddItem();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  // Default expected delivery: 8 days out (Steam's actual trade hold window),
  // formatted YYYY-MM-DD for <input type="date">.
  const defaultDeliveryISO = (() => {
    const d = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  })();

  return (
    <div id="section-add" className={`${theme.panel} ${theme.panelBorder} rounded-xl p-5 border`}>
      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <PackagePlus size={18} className="text-indigo-400" />
        Add New Item
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Item Name */}
        <div>
          <label className={`block ${theme.subtext} mb-1.5 text-xs font-medium`}>Item Name</label>
          <ItemAutoComplete
            value={formData.itemName}
            onChange={(val) => setFormData({ ...formData, itemName: val })}
            placeholder="-"
            theme={theme}
          />
        </div>

        {/* Purchase Price */}
        <div>
          <label className={`block ${theme.subtext} mb-1.5 text-xs font-medium`}>Purchase Price ($)</label>
          <div className="relative">
            <input
              type="number" step="1" value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              className={`w-full ${theme.input} rounded-lg px-3 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
          <label className={`block ${theme.subtext} mb-1.5 text-xs font-medium`}>Quantity</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormData({ ...formData, quantity: Math.max(1, (parseInt(formData.quantity) || 1) - 1) })}
              className={`${theme.card} hover:bg-white/10 text-white h-[38px] w-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors flex-shrink-0 border ${theme.cardBorder}`}
            >−</button>
            <input
              type="number" min="1" max="999" value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className={`w-full ${theme.input} rounded-lg px-3 py-2 text-sm text-white text-center placeholder-slate-500 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <button
              onClick={() => setFormData({ ...formData, quantity: (parseInt(formData.quantity) || 1) + 1 })}
              className={`${theme.card} hover:bg-white/10 text-white h-[38px] w-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors flex-shrink-0 border ${theme.cardBorder}`}
            >+</button>
          </div>
          {formData.quantity > 1 && (
            <p className="text-xs text-emerald-400 mt-1">
              Total: {formData.quantity} items (${formData.purchasePrice
                ? (parseFloat(formData.purchasePrice) * formData.quantity).toFixed(2) : "0.00"})
            </p>
          )}
        </div>

        {/* Platform picker (dropdown — same component as the sell picker) */}
        <div>
          <label className={`block ${theme.subtext} mb-1.5 text-xs font-medium`}>Platform</label>
          <PlatformPicker
            value={formData.platform}
            onChange={(val) => setFormData({ ...formData, platform: val })}
            theme={theme}
            platforms={PLATFORMS}
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className={`block ${theme.subtext} mb-1.5 text-xs font-medium`}>Notes</label>
          <input
            type="text" value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={`w-full ${theme.input} rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors border`}
            placeholder="-"
          />
        </div>

        {/* Trade-hold toggle + expected delivery — styled to match the
            other pill buttons in the form */}
        <div className="md:col-span-2 flex items-center flex-wrap gap-3 -mt-1">
          <button
            type="button"
            onClick={() => {
              const next = !formData.pending;
              setFormData({
                ...formData,
                pending: next,
                expectedDelivery: next
                  ? formData.expectedDelivery || defaultDeliveryISO
                  : '',
              });
            }}
            title="Item is on trade hold (not yet received)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
              ${formData.pending
                ? 'bg-amber-500 hover:bg-amber-400 border-transparent text-white'
                : `${theme.card} ${theme.cardBorder} ${theme.subtext} hover:text-white`
              }`}
          >
            <Clock size={14} />
            <span>On trade hold</span>
          </button>
          {formData.pending && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${theme.subtext}`}>Expected delivery:</span>
              <input
                type="date"
                value={formData.expectedDelivery || defaultDeliveryISO}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className={`${theme.input} rounded-md px-2 py-1 text-white text-sm focus:outline-none border`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-3">
        <button
          onClick={onAdd}
          className={`relative flex items-center gap-2 pl-5 pr-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 border overflow-hidden
            ${success
              ? 'bg-emerald-500 border-emerald-400 scale-95 text-white'
              : `${theme.card} ${theme.cardBorder} text-white hover:bg-white/5 active:scale-95`
            }`}
        >
          {!success && (
            <span
              className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                formData.pending ? 'bg-amber-500' : 'bg-blue-500'
              }`}
            />
          )}
          {success ? (
            <><CheckCircle size={16} /><span>Added!</span></>
          ) : formData.pending ? (
            <><Clock size={16} className="text-amber-400" /><span>{formData.quantity > 1 ? `Add ${formData.quantity} Pending` : 'Add Pending'}</span></>
          ) : (
            <span>{formData.quantity > 1 ? `Add ${formData.quantity} Items` : "Add Item"}</span>
          )}
        </button>
      </div>
    </div>
  );
}