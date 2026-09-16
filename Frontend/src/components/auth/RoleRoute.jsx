import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function RoleRoute({ children, allowedRoles = [] }) {
  const { user, role, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAllowed = !allowedRoles || allowedRoles.length === 0 || hasRole(allowedRoles);

  if (!isAllowed) {
    const normalizedRole = String(role || user?.role || "").toUpperCase();
    const defaultDashboard =
      {
        GOVERNMENT: "/government/dashboard",
        STARTUP: "/startup/dashboard",
        EVALUATOR: "/evaluator/dashboard",
        ADMIN: "/admin/dashboard",
      }[normalizedRole] || "/login";

    console.log(`[AUTH DEBUG] dashboard redirect role: ${normalizedRole}`);
    console.log(`[AUTH DEBUG] dashboard redirect path: ${defaultDashboard}`);

    return <Navigate to={defaultDashboard} replace />;
  }

  return children;
}

export default RoleRoute;
