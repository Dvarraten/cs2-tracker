// Read-only feature overview modal — describes what SkinROI does and lists
// the key capabilities available to the user.
import React from 'react';
import { X, TrendingUp, RefreshCw, BarChart3, Globe, Tag, Layers } from 'lucide-react';
import logoSrc from '../utils/skinroi-logo.svg';
import logoLightSrc from '../utils/skinroi-logo-light.svg';

const features = [
  { icon: RefreshCw, text: 'Automatic Steam inventory sync — detects incoming and outgoing items' },
  { icon: TrendingUp, text: 'Profit & loss tracking after platform fees across CSFloat, Buff163, YouPin, CSMoney' },
  { icon: Layers, text: 'Pending Purchases tab for items in 7-day Steam trade hold' },
  { icon: Tag, text: 'Tag-based skin autocomplete — type "but dop fn" to find Butterfly Knife Doppler FN' },
  { icon: Globe, text: 'Live USD ↔ CNY conversion wired into every price input' },
  { icon: BarChart3, text: 'Analytics: P&L over time, weekly / monthly summaries, 90-day heatmap' },
];

export default function AboutModal({ onClose, theme }) {
  const panel       = theme?.panel       || 'bg-[#111827]';
  const panelBorder = theme?.panelBorder || 'border-white/10';
  const text        = theme?.textSecondary || 'text-slate-300';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg ${panel} border ${panelBorder} rounded-2xl shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${panelBorder}`}>
          <img src={theme?.name === 'Light' ? logoLightSrc : logoSrc} alt="SkinROI" style={{ height: '52px', width: 'auto' }} />
          <button onClick={onClose} className="text-slate-500 hover:text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className={`${text} text-sm leading-relaxed`}>
            SkinROI is a personal profit/loss tracker for buying and selling CS2 skins across
            multiple third-party markets. It connects to your Steam inventory to detect trades
            automatically and gives you a clear picture of your actual returns after fees.
          </p>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Features</h3>
            <ul className="space-y-2.5">
              {features.map(({ icon: Icon, text: featureText }) => (
                <li key={featureText} className="flex items-start gap-3">
                  <Icon size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <span className={`${text} text-sm`}>{featureText}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`pt-1 border-t ${panelBorder}`}>
            <p className="text-slate-500 text-xs leading-relaxed">
              SkinROI is not affiliated with or endorsed by Valve Corporation. Counter-Strike,
              CS2, and Steam are trademarks of Valve Corporation. Item images are served from
              Steam's CDN; skin metadata via{' '}
              <a
                href="https://github.com/ByMykel/CSGO-API"
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-slate-400 underline"
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
