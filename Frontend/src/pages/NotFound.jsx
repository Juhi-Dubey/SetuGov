import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Compass,
  FileQuestion,
  Home,
  LayoutDashboard,
  Moon,
  Search,
  ShieldAlert,
  Sun,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Smart detection of role & dashboard URL
  let dashboardUrl = "/role-selection";

  if (location.pathname.startsWith("/admin")) {
    dashboardUrl = "/admin/dashboard";
  } else if (location.pathname.startsWith("/startup")) {
    dashboardUrl = "/startup/dashboard";
  } else if (location.pathname.startsWith("/evaluator")) {
    dashboardUrl = "/evaluator/dashboard";
  } else if (location.pathname.startsWith("/government")) {
    dashboardUrl = "/government/dashboard";
  } else {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const savedRole =
        storedUser.role ||
        localStorage.getItem("role") ||
        localStorage.getItem("selectedRole");

      if (savedRole) {
        const r = savedRole.toLowerCase();
        if (r.includes("admin")) dashboardUrl = "/admin/dashboard";
        else if (r.includes("startup")) dashboardUrl = "/startup/dashboard";
        else if (r.includes("evaluator")) dashboardUrl = "/evaluator/dashboard";
        else if (r.includes("gov")) dashboardUrl = "/government/dashboard";
      }
    } catch {
      dashboardUrl = "/role-selection";
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      {/* BACKGROUND GLOW ACCENTS */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15" />

      {/* TOP BAR / THEME BUTTON */}
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-600" />
          )}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg text-center"
      >
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-bold text-indigo-700 backdrop-blur dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Error 404 • Resource Not Found</span>
        </div>

        {/* 404 BIG NUMBER */}
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-6 text-7xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-indigo-600 via-indigo-400 to-emerald-400 bg-clip-text sm:text-8xl"
        >
          404
        </motion.h1>

        {/* TITLE & DESCRIPTION */}
        <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          Page not found
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
          The requested URL{" "}
          <code className="rounded-lg bg-slate-200/80 px-2 py-0.5 font-mono text-xs text-indigo-600 dark:bg-slate-900 dark:text-indigo-400">
            {location.pathname}
          </code>{" "}
          does not exist or may have been relocated.
        </p>

        {/* ACTION BUTTONS */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <Link
            to={dashboardUrl}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 dark:shadow-indigo-500/10 sm:w-auto"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>

        {/* POPULAR QUICK LINKS */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Looking for something else?
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
            <Link
              to="/startup/challenges"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
            >
              <Compass className="h-3.5 w-3.5" />
              Challenges Directory
            </Link>

            <Link
              to="/role-selection"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
            >
              <Home className="h-3.5 w-3.5" />
              Switch Workspace
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
            >
              <FileQuestion className="h-3.5 w-3.5" />
              Sign In Page
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default NotFound;
