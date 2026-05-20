import React, { useCallback, useRef, useState } from 'react';
import { ExternalLink, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const BASE = process.env.REACT_APP_STEAM_SYNC_URL || '';
const TOKEN_URL = 'https://store.steampowered.com/pointssummary/ajaxgetasyncconfig';

function formatDate(unixSec) {
  if (!unixSec) return '';
  return new Date(unixSec * 1000).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function SteamQRSetup({
  onComplete,
  theme = {},
  expired = false,
  hasRefreshToken = false,
  refreshTokenExp = null,
}) {
  const [token, setToken] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | saving | done | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [showRenew, setShowRenew] = useState(false);
  const inputRef = useRef(null);

  const save = useCallback(async () => {
    const t = token.trim();
    if (!t) return;
    setPhase('saving');
    setErrorMsg(null);
    try {
      const res = await fetch(`${BASE}/api/auth/token`, {
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

  const card      = theme.card       || 'bg-slate-800/60';
  const border    = theme.cardBorder || 'border-slate-700/50';
  const sub       = theme.subtext    || 'text-slate-400';
  const accent    = theme.accentBg   || 'bg-indigo-600 hover:bg-indigo-500';
  const input     = theme.input      || 'bg-slate-900 border-slate-700';
  const text      = theme.text       || 'text-white';
  const textHover = theme.textHover  || 'hover:text-white';

  if (phase === 'done') {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${card} border ${border}`}>
        <CheckCircle size={18} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-300 font-medium">Steam token saved. Trade sync is active.</p>
      </div>
    );
  }

  // Refresh token is valid — auto-refresh is active, no action needed.
  if (hasRefreshToken && !showRenew) {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${card} border ${border}`}>
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Auto-refresh active</p>
            {refreshTokenExp && (
              <p className={`text-xs mt-0.5 ${sub}`}>Refresh token valid until {formatDate(refreshTokenExp)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowRenew(true)}
          className={`text-xs ${sub} ${textHover} transition-colors shrink-0`}
        >
          Renew
        </button>
      </div>
    );
  }

  // Paste form — shown when no refresh token, token expired, or user clicked Renew.
  const isExpired = expired && !hasRefreshToken;
  const isRenewing = showRenew && hasRefreshToken;

  return (
    <div className={`flex flex-col gap-3 px-4 py-4 rounded-xl ${card} border ${border}`}>
      {isExpired ? (
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Steam token expired</p>
            <p className={`text-xs mt-0.5 ${sub}`}>Paste a new token below.</p>
          </div>
        </div>
      ) : isRenewing ? (
        <div>
          <p className={`text-sm font-semibold ${text}`}>Renew Steam token</p>
          <p className={`text-xs mt-0.5 ${sub}`}>Paste a new refresh token to extend auto-refresh.</p>
        </div>
      ) : (
        <div>
          <p className={`text-sm font-semibold ${text}`}>Enable trade hold detection</p>
          <p className={`text-xs mt-0.5 ${sub}`}>Required to detect items on a 7-day trade hold. Already tradeable items sync without this.</p>
        </div>
      )}

      {/* Primary: webapi_token */}
      <ol className={`text-xs ${sub} flex flex-col gap-1.5 list-none`}>
        <li className="flex items-start gap-2">
          <span className="font-bold shrink-0">1.</span>
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
          <span className="font-bold shrink-0">2.</span>
          <span>Find <code className="bg-black/20 px-1 rounded">webapi_token</code> and paste its value below.</span>
        </li>
      </ol>

      {/* Developer option: long-lived script token */}
      <details className="group">
        <summary className={`text-xs ${sub} cursor-pointer ${textHover} transition-colors list-none flex items-center gap-1`}>
          <span className="group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
          Developer option — token lasts ~6 months
        </summary>
        <p className={`text-xs ${sub} mt-2`}>
          Run{' '}
          <code className="bg-black/20 px-1 rounded">node scripts/get-refresh-token.mjs</code>
          {' '}in the project folder and paste the output below.
        </p>
      </details>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste token here…"
          className={`flex-1 text-xs px-3 py-2 rounded-lg border ${input} ${text} placeholder-slate-500 focus:outline-none`}
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

      {isRenewing && (
        <button
          type="button"
          onClick={() => { setShowRenew(false); setToken(''); setPhase('idle'); }}
          className={`text-xs ${sub} ${textHover} transition-colors text-left`}
        >
          Cancel
        </button>
      )}

      {phase === 'error' && (
        <p className="text-xs text-red-400">{errorMsg || 'Something went wrong. Please try again.'}</p>
      )}
    </div>
  );
}
