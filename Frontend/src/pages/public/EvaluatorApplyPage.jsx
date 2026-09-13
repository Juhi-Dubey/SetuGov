import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Mail,
  User,
  Phone,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Clock,
} from "lucide-react";
import { submitEvaluatorApplication } from "../../services/accessRequestService";
import { useTheme } from "../../context/ThemeContext";
import TurnstileWidget from "../../components/common/TurnstileWidget";

const DOMAINS = [
  "Artificial Intelligence & Machine Learning",
  "Healthcare & MedTech Diagnostics",
  "Smart City, Urban Mobility & IoT",
  "Agriculture & Rural Supply Chain",
  "Cybersecurity, Privacy & Blockchain",
  "Clean Energy, Water & Waste Management",
  "FinTech, GovTech & Citizen Grievance Systems",
];

export default function EvaluatorApplyPage() {
  const { isDark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    employment_type: "INDEPENDENT",
    organization: "",
    designation: "",
    domain_expertise: "Artificial Intelligence & Machine Learning",
    years_experience: "5-10 years",
    bio: "",
    reason: "",
    supporting_document_url: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [resetTurnstile, setResetTurnstile] = useState(0);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Full name is required";
    if (!formData.email.trim()) {
      errs.email = "Professional email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!formData.reason.trim()) errs.reason = "Please state your reason / motivation for joining";

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

    setLoading(true);
    setSubmitError("");

    try {
      const res = await submitEvaluatorApplication({
        ...formData,
        turnstileToken,
        requested_role: "EVALUATOR",
        request_source: "EVALUATOR_SELF_REQUEST",
      });
      const data = res?.data || res;
      setSubmittedData(data);
    } catch (err) {
      console.error("Evaluator application failed:", err);
      setSubmitError(err?.message || "Failed to submit evaluator application. Please try again.");
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
                Independent Evaluator Panel
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
            className="overflow-hidden rounded-3xl border border-purple-200 bg-white p-8 shadow-sm dark:border-purple-900/40 dark:bg-slate-900 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              Evaluator Application Registered
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Your profile has been submitted to the State Innovation Evaluation Committee. You will receive an invitation token upon review and domain verification.
            </p>

            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Applicant:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formData.name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Domain Expertise:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formData.domain_expertise}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Professional Email:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{formData.email}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Review Status:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Clock className="h-3 w-3" /> PENDING ADMIN VERIFICATION
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Return to Homepage
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          /* =====================================================
             EVALUATOR APPLICATION FORM
          ===================================================== */
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Header Banner */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-purple-50 via-slate-50 to-pink-50 p-6 sm:p-8 dark:border-slate-800 dark:from-purple-950/20 dark:via-slate-900 dark:to-pink-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                    Expert Evaluation Board
                  </div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Apply to Join Evaluator Panel
                  </h1>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Join independent panels evaluating deep-tech startup proposals for state procurement. Open to employed industry leaders, academicians, and independent domain specialists.
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

              {/* Employment Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Employment Engagement Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, employment_type: "INDEPENDENT" })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                      formData.employment_type === "INDEPENDENT"
                        ? "border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/30 dark:text-purple-300"
                        : "border-slate-200 bg-slate-50/50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Independent / Consultant
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, employment_type: "EMPLOYED" })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                      formData.employment_type === "EMPLOYED"
                        ? "border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/30 dark:text-purple-300"
                        : "border-slate-200 bg-slate-50/50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Employed / Organization
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Anita Desai"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 ${
                        errors.name
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                </div>

                {/* Professional Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Professional / Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="expert@institution.edu or work email"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 ${
                        errors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs outline-none transition focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-950"
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
                      placeholder="e.g. Principal AI Scientist / Professor"
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 ${
                        errors.designation
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.designation && <p className="mt-1 text-[11px] text-red-500">{errors.designation}</p>}
                </div>

                {/* Organization (Mandatory if Employed, Optional if Independent) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization / University {formData.employment_type === "EMPLOYED" ? "*" : "(Optional for Independent)"}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="organization"
                      required={formData.employment_type === "EMPLOYED"}
                      value={formData.organization}
                      onChange={handleChange}
                      placeholder={formData.employment_type === "EMPLOYED" ? "e.g. IIT Bombay / Microsoft Research" : "Self-employed / Advisory"}
                      className={`h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 ${
                        errors.organization
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                      }`}
                    />
                  </div>
                  {errors.organization && <p className="mt-1 text-[11px] text-red-500">{errors.organization}</p>}
                </div>

                {/* Domain Expertise */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Domain Expertise *
                  </label>
                  <select
                    name="domain_expertise"
                    value={formData.domain_expertise}
                    onChange={handleChange}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs outline-none transition focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-950"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Years of Experience */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Years of Professional Experience *
                  </label>
                  <select
                    name="years_experience"
                    value={formData.years_experience}
                    onChange={handleChange}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs outline-none transition focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="3-5 years">3 - 5 years</option>
                    <option value="5-10 years">5 - 10 years</option>
                    <option value="10-15 years">10 - 15 years</option>
                    <option value="15+ years">15+ years (Senior Specialist)</option>
                  </select>
                </div>

                {/* Supporting Credentials URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    LinkedIn / Google Scholar / Resume URL (Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      name="supporting_document_url"
                      value={formData.supporting_document_url}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/... or drive link"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs outline-none transition focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Bio & Technical Summary *
                </label>
                <textarea
                  rows={2}
                  name="bio"
                  required
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Summarize your key technical achievements, patents, research papers, or industry implementations..."
                  className={`w-full rounded-xl border bg-slate-50/50 p-3 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 ${
                    errors.bio
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                  }`}
                />
                {errors.bio && <p className="mt-1 text-[11px] text-red-500">{errors.bio}</p>}
              </div>

              {/* Reason for Joining */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivation for Evaluating State Innovation Proposals *
                </label>
                <textarea
                  rows={2}
                  name="reason"
                  required
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Specify why you would like to participate in state procurement evaluation panels..."
                  className={`w-full rounded-xl border bg-slate-50/50 p-3 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 ${
                    errors.reason
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                  }`}
                />
                {errors.reason && <p className="mt-1 text-[11px] text-red-500">{errors.reason}</p>}
              </div>

              {/* Cloudflare Turnstile Verification Widget */}
              <TurnstileWidget
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
                resetTrigger={resetTurnstile}
              />

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 text-xs font-bold text-white shadow-md shadow-purple-500/15 transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting Evaluator Profile...
                    </>
                  ) : (
                    <>
                      Submit Application to Panel
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[10px] leading-relaxed text-slate-400">
                All evaluator assignments are protected by automated conflict-of-interest declarations and recusal guarantees.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
