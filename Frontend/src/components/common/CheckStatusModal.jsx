import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  UserCheck,
  KeyRound,
  Mail,
  Loader2
} from "lucide-react";
import { checkAccessRequestStatus } from "../../services/accessRequestService";

export default function CheckStatusModal({ isOpen, onClose, initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await checkAccessRequestStatus(cleanEmail);
      if (response?.data) {
        setResult(response.data);
      } else if (response?.found === false) {
        setResult({ found: false, message: response.message });
      } else {
        setResult(response);
      }
    } catch (err) {
      console.error("Status check failed:", err);
      setError(err?.message || "Failed to query status. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = (applicantEmail) => {
    onClose();
    navigate("/login", {
      state: { prefilledEmail: applicantEmail }
    });
  };

  const status = result?.data?.status || (result?.found === false ? "NOT_FOUND" : null);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Access Request Verification
                  </h3>
                  <p className="text-xs text-slate-300">
                    Official SetuGov Status Tracker
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Search Input Form */}
            <form onSubmit={handleSearch} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Official Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. officer@nic.in or evaluator@domain.org"
                  className="w-full pl-10 pr-24 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Check</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enter the email address provided in your Government Officer or Evaluator application.
              </p>
            </form>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Results Display */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* NOT FOUND STATE */}
                {result.found === false && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Clock className="w-4 h-4" />
                      <span>No Application Found</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      We could not find an access request associated with <strong>{email}</strong>. Please verify the email spelling or submit a new access request.
                    </p>
                  </div>
                )}

                {/* APPROVED STATE */}
                {status === "APPROVED" && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-emerald-500 text-white">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                            Access Request Approved
                          </h4>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            Role: {result.data.requested_role}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                        Active
                      </span>
                    </div>

                    <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex justify-between py-0.5 border-b border-emerald-100 dark:border-emerald-900/30">
                        <span className="text-slate-500 dark:text-slate-400">Applicant:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{result.data.name}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-emerald-100 dark:border-emerald-900/30">
                        <span className="text-slate-500 dark:text-slate-400">Login ID:</span>
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{result.data.email}</span>
                      </div>
                      {result.data.organization && (
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Organization:</span>
                          <span className="text-slate-800 dark:text-slate-200">{result.data.organization}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
                      <KeyRound className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <strong>Credentials Assigned:</strong>
                        <p className="mt-0.5 text-[11px] text-blue-700 dark:text-blue-400">
                          Your login password has been issued by the Administrator and sent to your email. You can now sign in to your workspace.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProceedToLogin(result.data.email)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
                    >
                      <span>Proceed to Sign In Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* PENDING / UNDER REVIEW STATE */}
                {(status === "PENDING" || status === "UNDER_REVIEW") && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-blue-500 text-white">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-950 dark:text-blue-200">
                            {status === "UNDER_REVIEW" ? "Under Active Review" : "Application Received & Pending"}
                          </h4>
                          <span className="text-[11px] text-blue-700 dark:text-blue-400">
                            Role: {result.data.requested_role}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                        {status === "UNDER_REVIEW" ? "Under Review" : "Pending"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Your application has been logged in the system and is undergoing administrative and statutory credential verification.
                      Once approved, your <strong>Login ID & Password</strong> will be automatically dispatched to this email address.
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-blue-100 dark:border-blue-900/40">
                      Submitted on: {new Date(result.data.submitted_at).toLocaleDateString()} at {new Date(result.data.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}

                {/* REJECTED STATE */}
                {status === "REJECTED" && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-red-500 text-white">
                          <XCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-red-950 dark:text-red-200">
                            Access Request Not Approved
                          </h4>
                          <span className="text-[11px] text-red-700 dark:text-red-400">
                            Role: {result.data.requested_role}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300">
                        Declined
                      </span>
                    </div>

                    {result.data.rejection_reason && (
                      <div className="text-xs text-red-800 dark:text-red-300 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                        <span className="font-semibold">Review Remark: </span>
                        {result.data.rejection_reason}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      If you believe this is in error, please reach out with official documentation to <span className="font-medium text-slate-700 dark:text-slate-300">support@setugov.gov.in</span>.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
