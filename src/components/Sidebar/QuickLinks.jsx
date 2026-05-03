import React from "react"
import { Package, Link as LinkIcon, Gem, Target, DollarSign, BarChart3, MessageSquare } from 'lucide-react';
            
export default function QuickLinks({
    theme, setShowQuickLinks, showQuickLinks
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowQuickLinks(p => !p)}
        className={`w-full ${theme.card} hover:bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${theme.cardBorder} text-white transition-all flex items-center justify-between gap-3`}
      >
        <span className="flex items-center gap-3 text-sm">
          <LinkIcon size={18} />
          Quick Links
        </span>
        <svg
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${showQuickLinks ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showQuickLinks && (
        <div className="space-y-2">
          <a 
            href="https://steamcommunity.com/id/dvichen/inventory" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${theme.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
          >
            <Package size={18} />
            <span>Inventory</span>
          </a>
          <a 
            href="https://steamcommunity.com/tradeoffer/new/?partner=173276083&token=pnIzDPno" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${theme.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
          >
            <LinkIcon size={18} />
            <span>Trade Link</span>
          </a>
          <a 
            href="https://csfloatheme.com/stall/76561198133541811" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-900/30 hover:bg-blue-800/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/50 text-sm text-blue-200 hover:text-white transition-all hover:border-blue-600 flex items-center gap-3 w-full"
          >
            <Gem size={18} />
            <span>CSFloat</span>
          </a>
          <a 
            href="https://gamerpay.gg/sell" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-900/30 hover:bg-blue-800/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/50 text-sm text-blue-200 hover:text-white transition-all hover:border-blue-600 flex items-center gap-3 w-full"
          >
            <Target size={18} />
            <span>GamerPay</span>
          </a>
          <a 
            href="https://cs.money/market/sell" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-900/30 hover:bg-blue-800/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/50 text-sm text-blue-200 hover:text-white transition-all hover:border-blue-600 flex items-center gap-3 w-full"
          >
            <DollarSign size={18} />
            <span>CS.MONEY</span>
          </a>
          <a 
            href="https://pricempire.com/app/comparison?min_price=10&max_price=9000&blacklist=case,capsule,sticker,&from_provider=csfloat&to_provider=youpin&volume=0&min_roi=5&max_roi=100&liquidity=70&price_age=10" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${theme.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
          >
            <BarChart3 size={18} />
            <span>Pricempire</span>
          </a>
          <a
            href="https://steamcommunity.com/id/dvichen/posthistory/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${theme.sidebarItem} backdrop-blur-sm rounded-lg px-4 py-3 border text-sm text-slate-200 hover:text-white transition-all hover:border-white/30 flex items-center gap-3 w-full`}
          >
            <MessageSquare size={18} />
            <span>Trading Forum</span>
          </a>
        </div>
      )}
    </div>
    );
}