// contexts/EmergencyContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getActiveEmergency, endEmergencyServer } from '../services/api';
import { useAuth } from './AuthContext';

export interface EmergencyLocation {
  room: string;
  floor: number;
  buildingId?: string;
}

export interface EmergencyState {
  isActive: boolean;
  emergencyId: string | null;
  type: string | null;
  location: EmergencyLocation | null;
  startedAt: Date | null;
  declaredBy: string | null;
  requiresEvacuation: boolean;
}

export interface UserEvacuationState {
  currentRoom: string | null;
  currentFloor: number | null;
  escapePath: RouteNode[];
  isEvacuated: boolean;
}

export interface RouteNode {
  roomId: string;
  floor: number;
  coordinates: { x: number; y: number };
  instruction: string;
}

interface EmergencyContextType {
  emergencyState: EmergencyState;
  userEvacuation: UserEvacuationState;
  refreshEmergencyState: () => Promise<void>;
  endEmergency: (emergencyId: string) => Promise<void>;
  updateUserLocation: (roomId: string, floor: number) => void;
  isLoading: boolean;
  error: string | null;
}

const defaultEmergencyState: EmergencyState = {
  isActive: false,
  emergencyId: null,
  type: null,
  location: null,
  startedAt: null,
  declaredBy: null,
  requiresEvacuation: false,
};

const defaultEvacuationState: UserEvacuationState = {
  currentRoom: null,
  currentFloor: null,
  escapePath: [],
  isEvacuated: false,
};

const EmergencyContext = createContext<EmergencyContextType | null>(null);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [emergencyState, setEmergencyState] = useState<EmergencyState>(defaultEmergencyState);
  const [userEvacuation, setUserEvacuation] = useState<UserEvacuationState>(defaultEvacuationState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current emergency state from server
  const refreshEmergencyState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const emergency = await getActiveEmergency();
      
      if (emergency && emergency.id) {
        // Parse floor from location string if available (e.g., "Room 201" -> floor 2)
        let floor = 1;
        const roomMatch = emergency.location?.match(/(\d)/);
        if (roomMatch) {
          const firstDigit = parseInt(roomMatch[1], 10);
          if (firstDigit >= 1 && firstDigit <= 3) {
            floor = firstDigit;
          }
        }

        setEmergencyState({
          isActive: true,
          emergencyId: emergency.id,
          type: emergency.type || 'Unknown',
          location: {
            room: emergency.location || 'Unknown',
            floor: floor,
          },
          startedAt: emergency.confirmed_at ? new Date(emergency.confirmed_at) : new Date(),
          declaredBy: emergency.staff || 'Unknown',
          requiresEvacuation: emergency.requires_evacuation || false,
        });
      } else {
        // No active emergency
        setEmergencyState(defaultEmergencyState);
        setUserEvacuation(defaultEvacuationState);
      }
    } catch (e: any) {
      console.error('[EmergencyContext] Failed to fetch emergency state:', e?.message);
      setError(e?.message || 'Failed to fetch emergency state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // End emergency (admin only)
  const endEmergency = useCallback(async (emergencyId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await endEmergencyServer(emergencyId);
      // Clear local state
      setEmergencyState(defaultEmergencyState);
      setUserEvacuation(defaultEvacuationState);
    } catch (e: any) {
      console.error('[EmergencyContext] Failed to end emergency:', e?.message);
      setError(e?.message || 'Failed to end emergency');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user's current location
  const updateUserLocation = useCallback((roomId: string, floor: number) => {
    setUserEvacuation(prev => ({
      ...prev,
      currentRoom: roomId,
      currentFloor: floor,
    }));

    // TODO: Recalculate escape path when location changes during emergency
    // For now this is a placeholder - pathfinding will be implemented later
    if (emergencyState.isActive) {
      console.log('[EmergencyContext] User location updated during emergency:', roomId, 'floor', floor);
      // Future: calculateEscapePath(roomId, floor, emergencyState.location)
    }
  }, [emergencyState.isActive]);

  // Poll for emergency state changes (only when logged in)
  useEffect(() => {
    // Don't poll if user is not logged in
    if (!user) {
      // Reset state when user logs out
      setEmergencyState(defaultEmergencyState);
      setUserEvacuation(defaultEvacuationState);
      return;
    }

    // Initial fetch
    refreshEmergencyState();

    // Poll every 5 seconds for emergency updates
    const interval = setInterval(refreshEmergencyState, 5000);
    return () => clearInterval(interval);
  }, [user, refreshEmergencyState]);

  return (
    <EmergencyContext.Provider
      value={{
        emergencyState,
        userEvacuation,
        refreshEmergencyState,
        endEmergency,
        updateUserLocation,
        isLoading,
        error,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
}

export default EmergencyContext;
