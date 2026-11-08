export const ADMIN_ROLES = ['admin'];
export const MANAGER_ROLES = ['admin', 'manager'];
export const STAFF_ROLES = ['admin', 'manager', 'staff'];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

// The first page each role sees after signing in.
export function homeFor(role) {
  if (MANAGER_ROLES.includes(role)) return '/admin/dashboard';
  if (role === 'staff') return '/admin/check-in-out';
  return '/rooms';
}