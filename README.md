# EmergencyRelay

This README explains how to run the local backend and the Expo React Native app, how to test the login flow, and a few troubleshooting tips.

## ID for testing:

- Email: `staff2@example.com`
- Password: `S3curePass!`

---

## Prerequisites

- Node.js (v18+ recommended, Node 24 works too)
- npm
- Expo CLI (optional: `npm install -g expo-cli`, but `npx expo` works fine)
- Android or iOS emulator / physical device for mobile testing

## Install dependencies

From the project root (this repo):

```bash
# install client deps (root expo app)
npm install

# install server deps
cd server
npm install
cd ..
```

If `npm start` inside `server` later complains about a missing package (e.g., `cors`), run `npm install cors` inside the `server` folder.

## Start the backend server

Open a terminal and run:

```bash
cd server
npm start
```

The server listens on port `5000` by default. It uses a simple JSON file at `server/data/users.json` for user storage (development only).

## Start the Expo app (client)

From the project root:

```bash
npx expo start -c
```

Then run the app on your target:

- Press `a` to open on the Android emulator (or use the Expo app on your phone)
- Press `i` to open on the iOS simulator
- Open in web (browser) with `w` (Expo web)

## Important: API base URL and emulators/devices

The client by default targets `http://localhost:5000`. That works for web and iOS simulator. For Android emulator you typically must use `http://10.0.2.2:5000` (the emulator's host gateway). For a physical phone use your computer LAN IP, e.g. `http://192.168.1.100:5000`.

To update the API base at runtime, your app exposes `configureApiBase(url)` through the `useAuth()` hook. Example use in any component:

```js
const { configureApiBase } = useAuth();
configureApiBase("http://10.0.2.2:5000");
```

I can add a small settings screen that lets you toggle this without editing code — tell me if you want that.

## Create a new user (admin endpoint)

You can create users from the command line (development only):

```bash
curl -i -X POST http://localhost:5000/admin/users/create \
  -H "Content-Type: application/json" \
  -d '{"email":"newstaff@example.com","password":"MyNewPass1!","roles":["staff"]}'
```

Or as an admin inside the app use the Create Staff Account screen — it now posts to the server's admin endpoint.

## Where user data is stored (dev)

`server/data/users.json` contains the user records (passwords are hashed). This file is for development only — in production you'd use a real database.
