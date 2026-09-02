import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Rocket,
  ClipboardCheck,
  Settings,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const roles = [
  {
    id: "government",
    roleKey: "GOVERNMENT",
    title: "Government Officer",
    description:
      "Create challenges, discover startups, manage pilots, and make procurement decisions.",
    icon: Building2,
    path: "/government/dashboard",
  },
  {
    id: "startup",
    roleKey: "STARTUP",
    title: "Startup",
    description:
      "Discover government challenges, submit applications, and manage your pilots.",
    icon: Rocket,
    path: "/startup/dashboard",
  },
  {
    id: "evaluator",
    roleKey: "EVALUATOR",
    title: "Evaluator",
    description:
      "Review startup proposals, evaluate technical feasibility, and submit assessments.",
    icon: ClipboardCheck,
    path: "/evaluator/dashboard",
  },
  {
    id: "admin",
    roleKey: "ADMIN",
    title: "Admin",
    description:
      "Manage users, startups, evaluation criteria, templates, and system activity.",
    icon: Settings,
    path: "/admin/dashboard",
  },
];

function RoleSelection() {
  const navigate = useNavigate();
  const { user, role: currentRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    if (currentRole) {
      const match = roles.find((r) => r.roleKey === currentRole);
      if (match) setSelectedRole(match.id);
    }
  }, [currentRole]);

  const handleContinue = () => {
    if (!selectedRole) return;
    const role = roles.find((item) => item.id === selectedRole);
    if (role) {
      navigate(role.path);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        {/* Top Theme Switcher */}
        <div className="absolute right-6 top-6 z-20">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Background decorations */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-4xl"
        >
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Role-Based Workspace
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Choose your role to continue
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {user ? `Logged in as ${user.name} (${user.role})` : "Select a workspace to explore the platform capabilities."}
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.id;
              const isUserAssignedRole = currentRole === item.roleKey;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  onClick={() => setSelectedRole(item.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
                    isSelected
                      ? "border-indigo-600 bg-white shadow-lg ring-2 ring-indigo-600/20 dark:border-indigo-400 dark:bg-slate-900 dark:ring-indigo-400/20"
                      : "border-slate-200 bg-white/80 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white dark:bg-indigo-500"
                          : "bg-slate-100 text-slate-700 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex items-center gap-2">
                      {isUserAssignedRole && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Assigned
                        </span>
                      )}
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-semibold">{item.title}</h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={!selectedRole}
              onClick={handleContinue}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-semibold text-white shadow-lg transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Continue to Workspace
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default RoleSelection;
