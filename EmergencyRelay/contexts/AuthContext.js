// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { fakeLogin, fakeGetMe, loginServer, getMeServer, clearTokens, setTokens, setApiBaseUrl, getAccessToken, getApiBaseUrl, registerPushTokenServer, loadPersistedTokens } from '../services/api';
import { startLocationTracking, stopLocationTracking } from '../services/LocationTracker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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
      // API base should come from app config/environment (services/api) or an explicit runtime override.
      if (!getApiBaseUrl()) {
        console.warn('[Auth] API base is not configured. Set expo.extra.API_BASE in app.json or call configureApiBase(url).');
      }
      
      // Try to load persisted tokens from AsyncStorage
      try {
        const hasTokens = await loadPersistedTokens();
        if (hasTokens) {
          console.log('[Auth] Loaded persisted tokens from storage');
        }
      } catch (e) {
        console.warn('[Auth] Failed to load persisted tokens:', e && e.message);
      }
      
      try {
        // try server first
        let me = null;
        try {
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 8000)
          );
          me = await Promise.race([getMeServer(), timeoutPromise]);
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
      const res = await loginServer(email, password);
      // loginServer now returns { token, user }
      if (res && res.token) {
        setTokens({ access: res.token });
      }
      if (res && res.user) {
        setUser(res.user);
        
        // Register push token with server (only works on physical devices, not web/simulators)
        try {
          // Check if we're on a physical device
          if (Platform.OS === 'web') {
            console.log('[Auth] Push notifications not supported on web platform');
          } else if (!Device.isDevice) {
            console.log('[Auth] Push notifications require a physical device (not simulator/emulator for full support)');
            // Still try to register - some emulators support it
            await registerPushToken();
          } else {
            await registerPushToken();
          }
        } catch (e) {
          console.warn('[Auth] Failed to register push token:', e && e.message);
        }
        
        // Start location tracking after successful login
        // Track every 5 seconds (5000ms) - adjust interval as needed
        try {
          await startLocationTracking(5000);
          console.log('[Auth] Location tracking started after login');
        } catch (e) {
          console.warn('[Auth] Failed to start location tracking:', e && e.message);
        }
        
        return res.user;
      }
      return null;
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
        // Also start tracking for fake login
        try {
          await startLocationTracking(5000);
        } catch (e2) {
          console.warn('[Auth] Failed to start location tracking:', e2 && e2.message);
        }
        return u;
      }
      // otherwise rethrow so the UI can show a network/server error
      throw e;
    }
  }
  
  // Helper function to register push token
  async function registerPushToken() {
    try {
      console.log('[Auth] Getting push token...');
      
      // First check/request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      console.log('[Auth] Current notification permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('[Auth] Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[Auth] Permission request result:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.warn('[Auth] Notification permissions not granted');
        return;
      }
      
      console.log('[Auth] Notification permissions granted, getting token...');
      
      // Get the push token with the proper EAS projectId
      let pushToken;
      try {
        pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: '4ddc16ba-942e-428c-b922-1402e5314177'
        });
      } catch (e) {
        console.log('[Auth] getExpoPushTokenAsync failed:', e.message);
        console.log('[Auth] Push notifications may require EAS configuration.');
        return;
      }
      
      console.log('[Auth] Push token received:', JSON.stringify(pushToken));
      
      if (pushToken && pushToken.data) {
        console.log('[Auth] Registering push token with server:', pushToken.data.substring(0, 30) + '...');
        await registerPushTokenServer(pushToken.data);
        console.log('[Auth] ✓ Push token registered successfully');
      } else {
        console.warn('[Auth] Push token data is empty or undefined');
      }
    } catch (e) {
      console.error('[Auth] Error in registerPushToken:', e && e.message);
      console.error('[Auth] Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    }
  }

  // allow app to change API base URL at runtime (useful for emulator/device)
  function configureApiBase(url) {
    setApiBaseUrl(url);
  }

  async function signOut() {
    // Stop location tracking before clearing auth
    try {
      stopLocationTracking();
      console.log('[Auth] Location tracking stopped on sign out');
    } catch (e) {
      console.warn('[Auth] Error stopping location tracking:', e && e.message);
    }
    
    // clear tokens and user (clearTokens is async now)
    await clearTokens();
    console.log('[Auth] Tokens cleared, setting user to null');
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