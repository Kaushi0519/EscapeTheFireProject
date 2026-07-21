/**
 * Developer Notes:
 * - This file manages login state for the whole app.
 * - It signs users in with the server, stores the logged-in user, and signs users out.
 * - It checks if the logged-in user is an admin so App.js can show the correct screens.
 * - It also sets the API base URL for emulator/device testing when needed.
 * - Keep this file stable, because many screens depend on it.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginServer, getMeServer, clearTokens, setTokens, setApiBaseUrl, getAccessToken, getApiBaseUrl } from '../services/api';
import { Platform } from 'react-native';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  // optional: try to restore session on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      // Auto-configure a sensible API base for local development when none is set.
      // - Android emulator: use 10.0.2.2 to reach host machine
      // - iOS simulator / web: use localhost
      try {
        if (!getApiBaseUrl()) {
          const defaultDevBase = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
          console.info('[Auth] setting default API base to', defaultDevBase);
          setApiBaseUrl(defaultDevBase);
        }
      } catch (e) {
        // ignore
      }
      try {
        const me = await getMeServer();
        if (mounted && me) setUser(me);
      } catch (e) {
        console.warn('[Auth] getMeServer failed:', e && e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function signIn(email, password) {
    try {
      const res = await loginServer(email, password);
      // loginServer now returns { token, user }
      if (res && res.token) {
        setTokens({ access: res.token });
      }
      if (res && res.user) {
        setUser(res.user);
        return res.user;
      }
      return null;
    } catch (e) {
      // If the server explicitly rejected credentials (401/400), propagate that so the UI can show an error.
      if (e && (e.status === 401 || e.status === 400)) {
        throw e; // authentication failed
      }
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
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, configureApiBase, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}