import React from "react";

import csfloatIcon  from "../assets/platforms/csfloat.webp";
import csmoneyIcon  from "../assets/platforms/csmoney.webp";
import gamerpayIcon from "../assets/platforms/gamerpay.webp";
import skinswapIcon from "../assets/platforms/skinswap.webp";
import youpinIcon   from "../assets/platforms/youpin.webp";
import dmarketIcon  from "../assets/platforms/dmarket.webp";

// Colors sourced from SAP Fiori Morning Horizon chart palette
// sapChart_OrderedColor_* from SAP/theming-base-content
const PLATFORM_CONFIG = {
  csfloat:  { label: "CSFloat",  icon: csfloatIcon,  bg: "#168eff1a", border: "#168eff40", text: "#62b3ff" }, // SAP blue  (#1)
  gamerpay: { label: "GamerPay", icon: gamerpayIcon, bg: "#0070f21a", border: "#0070f240", text: "#5aabff" }, // SAP royal blue (#7)
  csmoney:  { label: "CS.MONEY", icon: csmoneyIcon,  bg: "#df12781a", border: "#df127840", text: "#f06bab" }, // SAP magenta (#4)
  skinswap: { label: "SkinSwap", icon: skinswapIcon, bg: "#f532321a", border: "#f5323240", text: "#f07070" }, // SAP bad/red
  dmarket:  { label: "DMarket",  icon: dmarketIcon,  bg: "#75980b1a", border: "#75980b40", text: "#9ec41a" }, // SAP olive (#3)
  youpin:   { label: "Youpin",   icon: youpinIcon,   bg: "#c87b001a", border: "#c87b0040", text: "#e8a020" }, // SAP orange (#2)
  tradeit:  { label: "Tradeit",  icon: null,         bg: "#8b47d71a", border: "#8b47d740", text: "#b07de8" }, // SAP purple (#5)
  facebook: { label: "Facebook", icon: null,         bg: "#049f9a1a", border: "#049f9a40", text: "#06c9c3" }, // SAP teal (#6)
  other:    { label: "Other",    icon: null,         bg: "#758ca41a", border: "#758ca440", text: "#9aafbf" }, // SAP neutral
};

export function PlatformBadge({ platform, size = "sm" }) {
  if (!platform) return null;
  const key = platform.toLowerCase();
  const config = PLATFORM_CONFIG[key] ?? PLATFORM_CONFIG.other;
  const imgSize = size === "xs" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-medium ${textSize}`}
      style={{ backgroundColor: config.bg, borderColor: config.border, color: config.text }}
    >
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