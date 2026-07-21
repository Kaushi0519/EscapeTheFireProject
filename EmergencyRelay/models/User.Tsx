export type UserRole = 'admin' | 'staff';

// Location tracking structure
export interface UserLocation {
  bssid: string;      // WiFi MAC address
  room?: string;      // Room/zone identified by admin mapping
  updated: number;    // Timestamp of last update
}

// Structure of a user object
export interface User {
  id: string;
  name: string;
  role: UserRole;
  lastLocation?: UserLocation;  // Current WiFi location
  imageUrl?: string;            // Optional profile image URL
}


// These are used to check if the user is an admin or staff member (call these when checking permissions)
export function isAdmin(user: User) {
  return user.role === 'admin';
}

export function isStaff(user: User) {
  return user.role === 'staff';
}

export default function createUser(id: string, name: string, role: UserRole): User {
  return {
    id,
    name,
    role
  };
}