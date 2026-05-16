import React, { useCallback, useRef, useState } from 'react';
import { ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';

const BASE = process.env.REACT_APP_STEAM_SYNC_URL || '';
const TOKEN_URL = 'https://store.steampowered.com/pointssummary/ajaxgetasyncconfig';

export default function SteamQRSetup({ onComplete, theme = {}, expired = false }) {
  const [token, setToken] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | saving | done | error
  const [errorMsg, setErrorMsg] = useState(null);
  const inputRef = useRef(null);

  const save = useCallback(async () => {
    const t = token.trim();
    if (!t) return;
    setPhase('saving');
    setErrorMsg(null);
    try {
      const res = await fetch(`${BASE}/api/auth/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', token: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPhase('done');
      if (onComplete) onComplete();
    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message || String(err));
    }
  }, [token, onComplete]);

  const card  = theme.card     || 'bg-slate-800/60';
  const border = theme.cardBorder || 'border-slate-700/50';
  const sub   = theme.subtext  || 'text-slate-400';
  const accent = theme.accentBg || 'bg-indigo-600 hover:bg-indigo-500';
  const input  = theme.input   || 'bg-slate-900 border-slate-700';

  if (phase === 'done') {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${card} border ${border}`}>
        <CheckCircle size={18} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-300 font-medium">Steam token saved. Trade sync is active.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 px-4 py-4 rounded-xl ${card} border ${border}`}>
      {expired ? (
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Steam token expired</p>
            <p className={`text-xs mt-0.5 ${sub}`}>Follow the steps below to get a fresh token.</p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-white">Connect Steam Account</p>
          <p className={`text-xs mt-0.5 ${sub}`}>Needed to sync your CS2 trade history.</p>
        </div>
      )}

      <ol className={`text-xs ${sub} flex flex-col gap-1.5 list-none`}>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400 font-bold shrink-0">1.</span>
          <span>
            Make sure you're logged into Steam in this browser, then{' '}
            <a
              href={TOKEN_URL}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-1"
            >
              open this page <ExternalLink size={10} />
            </a>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400 font-bold shrink-0">2.</span>
          <span>Find <code className="text-slate-300 bg-slate-700/60 px-1 rounded">webapi_token</code> in the JSON and copy its value.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400 font-bold shrink-0">3.</span>
          <span>Paste it below and click Save.</span>
        </li>
      </ol>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste webapi_token here…"
          className={`flex-1 text-xs px-3 py-2 rounded-lg border ${input} text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500`}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <button
          type="button"
          onClick={save}
          disabled={!token.trim() || phase === 'saving'}
          className={`${accent} text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40`}
        >
          {phase === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>

      {phase === 'error' && (
        <p className="text-xs text-red-400">{errorMsg || 'Something went wrong. Please try again.'}</p>
      )}
    </div>
  );
}
