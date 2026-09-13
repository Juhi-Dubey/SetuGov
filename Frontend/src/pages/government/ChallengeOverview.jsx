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
import { getChallengeById, runChallengeMatching } from "../../services/challengeService";

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
  const id = paramId || challengeId || "1";

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, [id]);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      const res = await getChallengeById(id);
      if (res?.data) {
        setChallenge(res.data);
      }
    } catch (err) {
      console.warn("Challenge load fallback:", err);
    } finally {
      setLoading(false);
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

  const displayData = {
    id: challenge?.id || id,
    title: challenge?.title || "Smart Waste Management System",
    department: challenge?.department?.name || "Urban Development Department",
    status: challenge?.status || "PUBLISHED",
    location: challenge?.location || "Maharashtra",
    description:
      challenge?.problem_description ||
      "Develop an innovative technology solution to improve municipal waste collection, monitoring, route optimization and operational efficiency.",
    desiredOutcome:
      challenge?.desired_outcome ||
      "Improve waste collection efficiency, reduce unnecessary travel and provide real-time visibility into municipal waste operations.",
    budget: challenge?.budget_max
      ? `₹${Number(challenge.budget_max).toLocaleString("en-IN")}`
      : "₹25,00,000",
    startDate: challenge?.created_at ? new Date(challenge.created_at).toLocaleDateString() : "Active",
    endDate: challenge?.pilot_duration_days ? `${challenge.pilot_duration_days} days` : "60 days",
    applications: challenge?.applications?.length ?? challenge?._count?.applications ?? 3,
    eligibleStartups: 2,
    evaluationProgress: 75,
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
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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

            <div className="flex items-center gap-3">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                View Applications
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* SUMMARY CARDS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={Users}
            label="Applications"
            value={displayData.applications}
            description="Total submitted"
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

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
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