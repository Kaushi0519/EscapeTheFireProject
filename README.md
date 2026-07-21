# EmergencyRelay

A mobile app for emergency management that helps Boys and Girls Club staff quickly account for and manage student rosters during evacuations. EmergencyRelay provides real-time location tracking, roster management, and administrative oversight through an intuitive, role-based interface.

## Features

- **Role-based Access**: Separate interfaces for staff and administrators
- **Real-time Roster Management**: Track student locations and status during evacuations
- **Location Tracking**: WiFi-based positioning to identify which areas users are in
- **User Management**: Administrators can create and manage staff accounts
- **Offline-ready**: Works in areas with limited connectivity

## Prerequisites

- Node.js (v18+) and npm
- Expo Go app (for mobile testing on physical devices)
- WiFi access (for app and server communication)

## Getting Started

### Installation

```bash
# Install app dependencies
cd EmergencyRelay
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### Starting the App

**Terminal 1: Start the backend server**

```bash
cd EmergencyRelay/server
npm start
```

The server runs on `http://localhost:5000`.

**Terminal 2: Start the Expo app**

```bash
cd EmergencyRelay
npm start
```

Choose your platform:

- Press `w` for **web** (browser)
- Press `a` for **Android Emulator**
- Press `i` for **iOS Simulator**
- Scan the QR code with your phone for **Physical Device**

## Configuration

The app automatically configures the API URL based on your platform:

| Platform         | API Base URL            | Notes                    |
| ---------------- | ----------------------- | ------------------------ |
| Web/Browser      | `http://localhost:5000` | Local development        |
| Android Emulator | `http://10.0.2.2:5000`  | Special emulator address |
| Physical Device  | Your machine's LAN IP   | Same WiFi network        |

### Finding Your Machine's IP

**Linux:**

```bash
hostname -I | awk '{print $1}'
```

**macOS:**

```bash
ipconfig getifaddr en0
```

**Windows:**

```bash
ipconfig
```

### For Physical Device on Different Network

If you need to test on a different network, update `EXPO_PUBLIC_API_BASE` in the environment or use a tunneling service. The app includes tunnel support via `npm start` (default), which creates a secure connection without needing to know your IP.

## Test Accounts

Use these credentials to log in:

| Role  | Email | Password | Notes             |
| ----- | ----- | -------- | ----------------- |
| Staff | `A`   | `A`      | View rosters only |
| Admin | `B`   | `B`      | Full admin access |

## Quick Start

### 1. Web Browser (Best for Quick Testing)

```bash
# Terminal 1
cd EmergencyRelay/server && npm start

# Terminal 2
cd EmergencyRelay && npm run web
```

Opens at `http://localhost:8081`.

### 2. Android Emulator

```bash
# Terminal 1
cd EmergencyRelay/server && npm start

# Terminal 2
cd EmergencyRelay && npm start
# Press 'a'
```

### 3. Physical Phone

Your phone must be on the same WiFi as your computer.

```bash
# Terminal 1
cd EmergencyRelay/server && npm start

# Terminal 2
cd EmergencyRelay && npm start
# Scan the QR code with your phone
```

**If the app can't connect:** The app will use Expo's tunnel by default. If you prefer a local IP connection, update your `app.json` configuration.

---

## Project Structure

```
EmergencyRelay/
├── App.js                # App entry point and navigation setup
├── app.json              # Expo configuration
├── screens/              # UI screens (Login, Dashboard, Rosters, etc.)
├── contexts/             # React Context (AuthContext for auth state)
├── services/             # API client utilities and location tracking
├── models/               # TypeScript data models
├── components/           # Reusable UI components (FloorMap)
└── server/               # Backend API
    ├── src/index.js      # Express server with auth endpoints
    └── data/             # Data storage (users and rosters)
```

## API Endpoints

The backend provides the following key endpoints:

- `POST /auth/login` — User login (email/password)
- `GET /auth/me` — Get current user info (requires Bearer token)
- `POST /admin/users/create` — Create new staff account (admin only)
- `GET /admin/rosters` — List all rosters (admin only)
- `POST /rosters/{id}/update` — Update roster status

All authenticated endpoints require the `Authorization: Bearer <token>` header.

## Troubleshooting

### "Network request failed" on phone

1. Verify the server is running: `cd server && npm start`
2. Check that your phone is on the same WiFi network as your computer
3. Verify the API base URL is correct for your device type
4. Test connectivity by opening the API URL directly in your phone's browser

### Android Emulator won't connect

The Android emulator uses `10.0.2.2` to reach your computer's localhost. Ensure your configuration points to this address. The app should do this automatically.

### Port 5000 is already in use

Find and terminate the existing process:

```bash
kill -9 $(lsof -ti tcp:5000)
```

Or use a different port:

```bash
PORT=5001 npm start
```

### Cache issues after updates

Clear the Expo cache when you make configuration changes:

```bash
npm start -- -c
```

## Architecture Overview

**Frontend (Expo React Native):**

- Manages user authentication via `AuthContext`
- Displays role-specific interfaces (Staff vs Admin)
- Communicates with backend via REST API in `services/api.js`
- Handles location tracking and roster management

**Backend (Express + NeDB):**

- JSON-file-based data store (development-friendly)
- Password hashing with scrypt
- Session token management
- REST API for user, roster, and location data

## Development Notes

This is a development-ready application suitable for testing and integration. The backend uses NeDB, a file-based database stored in `server/data/`, making it easy to inspect and reset data during development.

For production deployment, consider:

- Migrating to a persistent database (PostgreSQL, MongoDB)
- Implementing secure session storage
- Adding HTTPS/TLS encryption
- Setting up automated backups
- Implementing rate limiting and security hardening

## License

This project is licensed under the 0BSD License. See the LICENSE file for details.

---
