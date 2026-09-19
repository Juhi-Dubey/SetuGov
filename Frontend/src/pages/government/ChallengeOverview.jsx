import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  ShieldCheck,
  ClipboardCheck,
  FlaskConical,
  FileSignature,
  CreditCard,
  FolderCheck,
  Gavel,
  History,
  MapPin,
  Calendar,
  IndianRupee,
  Target,
  Sparkles,
  Loader2,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengeById, runChallengeMatching, startChallengeEvaluation } from "../../services/challengeService";
import { formatPublishDate } from "../../utils/filterUtils";

const workflowItems = [
  {
    title: "Applications",
    description: "Review startup applications submitted for this challenge.",
    icon: Users,
    path: "applications",
  },
  {
    title: "Eligibility",
    description: "Check eligibility requirements and startup compliance.",
    icon: ShieldCheck,
    path: "eligibility",
  },
  {
    title: "Evaluation",
    description: "Evaluate eligible startups using 5-factor scoring metrics.",
    icon: ClipboardCheck,
    path: "evaluation",
  },
  {
    title: "Pilot",
    description: "Manage pilot execution, milestone KPIs, and live evidence.",
    icon: FlaskConical,
    path: "pilot",
  },
  {
    title: "Contract",
    description: "Manage pilot agreement and governance drafting with Brain 5.",
    icon: FileSignature,
    path: "contract",
  },
  {
    title: "Payments",
    description: "Track escrow and milestone-linked payment releases.",
    icon: CreditCard,
    path: "payments",
  },
  {
    title: "Evidence",
    description: "Review uploaded proof artifacts and field testing logs.",
    icon: FolderCheck,
    path: "evidence",
  },
  {
    title: "Decision",
    description: "Record final pilot scale-up recommendation with Brain 4.",
    icon: Gavel,
    path: "decision",
  },
  {
    title: "Audit",
    description: "Review complete challenge lifecycle and immutable audit trail.",
    icon: History,
    path: "audit",
  },
];

function ChallengeOverview() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId;

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (id) {
      loadChallenge();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      setActionError("");
      const res = await getChallengeById(id);
      if (res?.data) {
        setChallenge(res.data?.challenge || res.data);
      }
    } catch (err) {
      console.warn("Challenge load error:", err);
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = async () => {
    try {
      setTransitioning(true);
      setActionError("");
      await startChallengeEvaluation(id);
      await loadChallenge();
    } catch (err) {
      console.error("Failed to start evaluation:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to start evaluation.");
    } finally {
      setTransitioning(false);
    }
  };

  const handleRunMatching = async () => {
    try {
      setMatchingLoading(true);
      await runChallengeMatching(id);
      navigate(`/government/challenges/${id}/applications`);
    } catch (err) {
      console.warn("Matching trigger:", err);
      navigate(`/government/challenges/${id}/applications`);
    } finally {
      setMatchingLoading(false);
    }
  };

  if (!id) {
    return (
      <AppLayout role="government">
        <div className="mx-auto max-w-7xl py-12 text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Challenge Selected</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Please select a valid challenge from the repository.</p>
          <button
            onClick={() => navigate("/government/challenges")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Challenges
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!loading && !challenge) {
    return (
      <AppLayout role="government">
        <div className="mx-auto max-w-7xl py-12 text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Challenge Not Found</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">The requested challenge could not be found or you do not have permission to view it.</p>
          <button
            onClick={() => navigate("/government/challenges")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Challenges
          </button>
        </div>
      </AppLayout>
    );
  }

  const apps = challenge?.applications || [];
  const appCount = challenge?.applications?.length ?? challenge?._count?.applications ?? 0;
  const eligibleCount = apps.filter(a => ['UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'SELECTED'].includes(a.status)).length;
  const evaluatedCount = apps.filter(a => (a.evaluations && a.evaluations.length > 0) || ['SHORTLISTED', 'ACCEPTED', 'SELECTED'].includes(a.status)).length;
  const evalProgress = appCount > 0 ? Math.round((evaluatedCount / appCount) * 100) : 0;

  const displayData = {
    id: challenge?.id || id,
    title: challenge?.title || "Procurement Challenge",
    department: challenge?.department?.name || "Department Not Specified",
    status: challenge?.status || "PUBLISHED",
    location: challenge?.location || "Not specified",
    description:
      challenge?.problem_description ||
      "No detailed problem description provided for this challenge.",
    desiredOutcome:
      challenge?.desired_outcome ||
      "No specific desired outcome defined.",
    budget: challenge?.budget_max
      ? `₹${Number(challenge.budget_max).toLocaleString("en-IN")}`
      : (challenge?.budget_min ? `₹${Number(challenge.budget_min).toLocaleString("en-IN")}` : "Not specified"),
    startDate: challenge?.created_at ? new Date(challenge.created_at).toLocaleDateString() : "Active",
    publishedDate: formatPublishDate(challenge),
    endDate: challenge?.pilot_duration_days ? `${challenge.pilot_duration_days} days` : "Not specified",
    applications: appCount,
    eligibleStartups: eligibleCount,
    evaluationProgress: evalProgress,
  };

  const handleWorkflowNavigation = (path) => {
    navigate(`/government/challenges/${id}/${path}`);
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate("/government/dashboard")}
            className="back-nav"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {displayData.status}
                </span>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Published: {displayData.publishedDate}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Challenge #{displayData.id.slice ? displayData.id.slice(0, 8) : displayData.id}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {displayData.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {displayData.department} · {displayData.location}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {challenge?.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => navigate(`/government/challenges/${id}/edit`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                  <FileText className="h-4 w-4" />
                  Edit Draft
                </button>
              )}

              {challenge?.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={handleStartEvaluation}
                  disabled={transitioning}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
                >
                  {transitioning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  Start Evaluation Phase
                </button>
              )}

              <button
                type="button"
                onClick={handleRunMatching}
                disabled={matchingLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
              >
                {matchingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                )}
                Run Brain 2 Matching
              </button>

              <button
                type="button"
                onClick={() => navigate(`/government/challenges/${id}/applications`)}
                className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
              >
                View Applications
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {actionError}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={Users}
            label="Applications"
            value={displayData.applications}
            description="Total submitted (Click to view)"
            onClick={() => navigate(`/government/challenges/${id}/applications`)}
          />

          <SummaryCard
            icon={ShieldCheck}
            label="Eligible Startups"
            value={displayData.eligibleStartups}
            description="Passed compliance"
          />

          <SummaryCard
            icon={ClipboardCheck}
            label="Evaluation"
            value={`${displayData.evaluationProgress}%`}
            description="Scoring progress"
          />

          <SummaryCard
            icon={FlaskConical}
            label="Pilot Duration"
            value={displayData.endDate}
            description="Target sandbox duration"
          />
        </div>

        {/* DETAILS SECTION */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <h2 className="text-base font-semibold">Problem Statement</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {displayData.description}
            </p>

            <h2 className="mt-6 text-base font-semibold">Desired Outcome</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {displayData.desiredOutcome}
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Key Parameters</h2>
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-500">
                  <IndianRupee className="h-4 w-4" /> Budget
                </span>
                <span className="font-semibold">{displayData.budget}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4" /> Location
                </span>
                <span className="font-semibold">{displayData.location}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-500">
                  <Target className="h-4 w-4" /> Status
                </span>
                <span className="font-semibold">{displayData.status}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-500">
                  <Calendar className="h-4 w-4" /> Published Date
                </span>
                <span className="font-semibold">{displayData.publishedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW MATRIX */}
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight">Challenge Lifecycle Stages</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track and execute each phase from startup selection through pilot validation and scaling.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflowItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleWorkflowNavigation(item.path)}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, description, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${
        onClick
          ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{description}</p>
    </div>
  );
}

export default ChallengeOverview;