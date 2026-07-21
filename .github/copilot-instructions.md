````instructions
## Quick orientation

This repository contains a small Expo React Native client (`/EmergencyRelay`) and a minimal Express dev server (`/EmergencyRelay/server`). The server is a development-only JSON-backed auth service. Start by reading these files in order:

- `EmergencyRelay/App.js` — app root and navigation (role-based routing)
- `EmergencyRelay/contexts/AuthContext.js` — central auth logic: `signIn`, `signOut`, `isAdmin`, and `configureApiBase`
- `EmergencyRelay/services/api.js` — client API helpers (`loginServer`, `getMeServer`, `createUserServer`), in-memory token helpers, and `DEFAULT_BASE`
- `EmergencyRelay/server/src/index.js` — express dev server, scrypt password hashing, session token handling, and file storage
- `EmergencyRelay/server/data/users.json` — development user store (inspectable; contains hashed passwords and in-file session tokens)

## Big-picture architecture notes

- The app is single-page (Expo) with role-based navigation handled by `AuthProvider` (admin vs staff). Any change to routing or session behavior will involve `contexts/AuthContext.js`.
- Authentication has two modes in the codebase:
  - Real server mode: calls `EmergencyRelay/server` endpoints (`/auth/login`, `/auth/me`, `/admin/users/create`).
  - Dev fallback: `fakeLogin` / `fakeGetMe` inside `services/api.js` (disabled by default via ALLOW_FAKE_FALLBACK in `AuthContext`).
- `services/api.js` centralizes request logic and a tiny in-memory token store (`setTokens`/`clearTokens`). There is currently no persistent secure storage by default (use `models/Keychain.tsx` if you add persistence).
- The dev server is intentionally simple: it stores users in `server/data/users.json`, salts+hashes passwords with scrypt, and writes session tokens directly into that JSON for short-term development convenience. This is NOT production-safe — treat the server as a test double.

## Concrete developer workflows (copy-paste friendly)

- Install project deps (root installs the Expo app):

  npm install

- Install server deps (if needed):

  cd EmergencyRelay/server && npm install

- Start server (dev auth service):

  cd EmergencyRelay/server && npm start

  - Server default port: 5000

- Start Expo client:

  cd EmergencyRelay && npx expo start -c

  - The client default API base is `http://localhost:5000` (good for web and iOS simulator).
  - Android emulator: use `http://10.0.2.2:5000` (or set via `configureApiBase`).
  - Physical device: use your machine LAN IP (e.g., `http://192.168.x.y:5000`).

## API contract and endpoints (explicit)

- POST /auth/login — request: { email, password } — response: { token, user }
- GET /auth/me — header: Authorization: Bearer <token> — response: user
- POST /admin/users/create — request: { email, password, roles } — response: { id, email, roles }

Code pointers:
- `createUserServer` in `EmergencyRelay/services/api.js` calls `/admin/users/create` (used by `screens/CreateStaffAccount.tsx`).
- `loginServer` and `getMeServer` in `services/api.js` implement the client-server contract used by `AuthContext`.

## Project-specific conventions and patterns

- Runtime base URL: `services/api.js` defines `DEFAULT_BASE = 'http://localhost:5000'`. If you add new HTTP calls, keep them parameterized to accept a `baseUrl` argument or honor `setApiBaseUrl`.
- Dev fallbacks are explicit and opt-in. `AuthContext` sets `ALLOW_FAKE_FALLBACK = false`. Only enable this when developing offline and intentionally bypassing the server.
- Minimal error handling convention: functions that fail due to authentication return errors with `.status` set (e.g., 400/401). UI code checks `err.status` to distinguish credential failures from network/5xx errors.

## Editing heuristics for agents (practical rules)

- If you change an endpoint's JSON shape, update both `services/api.js` and `server/src/index.js` to keep the local dev server consistent with client expectations.
- Prefer adding API helpers to `services/api.js` (central location) rather than scattering fetch calls in components.
- When adding features that affect roles or routing, update `AuthContext.isAdmin()` logic and the navigation in `App.js`.

## Debugging tips specific to this repo

- Check `EmergencyRelay/server/data/users.json` after creating users — it contains `password_hash` and `session` fields.
- If `AuthContext` reports `getMeServer` failed, confirm the server is running on port 5000 and the base URL is correct for the device/emulator.
- For Android emulator networking issues, use `10.0.2.2` instead of `localhost`.

## Where to look next (quick links)

- `EmergencyRelay/App.js` — navigation + `AuthProvider` usage
- `EmergencyRelay/contexts/AuthContext.js` — signIn/signOut/configureApiBase
- `EmergencyRelay/services/api.js` — token helpers, fake helpers, and server helpers
- `EmergencyRelay/screens/*.tsx` — examples of using `useAuth()` and `createUserServer`
- `EmergencyRelay/server/src/index.js` — express implementation and data persistence

If you want this file expanded with CI steps, unit test conventions, or a short dev checklist (how to test auth flows end-to-end), tell me which area to expand and I will iterate.

```## Quick orientation

This repository contains a small Expo React Native client (`/EmergencyRelay`) and a minimal Express dev server (`/EmergencyRelay/server`). The server is a development-only JSON-backed auth service. The most important files to read first are:

- `EmergencyRelay/App.js` — app root and navigation setup
- `EmergencyRelay/contexts/AuthContext.js` — app auth logic, signIn/signOut, and `configureApiBase`
- `EmergencyRelay/services/api.js` — API helpers: `loginServer`, `getMeServer`, `createUserServer`, plus dev `fakeLogin` helpers and `setApiBaseUrl`
- `EmergencyRelay/server/src/index.js` — simple Express server, endpoints and JSON storage
- `EmergencyRelay/server/data/users.json` — development user store (passwords are hashed here)

## Big-picture architecture notes (what matters to code-editing agents)

- Single-page mobile app (Expo) uses `AuthProvider` (in `contexts/AuthContext.js`) to manage session state and role-based routing (admin vs staff). Changing auth behavior almost always starts in that file.
- The client calls either the
````
