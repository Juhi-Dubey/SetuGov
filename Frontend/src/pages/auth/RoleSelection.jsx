
import { useEffect, useState } from "react";
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

const roles = [
  {
    id: "government",
    title: "Government Officer",
    description:
      "Create challenges, discover startups, manage pilots, and make procurement decisions.",
    icon: Building2,
    path: "/government/dashboard",
  },
  {
    id: "startup",
    title: "Startup",
    description:
      "Discover government challenges, submit applications, and manage your pilots.",
    icon: Rocket,
    path: "/startup/dashboard",
  },
  {
    id: "evaluator",
    title: "Evaluator",
    description:
      "Review startup proposals, evaluate technical feasibility, and submit assessments.",
    icon: ClipboardCheck,
    path: "/evaluator/dashboard",
  },
  {
    id: "admin",
    title: "Admin",
    description:
      "Manage users, startups, evaluation criteria, templates, and system activity.",
    icon: Settings,
    path: "/admin/dashboard",
  },
];

function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

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
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-5xl"
        >
          {/* Header */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900"
            >
              <Building2 className="h-7 w-7" />
            </motion.div>

            <p className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              GovInnov
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              You want to login as
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select your role to access the workspace designed for your
              responsibilities.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {roles.map((role, index) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;

              return (
                <motion.button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.08,
                  }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.985 }}
                  className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-500/10"
                      : "border-slate-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50"
                  }`}
                >
                  {/* Selected indicator */}
                  <div
                    className={`absolute right-5 top-5 transition-all duration-300 ${
                      isSelected
                        ? "scale-100 opacity-100"
                        : "scale-75 opacity-0"
                    }`}
                  >
                    <CheckCircle2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  {/* Icon */}
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                      isSelected
                        ? "bg-indigo-600 text-white dark:bg-indigo-500"
                        : "bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <h2 className="text-lg font-semibold">
                    {role.title}
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {role.description}
                  </p>

                  {/* Selection label */}
                  <div
                    className={`mt-5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select this role"}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Continue Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-col items-center"
          >
            <motion.button
              type="button"
              onClick={handleContinue}
              disabled={!selectedRole}
              whileHover={{ scale: selectedRole ? 1.02 : 1 }}
              whileTap={{ scale: selectedRole ? 0.98 : 1 }}
              className="flex h-12 min-w-52 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Your role determines your workspace permissions
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default RoleSelection;

