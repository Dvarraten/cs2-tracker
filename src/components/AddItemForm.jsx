// Slide-in panel for adding a new tracked item. Manages its own form state
// (name autocomplete, price, platform, quantity, pending toggle, delivery
// date) and calls back into useItems on submit.
import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, PackagePlus } from "lucide-react";
import ItemAutoComplete from "./ItemAutoComplete";
import PasteButton from "./PasteButton";
import PlatformPicker from "./PlatformPicker";
import { useItemImage } from "../utils/itemImages";

import csfloatIcon from "../assets/platforms/csfloat.webp";
import csmoneyIcon from "../assets/platforms/csmoney.webp";
import gamerpayIcon from "../assets/platforms/gamerpay.webp";
import skinswapIcon from "../assets/platforms/skinswap.webp";
import youpinIcon from "../assets/platforms/youpin.webp";
import dmarketIcon from "../assets/platforms/dmarket.webp";

const PLATFORMS = [
  { value: "csfloat", label: "CSFloat", icon: csfloatIcon, fee: "2%" },
  { value: "csmoney", label: "CS.MONEY", icon: csmoneyIcon, fee: "5%" },
  { value: "gamerpay", label: "GamerPay", icon: gamerpayIcon, fee: "3%" },
  { value: "skinswap", label: "SkinSwap", icon: skinswapIcon, fee: "5%" },
  { value: "dmarket", label: "DMarket", icon: dmarketIcon, fee: "5%" },
  { value: "youpin", label: "Youpin", icon: youpinIcon, fee: "0.5%" },
  { value: "other", label: "Other", icon: null, fee: "?" },
];

const label =
  "block text-xs text-slate-500 font-medium uppercase tracking-wide mb-2";
const inputH = "h-9";

export default function AddItemForm({
  formData,
  setFormData,
  handleAddItem,
  theme,
  bare = false,
}) {
  const [success, setSuccess] = useState(false);

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

  const defaultDeliveryISO = (() => {
    const d = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  })();

  return (
    <div
      className={
        bare ? "" : `${theme.panel} ${theme.panelBorder} rounded-xl p-5 border`
      }
    >
      {/* Header — hidden in bare/modal mode, modal provides its own */}
      {!bare && (
        <div className="flex items-center gap-2 mb-5">
          <PackagePlus size={16} className="text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Add New Item
          </h3>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Item Name */}
        <div>
          <label className={label}>Item Name</label>
          <ItemAutoComplete
            value={formData.itemName}
            onChange={(val) => setFormData({ ...formData, itemName: val })}
            placeholder="Search…"
            theme={theme}
          />
        </div>

        {/* Purchase Price */}
        <div>
          <label className={label}>Purchase Price ($)</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) =>
                setFormData({ ...formData, purchasePrice: e.target.value })
              }
              className={`w-full ${inputH} ${theme.input} rounded-lg px-3 pr-9 text-sm font-mono ${theme.text} placeholder-slate-600 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              placeholder="0.00"
            />
            <PasteButton
              onPaste={(val) => {
                const num = parseFloat(val);
                if (!isNaN(num))
                  setFormData({ ...formData, purchasePrice: num });
              }}
            />
          </div>
        </div>

        {/* Platform */}
        <div>
          <label className={label}>Platform</label>
          <PlatformPicker
            value={formData.platform}
            onChange={(val) => setFormData({ ...formData, platform: val })}
            theme={theme}
            platforms={PLATFORMS}
          />
        </div>

        {/* Quantity */}
        <div>
          <label className={label}>
            Quantity
            {formData.quantity > 1 && formData.purchasePrice && (
              <span className="ml-2 text-profit normal-case font-mono tracking-normal">
                = $
                {(
                  parseFloat(formData.purchasePrice) * formData.quantity
                ).toFixed(2)}{" "}
                total
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  quantity: Math.max(1, (parseInt(formData.quantity) || 1) - 1),
                })
              }
              className={`${theme.card} hover:bg-white/10 ${theme.text} ${inputH} w-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors shrink-0 border ${theme.cardBorder}`}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="999"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className={`w-full ${inputH} ${theme.input} rounded-lg px-3 text-sm font-mono ${theme.text} text-center focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  quantity: (parseInt(formData.quantity) || 1) + 1,
                })
              }
              className={`${theme.card} hover:bg-white/10 ${theme.text} ${inputH} w-9 rounded-lg flex items-center justify-center text-base font-bold transition-colors shrink-0 border ${theme.cardBorder}`}
            >
              +
            </button>
          </div>
        </div>

        {/* Notes — full width */}
        <div className="md:col-span-2">
          <label className={label}>Notes</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className={`w-full ${inputH} ${theme.input} rounded-lg px-3 text-sm ${theme.text} placeholder-slate-600 focus:outline-none transition-colors border`}
            placeholder="Float, pattern, stickers"
          />
        </div>
      </div>

      {/* Action row */}
      <div
        className={`flex flex-wrap gap-3 mt-5 pt-4 border-t ${theme.cardBorder} items-center`}
      >
        <button
          onClick={onAdd}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95
            ${
              success ? "bg-profit text-white" : `${theme.accentBg} text-white`
            }`}
        >
          {success ? (
            <>
              <CheckCircle size={15} /> Added!
            </>
          ) : formData.pending ? (
            <>
              <Clock size={15} className="text-white/70" />
              {formData.quantity > 1
                ? `Add ${formData.quantity} Pending`
                : "Add Pending"}
            </>
          ) : formData.quantity > 1 ? (
            `Add ${formData.quantity} Items`
          ) : (
            "Add Item"
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !formData.pending;
            setFormData({
              ...formData,
              pending: next,
              expectedDelivery: next
                ? formData.expectedDelivery || defaultDeliveryISO
                : "",
            });
          }}
          title="Item is on trade hold (not yet received)"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
            ${theme.card} ${theme.cardBorder}
            ${formData.pending ? "text-warn ring-1 ring-warn/30" : `text-slate-400 ${theme.textHover}`}`}
        >
          <Clock
            size={15}
            className={formData.pending ? "text-warn" : "text-slate-500"}
          />
          Trade hold
        </button>

        {formData.pending && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${theme.subtext}`}>Delivery:</span>
            <input
              type="date"
              value={formData.expectedDelivery || defaultDeliveryISO}
              onChange={(e) =>
                setFormData({ ...formData, expectedDelivery: e.target.value })
              }
              className={`${theme.input} rounded-md px-2 py-1.5 ${theme.text} text-xs focus:outline-none border`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
