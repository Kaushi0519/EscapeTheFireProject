// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fakeLogin, fakeGetMe, loginServer, getMeServer, clearTokens, setTokens, setApiBaseUrl } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // By default do NOT fall back to the in-memory fake auth when the server is unreachable.
  // Set this to true only for offline development convenience.
  const ALLOW_FAKE_FALLBACK = false;

  // optional: try to restore session on mount (calls fakeGetMe)
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        // try server first
        let me = null;
        try {
          me = await getMeServer();
        } catch (e) {
          // server call failed (network/server error)
          if (!ALLOW_FAKE_FALLBACK) {
            console.warn('[Auth] getMeServer failed and fake fallback disabled:', e && e.message);
          }
        }
        if (!me && ALLOW_FAKE_FALLBACK) {
          me = await fakeGetMe();
        }
        if (mounted && me) setUser(me);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function signIn(email, password) {
    // try server login first
    try {
      const user = await loginServer(email, password);
      setUser(user);
      return user;
    } catch (e) {
      // If the server explicitly rejected credentials (401/400), propagate that so the UI can show an error.
      if (e && (e.status === 401 || e.status === 400)) {
        throw e; // authentication failed
      }
      // For other errors (network, 5xx, etc.), only fallback to fake login when allowed by config.
      if (ALLOW_FAKE_FALLBACK) {
        console.warn('[Auth] server login failed, falling back to fake login:', e && e.message);
        const u = await fakeLogin(email, password);
        setUser(u);
        return u;
      }
      // otherwise rethrow so the UI can show a network/server error
      throw e;
    }
  }

  // allow app to change API base URL at runtime (useful for emulator/device)
  function configureApiBase(url) {
    setApiBaseUrl(url);
  }

  async function signOut() {
    // clear tokens and user
    clearTokens();
    setUser(null);
  }

  function isAdmin() {
    return !!(user && Array.isArray(user.roles) && user.roles.includes('admin'));
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, configureApiBase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}