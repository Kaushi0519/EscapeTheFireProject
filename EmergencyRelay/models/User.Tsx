export type UserRole = 'admin' | 'staff';

// Structure of a user object
export interface User {
  id: string;
  name: string;
  role: UserRole;
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