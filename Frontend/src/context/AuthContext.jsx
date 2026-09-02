import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getCurrentUser, loginUser, logoutUser } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore user session on startup via GET /auth/me
  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem("token");
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const response = await getCurrentUser();
      const userData = response?.data?.user || response?.user || response?.data;
      if (userData) {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        return userData;
      }
    } catch (err) {
      console.warn("Session restore failed:", err?.message);
      // Clear expired or revoked session
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login handler
  const login = async (credentials) => {
    setError(null);
    try {
      const response = await loginUser(credentials);
      const token = response?.data?.token || response?.token;
      const user = response?.data?.user || response?.user;

      if (!token || !user) {
        throw new Error("Invalid response from authentication server");
      }

      setToken(token);
      setUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      return { success: true, user, token };
    } catch (err) {
      const message = err?.message || "Invalid email or password.";
      setError(message);
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Backend logout error:", err?.message);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  // Check role helper (case-insensitive)
  const hasRole = useCallback(
    (allowedRoles) => {
      if (!user || !user.role) return false;
      const userRole = String(user.role).toUpperCase();
      if (Array.isArray(allowedRoles)) {
        return allowedRoles.map((r) => String(r).toUpperCase()).includes(userRole);
      }
      return userRole === String(allowedRoles).toUpperCase();
    },
    [user]
  );

  const value = {
    user,
    token,
    role: user?.role ? String(user.role).toUpperCase() : null,
    isAuthenticated: Boolean(token && user),
    loading,
    error,
    login,
    logout,
    refreshUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
