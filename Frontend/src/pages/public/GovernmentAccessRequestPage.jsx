import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Mail,
  User,
  Phone,
  Briefcase,
  MapPin,
  Globe,
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  Clock,
} from "lucide-react";
import { submitGovernmentAccessRequest } from "../../services/accessRequestService";
import { useTheme } from "../../context/ThemeContext";
import TurnstileWidget from "../../components/common/TurnstileWidget";

const INDIAN_STATES = [
  "Maharashtra",
  "Karnataka",
  "Telangana",
  "Tamil Nadu",
  "Gujarat",
  "Delhi",
  "Uttar Pradesh",
  "Rajasthan",
  "Madhya Pradesh",
  "Kerala",
  "Andhra Pradesh",
  "West Bengal",
  "Punjab",
  "Haryana",
  "Odisha",
  "Assam",
  "Bihar",
  "Other State / Central UT",
];

export default function GovernmentAccessRequestPage() {
  const { isDark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department_name: "",
    designation: "",
    state: "",
    department_code: "",
    official_website: "",
    supporting_document_url: "",
    reason: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [resetTurnstile, setResetTurnstile] = useState(0);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Officer name is required";
    if (!formData.email.trim()) {
      errs.email = "Official email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!formData.department_name.trim()) errs.department_name = "Department name is required";
    if (!formData.designation.trim()) errs.designation = "Designation / Role is required";
    if (!formData.state.trim()) errs.state = "State is required";
    if (!formData.reason.trim()) errs.reason = "Please provide the official purpose or challenges to be posted";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError("Please complete the bot verification before submitting.");
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const res = await submitGovernmentAccessRequest({
        ...formData,
        turnstileToken,
        requested_role: "GOVERNMENT",
        request_source: "GOVERNMENT_SELF_REQUEST",
      });
      const data = res?.data || res;
      setSubmittedData(data);
    } catch (err) {
      console.error("Government access request failed:", err);
      setSubmitError(err?.message || "Failed to submit official access request. Please try again.");
      setResetTurnstile((prev) => prev + 1);
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

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
                Official Government Access Gateway
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
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {submittedData ? (
          /* =====================================================
             SUCCESS CONFIRMATION SCREEN
          ===================================================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-3xl border border-blue-200 bg-white p-8 shadow-sm dark:border-blue-900/40 dark:bg-slate-900 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              Official Access Request Submitted
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Your application for official government procurement access has been registered and forwarded to the State Administrator Review Committee.
            </p>

            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Applicant:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formData.name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formData.department_name} ({formData.state})</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formData.email}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Verification Status:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Clock className="h-3 w-3" /> PENDING ADMIN REVIEW
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="btn-primary inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                Return to Homepage
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                Go to Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          /* =====================================================
             ACCESS REQUEST FORM
          ===================================================== */
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Header Banner */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 p-6 sm:p-8 dark:border-slate-800 dark:from-blue-950/20 dark:via-slate-900 dark:to-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                    Official Government Channel
                  </div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Request Official Department Access
                  </h1>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Government officer accounts are strictly provisioned following official department verification. Please submit your official credentials below.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {submitError && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Officer Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Ramesh Kumar, IAS"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
                        errors.name
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email (.gov.in / .nic.in / state domain) *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="officer.name@health.gov.in"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
                        errors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 22 2202 0000"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Title *
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="designation"
                      required
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. Joint Secretary / Director IT"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
                        errors.designation
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.designation && <p className="mt-1 text-[11px] text-red-500">{errors.designation}</p>}
                </div>

                {/* Department Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department / Ministry Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="department_name"
                      required
                      value={formData.department_name}
                      onChange={handleChange}
                      placeholder="e.g. Public Health & Family Welfare"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
                        errors.department_name
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.department_name && <p className="mt-1 text-[11px] text-red-500">{errors.department_name}</p>}
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    State / Union Territory *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department Code / File Reference (Optional)
                  </label>
                  <input
                    type="text"
                    name="department_code"
                    value={formData.department_code}
                    onChange={handleChange}
                    placeholder="e.g. MH-HLTH-2026"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                  />
                </div>

                {/* Official Website */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Department Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      name="official_website"
                      value={formData.official_website}
                      onChange={handleChange}
                      placeholder="https://health.maharashtra.gov.in"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Reason for Access */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Official Access / Innovation Procurement Scope *
                </label>
                <textarea
                  rows={3}
                  name="reason"
                  required
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Specify planned challenges, civic pain points, or sandbox pilot requirements..."
                  className={`w-full rounded-xl border bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
                    errors.reason
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-800"
                  }`}
                />
                {errors.reason && <p className="mt-1 text-[11px] text-red-500">{errors.reason}</p>}
              </div>

              {/* Supporting Document */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supporting Authorization Document / Office Order URL (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    name="supporting_document_url"
                    value={formData.supporting_document_url}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/... or official letter URL"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              {/* Cloudflare Turnstile Verification Widget */}
              <TurnstileWidget
                action="government_access_request"
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => {
                  setTurnstileToken(null);
                  setSubmitError("Bot verification encountered an issue. Please try again.");
                }}
                resetTrigger={resetTurnstile}
              />

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-md shadow-blue-500/15 transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting Official Access Request...
                    </>
                  ) : (
                    <>
                      Submit Access Request
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[10px] leading-relaxed text-slate-400">
                Official credentials are independently verified by the State Administrator before secure access activation.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
