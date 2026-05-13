import React from 'react';

export default function LoginScreen({ onLogin }) {
  return (
    <div className="min-h-screen bg-[#080e1a] flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-white text-3xl font-semibold tracking-tight mb-2">CS2 Trading Tracker</h1>
        <p className="text-slate-400 text-sm">Sign in with Steam to access your data</p>
      </div>
      <button
        onClick={onLogin}
        className="flex items-center gap-3 bg-[#1b2838] hover:bg-[#2a475e] border border-white/10 text-white px-6 py-3 rounded-lg transition-colors font-medium"
      >
        <img
          src="https://store.akamai.steamstatic.com/public/shared/images/header/logo_steam.svg"
          alt="Steam"
          className="h-6 brightness-0 invert"
        />
        Sign in with Steam
      </button>
    </div>
  );
}
