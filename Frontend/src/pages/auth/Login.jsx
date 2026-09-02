import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const demoAccounts = [
  {
    role: "Government",
    email: "ramesh.kumar@health.gov.in",
    password: "Password123!",
    icon: Building2,
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  {
    role: "Startup",
    email: "vikas@mediqueue.ai",
    password: "Password123!",
    icon: Rocket,
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  {
    role: "Evaluator",
    email: "anita.desai@evaluators.setugov.in",
    password: "Password123!",
    icon: ClipboardCheck,
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  },
  {
    role: "Admin",
    email: "admin@setugov.in",
    password: "Password123!",
    icon: Shield,
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800",
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
    const fromPath = location.state?.from?.pathname;
    if (fromPath && fromPath !== "/login") {
      navigate(fromPath, { replace: true });
      return;
    }

    const role = String(userRole || "").toUpperCase();
    switch (role) {
      case "ADMIN":
        navigate("/admin/dashboard", { replace: true });
        break;
      case "GOVERNMENT":
        navigate("/government/dashboard", { replace: true });
        break;
      case "STARTUP":
        navigate("/startup/dashboard", { replace: true });
        break;
      case "EVALUATOR":
        navigate("/evaluator/dashboard", { replace: true });
        break;
      default:
        navigate("/role-selection", { replace: true });
        break;
    }
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

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm backdrop-blur dark:bg-white/10 dark:text-white">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  SetuGov
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Government Innovation Procurement OS
                </p>
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="max-w-xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Problem Statement 26136 · Maharashtra
              </div>

              <h2 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white xl:text-5xl">
                Transform government challenges into
                <span className="text-indigo-600 dark:text-indigo-400"> measurable innovation.</span>
              </h2>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-400">
                Connect government departments, startups, and evaluators through
                an immutable, milestone-driven innovation procurement lifecycle.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">01</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Challenge AI Copilot
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">02</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    5-Factor Matching
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">03</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
        <div className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
          {/* Top Theme Switcher */}
          <div className="absolute right-6 top-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold">SetuGov</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Innovation Procurement OS
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-bold tracking-tight">
                Sign in to SetuGov
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
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
                    className={`h-11 w-full rounded-xl border bg-white pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 ${
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
                    className={`h-11 w-full rounded-xl border bg-white pl-11 pr-12 text-sm outline-none transition-all placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 ${
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

              {/* Sign In */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Demo Quick-Fill
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Quick Demo Login Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleQuickFill(account)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-all hover:opacity-90 ${account.badgeColor}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{account.role}</p>
                      <p className="text-[10px] opacity-75 truncate">{account.email.split("@")[0]}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              State Innovation Procurement Platform · Standard JWT Auth
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Login;