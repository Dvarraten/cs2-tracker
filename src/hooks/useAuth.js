// Fetches the current Steam session from /api/auth/me on mount. Provides
// login (redirects to Steam OpenID) and logout actions.
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => setUser(user || null))
      .catch(() => setUser(null));
  }, []);

  const login = () => { window.location.href = '/api/auth/steam'; };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  };

  return { user, login, logout, loading: user === undefined };
}
