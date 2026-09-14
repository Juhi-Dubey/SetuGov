import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket,
  Building2,
  LockKeyhole,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Send
} from "lucide-react";
import { registerUser, resendEmailVerification } from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

export default function StartupSignup() {
  const { isDark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [devToken, setDevToken] = useState(null);

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Full name is required";
    if (!formData.email.trim()) {
      errs.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errs.password = "Password is required";
    } else if (formData.password.length < 12) {
      errs.password = "Password must be at least 12 characters long";
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setAuthError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setAuthError("");

    try {
      // Strictly register as STARTUP
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        role: "STARTUP",
      };

      const res = await registerUser(payload);
      const data = res?.data || res;

      setRegisteredEmail(formData.email.trim());
      setIsSuccess(true);
      if (data?.dev_verification_token) {
        setDevToken(data.dev_verification_token);
      }
    } catch (err) {
      console.error("Startup registration failed:", err);
      setAuthError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    setResendStatus("");
    try {
      await resendEmailVerification(registeredEmail);
      setResendStatus("A new verification link has been sent to your email.");
    } catch (err) {
      setResendStatus(err?.message || "Failed to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Branding Section */}
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-100/80 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 lg:flex">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  SetuGov
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  National Innovation Procurement Platform
                </p>
              </div>
            </Link>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Rocket className="h-4 w-4" />
                GeM-Style Seller & Startup Onboarding
              </div>

              <h2 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white xl:text-5xl">
                Verified Onboarding for{" "}
                <span className="text-emerald-600 dark:text-emerald-400">Government Procurement.</span>
              </h2>

              <p className="mt-6 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Register your startup, verify your email, and complete your organization dossier with PAN, GST, DPIIT recognition, banking details, and private document validation to unlock state procurement tenders and sandbox contracts.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Step 1: Secure Account Creation & Email Verification</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Step 2: Organization, Business Identity & Banking Details</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Step 3: Document Verification & Government Sandbox Eligibility</span>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Public Startup Self-Registration · DPIIT & GeM Standards Compliant
            </div>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
          {/* Top Theme Switcher & Home link */}
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Step 1: Account Setup
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Create Startup Account
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Register as an innovator or enterprise to initiate organizational verification.
              </p>
            </div>

            {/* Verification Required Success Screen */}
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto mb-4">
                  <Mail className="h-6 w-6" />
                </div>

                <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white">
                  Verify Your Email Address
                </h3>

                <p className="mt-2 text-center text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  We have dispatched an email verification link to <strong>{registeredEmail}</strong>. Please check your inbox and click the verification link to activate your user account and begin the multi-step GeM-style organization onboarding wizard.
                </p>

                {devToken && (
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <p className="font-bold">Development Mode Direct Link:</p>
                    <Link
                      to={`/verify-email?token=${devToken}&email=${encodeURIComponent(registeredEmail)}`}
                      className="mt-1 block font-mono text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                    >
                      /verify-email?token={devToken}
                    </Link>
                  </div>
                )}

                {resendStatus && (
                  <p className="mt-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {resendStatus}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isResending ? "Resending..." : "Resend Verification Email"}
                  </button>

                  <Link
                    to="/login"
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Error Banner */}
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </motion.div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Authorized Signatory Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Vikramaditya Sharma"
                        className={`h-10 w-full rounded-xl border bg-white pl-10 pr-4 text-xs outline-none transition focus:ring-4 dark:bg-slate-900 ${
                          errors.name
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800"
                        }`}
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official / Founder Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="founder@innovations.in"
                        className={`h-10 w-full rounded-xl border bg-white pl-10 pr-4 text-xs outline-none transition focus:ring-4 dark:bg-slate-900 ${
                          errors.email
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800"
                        }`}
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Account Password (min. 12 characters) *
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Minimum 12 characters"
                        className={`h-10 w-full rounded-xl border bg-white pl-10 pr-10 text-xs outline-none transition focus:ring-4 dark:bg-slate-900 ${
                          errors.password
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-[11px] text-red-500">{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter your password"
                        className={`h-10 w-full rounded-xl border bg-white pl-10 pr-10 text-xs outline-none transition focus:ring-4 dark:bg-slate-900 ${
                          errors.confirmPassword
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((p) => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-[11px] text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Continue to Email Verification
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Other Gateways Links */}
                <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    Already registered?{" "}
                    <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                      Sign In to Workspace
                    </Link>
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                    <Link to="/government/request-access" className="hover:text-blue-600 underline">
                      Government Officer Access
                    </Link>
                    <span>·</span>
                    <Link to="/evaluator/apply" className="hover:text-purple-600 underline">
                      Evaluator Application
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
