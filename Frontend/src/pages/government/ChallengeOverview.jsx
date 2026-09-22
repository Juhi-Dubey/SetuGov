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
  UserCheck,
  Award,
  RefreshCw,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/common/StatCard";
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
    title: "Evaluator Recruitment",
    description: "Empanel expert evaluators, manage intake, and shortlist review committee.",
    icon: UserCheck,
    path: "evaluators",
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
          <p className="mt-2 text-slate-600 dark:text-slate-300">Please select a valid challenge from the repository.</p>
          <button
            onClick={() => navigate("/government/challenges")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition dark:bg-blue-600 dark:hover:bg-blue-500"
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
          <p className="mt-2 text-slate-600 dark:text-slate-300">The requested challenge could not be found or you do not have permission to view it.</p>
          <button
            onClick={() => navigate("/government/challenges")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition dark:bg-blue-600 dark:hover:bg-blue-500"
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

  const evaluatorCount = challenge?.evaluator_pool_memberships?.length || challenge?.evaluators?.length || 0;
  const evalCount = challenge?.evaluations?.length || evaluatedCount || 0;

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
        {/* Page Header */}
        <PageHeader
          showBack
          backTo="/government/dashboard"
          backLabel="Back to Dashboard"
          badge={displayData.status}
          badgeIcon={ShieldCheck}
          title={displayData.title}
          description={`${displayData.department} · ${displayData.location}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {challenge?.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => navigate(`/government/challenges/${id}/edit`)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-xs font-semibold text-amber-800 shadow-xs transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
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
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Sparkles className="h-4 w-4" />
                  {transitioning ? "Moving to Evaluation..." : "Move to Evaluation"}
                </button>
              )}

              <button
                type="button"
                onClick={handleRunMatching}
                disabled={matchingLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {matchingLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
                Run Brain 2 Matching
              </button>

              <button
                type="button"
                onClick={() => navigate(`/government/challenges/${id}/applications`)}
                className="btn-primary inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                View Applications
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          }
        />

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {actionError}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            icon={Users}
            title="Total Applications"
            value={appCount}
            description="Submitted solutions"
            color="blue"
            onClick={() => navigate(`/government/challenges/${id}/applications`)}
          />
          <StatCard
            index={1}
            icon={Award}
            title="Assigned Evaluators"
            value={evaluatorCount}
            description="Review committee"
            color="violet"
            onClick={() => navigate(`/government/challenges/${id}/evaluators`)}
          />
          <StatCard
            index={2}
            icon={ShieldCheck}
            title="Evaluation Progress"
            value={evalCount}
            description="Completed scorecards"
            color="emerald"
            onClick={() => navigate(`/government/challenges/${id}/evaluators`)}
          />
          <StatCard
            index={3}
            icon={IndianRupee}
            title="Budget Allocation"
            value={displayData.budget}
            description={displayData.location}
            color="cyan"
          />
        </div>

        {/* MAIN DETAILS */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Problem Description</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {displayData.problemDescription}
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
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <IndianRupee className="h-4 w-4" /> Budget
                </span>
                <span className="font-semibold">{displayData.budget}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="h-4 w-4" /> Location
                </span>
                <span className="font-semibold">{displayData.location}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Target className="h-4 w-4" /> Status
                </span>
                <span className="font-semibold">{displayData.status}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
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
          <p className="text-xs text-slate-600 dark:text-slate-300">
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
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
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

export default ChallengeOverview;