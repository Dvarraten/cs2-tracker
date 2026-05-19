// First-visit modal shown to unauthenticated users — offers Steam login or
// guest mode (data stored in localStorage only).
import React from "react";
import steamLogo from "../assets/platforms/steam.png";
import logoSrc from "../utils/skinroi-logo.svg";

export default function WelcomeModal({ onLogin, onContinue }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-6 shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <img src={logoSrc} alt="SkinROI" style={{ height: '80px', width: 'auto' }} />
          <p className="text-slate-400 text-sm">
            Track your CS2 skin investments across markets and see your real profit, fees, and ROI at a glance.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#1b2838] hover:bg-[#2a475e] border border-white/10 text-white px-4 py-3 rounded-xl font-medium transition-all"
          >
            <img src={steamLogo} alt="" className="h-5 w-5" />
            Sign in with Steam
          </button>

          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 px-4 py-3 rounded-xl text-sm transition-all"
          >
            Continue without account
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center">
          Without an account your data is saved locally in the browser
        </p>
      </div>
    </div>
  );
}
