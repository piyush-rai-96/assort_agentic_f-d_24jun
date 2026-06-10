import React, { createContext, useContext, useState, useCallback } from "react";
import { authenticate, hasModuleAccess } from "../config/users.js";

const SESSION_KEY = "fd_assortment_user";

const AuthContext = createContext(null);

function loadPersistedUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadPersistedUser());

  /*
   * Attempt to log in with email + password.
   * Returns { ok: true } on success or { ok: false, message: string } on failure.
   */
  const login = useCallback((email, password) => {
    const authenticated = authenticate(email, password);
    if (!authenticated) {
      return { ok: false, message: "Invalid email or password. Please try again." };
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authenticated));
    setUser(authenticated);
    return { ok: true };
  }, []);

  /*
   * Clear session and return to the login screen.
   */
  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  /*
   * Convenience guard used by the shell and views.
   */
  const hasAccess = useCallback(
    (moduleValue) => hasModuleAccess(user, moduleValue),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
