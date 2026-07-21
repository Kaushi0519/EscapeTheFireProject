let accessToken = null;
let refreshToken = null;

// WiFi BSSID collection (cross-platform, requires permissions)
import { Platform, PermissionsAndroid } from 'react-native';
let WifiManager;
try {
  WifiManager = require('react-native-wifi-reborn').default;
} catch (e) {
  WifiManager = null;
}

/**
 * Gets the currently connected WiFi BSSID (MAC address).
 * Returns null if not available or permissions denied.
 */
export async function getConnectedBSSID() {
  if (!WifiManager) return null;
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return null;
    try {
      return await WifiManager.getBSSID();
    } catch (e) {
      return null;
    }
  } else if (Platform.OS === 'ios') {
    // On iOS, location permission must be granted and app in foreground
    try {
      return await WifiManager.getBSSID();
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function setTokens(newAccessTokenOrObject, newRefreshToken) {
  // Accept either setTokens(access, refresh) or setTokens({ access, refresh })
  if (newAccessTokenOrObject && typeof newAccessTokenOrObject === 'object' && !newRefreshToken) {
    const obj = newAccessTokenOrObject;
    accessToken = obj.access || null;
    refreshToken = obj.refresh || null;
  } else {
    accessToken = newAccessTokenOrObject || null;
    refreshToken = newRefreshToken || null;
  }
}

export function clearTokens() {
    accessToken = null;
    refreshToken = null;
}

export async function apiFetch(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(path, Object.assign({ headers }, opts));
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`HTTP ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fakeLogin(username, password) {
  // Simple dev-only behavior:
  // admin/admin -> admin role
  // anything else non-empty -> staff role
  // accept an email or a short username for dev convenience
  const email = username;
  if (!email || !password) {
    const err = new Error('Missing credentials');
    err.status = 400;
    throw err;
  }
  if (email === 'admin' || email === 'admin@example.com') {
    // pretend tokens
    setTokens({ access: 'fake-admin-access', refresh: 'fake-admin-refresh' });
    return { id: '1', email: 'admin@example.com', roles: ['admin'], status: 'active' };
  }
  // normal staff
  setTokens({ access: 'fake-staff-access', refresh: 'fake-staff-refresh' });
  // if caller passed a full email, keep it; otherwise append @example.com
  const outEmail = email.includes('@') ? email : `${email}@example.com`;
  return { id: '2', email: outEmail, roles: ['staff'], status: 'active' };
}

export async function fakeGetMe() {
  // return user based on current fake token
  if (accessToken === 'fake-admin-access') {
    return { id: '1', email: 'admin@example.com', roles: ['admin'], status: 'active' };
  }
  if (accessToken === 'fake-staff-access') {
    return { id: '2', email: 'staff@example.com', roles: ['staff'], status: 'active' };
  }
  return null;
}

// --- live server helpers ---
// The API base can come from several places (in order):
// 1) runtime call to setApiBaseUrl(url)
// 2) Expo app config `extra.API_BASE` (available via expo-constants)
// 3) Expo app config `extra.API_BASE_ANDROID` when running on Android
// 4) EXPO_PUBLIC_API_BASE environment variable
// 5) development fallback (localhost / 10.0.2.2 / detected IP)
let DEFAULT_BASE = null;
let warnedFallback = false;
let configChecked = false;

function readExpoExtra() {
  try {
    const Constants = require('expo-constants').default || require('expo-constants');
    // Try multiple paths since Expo SDK versions differ
    const extra = (Constants.expoConfig && Constants.expoConfig.extra)
      || (Constants.manifest && Constants.manifest.extra)
      || (Constants.manifest2 && Constants.manifest2.extra)
      || null;
    return extra;
  } catch (e) {
    console.warn('[api] Failed to read expo-constants:', e && e.message);
    return null;
  }
}

function detectPlatform() {
  try {
    const rn = require('react-native');
    return rn && rn.Platform ? rn.Platform.OS : null;
  } catch (e) {
    return null;
  }
}

function getDevFallbackBase() {
  const platform = detectPlatform();
  if (platform === 'android') return 'http://10.0.2.2:5000';
  // For iOS/web, try to extract host from Expo's manifest URL
  try {
    const Constants = require('expo-constants').default || require('expo-constants');
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost') {
        return `http://${host}:5000`;
      }
    }
  } catch (e) { /* ignore */ }
  return 'http://localhost:5000';
}

function ensureConfigLoaded() {
  if (configChecked) return;
  configChecked = true;
  
  // Priority: 1) Env var override 2) app.json config 3) fallback
  // Check env var first so start:local can override app.json
  try {
    if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_BASE) {
      DEFAULT_BASE = process.env.EXPO_PUBLIC_API_BASE;
      return; // env var takes priority, skip app.json
    }
  } catch (e) {
    // ignore if process/env is not available
  }

  // try to read from Expo Constants (app.json/app.config.extra) when available
  const extra = readExpoExtra();
  if (extra) {
    const platform = detectPlatform();
    if (platform === 'android' && extra.API_BASE_ANDROID) {
      DEFAULT_BASE = extra.API_BASE_ANDROID;
    } else if (platform === 'web' && extra.API_BASE_WEB) {
      DEFAULT_BASE = extra.API_BASE_WEB;
    } else if (extra.API_BASE) {
      DEFAULT_BASE = extra.API_BASE;
    }
  }
}

export function setApiBaseUrl(url) {
  DEFAULT_BASE = url;
  configChecked = true; // skip auto-detection if manually set
}

export function getAccessToken() {
  return accessToken;
}

export function getApiBaseUrl() {
  ensureConfigLoaded();
  return DEFAULT_BASE;
}

function getBase(override) {
  ensureConfigLoaded();
  let base = override || DEFAULT_BASE;
  if (!base) {
    base = getDevFallbackBase();
    DEFAULT_BASE = base;
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(`[api] API base not configured; using development fallback ${base}`);
    }
  }
  return base.replace(/\/$/, '');
}

function alternateLocalPortBase(base) {
  const normalized = String(base || '').replace(/\/$/, '');
  if (normalized.includes('localhost:5000')) return normalized.replace('localhost:5000', 'localhost:5001');
  if (normalized.includes('localhost:5001')) return normalized.replace('localhost:5001', 'localhost:5000');
  if (normalized.includes('10.0.2.2:5000')) return normalized.replace('10.0.2.2:5000', '10.0.2.2:5001');
  if (normalized.includes('10.0.2.2:5001')) return normalized.replace('10.0.2.2:5001', '10.0.2.2:5000');
  return null;
}

async function fetchWithLocalPortFallback(base, path, options) {
  const primaryBase = String(base || '').replace(/\/$/, '');
  try {
    return { response: await fetch(`${primaryBase}${path}`, options), baseUsed: primaryBase };
  } catch (e) {
    const alt = alternateLocalPortBase(primaryBase);
    if (!alt) throw e;
    const response = await fetch(`${alt}${path}`, options);
    DEFAULT_BASE = alt;
    console.info(`[api] switched API base to ${alt} after fallback`);
    return { response, baseUsed: alt };
  }
}

export async function loginServer(email, password, baseUrl) {
  const base = getBase(baseUrl);
  const { response: res, baseUsed } = await fetchWithLocalPortFallback(base, '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  DEFAULT_BASE = baseUsed;
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Login failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  // the server returns { token, user }
  if (data.token) setTokens({ access: data.token });
  // return full response so callers can inspect token/user if needed
  return data;
}

export async function getMeServer(baseUrl) {
  // require accessToken to be set
  if (!accessToken) return null;
  const base = getBase(baseUrl);
  const { response: res, baseUsed } = await fetchWithLocalPortFallback(base, '/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  DEFAULT_BASE = baseUsed;
  if (!res.ok) {
    return null;
  }
  return res.json();
}

/**
 * Admin helper to create a new user on the server (development convenience).
 * body: { email, password, roles }
 */
export async function createUserServer({ email, password, roles = ['staff'] }, baseUrl) {
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/admin/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, roles }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Create user failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- rosters client helpers ---
export async function listRosters(baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/rosters`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`List rosters failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function createRoster({ name, assignedToEmail }, baseUrl) {
  const base = getBase(baseUrl);
  const body = { name };
  if (assignedToEmail) body.assignedToEmail = assignedToEmail;
  const res = await fetch(`${base}/rosters`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: accessToken ? `Bearer ${accessToken}` : '' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Create roster failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function getRoster(id, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/rosters/${id}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Get roster failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data;
}

export async function addStudentToRoster(id, { name, imageUrl }, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/rosters/${id}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ name, imageUrl }) });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Add student failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateStudentInRoster(rosterId, studentId, patch, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/rosters/${rosterId}/students/${studentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(patch) });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Update student failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function deleteStudentFromRoster(rosterId, studentId, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/rosters/${rosterId}/students/${studentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    const err = new Error(`Delete student failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

export async function assignRoster(rosterId, { staffId, staffEmail, clear } = {}, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const body = {};
  if (typeof clear !== 'undefined') body.clear = !!clear;
  if (staffId) body.staffId = staffId;
  if (staffEmail) body.staffEmail = staffEmail;
  const res = await fetch(`${base}/rosters/${rosterId}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Assign roster failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Delete a roster (admin only)
 */
export async function deleteRoster(id, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/rosters/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    const err = new Error(`Delete roster failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

// --- students client helper ---
export async function createStudentServer({ firstName, lastName, imageUrl, rosterId } = {}, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const body = { firstName, lastName };
  if (imageUrl) body.imageUrl = imageUrl;
  if (rosterId) body.rosterId = rosterId;
  const res = await fetch(`${base}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Create student failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Admin: list users
 */
export async function getUsersServer(baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/admin/users`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Get users failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * List students from server
 */
export async function getStudentsServer(baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/students`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Get students failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function deleteStudentServer(id, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/students/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    const err = new Error(`Delete student failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

/**
 * Admin: delete a user by id
 */
export async function deleteUserServer(id, baseUrl) {
  if (!accessToken) throw new Error('no_token');
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    const err = new Error(`Delete user failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

// Send BSSID to server and update user location
export async function updateUserLocationWithBSSID(bssid, baseUrl) {
  if (!bssid) throw new Error('No BSSID provided');
  const url = (baseUrl || getApiBaseUrl()) + '/user/update-location';
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bssid })
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`HTTP ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}