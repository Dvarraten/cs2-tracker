// SAP Fiori Morning Horizon chart palette (SAP/theming-base-content)
export const SAP_CHART_COLORS = {
  1:  "#168eff", // blue
  2:  "#c87b00", // orange
  3:  "#75980b", // olive green
  4:  "#df1278", // magenta
  5:  "#8b47d7", // purple
  6:  "#049f9a", // teal
  7:  "#0070f2", // royal blue
  8:  "#cc00dc", // violet
  9:  "#798c77", // muted sage
  10: "#da6c6c", // salmon
  11: "#5d36ff", // indigo
  12: "#a68a5b", // warm tan
  good:     "#30914c",
  bad:      "#f53232",
  critical: "#e26300",
  neutral:  "#758ca4",
};

export const themes = {
  // ── 1. Midnight Blue (default) ──────────────────────────────────────────
  default: {
    name: "Midnight Blue",
    dot: "bg-blue-500",
    bg: "bg-[#0c1120]",
    card: "bg-[#151f35]",
    cardHover: "hover:border-slate-500/50",
    cardBorder: "border-slate-600/40",
    panel: "bg-[#111827]",
    panelBorder: "border-slate-600/40",
    input: "bg-[#1a2540] border-slate-600/50 focus:border-indigo-500/50",
    inputSell: "bg-[#1a2540] border-slate-600/50 focus:border-indigo-500/50",
    tabActive: "bg-blue-600 text-white",
    tabInactive: "bg-[#151f35] text-slate-300 hover:bg-slate-700/50 border border-slate-600/40",
    accent: "text-blue-400",
    accentBg: "bg-blue-600 hover:bg-blue-500",
    subtext: "text-slate-400",
    soldCard: "bg-[#1a2540] border-slate-600/30",
    sidebarItem: "bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50",
    header: "bg-[#080e1a]",
    chartGrid: "#334155",
    chartAxis: SAP_CHART_COLORS.neutral,
    chartTooltipBg: "#1e293b",
    chartTooltipBorder: "#475569",
    chartLine: SAP_CHART_COLORS[1],
    chartColors: [SAP_CHART_COLORS[1], SAP_CHART_COLORS[6], SAP_CHART_COLORS[3], SAP_CHART_COLORS[5], SAP_CHART_COLORS[2], SAP_CHART_COLORS[4]],
  },

  // ── 2. Arctic ───────────────────────────────────────────────────────────
  arctic: {
    name: "Arctic",
    dot: "bg-sky-400",
    bg: "bg-[#1a2332]",
    card: "bg-[#1f2d40]",
    cardHover: "hover:border-sky-600/40",
    cardBorder: "border-slate-500/30",
    panel: "bg-[#1c2738]",
    panelBorder: "border-slate-500/30",
    input: "bg-[#243447] border-slate-500/40 focus:border-sky-500/50",
    inputSell: "bg-[#243447] border-slate-500/40 focus:border-sky-500/50",
    tabActive: "bg-sky-500/80 text-white",
    tabInactive: "bg-[#1f2d40] text-slate-300 hover:bg-slate-600/30 border border-slate-500/30",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/80 hover:bg-sky-500",
    subtext: "text-slate-400",
    soldCard: "bg-[#243447] border-slate-500/25",
    sidebarItem: "bg-slate-600/30 hover:bg-slate-600/50 border-slate-500/30",
    header: "bg-[#141c28]",
    chartGrid: "#2d3f55",
    chartAxis: SAP_CHART_COLORS.neutral,
    chartTooltipBg: "#1f2d40",
    chartTooltipBorder: "#3d5570",
    chartLine: SAP_CHART_COLORS[6],
    chartColors: [SAP_CHART_COLORS[6], SAP_CHART_COLORS[1], SAP_CHART_COLORS[3], SAP_CHART_COLORS[5], SAP_CHART_COLORS[9], SAP_CHART_COLORS[12]],
  },

  // ── 3. Teal (SAP #6 – #049f9a) ──────────────────────────────────────────
  teal: {
    name: "Deep Teal",
    dot: "bg-[#049f9a]",
    bg: "bg-[#081614]",
    card: "bg-[#0d2120]",
    cardHover: "hover:border-teal-600/40",
    cardBorder: "border-teal-900/50",
    panel: "bg-[#0a1c1b]",
    panelBorder: "border-teal-900/50",
    input: "bg-[#102625] border-teal-800/40 focus:border-teal-500/60",
    inputSell: "bg-[#102625] border-teal-800/40 focus:border-teal-500/60",
    tabActive: "bg-[#049f9a] text-white",
    tabInactive: "bg-[#0d2120] text-slate-300 hover:bg-teal-900/30 border border-teal-900/50",
    accent: "text-[#049f9a]",
    accentBg: "bg-[#049f9a] hover:bg-[#06b8b2]",
    subtext: "text-teal-300/60",
    soldCard: "bg-[#102625] border-teal-900/40",
    sidebarItem: "bg-teal-900/30 hover:bg-teal-900/50 border-teal-800/30",
    header: "bg-[#04100f]",
    chartGrid: "#1a3533",
    chartAxis: SAP_CHART_COLORS.neutral,
    chartTooltipBg: "#0d2120",
    chartTooltipBorder: "#049f9a50",
    chartLine: SAP_CHART_COLORS[6],
    chartColors: [SAP_CHART_COLORS[6], SAP_CHART_COLORS[1], SAP_CHART_COLORS[3], SAP_CHART_COLORS[9], SAP_CHART_COLORS[12], SAP_CHART_COLORS[5]],
  },

  // ── 4. Indigo (SAP #11 – #5d36ff) ──────────────────────────────────────
  indigo: {
    name: "Indigo",
    dot: "bg-[#5d36ff]",
    bg: "bg-[#0d0b1e]",
    card: "bg-[#14113a]",
    cardHover: "hover:border-indigo-500/40",
    cardBorder: "border-indigo-900/50",
    panel: "bg-[#100e2e]",
    panelBorder: "border-indigo-900/50",
    input: "bg-[#1a1748] border-indigo-800/40 focus:border-indigo-500/60",
    inputSell: "bg-[#1a1748] border-indigo-800/40 focus:border-indigo-500/60",
    tabActive: "bg-[#5d36ff] text-white",
    tabInactive: "bg-[#14113a] text-slate-300 hover:bg-indigo-900/30 border border-indigo-900/50",
    accent: "text-[#8b6fff]",
    accentBg: "bg-[#5d36ff] hover:bg-[#7050ff]",
    subtext: "text-indigo-300/60",
    soldCard: "bg-[#1a1748] border-indigo-900/40",
    sidebarItem: "bg-indigo-900/30 hover:bg-indigo-900/50 border-indigo-800/30",
    header: "bg-[#080614]",
    chartGrid: "#1e1a40",
    chartAxis: SAP_CHART_COLORS.neutral,
    chartTooltipBg: "#14113a",
    chartTooltipBorder: "#5d36ff50",
    chartLine: SAP_CHART_COLORS[11],
    chartColors: [SAP_CHART_COLORS[11], SAP_CHART_COLORS[5], SAP_CHART_COLORS[8], SAP_CHART_COLORS[1], SAP_CHART_COLORS[4], SAP_CHART_COLORS[6]],
  },

  // ── 5. Olive (SAP #3 – #75980b) ─────────────────────────────────────────
  olive: {
    name: "Olive",
    dot: "bg-[#75980b]",
    bg: "bg-[#0e1209]",
    card: "bg-[#161d0d]",
    cardHover: "hover:border-lime-700/40",
    cardBorder: "border-lime-900/40",
    panel: "bg-[#12170a]",
    panelBorder: "border-lime-900/40",
    input: "bg-[#1c2510] border-lime-800/40 focus:border-lime-600/60",
    inputSell: "bg-[#1c2510] border-lime-800/40 focus:border-lime-600/60",
    tabActive: "bg-[#75980b] text-white",
    tabInactive: "bg-[#161d0d] text-slate-300 hover:bg-lime-900/30 border border-lime-900/40",
    accent: "text-[#9ec41a]",
    accentBg: "bg-[#75980b] hover:bg-[#87ae0d]",
    subtext: "text-lime-300/50",
    soldCard: "bg-[#1c2510] border-lime-900/30",
    sidebarItem: "bg-lime-900/20 hover:bg-lime-900/40 border-lime-800/30",
    header: "bg-[#090d05]",
    chartGrid: "#1e2a10",
    chartAxis: SAP_CHART_COLORS.neutral,
    chartTooltipBg: "#161d0d",
    chartTooltipBorder: "#75980b50",
    chartLine: SAP_CHART_COLORS[3],
    chartColors: [SAP_CHART_COLORS[3], SAP_CHART_COLORS[6], SAP_CHART_COLORS[9], SAP_CHART_COLORS[12], SAP_CHART_COLORS[1], SAP_CHART_COLORS[2]],
  },
};