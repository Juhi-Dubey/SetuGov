import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  CalendarDays,
  Clock3,
  IndianRupee,
  Users,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  ShieldCheck,
  Layers,
  Cpu,
  Target,
  MapPin,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Lock,
  Scale,
  Award,
  Compass,
  FileCheck2,
  Mail,
  Globe,
  Loader2,
} from "lucide-react";
import { getChallengeById } from "../../services/challengeService";
import { formatPublishDate } from "../../utils/filterUtils";

/**
 * Format currency amount cleanly to Indian numbering format (e.g. ₹25,00,000)
 */
function formatRupees(amount) {
  if (amount === undefined || amount === null || amount === "") return null;
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Resolves budget display string:
 * - If min & max: ₹min - ₹max
 * - If only max: Up to ₹max
 * - If only min: From ₹min
 * - Fallback: Not specified
 */
function formatBudgetRange(min, max, fallback) {
  const minFmt = formatRupees(min);
  const maxFmt = formatRupees(max);
  if (minFmt && maxFmt && min !== max) {
    if (Number(min) === 0) return `Up to ${maxFmt}`;
    return `${minFmt} - ${maxFmt}`;
  }
  if (maxFmt) return `Up to ${maxFmt}`;
  if (minFmt && Number(min) > 0) return `From ${minFmt}`;
  return fallback || "Not specified";
}

/**
 * Format ISO date string safely to standard Indian date (e.g. "18 Oct 2026")
 */
function formatStandardDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Statutory 5-factor scoring criteria for SetuGov challenges
 */
const STATUTORY_EVALUATION_CRITERIA = [
  {
    name: "Technical Feasibility & Architecture",
    weight: 25,
    description:
      "Architectural soundness, Technology Readiness Level (TRL), robustness of proposed tech stack, and API integration feasibility with municipal/state legacy infrastructure.",
  },
  {
    name: "Innovation & Intellectual Property",
    weight: 20,
    description:
      "Novelty of the solution, differentiation from existing procurement alternatives, proprietary models, and patents or defensible domain algorithms.",
  },
  {
    name: "Expected Impact & Outcome Improvement",
    weight: 25,
    description:
      "Quantitative potential to beat existing baseline metrics, public service delivery efficiency, reduction in incident turnaround latency, and citizen benefit.",
  },
  {
    name: "Deployment Readiness & Operational Scalability",
    weight: 15,
    description:
      "Track record of technical team, availability of deployed prototype/pilot sandbox capabilities, and readiness to scale across multiple municipal zones.",
  },
  {
    name: "Cost-Effectiveness & Unit Economics",
    weight: 15,
    description:
      "Optimal utilization of pilot grant budget, cost per beneficiary, transparent milestone costing, and sustainable long-term public maintenance viability.",
  },
];

export default function StartupChallengeDetailModal({
  challenge: initialChallenge,
  onClose,
  onApply,
}) {
  const [fullChallenge, setFullChallenge] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch complete challenge record if ID is available
  useEffect(() => {
    const targetId = initialChallenge?.id;
    if (!targetId) return;

    let isMounted = true;
    setLoadingFull(true);

    getChallengeById(targetId)
      .then((res) => {
        if (!isMounted) return;
        const ch = res?.data?.challenge || res?.challenge;
        if (ch) {
          setFullChallenge(ch);
        }
      })
      .catch((err) => {
        console.warn("[StartupChallengeDetailModal] fetch error:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingFull(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialChallenge?.id]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!initialChallenge) return null;

  // Merge initial summary data with full record
  const challenge = {
    ...initialChallenge,
    ...(fullChallenge || {}),
  };

  const department = challenge.departmentObj || challenge.department || {};
  const departmentName =
    typeof department === "object" ? department.name : String(department || "Government Department");
  const departmentState = typeof department === "object" ? department.state : null;
  const departmentEmail = typeof department === "object" ? department.contact_email : null;
  const departmentWebsite = typeof department === "object" ? department.official_website : null;
  const departmentCode = typeof department === "object" ? department.department_code : null;
  const nodalOfficerName = typeof department === "object" ? department.nodal_officer_name : null;
  const nodalOfficerDesignation = typeof department === "object" ? department.nodal_officer_designation : null;

  const category = challenge.sector || challenge.category || "GovTech";
  const publishedDate = formatPublishDate(challenge);

  // Deadline & status calculations
  const rawDeadline = challenge.application_deadline || challenge.deadlineRaw;
  const formattedDeadline = formatStandardDate(rawDeadline) || challenge.deadline || "Open Rolling";
  const isExpired = rawDeadline ? new Date(rawDeadline) < new Date() : false;

  const daysLeft = rawDeadline
    ? Math.max(0, Math.ceil((new Date(rawDeadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const budgetDisplay = formatBudgetRange(
    challenge.budget_min,
    challenge.budget_max,
    challenge.budget
  );

  const applicantsCount =
    challenge._count?.applications ??
    (Array.isArray(challenge.applications) ? challenge.applications.length : challenge.applicants ?? 0);

  const statusLabel = isExpired ? "Closed" : challenge.status === "PUBLISHED" ? "Open" : challenge.status || "Active";

  // Data collections
  const kpis = Array.isArray(challenge.kpis) ? challenge.kpis : [];
  const milestones = Array.isArray(challenge.milestones) ? challenge.milestones : [];
  const eligibilityReqs = Array.isArray(challenge.eligibility_requirements)
    ? challenge.eligibility_requirements
    : [];
  const requiredDocs = Array.isArray(challenge.required_documents)
    ? challenge.required_documents
    : [];
  const requiredTechs = Array.isArray(challenge.required_technologies)
    ? challenge.required_technologies
    : [];

  const handleCopyId = () => {
    if (challenge.id) {
      navigator.clipboard.writeText(challenge.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleApplyClick = () => {
    onApply(challenge.id);
  };

  // Build dynamic navigation tabs based on available data
  const navTabs = [
    { id: "overview", label: "Overview & Problem" },
    { id: "objective", label: "Objective & Scope" },
    ...(kpis.length > 0 ? [{ id: "kpis", label: `Deliverables & KPIs (${kpis.length})` }] : []),
    { id: "eligibility", label: "Eligibility Criteria" },
    { id: "evaluation", label: "Evaluation Methodology" },
    ...(milestones.length > 0 ? [{ id: "timeline", label: `Timeline & Milestones (${milestones.length})` }] : []),
    ...(requiredDocs.length > 0 ? [{ id: "documents", label: `Required Documents (${requiredDocs.length})` }] : []),
    ...((challenge.data_classification || challenge.ip_ownership || challenge.cybersecurity_requirements || challenge.data_compliance) ? [{ id: "governance", label: "Governance & Legal" }] : []),
    ...((departmentEmail || departmentWebsite || nodalOfficerName) ? [{ id: "department", label: "Department Info" }] : []),
  ];

  const scrollToSection = (id) => {
    setActiveTab(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 md:p-6 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25 }}
        className="relative flex flex-col w-full max-w-5xl h-[94vh] max-h-[950px] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 overflow-hidden"
      >
        {/* ===================================================== */}
        {/* MODAL HEADER (STICKY)                                 */}
        {/* ===================================================== */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-4.5 dark:border-slate-800 dark:bg-slate-950 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* TOP BADGES ROW */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Building2 className="h-3.5 w-3.5" />
                  {departmentName}
                  {departmentState && (
                    <span className="opacity-75">• {departmentState}</span>
                  )}
                </span>

                <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {category}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                    isExpired
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : statusLabel === "Open" || statusLabel === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isExpired
                        ? "bg-rose-500"
                        : statusLabel === "Open" || statusLabel === "PUBLISHED"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  {statusLabel === "PUBLISHED" ? "Open" : statusLabel}
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3 w-3" />
                  Published {publishedDate}
                </span>

                {challenge.id && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title="Click to copy Challenge ID"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    ID: {challenge.id.slice(0, 8)}...
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}

                {loadingFull && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                    Syncing latest...
                  </span>
                )}
              </div>

              {/* TITLE */}
              <h1
                id="challenge-modal-title"
                className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              >
                {challenge.title}
              </h1>
            </div>

            {/* TOP ACTIONS */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyClick}
                disabled={isExpired}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Apply Now
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close challenge details"
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* HORIZONTAL SECTION TABS */}
          <div className="mt-3 -mb-1 flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === tab.id
                    ? "bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===================================================== */}
        {/* SCROLLABLE CONTENT BODY                               */}
        {/* ===================================================== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 space-y-8 scroll-smooth">
          {/* QUICK METRICS GRID */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <MetricCard
              icon={IndianRupee}
              label="Estimated Budget"
              value={budgetDisplay}
              accent="emerald"
            />
            <MetricCard
              icon={CalendarDays}
              label="Deadline"
              value={formattedDeadline}
              accent="blue"
            />
            <MetricCard
              icon={Clock3}
              label="Time Left"
              value={
                isExpired
                  ? "Deadline Expired"
                  : daysLeft !== null
                  ? `${daysLeft} days remaining`
                  : "Rolling"
              }
              accent={isExpired ? "rose" : daysLeft !== null && daysLeft <= 7 ? "amber" : "indigo"}
            />
            <MetricCard
              icon={Users}
              label="Applicants"
              value={`${applicantsCount} registered`}
              accent="purple"
            />
            {challenge.pilot_duration_days ? (
              <MetricCard
                icon={Layers}
                label="Pilot Duration"
                value={`${challenge.pilot_duration_days} Days Trial`}
                accent="amber"
              />
            ) : null}
          </div>

          {/* SECTION: OVERVIEW & PROBLEM STATEMENT */}
          <section id="section-overview" className="space-y-5">
            <SectionHeader
              icon={AlertCircle}
              title="Problem Statement & Operational Context"
              subtitle="Detailed operational bottlenecks and current baseline provided by the department."
            />

            {/* PROBLEM DESCRIPTION (UNTRUNCATED) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Problem Description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {challenge.problem_description || "No problem statement provided."}
              </p>
            </div>

            {/* CURRENT OPERATIONAL PROCESS / BOTTLENECKS */}
            {challenge.current_process && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300">
                  <Layers className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Current Process & Operational Bottlenecks
                  </h3>
                </div>
                <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {challenge.current_process}
                </div>
              </div>
            )}

            {/* CURRENT BASELINE */}
            {challenge.current_baseline && (
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-1.5 text-blue-800 dark:text-blue-300">
                  <TrendingDown className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Pre-Innovation Operational Baseline
                  </h3>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {challenge.current_baseline}
                </p>
              </div>
            )}
          </section>

          {/* SECTION: OBJECTIVE & SCOPE */}
          <section id="section-objective" className="space-y-5">
            <SectionHeader
              icon={Target}
              title="Challenge Objectives & Operational Scope"
              subtitle="Expected transformational outcomes and operational site requirements."
            />

            {/* DESIRED OUTCOME */}
            {challenge.desired_outcome && (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-300">
                  <Target className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Target Objective & Measurable Desired Outcome
                  </h3>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                  {challenge.desired_outcome}
                </p>
              </div>
            )}

            {/* OPERATIONAL SCOPE & SITES */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {challenge.location && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    Target Operational Location
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {challenge.location}
                  </p>
                </div>
              )}

              {challenge.pilot_location && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Compass className="h-4 w-4 text-emerald-500" />
                    Sandbox Pilot Site
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {challenge.pilot_location}
                  </p>
                </div>
              )}

              {challenge.pilot_duration_days ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-amber-500" />
                    Pilot Execution Period
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {challenge.pilot_duration_days} Days Sandbox Trial
                  </p>
                </div>
              ) : null}
            </div>

            {/* REQUIRED TECHNOLOGIES */}
            {requiredTechs.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Required Technologies & Core Capabilities
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredTechs.map((tech, idx) => {
                    const techLabel =
                      typeof tech === "object" && tech !== null
                        ? tech.name || tech.label || JSON.stringify(tech)
                        : String(tech);
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        {techLabel}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STARTUP REQUIREMENTS (IF SET) */}
            {challenge.startup_requirements && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Specific Startup Capabilities
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {challenge.startup_requirements}
                </p>
              </div>
            )}
          </section>

          {/* SECTION: DELIVERABLES & KPIS */}
          {kpis.length > 0 && (
            <section id="section-kpis" className="space-y-4">
              <SectionHeader
                icon={TrendingUp}
                title="Expected Solution Deliverables & Key Performance Indicators"
                subtitle="Measurable metrics against which pilot trial performance will be evaluated."
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi, index) => {
                  const targetVal = kpi.target || kpi.target_value;
                  const baselineVal = kpi.baseline || kpi.baseline_value;
                  const unitVal = kpi.unit;
                  const weightVal = kpi.weight;
                  const direction = (kpi.direction || "").toLowerCase();

                  return (
                    <div
                      key={kpi.id || index}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {kpi.name || `KPI #${index + 1}`}
                          </h4>

                          {weightVal && (
                            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {weightVal}% Weight
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          {targetVal && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Target:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {targetVal} {unitVal && `(${unitVal})`}
                              </span>
                            </div>
                          )}

                          {baselineVal && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Baseline:</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {baselineVal} {unitVal && `(${unitVal})`}
                              </span>
                            </div>
                          )}

                          {direction && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Goal:</span>
                              <span className="inline-flex items-center gap-1 font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                                {direction === "decrease" ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {direction}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION: ELIGIBILITY & KEY CRITERIA */}
          <section id="section-eligibility" className="space-y-4">
            <SectionHeader
              icon={CheckCircle2}
              title="Eligibility Requirements & Conditions"
              subtitle="Conditions and qualifications participating startups must satisfy."
            />

            {eligibilityReqs.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {eligibilityReqs.map((req, index) => {
                  const isMandatory = req.required !== false;
                  return (
                    <div
                      key={req.id || index}
                      className="rounded-2xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              isMandatory ? "text-emerald-500" : "text-slate-400"
                            }`}
                          />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {req.name || `Criterion #${index + 1}`}
                          </h4>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            isMandatory
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {isMandatory ? "Mandatory" : "Optional"}
                        </span>
                      </div>

                      {req.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                          {req.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Standard SetuGov Statutory Innovation Sandbox Eligibility Criteria Apply:
                </p>
                <div className="grid gap-2 sm:grid-cols-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>DPIIT-recognized startup or incorporated Indian entity in good standing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>Valid GSTIN, PAN, and active statutory tax compliance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>Working technology prototype (TRL 4+) aligned with departmental problem scope</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION: EVALUATION METHODOLOGY */}
          <section id="section-evaluation" className="space-y-4">
            <SectionHeader
              icon={Scale}
              title="Official Evaluation & Selection Methodology"
              subtitle="Transparent 5-factor scoring rubric used by domain evaluators."
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STATUTORY_EVALUATION_CRITERIA.map((criterion, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {criterion.name}
                    </h4>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {criterion.weight}%
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {criterion.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-900 dark:border-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-200 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong>Blind Evaluation Policy:</strong> Proposals are evaluated independently by verified academic and industry experts with strict conflict-of-interest declarations.
              </span>
            </div>
          </section>

          {/* SECTION: TIMELINE & MILESTONES */}
          {milestones.length > 0 && (
            <section id="section-timeline" className="space-y-4">
              <SectionHeader
                icon={CalendarDays}
                title="Phased Implementation Milestones & Tranches"
                subtitle="Milestone deliverables and associated grant payment disbursals."
              />

              <div className="space-y-3">
                {milestones.map((m, index) => {
                  const paymentPct = m.paymentPercentage || m.payment_percentage;
                  const dueDate = formatStandardDate(m.dueDate || m.due_date);

                  return (
                    <div
                      key={m.id || index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-xs">
                          {index + 1}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {m.name || `Phase ${index + 1}`}
                            </h4>
                            {m.status && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">
                                {m.status.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          {m.description && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0 pl-11 sm:pl-0">
                        {paymentPct && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {paymentPct}% Disbursal
                          </span>
                        )}
                        {dueDate && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Due: {dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION: REQUIRED DOCUMENTS */}
          {requiredDocs.length > 0 && (
            <section id="section-documents" className="space-y-4">
              <SectionHeader
                icon={FileCheck2}
                title="Required Application & Compliance Documents"
                subtitle="Documentation required during proposal submission and verification."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {requiredDocs.map((doc, index) => {
                  const docName = doc.name || `Document #${index + 1}`;
                  const docDesc = doc.description;
                  const docStatus = doc.verificationStatus || doc.verification_status;
                  const docUrl = doc.url || doc.file_path;

                  return (
                    <div
                      key={doc.id || index}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {docName}
                            </h4>
                          </div>

                          {docStatus && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
                              {docStatus}
                            </span>
                          )}
                        </div>

                        {docDesc && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                            {docDesc}
                          </p>
                        )}
                      </div>

                      {docUrl && (
                        <div className="mt-3 pl-6">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Reference Document / Template
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION: GOVERNANCE, LEGAL & DATA TERMS */}
          {(challenge.data_classification ||
            challenge.ip_ownership ||
            challenge.cybersecurity_requirements ||
            challenge.data_compliance ||
            challenge.data_access_requirements ||
            challenge.data_retention_period ||
            challenge.licensing_terms ||
            challenge.confidentiality_terms) && (
            <section id="section-governance" className="space-y-4">
              <SectionHeader
                icon={ShieldCheck}
                title="Data Governance, IP Ownership & Regulatory Compliance"
                subtitle="Statutory public data boundaries, intellectual property protections, and security rules."
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {challenge.ip_ownership && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <Award className="h-4 w-4 text-emerald-500" />
                      IP Ownership Rights
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {challenge.ip_ownership === "STARTUP_OWNED"
                        ? "Startup Retains 100% IP Rights"
                        : challenge.ip_ownership}
                    </p>
                  </div>
                )}

                {challenge.data_classification && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <Lock className="h-4 w-4 text-amber-500" />
                      Data Classification
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {challenge.data_classification}
                    </p>
                  </div>
                )}

                {challenge.data_retention_period && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <Clock3 className="h-4 w-4 text-blue-500" />
                      Data Retention Period
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {challenge.data_retention_period}
                    </p>
                  </div>
                )}

                {challenge.cybersecurity_requirements && (
                  <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      Cybersecurity & System Integrity Requirements
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {challenge.cybersecurity_requirements}
                    </p>
                  </div>
                )}

                {challenge.data_compliance && (
                  <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <Scale className="h-4 w-4 text-purple-500" />
                      Statutory Data Compliance & Privacy
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {challenge.data_compliance}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SECTION: DEPARTMENT CONTACT & NODAL OFFICER */}
          {(departmentEmail || departmentWebsite || nodalOfficerName || departmentCode) && (
            <section id="section-department" className="space-y-4">
              <SectionHeader
                icon={Building2}
                title="Department & Nodal Authority Details"
                subtitle="Official contact information for public administration inquiries."
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Issuing Ministry / Department
                    </span>
                    <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
                      {departmentName}
                    </p>
                    {departmentState && (
                      <p className="text-[11px] text-slate-500">{departmentState}, India</p>
                    )}
                  </div>

                  {departmentCode && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Department Code
                      </span>
                      <p className="mt-0.5 text-xs font-mono font-semibold text-slate-900 dark:text-white">
                        {departmentCode}
                      </p>
                    </div>
                  )}

                  {departmentEmail && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Official Contact Email
                      </span>
                      <p className="mt-0.5">
                        <a
                          href={`mailto:${departmentEmail}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {departmentEmail}
                        </a>
                      </p>
                    </div>
                  )}

                  {departmentWebsite && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Official Portal
                      </span>
                      <p className="mt-0.5">
                        <a
                          href={departmentWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {departmentWebsite}
                        </a>
                      </p>
                    </div>
                  )}

                  {nodalOfficerName && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Nodal Officer
                      </span>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
                        {nodalOfficerName}
                      </p>
                      {nodalOfficerDesignation && (
                        <p className="text-[11px] text-slate-500">{nodalOfficerDesignation}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ===================================================== */}
        {/* STICKY BOTTOM ACTION BAR                             */}
        {/* ===================================================== */}
        <div className="shrink-0 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Deadline: <span className="font-bold text-slate-900 dark:text-white">{formattedDeadline}</span>
                </span>
                {daysLeft !== null && !isExpired && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {daysLeft} days left
                  </span>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                <IndianRupee className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Budget: <span className="font-bold text-slate-900 dark:text-white">{budgetDisplay}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleApplyClick}
                disabled={isExpired}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExpired ? "Applications Closed" : "Apply for this Challenge"}
                {!isExpired && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({ icon: Icon, label, value, accent = "indigo" }) {
  const accentColors = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentColors[accent] || accentColors.indigo}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
        {value}
      </p>
    </div>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-indigo-500 shrink-0" />}
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
