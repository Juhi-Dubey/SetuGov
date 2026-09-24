import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  AlertCircle,
  Shield,
  Rocket,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const demoAccounts = [
  // Canonical Main Accounts
  {
    role: "Government",
    name: "Dr. Ramesh Kumar (Director)",
    email: "ramesh.kumar@health.gov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  },
  {
    role: "Startup",
    name: "Vikas Sharma (MediQueue AI)",
    email: "vikas@mediqueue.ai",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  },
  {
    role: "Evaluator",
    name: "Dr. Anita Desai (NHA Specialist)",
    email: "anita.desai@evaluators.setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  },
  {
    role: "Admin",
    name: "Priya Sharma (State Admin)",
    email: "admin@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  },

  // Government Test Users (Govt1 - Govt5)
  {
    role: "Government",
    name: "Govt1 (Joint Director)",
    email: "govt1@setugov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  },
  {
    role: "Government",
    name: "Govt2 (Nodal Officer)",
    email: "govt2@setugov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  },
  {
    role: "Government",
    name: "Govt3 (Procurement Supt)",
    email: "govt3@setugov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  },
  {
    role: "Government",
    name: "Govt4 (Technical Officer)",
    email: "govt4@setugov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  },
  {
    role: "Government",
    name: "Govt5 (Audit Officer)",
    email: "govt5@setugov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  },

  // Startup Test Users (Startup1 - Startup5)
  {
    role: "Startup",
    name: "Startup1 (Health AI)",
    email: "startup1@setugov.in",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  },
  {
    role: "Startup",
    name: "Startup2 (TeleHealth Labs)",
    email: "startup2@setugov.in",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  },
  {
    role: "Startup",
    name: "Startup3 (CleanGov Robotics)",
    email: "startup3@setugov.in",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  },
  {
    role: "Startup",
    name: "Startup4 (SmartCity Mobility)",
    email: "startup4@setugov.in",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  },
  {
    role: "Startup",
    name: "Startup5 (CyberShield Labs)",
    email: "startup5@setugov.in",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  },

  // Evaluator Test Users (Evaluator1 - Evaluator5)
  {
    role: "Evaluator",
    name: "Evaluator1 (IISc Prof)",
    email: "evaluator1@setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  },
  {
    role: "Evaluator",
    name: "Evaluator2 (IIT Delhi)",
    email: "evaluator2@setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  },
  {
    role: "Evaluator",
    name: "Evaluator3 (NIC Director)",
    email: "evaluator3@setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  },
  {
    role: "Evaluator",
    name: "Evaluator4 (NITI Aayog)",
    email: "evaluator4@setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  },
  {
    role: "Evaluator",
    name: "Evaluator5 (AIIMS Lead)",
    email: "evaluator5@setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  },

  // Admin Test Users (Admin1 - Admin5)
  {
    role: "Admin",
    name: "Admin1 (State Lead)",
    email: "admin1@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  },
  {
    role: "Admin",
    name: "Admin2 (Gov Lead)",
    email: "admin2@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  },
  {
    role: "Admin",
    name: "Admin3 (Audit Lead)",
    email: "admin3@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  },
  {
    role: "Admin",
    name: "Admin4 (Procurement)",
    email: "admin4@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  },
  {
    role: "Admin",
    name: "Admin5 (Operations)",
    email: "admin5@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  },
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [demoRoleFilter, setDemoRoleFilter] = useState("ALL");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
    setAuthError("");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRedirectByRole = (userRole) => {
    const role = String(userRole || "").toUpperCase();
    const fromPath = location.state?.from?.pathname;

    const defaultDashboard =
      {
        ADMIN: "/admin/dashboard",
        GOVERNMENT: "/government/dashboard",
        STARTUP: "/startup/dashboard",
        EVALUATOR: "/evaluator/dashboard",
      }[role] || "/role-selection";

    // console.log(`[AUTH DEBUG] dashboard redirect role: ${role}`);
    // console.log(`[AUTH DEBUG] dashboard redirect path: ${defaultDashboard}`);

    // Validate that fromPath is strictly allowed for the authenticated role
    if (fromPath && fromPath !== "/login" && fromPath !== "/") {
      let isPathAllowed = false;

      if (role === "ADMIN") {
        isPathAllowed = true;
      } else if (role === "GOVERNMENT") {
        isPathAllowed = fromPath.startsWith("/government");
      } else if (role === "EVALUATOR") {
        isPathAllowed = fromPath.startsWith("/evaluator");
      } else if (role === "STARTUP") {
        isPathAllowed = fromPath.startsWith("/startup");
      }

      if (isPathAllowed) {
        navigate(fromPath, { replace: true });
        return;
      }
    }

    navigate(defaultDashboard, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setAuthError("");

    try {
      const result = await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      console.log(`[AUTH DEBUG] login response role: ${result.user?.role}`);
      handleRedirectByRole(result.user?.role);
    } catch (err) {
      setAuthError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (account) => {
    setFormData({
      email: account.email,
      password: account.password,
    });
    setErrors({});
    setAuthError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Branding Section */}
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-100/80 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 lg:flex">
          {/* Background decorations */}
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/20" />

          <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link to="/" className="flex items-center gap-3 w-fit">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm backdrop-blur dark:bg-white/10 dark:text-white">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    SetuGov
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Government Innovation Procurement OS
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="max-w-xl my-auto py-6"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Problem Statement 26136 · Maharashtra
              </div>

              <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-white xl:text-4xl">
                Transform government challenges into
                <span className="text-indigo-600 dark:text-indigo-400"> measurable innovation.</span>
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
                Connect government departments, startups, and evaluators through
                an immutable, milestone-driven innovation procurement lifecycle.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">01</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Challenge AI Copilot
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">02</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    5-Factor Matching
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">03</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Pilot & Scale Engine
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              End-to-End Audited & Authenticated Public Procurement
            </div>
          </div>
        </div>

        {/* Login Section */}
        <div className="relative flex items-center justify-center px-6 py-8 sm:px-8 lg:px-10">
          {/* Top Header Controls */}
          <div className="absolute right-6 top-6 lg:right-10 lg:top-10 flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-lg font-bold">SetuGov</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Innovation Procurement OS
                  </p>
                </div>
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-4">
              <p className="mb-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Welcome back
              </p>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in to SetuGov
              </h2>

              <p className="mt-2 text-xs sm:text-sm leading-5 text-slate-500 dark:text-slate-400">
                Access your procurement lifecycle workspace.
              </p>
            </div>

            {/* Global Error Banner */}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{authError}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@domain.gov.in"
                    className={`h-10 w-full rounded-xl border bg-white pl-11 pr-4 text-xs sm:text-sm outline-none transition-all placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 ${
                      errors.email
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-800"
                    }`}
                  />
                </div>

                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={`h-10 w-full rounded-xl border bg-white pl-11 pr-12 text-xs sm:text-sm outline-none transition-all placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 ${
                      errors.password
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-800"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Sign In Button */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className="btn-primary flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Startup Signup Card */}
            <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-center dark:border-slate-800/80 dark:bg-slate-900/50">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you a deep-tech innovator or startup?
              </p>
              <Link
                to="/signup"
                className="mt-1.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Rocket className="h-3.5 w-3.5" />
                Create Free Startup Account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Demo Fast-Fill (Collapsible Developer/Testing Mechanism) */}
            <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowDemoAccounts((prev) => !prev)}
                aria-expanded={showDemoAccounts}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                  Fast Test Accounts (Demo / Evaluation Mode)
                </span>
                {showDemoAccounts ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                )}
              </button>

              <AnimatePresence>
                {showDemoAccounts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {/* Role Filter Tabs */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pb-1">
                      {[
                        { id: "ALL", label: "All Users" },
                        { id: "GOVERNMENT", label: "Govt (1-5)" },
                        { id: "STARTUP", label: "Startup (1-5)" },
                        { id: "EVALUATOR", label: "Evaluator (1-5)" },
                        { id: "ADMIN", label: "Admin (1-5)" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDemoRoleFilter(tab.id)}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all ${
                            demoRoleFilter === tab.id
                              ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Test Accounts Grid */}
                    <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 pb-1">
                      {demoAccounts
                        .filter((acc) => demoRoleFilter === "ALL" || acc.role.toUpperCase() === demoRoleFilter)
                        .map((account) => {
                          const Icon = account.icon;
                          const isSelected = formData.email === account.email;
                          return (
                            <button
                              key={account.email}
                              type="button"
                              onClick={() => handleQuickFill(account)}
                              className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition-all hover:opacity-90 ${
                                account.badgeColor
                              } ${isSelected ? "ring-2 ring-indigo-500 shadow-sm" : ""}`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate leading-tight">{account.name || account.role}</p>
                                <p className="text-[10px] opacity-75 truncate">{account.email}</p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs leading-5 text-slate-400 dark:text-slate-500">
              State Innovation Procurement Platform · Standard JWT Auth
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Login;