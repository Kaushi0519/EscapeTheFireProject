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
// baseUrl default helps when running server locally; if using a device/emulator, replace with your machine IP or use Expo tunnel
let DEFAULT_BASE = 'http://localhost:5000';

export function setApiBaseUrl(url) {
  DEFAULT_BASE = url;
}

export async function loginServer(email, password, baseUrl = DEFAULT_BASE) {
  const res = await fetch(`${baseUrl}/auth/login`, {
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
  return data.user;
}

export async function getMeServer(baseUrl = DEFAULT_BASE) {
  // require accessToken to be set
  if (!accessToken) return null;
  const res = await fetch(`${baseUrl}/auth/me`, {
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
export async function createUserServer({ email, password, roles = ['staff'] }, baseUrl = DEFAULT_BASE) {
  const res = await fetch(`${baseUrl}/admin/users/create`, {
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