import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ShieldAlert } from "lucide-react";

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
    const defaultDashboard = {
      GOVERNMENT: "/government/dashboard",
      STARTUP: "/startup/dashboard",
      EVALUATOR: "/evaluator/dashboard",
      ADMIN: "/admin/dashboard",
    }[role] || "/role-selection";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/30 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your role (<strong className="font-semibold text-slate-700 dark:text-slate-300">{role || 'USER'}</strong>) does not have permission to view this section.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href={defaultDashboard}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default RoleRoute;
