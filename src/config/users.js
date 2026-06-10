/*
 * Hardcoded user registry — scraped verbatim from legacy fd-assortment-v4-2.html
 * lines 523-528 (CURRENT_USER / USERS object).
 *
 * All three users, roles, avatars, and brand colors are exact matches.
 * Emails and passwords are added for this implementation (no real DB).
 *
 * modules: "ALL" means every route value in navigation.jsx is accessible.
 *          An array lists the exact route values that are permitted.
 */

export const ALL_MODULES = "ALL";

export const USERS = [
  {
    id: "corp",
    email: "karen.m@flooranddecor.com",
    password: "Fd!Corp2025",
    name: "Karen M.",
    role: "VP Merchandising · Corporate",
    avatar: "K",
    color: "#2D6A2D",
    landing: "today",
    modules: ALL_MODULES,
  },
  {
    id: "regional",
    email: "jason.r@flooranddecor.com",
    password: "Fd!Region2025",
    name: "Jason R.",
    role: "Regional VP · Southeast Cluster",
    avatar: "J",
    color: "#0B7A6C",
    landing: "today",
    modules: ALL_MODULES,
  },
  {
    id: "store",
    email: "lisa.t@flooranddecor.com",
    password: "Fd!Store2025",
    name: "Lisa T.",
    role: "Store Manager · Atlanta Midtown",
    avatar: "L",
    color: "#D97706",
    landing: "today",
    modules: ALL_MODULES,
  },
];

/**
 * Validate email + password against the hardcoded registry.
 * Returns the matching user object (without the password field) on success,
 * or null on failure.
 */
export function authenticate(email, password) {
  const match = USERS.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password
  );
  if (!match) return null;
  // Strip the password before returning so it never leaks into state/storage.
  const { password: _pw, ...safeUser } = match;
  return safeUser;
}

/**
 * Returns whether a given user has access to a specific module value.
 */
export function hasModuleAccess(user, moduleValue) {
  if (!user) return false;
  if (user.modules === ALL_MODULES) return true;
  return Array.isArray(user.modules) && user.modules.includes(moduleValue);
}
