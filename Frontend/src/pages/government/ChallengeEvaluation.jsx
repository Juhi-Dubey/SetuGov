import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileText,
  Star,
  Users,
  Building2,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Scale,
  ShieldCheck,
  MessageSquare
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengeEvaluationSummary } from "../../services/challengeService";
import { getChallengeEvaluatorPool } from "../../services/evaluatorService";

const CANONICAL_CRITERIA = [
  {
    key: "technical_feasibility",
    title: "Technical Feasibility",
    weight: 25,
    description: "Evaluates technology readiness, architectural robustness, and implementation realism.",
  },
  {
    key: "expected_impact",
    title: "Expected Impact",
    weight: 25,
    description: "Measures projected operational, citizen-service, and measurable public efficiency gains.",
  },
  {
    key: "innovation",
    title: "Innovation",
    weight: 20,
    description: "Assesses originality, unique intellectual property, and technical differentiation.",
  },
  {
    key: "scalability",
    title: "Scalability",
    weight: 15,
    description: "Measures adaptability to multiple departments, locations, and high-volume workloads.",
  },
  {
    key: "cost_effectiveness",
    title: "Cost Effectiveness",
    weight: 15,
    description: "Evaluates pilot ROI, pricing realism, and ongoing operational maintenance cost.",
  },
];

function ChallengeEvaluation() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summaryData, setSummaryData] = useState(null);
  const [evaluatorPool, setEvaluatorPool] = useState([]);
  const [expandedAppId, setExpandedAppId] = useState(null);

  const loadEvaluationData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, poolRes] = await Promise.allSettled([
        getChallengeEvaluationSummary(id),
        getChallengeEvaluatorPool(id),
      ]);

      if (summaryRes.status === "fulfilled") {
        const data = summaryRes.value?.data || summaryRes.value || {};
        setSummaryData(data);
      } else {
        throw summaryRes.reason;
      }

      if (poolRes.status === "fulfilled") {
        const poolData = poolRes.value?.data || poolRes.value || [];
        setEvaluatorPool(Array.isArray(poolData) ? poolData : []);
      }
    } catch (err) {
      console.error("Failed to load evaluation summary:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load evaluation results from backend."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvaluationData();
  }, [loadEvaluationData]);

  const rankedApplications = summaryData?.ranked_applications || [];
  const requiredQuorum = summaryData?.required_quorum || 2;
  const totalApplications = summaryData?.total_applications || rankedApplications.length;

  const totalEvaluationsCount = rankedApplications.reduce(
    (acc, app) => acc + (app.evaluation_count || 0),
    0
  );

  const quorumMetCount = rankedApplications.filter(
    (app) => app.quorum_met
  ).length;

  const avgOverallScore =
    rankedApplications.length > 0
      ? (
          rankedApplications.reduce(
            (acc, app) => acc + (app.average_scores?.overall_total || 0),
            0
          ) / (rankedApplications.filter(a => a.evaluation_count > 0).length || 1)
        ).toFixed(1)
      : "0.0";

  const toggleExpand = (appId) => {
    setExpandedAppId((prev) => (prev === appId ? null : appId));
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate(`/government/challenges/${id}/applications`)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Star className="h-3.5 w-3.5" />
                Technical Evaluation & Review
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
                Technical Evaluation Summary
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {summaryData?.challenge_title
                  ? `Evaluator assessments and scored rankings for: ${summaryData.challenge_title}`
                  : "Review authoritative evaluator scorecards, criteria breakdowns, and quorum status."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Challenge ID
              </p>
              <p className="mt-0.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                {id}
              </p>
            </div>
          </div>
        </motion.div>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading evaluation results from PostgreSQL database...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20 mb-6">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-3 text-lg font-bold text-red-900 dark:text-red-300">
              Unable to Load Evaluation Summary
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400 max-w-md mx-auto">
              {error}
            </p>
            <button
              type="button"
              onClick={loadEvaluationData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && !error && (
          <>
            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Applications
                  </span>
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                  {totalApplications}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Total submitted proposals
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Evaluations Done
                  </span>
                  <Award className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                  {totalEvaluationsCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Completed scorecards
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Quorum Status
                  </span>
                  <Scale className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                  {quorumMetCount} / {rankedApplications.length || 0}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Min {requiredQuorum} reviews required
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Evaluator Pool
                  </span>
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                  {evaluatorPool.length}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Empaneled experts
                </p>
              </div>
            </div>

            {/* OFFICIAL EVALUATION CRITERIA REFERENCE */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Canonical Evaluation Framework & Weights
                  </h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Total Weight: 100%
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                {CANONICAL_CRITERIA.map((crit) => (
                  <div
                    key={crit.key}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {crit.weight}% Weight
                      </span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                      {crit.title}
                    </h3>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                      {crit.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* EMPTY STATE: NO COMPLETED EVALUATIONS */}
            {rankedApplications.length === 0 || totalEvaluationsCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
                <Star className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  No Completed Evaluator Assessments Yet
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {totalApplications === 0
                    ? "No startup applications have been submitted for this challenge yet."
                    : `Applications are awaiting evaluation by empaneled evaluators (min quorum: ${requiredQuorum} reviews per application).`}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/government/challenges/${id}/applications`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <FileText className="h-4 w-4" />
                    View Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/government/challenges/${id}/eligibility`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Check Eligibility
                  </button>
                </div>
              </div>
            ) : (
              /* RANKED APPLICATIONS LIST */
              <div className="space-y-5 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Ranked Startup Solutions ({rankedApplications.length})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ordered deterministically by composite weighted score and tie-breaker criteria.
                    </p>
                  </div>
                </div>

                {rankedApplications.map((app, index) => {
                  const isExpanded = expandedAppId === app.application_id;
                  const scores = app.average_scores || {};
                  const evaluations = Array.isArray(app.evaluations) ? app.evaluations : [];

                  return (
                    <motion.div
                      key={app.application_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900"
                    >
                      {/* CARD HEADER */}
                      <div className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                              #{app.rank || index + 1}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                  {app.startup?.company_name || "Startup Applicant"}
                                </h3>

                                {app.startup?.domain && (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {app.startup.domain}
                                  </span>
                                )}

                                {app.quorum_met ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Quorum Met ({app.evaluation_count}/{requiredQuorum})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Pending Reviews ({app.evaluation_count}/{requiredQuorum})
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Application ID: <span className="font-mono">{app.application_id}</span>
                                {app.startup?.readiness_level ? ` • TRL ${app.startup.readiness_level}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Composite Score
                              </p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {scores.overall_total !== undefined ? scores.overall_total : "—"}
                                <span className="text-xs font-normal text-slate-400"> / 100</span>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpand(app.application_id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                            >
                              {isExpanded ? "Hide Details" : "View Scorecards"}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* CRITERIA BARS */}
                        <div className="mt-6 grid gap-3 sm:grid-cols-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">Tech (25%)</span>
                              <span className="text-slate-900 dark:text-white font-mono">
                                {scores.technical_feasibility ?? 0}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, scores.technical_feasibility ?? 0))}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">Impact (25%)</span>
                              <span className="text-slate-900 dark:text-white font-mono">
                                {scores.expected_impact ?? 0}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, scores.expected_impact ?? 0))}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">Innovation (20%)</span>
                              <span className="text-slate-900 dark:text-white font-mono">
                                {scores.innovation ?? 0}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                              <div
                                className="h-full bg-purple-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, scores.innovation ?? 0))}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">Scalability (15%)</span>
                              <span className="text-slate-900 dark:text-white font-mono">
                                {scores.scalability ?? 0}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                              <div
                                className="h-full bg-amber-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, scores.scalability ?? 0))}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">Cost (15%)</span>
                              <span className="text-slate-900 dark:text-white font-mono">
                                {scores.cost_effectiveness ?? 0}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                              <div
                                className="h-full bg-rose-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, scores.cost_effectiveness ?? 0))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* EXPANDABLE EVALUATOR BREAKDOWN */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/30"
                          >
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                              Individual Evaluator Scorecards ({evaluations.length})
                            </h4>

                            {evaluations.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                No completed evaluator assessments recorded for this application.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {evaluations.map((ev, evIdx) => (
                                  <div
                                    key={ev.id || evIdx}
                                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                                          <Users className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                                            {ev.evaluator?.name || "Empaneled Evaluator"}
                                          </p>
                                          <p className="text-[10px] text-slate-400">
                                            Role: {ev.evaluator?.role || "EVALUATOR"}
                                            {ev.created_at ? ` • ${new Date(ev.created_at).toLocaleDateString()}` : ""}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                        Score: {ev.total_score} / 100
                                      </div>
                                    </div>

                                    {/* Score Pills */}
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                      <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Tech: <b>{ev.technical_score}</b>
                                      </span>
                                      <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Impact: <b>{ev.impact_score}</b>
                                      </span>
                                      <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Innovation: <b>{ev.innovation_score}</b>
                                      </span>
                                      <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Scalability: <b>{ev.scalability_score}</b>
                                      </span>
                                      <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Cost: <b>{ev.cost_score}</b>
                                      </span>
                                    </div>

                                    {/* Comments */}
                                    {ev.comments && (
                                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                                        <span>{ev.comments}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate(`/government/challenges/${id}/eligibility`)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Eligibility Review
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(`/government/challenges/${id}/applications`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm transition"
                >
                  <FileText className="h-4 w-4" />
                  View All Applications
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/government/challenges/${id}/decision`)}
                  className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
                >
                  Proceed to Pre-Award Decision
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default ChallengeEvaluation;