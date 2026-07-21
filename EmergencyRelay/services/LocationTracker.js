/**
 * LocationTracker - manages periodic location updates via WiFi BSSID
 * Provides background location tracking while the app is active
 */

import { getConnectedBSSID, updateUserLocationWithBSSID, getUserLocationsServer } from './api';

let trackingInterval = null;
let isTracking = false;
let trackingCallbacks = {};
let lastBSSID = null;

/**
 * Start periodic location tracking
 * @param {number} intervalMs - update interval in milliseconds (default: 5000ms / 5 seconds)
 * @param {function} onLocationUpdate - callback when location updates (optional)
 * @param {function} onUsersUpdate - callback when all user locations are fetched (optional)
 * @param {function} onError - callback for errors (optional)
 */
export async function startLocationTracking(
  intervalMs = 5000,
  onLocationUpdate = null,
  onUsersUpdate = null,
  onError = null
) {
  if (isTracking) {
    console.warn('[LocationTracker] Already tracking, ignoring duplicate start');
    return;
  }

  isTracking = true;
  trackingCallbacks = {
    onLocationUpdate,
    onUsersUpdate,
    onError,
  };

  console.log(`[LocationTracker] Starting location tracking with ${intervalMs}ms interval`);

  // Run one immediately, then set interval
  await performLocationUpdate();

  trackingInterval = setInterval(async () => {
    try {
      await performLocationUpdate();
    } catch (e) {
      console.error('[LocationTracker] Error in tracking interval:', e && e.message);
      if (trackingCallbacks.onError) {
        trackingCallbacks.onError(e);
      }
    }
  }, intervalMs);
}

/**
 * Stop location tracking
 */
export function stopLocationTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  isTracking = false;
  lastBSSID = null;
  trackingCallbacks = {};
  console.log('[LocationTracker] Stopped location tracking');
}

/**
 * Check if currently tracking
 */
export function isLocationTracking() {
  return isTracking;
}

/**
 * Get the last detected BSSID
 */
export function getLastBSSID() {
  return lastBSSID;
}

/**
 * Perform a single location update cycle
 */
async function performLocationUpdate() {
  try {
    // Get current BSSID
    const bssid = await getConnectedBSSID();
    if (!bssid) {
      console.warn('[LocationTracker] No BSSID available');
      return;
    }

    // Only update server if BSSID changed
    if (bssid !== lastBSSID) {
      lastBSSID = bssid;
      console.log(`[LocationTracker] BSSID changed: ${bssid}`);

      // Send location update to server
      const result = await updateUserLocationWithBSSID(bssid);
      console.log(`[LocationTracker] Location updated: room=${result.room}`);

      if (trackingCallbacks.onLocationUpdate) {
        trackingCallbacks.onLocationUpdate({ bssid, room: result.room });
      }
    }

    // Fetch all user locations periodically
    try {
      const userLocations = await getUserLocationsServer();
      if (trackingCallbacks.onUsersUpdate) {
        trackingCallbacks.onUsersUpdate(userLocations);
      }
    } catch (e) {
      console.warn('[LocationTracker] Failed to fetch user locations:', e && e.message);
    }
  } catch (e) {
    console.error('[LocationTracker] Error in performLocationUpdate:', e && e.message);
    if (trackingCallbacks.onError) {
      trackingCallbacks.onError(e);
    }
  }
}

/**
 * Force an immediate location update (useful after permissions granted)
 */
export async function forceLocationUpdate() {
  if (!isTracking) {
    console.warn('[LocationTracker] Not currently tracking');
    return null;
  }
  try {
    await performLocationUpdate();
    return lastBSSID;
  } catch (e) {
    console.error('[LocationTracker] Force update failed:', e && e.message);
    if (trackingCallbacks.onError) {
      trackingCallbacks.onError(e);
    }
    return null;
  }
}

/**
 * Manually get current user locations (single fetch, not part of tracking loop)
 */
export async function fetchUserLocations() {
  try {
    return await getUserLocationsServer();
  } catch (e) {
    console.error('[LocationTracker] Failed to fetch user locations:', e && e.message);
    throw e;
  }
}

export default {
  startLocationTracking,
  stopLocationTracking,
  isLocationTracking,
  getLastBSSID,
  forceLocationUpdate,
  fetchUserLocations,
};
