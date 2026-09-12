import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import {
  submitEvaluatorApplication,
  submitGovernmentAccessRequest,
} from "../../services/accessRequestService";

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

  // Evaluator Application Modal State
  const [showEvaluatorModal, setShowEvaluatorModal] = useState(false);
  const [evalModalLoading, setEvalModalLoading] = useState(false);
  const [evalModalSuccess, setEvalModalSuccess] = useState(false);
  const [evalModalError, setEvalModalError] = useState("");
  const [evalForm, setEvalForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    designation: "",
    employment_type: "INDEPENDENT",
    domain_expertise: "",
    years_experience: "",
    bio: "",
    reason: "",
    supporting_document_url: "",
  });

  // Government Access Request Modal State
  const [showGovModal, setShowGovModal] = useState(false);
  const [govModalLoading, setGovModalLoading] = useState(false);
  const [govModalSuccess, setGovModalSuccess] = useState(false);
  const [govModalError, setGovModalError] = useState("");
  const [govForm, setGovForm] = useState({
    name: "",
    email: "",
    phone: "",
    department_name: "",
    state: "",
    department_code: "",
    official_website: "",
    designation: "",
    reason: "",
    supporting_document_url: "",
  });

  const handleEvaluatorSubmit = async (e) => {
    e.preventDefault();
    setEvalModalLoading(true);
    setEvalModalError("");
    try {
      await submitEvaluatorApplication({
        ...evalForm,
        domain_expertise: evalForm.domain_expertise.split(",").map((s) => s.trim()).filter(Boolean),
        years_experience: parseInt(evalForm.years_experience, 10) || 0,
      });
      setEvalModalSuccess(true);
    } catch (err) {
      setEvalModalError(err.message || "Failed to submit evaluator application.");
    } finally {
      setEvalModalLoading(false);
    }
  };

  const handleGovSubmit = async (e) => {
    e.preventDefault();
    setGovModalLoading(true);
    setGovModalError("");
    try {
      await submitGovernmentAccessRequest(govForm);
      setGovModalSuccess(true);
    } catch (err) {
      setGovModalError(err.message || "Failed to submit government access request.");
    } finally {
      setGovModalLoading(false);
    }
  };

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
            >
              <Link to="/" className="flex items-center gap-3 w-fit">
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
              </Link>
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
          {/* Top Header Controls */}
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <Building2 className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-xl font-bold">SetuGov</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Innovation Procurement OS
                  </p>
                </div>
              </Link>
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

            {/* Startup Signup Card */}
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you a deep-tech innovator or startup?
              </p>
              <Link
                to="/signup"
                className="mt-1.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <Rocket className="h-3.5 w-3.5" />
                Create Free Startup Account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-4">
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

            {/* Access Request Portals */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Privileged Access Onboarding
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  to="/evaluator/apply"
                  className="flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 text-xs font-semibold text-purple-700 transition-all hover:bg-purple-100 dark:border-purple-900/30 dark:bg-purple-950/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
                >
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  Apply as Evaluator
                </Link>

                <Link
                  to="/government/request-access"
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  Request Govt Access
                </Link>
              </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              State Innovation Procurement Platform · Standard JWT Auth
            </p>
          </motion.div>
        </div>
      </div>

      {/* =====================================================
          EVALUATOR SELF-APPLICATION MODAL
      ===================================================== */}
      {showEvaluatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8"
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider">
                <ClipboardCheck className="h-4 w-4" />
                Evaluator Onboarding
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Apply as an Innovation Evaluator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Join the verified panel to evaluate emerging startup solutions. All applications undergo administrative verification.
              </p>
            </div>

            {evalModalSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/40">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Application Submitted!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Your credentials have been submitted to SetuGov administrators. You will receive an invitation token upon verification.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowEvaluatorModal(false);
                    setEvalModalSuccess(false);
                  }}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleEvaluatorSubmit} className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
                {evalModalError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30">
                    {evalModalError}
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={evalForm.name}
                    onChange={(e) => setEvalForm({ ...evalForm, name: e.target.value })}
                    placeholder="Dr. Rajesh Sharma"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Professional Email *</label>
                    <input
                      type="email"
                      required
                      value={evalForm.email}
                      onChange={(e) => setEvalForm({ ...evalForm, email: e.target.value })}
                      placeholder="rajesh@iisc.ac.in"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={evalForm.phone}
                      onChange={(e) => setEvalForm({ ...evalForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Employment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEvalForm({ ...evalForm, employment_type: "INDEPENDENT" })}
                      className={`h-8 rounded-lg border text-xs font-medium transition-all ${
                        evalForm.employment_type === "INDEPENDENT"
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Independent / Freelancer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalForm({ ...evalForm, employment_type: "EMPLOYED" })}
                      className={`h-8 rounded-lg border text-xs font-medium transition-all ${
                        evalForm.employment_type === "EMPLOYED"
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Organization / Employed
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">
                      Organization {evalForm.employment_type === "INDEPENDENT" ? "(Optional)" : "*"}
                    </label>
                    <input
                      type="text"
                      value={evalForm.organization}
                      onChange={(e) => setEvalForm({ ...evalForm, organization: e.target.value })}
                      placeholder={evalForm.employment_type === "INDEPENDENT" ? "Independent Consultant" : "IIT Madras / AIIMS"}
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Designation</label>
                    <input
                      type="text"
                      value={evalForm.designation}
                      onChange={(e) => setEvalForm({ ...evalForm, designation: e.target.value })}
                      placeholder="Principal Scientist / AI Lead"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Domain Expertise (comma-separated) *</label>
                    <input
                      type="text"
                      required
                      value={evalForm.domain_expertise}
                      onChange={(e) => setEvalForm({ ...evalForm, domain_expertise: e.target.value })}
                      placeholder="AI, Healthcare, IoT, Smart City"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={evalForm.years_experience}
                      onChange={(e) => setEvalForm({ ...evalForm, years_experience: e.target.value })}
                      placeholder="8"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Bio / Profile Summary</label>
                  <textarea
                    rows={2}
                    value={evalForm.bio}
                    onChange={(e) => setEvalForm({ ...evalForm, bio: e.target.value })}
                    placeholder="Brief background of technical evaluation and research experience..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-2.5 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Reason for Joining SetuGov *</label>
                  <textarea
                    rows={2}
                    required
                    value={evalForm.reason}
                    onChange={(e) => setEvalForm({ ...evalForm, reason: e.target.value })}
                    placeholder="Why would you like to evaluate public innovation procurement proposals?"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-2.5 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Supporting Credentials URL (LinkedIn / Google Scholar / Portfolio)</label>
                  <input
                    type="url"
                    value={evalForm.supporting_document_url}
                    onChange={(e) => setEvalForm({ ...evalForm, supporting_document_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEvaluatorModal(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={evalModalLoading}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    {evalModalLoading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* =====================================================
          GOVERNMENT ACCESS REQUEST MODAL
      ===================================================== */}
      {showGovModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8"
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider">
                <Building2 className="h-4 w-4" />
                Government Nodal Access
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Request Official Government Access
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                For state and central department officers procuring innovative solutions. Verified by platform administrators.
              </p>
            </div>

            {govModalSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/40">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Request Submitted!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Your official access request has been sent for administrative verification. You will receive an official setup invitation upon approval.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowGovModal(false);
                    setGovModalSuccess(false);
                  }}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGovSubmit} className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
                {govModalError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30">
                    {govModalError}
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-1">Nodal Officer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={govForm.name}
                    onChange={(e) => setGovForm({ ...govForm, name: e.target.value })}
                    placeholder="Shri Ramesh Kumar"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Official Email (.gov.in / .nic.in) *</label>
                    <input
                      type="email"
                      required
                      value={govForm.email}
                      onChange={(e) => setGovForm({ ...govForm, email: e.target.value })}
                      placeholder="ramesh.kumar@health.gov.in"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Official Phone</label>
                    <input
                      type="tel"
                      value={govForm.phone}
                      onChange={(e) => setGovForm({ ...govForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Department / Ministry Name *</label>
                    <input
                      type="text"
                      required
                      value={govForm.department_name}
                      onChange={(e) => setGovForm({ ...govForm, department_name: e.target.value })}
                      placeholder="Department of Health & Family Welfare"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">State / Union Territory *</label>
                    <input
                      type="text"
                      required
                      value={govForm.state}
                      onChange={(e) => setGovForm({ ...govForm, state: e.target.value })}
                      placeholder="Karnataka"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-1">Officer Designation</label>
                    <input
                      type="text"
                      value={govForm.designation}
                      onChange={(e) => setGovForm({ ...govForm, designation: e.target.value })}
                      placeholder="Joint Secretary / Nodal Director"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Department Code</label>
                    <input
                      type="text"
                      value={govForm.department_code}
                      onChange={(e) => setGovForm({ ...govForm, department_code: e.target.value })}
                      placeholder="HFW-KA-01"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Official Website</label>
                  <input
                    type="url"
                    value={govForm.official_website}
                    onChange={(e) => setGovForm({ ...govForm, official_website: e.target.value })}
                    placeholder="https://health.karnataka.gov.in"
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Reason for Official Access *</label>
                  <textarea
                    rows={2}
                    required
                    value={govForm.reason}
                    onChange={(e) => setGovForm({ ...govForm, reason: e.target.value })}
                    placeholder="Specify planned challenges and innovation procurement needs..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-2.5 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Supporting Authorization Document URL</label>
                  <input
                    type="url"
                    value={govForm.supporting_document_url}
                    onChange={(e) => setGovForm({ ...govForm, supporting_document_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGovModal(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={govModalLoading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {govModalLoading ? "Submitting..." : "Submit Access Request"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Login;