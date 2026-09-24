import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Mail,
  User,
  Phone,
  Building2,
  Briefcase,
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

/**
 * Maps the human-readable Years of Experience dropdown values to the numeric
 * value the backend schema expects (z.coerce.number() cannot parse range strings
 * like "5-10 years" and produces NaN).
 *
 * The numeric value represents the upper bound of the selected range.
 * "15+ years" maps to 20 as a pragmatic upper-bound representative value.
 */
const YEARS_EXPERIENCE_MAP = {
  "0-2 years": 2,
  "0-3 years": 3,
  "0 - 3 years": 3,
  "3-5 years": 5,
  "3 - 5 years": 5,
  "5-10 years": 10,
  "5 - 10 years": 10,
  "10-15 years": 15,
  "10 - 15 years": 15,
  "15+ years": 20,
};

const DOMAINS = [
  "Artificial Intelligence & Machine Learning",
  "Healthcare & MedTech Diagnostics",
  "Smart City, Urban Mobility & IoT",
  "Agriculture & Rural Supply Chain",
  "Cybersecurity, Privacy & Blockchain",
  "Clean Energy, Water & Waste Management",
  "FinTech, GovTech & Citizen Grievance Systems",
  "Others",
];

/** Red asterisk for required fields — visually consistent throughout the form */
function Req() {
  return (
    <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
  );
}

/** Accessible error message displayed below an invalid field */
function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] text-red-500">
      {message}
    </p>
  );
}

export default function EvaluatorApplyPage() {
  const { isDark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    employment_type: "INDEPENDENT",
    organization: "",
    designation: "",
    domain_expertise: "",
    years_experience: "",
    bio: "",
    reason: "",
    supporting_document_url: "",
  });

  const [customDomain, setCustomDomain] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [resetTurnstile, setResetTurnstile] = useState(0);

  // Synchronous guard — prevents duplicate API calls from double-clicks or
  // React Strict Mode's double-invocation of event handlers in development.
  const isSubmitting = useRef(false);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};

    // Full Name — required, no whitespace-only
    if (!formData.name.trim()) {
      errs.name = "Please enter your full name.";
    }

    // Email — required, valid format
    if (!formData.email.trim()) {
      errs.email = "Please enter your professional / work email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    // Phone — required, validate digit count (7–15 covers Indian & international)
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!formData.phone.trim()) {
      errs.phone = "Please enter your contact phone number.";
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errs.phone = "Please enter a valid phone number (7–15 digits).";
    }

    // Designation — required, no whitespace-only
    if (!formData.designation.trim()) {
      errs.designation = "Please enter your designation or professional title.";
    }

    // Organization — required when EMPLOYED, optional when INDEPENDENT
    if (formData.employment_type === "EMPLOYED" && !formData.organization.trim()) {
      errs.organization = "Please enter your organization or institution name.";
    }

    // Domain Expertise — required
    if (!formData.domain_expertise) {
      errs.domain_expertise = "Please select or input your primary domain expertise.";
    } else if (formData.domain_expertise === "Others" && !customDomain.trim()) {
      errs.domain_expertise = "Please type your custom domain expertise.";
    }

    // Years of Experience — must be a known option
    if (!formData.years_experience || !(formData.years_experience in YEARS_EXPERIENCE_MAP)) {
      errs.years_experience = "Please select your years of professional experience.";
    }

    // Professional Bio — required, no whitespace-only
    if (!formData.bio.trim()) {
      errs.bio = "Please provide a brief professional bio or technical summary.";
    }

    // Motivation / Reason — required, no whitespace-only
    if (!formData.reason.trim()) {
      errs.reason = "Please state your motivation for joining the evaluator panel.";
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
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Synchronous double-submit guard — drop any call while one is already in flight
    if (isSubmitting.current) return;

    if (!validate()) return;

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError("Please complete the bot verification before submitting.");
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    setSubmitError("");

    try {
      const yearsNumeric = YEARS_EXPERIENCE_MAP[formData.years_experience] ?? 0;
      const finalDomain = formData.domain_expertise === "Others" ? customDomain.trim() : formData.domain_expertise;

      const res = await submitEvaluatorApplication({
        ...formData,
        domain_expertise: finalDomain,
        years_experience: yearsNumeric,
        turnstileToken,
        requested_role: "EVALUATOR",
        request_source: "EVALUATOR_SELF_REQUEST",
      });
      const data = res?.data || res;
      setSubmittedData(data);
    } catch (err) {
      console.error("Evaluator application failed:", err);

      // Duplicate application — backend sends 409 ConflictError
      if (err?.status === 409) {
        setSubmitError(
          err.message ||
            "An evaluator application with this email is already pending review. Please wait for the admin team to process it, or contact support if you believe this is an error."
        );
      } else {
        setSubmitError(
          err?.message ||
            "Failed to submit evaluator application. Please try again."
        );
      }

      setResetTurnstile((prev) => prev + 1);
      setTurnstileToken(null);
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };


  // ── Shared class helpers ──────────────────────────────────────────────────
  const inputCls = (field) =>
    `h-10 w-full rounded-xl border bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
      errors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
    }`;

  const textareaCls = (field) =>
    `w-full rounded-xl border bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
      errors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
    }`;

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
                className="btn-primary inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
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
            <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-5">

              {/* Required field legend */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Fields marked with <span className="text-red-500 font-semibold">*</span> are required.
              </p>

              {submitError && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Employment Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Employment Engagement Type <Req />
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
                  <label htmlFor="ev-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <Req />
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="ev-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Anita Desai"
                      aria-required="true"
                      aria-describedby={errors.name ? "ev-name-err" : undefined}
                      aria-invalid={!!errors.name}
                      className={inputCls("name")}
                    />
                  </div>
                  <FieldError id="ev-name-err" message={errors.name} />
                </div>

                {/* Professional Email */}
                <div>
                  <label htmlFor="ev-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Professional / Work Email <Req />
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="ev-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="expert@institution.edu or work email"
                      aria-required="true"
                      aria-describedby={errors.email ? "ev-email-err" : undefined}
                      aria-invalid={!!errors.email}
                      className={inputCls("email")}
                    />
                  </div>
                  <FieldError id="ev-email-err" message={errors.email} />
                </div>

                {/* Phone Number — required for contact */}
                <div>
                  <label htmlFor="ev-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <Req />
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="ev-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      aria-required="true"
                      aria-describedby={errors.phone ? "ev-phone-err" : undefined}
                      aria-invalid={!!errors.phone}
                      className={inputCls("phone")}
                    />
                  </div>
                  <FieldError id="ev-phone-err" message={errors.phone} />
                </div>

                {/* Designation */}
                <div>
                  <label htmlFor="ev-designation" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Title <Req />
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="ev-designation"
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. Principal AI Scientist / Professor"
                      aria-required="true"
                      aria-describedby={errors.designation ? "ev-designation-err" : undefined}
                      aria-invalid={!!errors.designation}
                      className={inputCls("designation")}
                    />
                  </div>
                  <FieldError id="ev-designation-err" message={errors.designation} />
                </div>

                {/* Organization — required when EMPLOYED, optional when INDEPENDENT */}
                <div>
                  <label htmlFor="ev-organization" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization / University{" "}
                    {formData.employment_type === "EMPLOYED"
                      ? <Req />
                      : <span className="font-normal text-slate-400">(Optional for Independent)</span>}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="ev-organization"
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      placeholder={
                        formData.employment_type === "EMPLOYED"
                          ? "e.g. IIT Bombay / Microsoft Research"
                          : "Self-employed / Advisory"
                      }
                      aria-required={formData.employment_type === "EMPLOYED"}
                      aria-describedby={errors.organization ? "ev-org-err" : undefined}
                      aria-invalid={!!errors.organization}
                      className={
                        errors.organization
                          ? "h-10 w-full rounded-xl border border-red-500 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                          : "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                      }
                    />
                  </div>
                  <FieldError id="ev-org-err" message={errors.organization} />
                </div>

                {/* Domain Expertise */}
                <div>
                  <label htmlFor="ev-domain" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Domain Expertise <Req />
                  </label>
                  <select
                    id="ev-domain"
                    name="domain_expertise"
                    value={formData.domain_expertise}
                    onChange={handleChange}
                    aria-required="true"
                    aria-describedby={errors.domain_expertise ? "ev-domain-err" : undefined}
                    aria-invalid={!!errors.domain_expertise}
                    className={`h-10 w-full rounded-xl border bg-slate-50/50 px-3 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:focus:bg-slate-900 ${
                      formData.domain_expertise === "" ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"
                    } ${
                      errors.domain_expertise
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                    }`}
                  >
                    <option value="" disabled className="bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      Input your domain
                    </option>
                    {DOMAINS.map((d) => (
                      <option key={d} value={d} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                        {d}
                      </option>
                    ))}
                  </select>

                  {formData.domain_expertise === "Others" && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customDomain}
                        onChange={(e) => {
                          setCustomDomain(e.target.value);
                          if (errors.domain_expertise) {
                            setErrors((prev) => ({ ...prev, domain_expertise: "" }));
                          }
                        }}
                        placeholder="Input your domain..."
                        className={`h-10 w-full rounded-xl border bg-slate-50/50 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 ${
                          errors.domain_expertise
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                        }`}
                      />
                    </div>
                  )}
                  <FieldError id="ev-domain-err" message={errors.domain_expertise} />
                </div>

                {/* Years of Experience */}
                <div>
                  <label htmlFor="ev-years" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Years of Professional Experience <Req />
                  </label>
                  <select
                    id="ev-years"
                    name="years_experience"
                    value={formData.years_experience}
                    onChange={handleChange}
                    aria-required="true"
                    aria-describedby={errors.years_experience ? "ev-years-err" : undefined}
                    aria-invalid={!!errors.years_experience}
                    className={`h-10 w-full rounded-xl border bg-slate-50/50 px-3 text-xs outline-none transition focus:bg-white focus:ring-4 dark:bg-slate-950 dark:focus:bg-slate-900 ${
                      formData.years_experience === "" ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"
                    } ${
                      errors.years_experience
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/10 dark:border-slate-800"
                    }`}
                  >
                    <option value="" disabled className="bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      Input years of experience
                    </option>
                    <option value="0-3 years" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">0 - 3 years</option>
                    <option value="3-5 years" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">3 - 5 years</option>
                    <option value="5-10 years" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">5 - 10 years</option>
                    <option value="10-15 years" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">10 - 15 years</option>
                    <option value="15+ years" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">15+ years (Senior Specialist)</option>
                  </select>
                  <FieldError id="ev-years-err" message={errors.years_experience} />
                </div>

                {/* Supporting Credentials URL — optional */}
                <div>
                  <label htmlFor="ev-url" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    LinkedIn / Google Scholar / Resume URL{" "}
                    <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="ev-url"
                      type="url"
                      name="supporting_document_url"
                      value={formData.supporting_document_url}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/... or drive link"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Bio */}
              <div>
                <label htmlFor="ev-bio" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Bio &amp; Technical Summary <Req />
                </label>
                <textarea
                  id="ev-bio"
                  rows={3}
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Summarize your key technical achievements, patents, research papers, or industry implementations..."
                  aria-required="true"
                  aria-describedby={errors.bio ? "ev-bio-err" : undefined}
                  aria-invalid={!!errors.bio}
                  className={textareaCls("bio")}
                />
                <FieldError id="ev-bio-err" message={errors.bio} />
              </div>

              {/* Reason for Joining */}
              <div>
                <label htmlFor="ev-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivation for Evaluating State Innovation Proposals <Req />
                </label>
                <textarea
                  id="ev-reason"
                  rows={3}
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Specify why you would like to participate in state procurement evaluation panels..."
                  aria-required="true"
                  aria-describedby={errors.reason ? "ev-reason-err" : undefined}
                  aria-invalid={!!errors.reason}
                  className={textareaCls("reason")}
                />
                <FieldError id="ev-reason-err" message={errors.reason} />
              </div>

              {/* Cloudflare Turnstile Verification Widget */}
              <TurnstileWidget
                action="evaluator_self_application"
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
