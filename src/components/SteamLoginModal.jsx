// Modal for connecting a Steam account via username/password to obtain a
// mobile refresh token for trade-hold detection. Two-step: credentials
// then Steam Guard code if required.
import React, { useState, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

const BASE = process.env.REACT_APP_STEAM_SYNC_URL || '';

export default function SteamLoginModal({ onClose, onSuccess, theme }) {
  const [step, setStep] = useState('credentials'); // credentials | guard | done
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sessionKey, setSessionKey] = useState(null);
  const [guardType, setGuardType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const codeRef = useRef(null);

  const panel       = theme?.panel       || 'bg-[#111827]';
  const panelBorder = theme?.panelBorder || 'border-white/10';
  const inputClass  = `w-full h-9 ${theme?.input || 'bg-slate-800 border-slate-600'} rounded-lg px-3 ${theme?.text || 'text-white'} text-sm focus:outline-none border`;
  const sub         = theme?.subtext     || 'text-slate-400';

  const submitCredentials = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/steam-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      if (!data.needsGuard) {
        setStep('done');
        onSuccess?.();
      } else {
        setSessionKey(data.sessionKey);
        setGuardType(data.guardType);
        setStep('guard');
        setTimeout(() => codeRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/steam-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', sessionKey, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setStep('done');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`relative w-full max-w-sm ${panel} border ${panelBorder} rounded-2xl shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${panelBorder}`}>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            <h3 className={`font-semibold text-sm ${theme?.text || 'text-white'}`}>Connect Steam Account</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {step === 'done' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className={`text-sm font-semibold text-emerald-400`}>Connected successfully</p>
              <p className={`text-xs ${sub} text-center`}>Trade-protected items will now appear automatically in Handle Items.</p>
              <button
                onClick={onClose}
                className={`mt-2 relative group flex items-center gap-2 px-5 h-9 rounded-lg text-sm font-medium border transition-all ${theme?.card} ${theme?.cardBorder} ${theme?.text}`}
              >
                Done
                <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 w-0 group-hover:w-full ${theme?.dot}`} />
              </button>
            </div>
          ) : step === 'guard' ? (
            <>
              <p className={`text-sm ${sub}`}>
                {guardType === 2
                  ? 'Enter the Steam Guard code sent to your email.'
                  : 'Enter the code from your Steam authenticator app.'}
              </p>
              <input
                ref={codeRef}
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitCode()}
                placeholder="XXXXX"
                maxLength={10}
                className={`${inputClass} text-center tracking-widest font-mono text-lg`}
              />
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('credentials'); setError(null); setCode(''); }}
                  className={`relative group flex-1 flex items-center justify-center h-9 rounded-lg text-sm font-medium border transition-all ${theme?.card} ${theme?.cardBorder} ${theme?.subtext}`}
                >
                  Back
                  <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 w-0 group-hover:w-full ${theme?.dot}`} />
                </button>
                <button
                  onClick={submitCode}
                  disabled={loading || !code.trim()}
                  className={`relative group flex-1 flex items-center justify-center h-9 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 ${theme?.card} ${theme?.cardBorder} ${theme?.text}`}
                >
                  {loading ? 'Verifying…' : 'Confirm'}
                  <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${loading ? 'w-full bg-profit' : `w-0 group-hover:w-full ${theme?.dot}`}`} />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={`text-xs ${sub}`}>
                Enter your Steam credentials. Needed to detect items under trade protection before the hold lifts.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Steam username"
                  autoComplete="username"
                  className={inputClass}
                  onKeyDown={e => e.key === 'Enter' && submitCredentials()}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className={inputClass}
                  onKeyDown={e => e.key === 'Enter' && submitCredentials()}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
              <button
                onClick={submitCredentials}
                disabled={loading || !username.trim() || !password.trim()}
                className={`relative group w-full flex items-center justify-center h-9 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 ${theme?.card} ${theme?.cardBorder} ${theme?.text}`}
              >
                {loading ? 'Connecting…' : 'Connect'}
                <span className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-200 ${loading ? 'w-full bg-profit' : `w-0 group-hover:w-full ${theme?.dot}`}`} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
