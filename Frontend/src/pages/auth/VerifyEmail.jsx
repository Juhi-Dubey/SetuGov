import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Mail,
  ArrowRight,
  Building2,
  Send,
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import { verifyEmail, resendEmailVerification } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";

  const navigate = useNavigate();
  const { login: setAuthSession, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found in URL. Please use the link sent to your email.");
      return;
    }

    const performVerification = async () => {
      try {
        setStatus("verifying");
        const res = await verifyEmail(token);
        const data = res?.data || res;

        if (data?.token && data?.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          await refreshUser();
        }

        setStatus("success");
      } catch (err) {
        console.error("Email verification failed:", err);
        setStatus("error");
        setErrorMessage(err?.message || "Invalid or expired email verification link.");
      }
    };

    performVerification();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendStatus("");
    try {
      await resendEmailVerification(resendEmail.trim());
      setResendStatus("A fresh verification link has been dispatched to your email address.");
    } catch (err) {
      setResendStatus(err?.message || "Failed to resend verification link.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold dark:text-white">SetuGov</h1>
            <p className="text-[11px] text-slate-500">Innovation Procurement OS</p>
          </div>
        </div>

        {status === "verifying" && (
          <div className="text-center py-6">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Verifying Your Email Address...
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Validating your cryptographic verification token.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Email Verified Successfully!
            </h2>

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your startup user account is now active. Proceed to the GeM-style organization onboarding wizard to register your company details, business identity, banking, and verification documents.
            </p>

            <button
              type="button"
              onClick={() => navigate("/startup/profile")}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
            >
              Continue to Organization Onboarding
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 mx-auto mb-4">
              <XCircle className="h-8 w-8" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Verification Failed
            </h2>

            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </p>

            <form onSubmit={handleResend} className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enter your email address to resend link <span className="text-red-500">*</span>:
              </label>
              <div className="relative mb-3">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="founder@startup.in"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {resendStatus && (
                <p className="mb-3 text-[11px] text-emerald-600 dark:text-emerald-400">
                  {resendStatus}
                </p>
              )}

              <button
                type="submit"
                disabled={isResending}
                className="btn-primary flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                <Send className="h-3.5 w-3.5" />
                {isResending ? "Dispatching..." : "Resend Verification Link"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline">
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
