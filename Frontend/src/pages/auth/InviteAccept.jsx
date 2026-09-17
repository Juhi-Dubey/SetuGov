import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  Clock,
  UserCheck,
  ClipboardCheck,
} from "lucide-react";
import {
  validateInvitationToken,
  acceptInvitationAndSetPassword,
} from "../../services/authService";
import { useTheme } from "../../context/ThemeContext";

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTokenError("No invitation token provided. Please use the link sent in your invitation.");
      return;
    }

    const checkToken = async () => {
      try {
        setLoading(true);
        setTokenError("");
        const res = await validateInvitationToken(token);
        const data = res?.data || res;
        setTokenInfo(data);
      } catch (err) {
        setTokenError(err?.message || "This invitation link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!password) {
      setFormError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await acceptInvitationAndSetPassword({
        token,
        password,
      });
      setIsSuccess(true);
    } catch (err) {
      setFormError(err?.message || "Failed to set password. The token may have expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGovernment = tokenInfo?.role === "GOVERNMENT";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                SetuGov
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official Credential Setup
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/login"
              className="back-nav"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-4" />
            <p className="text-xs font-medium text-slate-500">Validating official invitation token...</p>
          </div>
        ) : isSuccess ? (
          /* =====================================================
             SUCCESS CARD
          ===================================================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl dark:border-emerald-900/40 dark:bg-slate-900"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Credentials Set Successfully!
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Your official account is now verified and active. You can now log in to access your platform dashboard.
            </p>

            <div className="mt-6">
              <Link
                to="/login"
                className="btn-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
              >
                Sign In to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        ) : tokenError ? (
          /* =====================================================
             TOKEN ERROR CARD
          ===================================================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-900/40 dark:bg-slate-900"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Invitation Invalid or Expired
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {tokenError}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/login"
                className="btn-primary inline-flex h-10 w-full items-center justify-center rounded-xl bg-blue-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
              >
                Return to Sign In
              </Link>
              <Link
                to="/government/request-access"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                Request Official Access
              </Link>
            </div>
          </motion.div>
        ) : (
          /* =====================================================
             PASSWORD CREATION FORM
          ===================================================== */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header Badge */}
            <div className="mb-6 text-center">
              {isGovernment ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 mb-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Government Nodal Officer Onboarding
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 mb-2">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Evaluator Credential Setup
                </div>
              )}

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Set Your Password
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Complete your credential setup to activate your account.
              </p>
            </div>

            {/* Officer Details Card (Read-Only) */}
            <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs dark:border-slate-800/80 dark:bg-slate-950/40 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Full Name:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{tokenInfo?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{tokenInfo?.email}</span>
              </div>
              {tokenInfo?.department?.name && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{tokenInfo.department.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Role:</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">{tokenInfo?.role}</span>
              </div>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  New Password (min. 12 characters) *
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 text-xs font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    Activate Account & Finish Setup
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </main>
    </div>
  );
}
