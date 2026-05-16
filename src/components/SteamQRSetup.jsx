import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, CheckCircle, X } from 'lucide-react';

const BASE = process.env.REACT_APP_STEAM_SYNC_URL || '';

/**
 * SteamQRSetup — shown when the user is logged in but hasn't yet connected
 * their Steam JWT token. Walks them through the QR auth flow.
 *
 * Props:
 *   onComplete (function) — called when tokens are stored successfully
 *   theme      (object)   — same themeStyles object used throughout the app
 */
export default function SteamQRSetup({ onComplete, theme = {} }) {
  const [phase, setPhase] = useState('idle'); // idle | starting | polling | done | error
  const [challengeUrl, setChallengeUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollTimerRef = useRef(null);
  const aliveRef = useRef(true);

  // Clean up polling on unmount.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setChallengeUrl(null);
    setErrorMsg(null);
  }, [stopPolling]);

  const poll = useCallback(async (data) => {
    if (!aliveRef.current) return;
    try {
      const res = await fetch(`${BASE}/api/auth/qr-poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: data.clientId, requestId: data.requestId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!aliveRef.current) return;

      if (result.done) {
        setPhase('done');
        stopPolling();
        if (onComplete) onComplete();
        return;
      }
    } catch (err) {
      if (!aliveRef.current) return;
      // Non-fatal — keep polling.
    }

    // Schedule next poll.
    if (aliveRef.current) {
      const intervalMs = (data.pollInterval || 5) * 1000;
      pollTimerRef.current = setTimeout(() => poll(data), intervalMs);
    }
  }, [onComplete, stopPolling]);

  const startQrFlow = useCallback(async () => {
    setPhase('starting');
    setErrorMsg(null);
    try {
      const res = await fetch(`${BASE}/api/auth/qr-start`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!aliveRef.current) return;

      setChallengeUrl(data.challengeUrl);
      const pd = {
        clientId: data.clientId,
        requestId: data.requestId,
        pollInterval: data.pollInterval || 5,
      };
      setPhase('polling');

      // Start polling immediately.
      const intervalMs = pd.pollInterval * 1000;
      pollTimerRef.current = setTimeout(() => poll(pd), intervalMs);
    } catch (err) {
      if (!aliveRef.current) return;
      setPhase('error');
      setErrorMsg(err.message || String(err));
    }
  }, [poll]);

  const card = theme.card || 'bg-slate-800/60';
  const border = theme.cardBorder || 'border-slate-700/50';
  const subtext = theme.subtext || 'text-slate-400';
  const accent = theme.accentBg || 'bg-indigo-600 hover:bg-indigo-500';

  if (phase === 'done') {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${card} border ${border}`}>
        <CheckCircle size={18} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-300 font-medium">
          Steam token connected. Syncing will use your account's trade history.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 px-4 py-4 rounded-xl ${card} border ${border}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Connect Steam Account</p>
          <p className={`text-xs mt-0.5 ${subtext}`}>
            Authorise SkinROI to read your trade history via a one-time QR approval in the Steam mobile app.
          </p>
        </div>
        {(phase === 'polling' || phase === 'starting') && (
          <button
            type="button"
            onClick={cancel}
            className={`${subtext} hover:text-white transition-colors shrink-0 p-1`}
            title="Cancel"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <button
          type="button"
          onClick={startQrFlow}
          className={`self-start ${accent} text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
        >
          Connect Handle Items
        </button>
      )}

      {phase === 'starting' && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Starting session…
        </div>
      )}

      {phase === 'polling' && challengeUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-300">
            Open the link below on your phone and approve it in the Steam app. This page will update automatically.
          </p>
          <a
            href={challengeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
          >
            <ExternalLink size={12} />
            Open Steam QR Auth
          </a>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Loader2 size={12} className="animate-spin" />
            Waiting for approval…
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-red-400">{errorMsg || 'Something went wrong. Please try again.'}</p>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setErrorMsg(null); }}
            className={`self-start ${accent} text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
