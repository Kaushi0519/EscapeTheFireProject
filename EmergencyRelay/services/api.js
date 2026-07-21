let accessToken = null;
let refreshToken = null;

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

// --- live server helpers ---
// The API base can come from several places (in order):
// 1) runtime call to setApiBaseUrl(url)
// 2) Expo app config `extra.API_BASE` (available via expo-constants)
// 3) if none of the above are set, callers will get a helpful error so tests don't silently call the wrong host.
let DEFAULT_BASE = null;

// try to read from Expo Constants (app.json/app.config.extra) when available
try {
  // require at runtime so this module can still be used in non-expo/test environments
  const Constants = require('expo-constants');
  if (Constants && Constants.manifest && Constants.manifest.extra && Constants.manifest.extra.API_BASE) {
    DEFAULT_BASE = Constants.manifest.extra.API_BASE;
  }
} catch (e) {
  // ignore if expo-constants isn't available (e.g., running tests)
}

export function setApiBaseUrl(url) {
  DEFAULT_BASE = url;
}

export function getAccessToken() {
  return accessToken;
}

export function getApiBaseUrl() {
  return DEFAULT_BASE;
}

function getBase(override) {
  const base = override || DEFAULT_BASE;
  if (!base) {
    throw new Error('API base URL not configured — call setApiBaseUrl(url) or set `extra.API_BASE` in app config');
  }
  return base.replace(/\/$/, '');
}

export async function loginServer(email, password, baseUrl) {
  const base = getBase(baseUrl);
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
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
  const res = await fetch(`${base}/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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