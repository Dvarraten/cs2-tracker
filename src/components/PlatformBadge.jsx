import React from "react";

import csfloatIcon   from "../assets/platforms/csfloat.webp";
import csmoneyIcon   from "../assets/platforms/csmoney.webp";
import gamerpayIcon  from "../assets/platforms/gamerpay.webp";
import skinswapIcon  from "../assets/platforms/skinswap.webp";
import youpinIcon    from "../assets/platforms/youpin.webp";
import dmarketIcon   from "../assets/platforms/dmarket.webp";

const PLATFORM_CONFIG = {
  csfloat:  { label: "CSFloat",  icon: csfloatIcon,  color: "bg-neutral-700/60 text-slate-200 border-white/10" },
  csmoney:  { label: "CS.MONEY", icon: csmoneyIcon,  color: "bg-pink-900/40  text-pink-200  border-pink-500/20" },
  gamerpay: { label: "GamerPay", icon: gamerpayIcon, color: "bg-blue-900/40  text-blue-200  border-blue-500/20" },
  skinswap: { label: "SkinSwap", icon: skinswapIcon, color: "bg-red-900/40   text-red-200   border-red-500/20"  },
  youpin:   { label: "Youpin",   icon: youpinIcon,   color: "bg-yellow-900/40 text-yellow-200 border-yellow-500/20" },
  dmarket:  { label: "DMarket",  icon: dmarketIcon,  color: "bg-green-900/40 text-green-200 border-green-500/20" },
  tradeit:  { label: "Tradeit",  icon: null,         color: "bg-red-900/40   text-red-200   border-red-500/20"  },
  facebook: { label: "Facebook", icon: null,         color: "bg-blue-900/40  text-blue-300  border-blue-600/30" },
  other:    { label: "Other",    icon: null,         color: "bg-slate-700/40 text-slate-300 border-slate-500/20" },
};

export function PlatformBadge({ platform, size = "sm" }) {
  if (!platform) return null;
  const key = platform.toLowerCase();
  const config = PLATFORM_CONFIG[key] ?? PLATFORM_CONFIG.other;
  const imgSize = size === "xs" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-medium ${textSize} ${config.color}`}>
      {config.icon && (
        <img
          src={config.icon}
          alt={config.label}
          className={`${imgSize} rounded-sm object-contain flex-shrink-0`}
        />
      )}
      {config.label}
    </span>
  );
}

export default PLATFORM_CONFIG;