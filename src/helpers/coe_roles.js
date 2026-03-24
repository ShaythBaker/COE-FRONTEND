// path: src/helpers/coe_roles.js
export const hasAnyRole = (userRoles = [], requiredRoles = []) => {
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) return true;
  const set = new Set(userRoles);
  return requiredRoles.some((r) => set.has(r));
};