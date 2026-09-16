import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getCurrentUser, loginUser, logoutUser } from "../services/authService";

const AuthContext = createContext(null);

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const sessionVersionRef = useRef(0);

  const [token, setToken] = useState(() => {
    try {
      const savedToken = localStorage.getItem("token");
      if (!savedToken) return null;
      const payload = decodeJwtPayload(savedToken);
      if (payload && payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }
      return savedToken;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      const savedToken = localStorage.getItem("token");
      if (!savedToken) return null;
      const payload = decodeJwtPayload(savedToken);
      // Prioritize authoritative JWT payload role if discrepancy exists with cached user JSON
      if (payload && parsedUser && payload.role && parsedUser.role !== payload.role) {
        parsedUser.role = payload.role;
      }
      return parsedUser;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore user session on startup via GET /auth/me
  const refreshUser = useCallback(async () => {
    const version = ++sessionVersionRef.current;
    const activeToken = localStorage.getItem("token");
    if (!activeToken) {
      if (sessionVersionRef.current === version) {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
      return null;
    }

    try {
      setLoading(true);
      const response = await getCurrentUser();

      // Guard against race condition: discard if session changed while request was in flight
      if (sessionVersionRef.current !== version) {
        return null;
      }
      if (localStorage.getItem("token") !== activeToken) {
        return null;
      }

      const userData = response?.data?.user || response?.user || response?.data;
      if (userData) {
        console.log(`[AUTH DEBUG] /auth/me role: ${userData.role}`);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        return userData;
      }
    } catch (err) {
      if (sessionVersionRef.current === version && localStorage.getItem("token") === activeToken) {
        console.warn("Session restore failed:", err?.message);
        // Clear expired or revoked session
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("selectedRole");
        setUser(null);
        setToken(null);
      }
    } finally {
      if (sessionVersionRef.current === version) {
        setLoading(false);
      }
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Safe development diagnostics (Requirement 17)
  useEffect(() => {
    console.log(`[AUTH DEBUG] current user role: ${user?.role || "NONE"}`);
    console.log(`[AUTH DEBUG] current token present: ${Boolean(token)}`);
  }, [user?.role, token]);

  // Login handler
  const login = async (credentials) => {
    setError(null);
    const version = ++sessionVersionRef.current;
    try {
      // Clear legacy/stale keys before processing new session
      localStorage.removeItem("role");
      localStorage.removeItem("selectedRole");

      const response = await loginUser(credentials);
      const token = response?.data?.token || response?.token;
      const user = response?.data?.user || response?.user;

      if (!token || !user) {
        throw new Error("Invalid response from authentication server");
      }

      console.log(`[AUTH DEBUG] login response role: ${user.role}`);

      if (sessionVersionRef.current === version) {
        setToken(token);
        setUser(user);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      }

      return { success: true, user, token };
    } catch (err) {
      const message = err?.message || "Invalid email or password.";
      setError(message);
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    ++sessionVersionRef.current;
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Backend logout error:", err?.message);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("selectedRole");
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
