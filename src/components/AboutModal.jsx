import React from 'react';
import { X, RefreshCw, TrendingUp, Layers, Tag, Globe, BarChart3 } from 'lucide-react';
import logoSrc from '../utils/skinroi-logo.svg';
import logoLightSrc from '../utils/skinroi-logo-light.svg';

const FEATURES = [
  {
    icon: RefreshCw,
    title: 'Steam Sync',
    desc: 'Inventory changes detected automatically. Connect in Handle Items to track trade-protected skins before the hold lifts.',
  },
  {
    icon: TrendingUp,
    title: 'P&L Tracking',
    desc: 'Accurate profit after platform fees — CSFloat, Buff163, Youpin, CS.MONEY, DMarket and more.',
  },
  {
    icon: Layers,
    title: 'Trade Hold Queue',
    desc: 'Pending tab for items in the 7-day Steam hold. Mark received when they clear.',
  },
  {
    icon: Tag,
    title: 'Smart Autocomplete',
    desc: 'Fuzzy skin search. Type "kara fade fn" to find Karambit | Fade (Factory New) instantly.',
  },
  {
    icon: Globe,
    title: 'Currency Converter',
    desc: 'Live exchange rates between any two currencies, synced across every price input.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Cumulative P&L chart, period filters, win rate, and a 30-day daily heatmap.',
  },
];

export default function AboutModal({ onClose, theme }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { e.currentTarget.dataset.closeIntent = e.target === e.currentTarget ? '1' : '0'; }}
      onClick={(e) => { if (e.currentTarget.dataset.closeIntent === '1') onClose(); }}
    >
      <div
        className={`relative w-full max-w-xl max-h-[85vh] flex flex-col ${theme?.panel || 'bg-[#111827]'} border ${theme?.panelBorder || 'border-white/10'} rounded-2xl shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme?.panelBorder || 'border-white/10'} shrink-0`}>
          <img
            src={theme?.name === 'Light' ? logoLightSrc : logoSrc}
            alt="SkinROI"
            style={{ height: '44px', width: 'auto' }}
          />
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <p className={`text-sm leading-relaxed ${theme?.textSecondary || 'text-slate-300'}`}>
            Personal profit &amp; loss tracker for buying and selling CS2 skins across
            third-party markets. Connects to your Steam inventory to detect trades automatically
            and shows your real returns after platform fees.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className={`${theme?.card || 'bg-white/5'} border ${theme?.cardBorder || 'border-white/8'} rounded-xl p-3.5 flex flex-col gap-2`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/8">
                    <Icon size={12} className={theme?.accent || 'text-blue-400'} />
                  </div>
                  <span className={`text-xs font-semibold ${theme?.text || 'text-white'}`}>{title}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${theme?.subtext || 'text-slate-500'}`}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className={`border-t ${theme?.panelBorder || 'border-white/10'} pt-4`}>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Not affiliated with or endorsed by Valve Corporation. Counter-Strike, CS2, and
              Steam are trademarks of Valve Corporation. Skin metadata via{' '}
              <a
                href="https://github.com/ByMykel/CSGO-API"
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-slate-400 underline underline-offset-2"
              >
                ByMykel/CSGO-API
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
