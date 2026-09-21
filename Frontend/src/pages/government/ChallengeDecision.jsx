import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  Send,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  XCircle,
  Loader2,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  Sparkles,
  ExternalLink,
  Award,
  Layers,
  Building2,
  Check
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengeById, getChallengePilot } from "../../services/challengeService";
import { createScaleDecision, getScaleDecision } from "../../services/pilotService";
import { formatPilotStatus } from "../../utils/filterUtils";

const DECISION_CONFIGS = {
  SCALE: {
    label: "Scale Up (Department Rollout)",
    shortLabel: "Scale",
    icon: TrendingUp,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    description: "Pilot demonstrated validated empirical value. Authorize full department procurement and nationwide rollout.",
    targetStatus: "SCALED"
  },
  EXTEND: {
    label: "Extend Pilot Sandbox",
    shortLabel: "Extend",
    icon: RotateCcw,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    description: "Additional operational sandbox trial or telemetry evidence is required before making a final scaling decision.",
    targetStatus: "EXTENDED"
  },
  STOP: {
    label: "Stop & Conclude Pilot",
    shortLabel: "Stop",
    icon: XCircle,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    description: "Pilot performance, technical limitations, or risk factors do not justify department adoption or further public funding.",
    targetStatus: "STOPPED"
  }
};

function ChallengeDecision() {
  const navigate = useNavigate();
  const { challengeId, id: paramId } = useParams();
  const challengeRouteId = challengeId || paramId;

  const [challenge, setChallenge] = useState(null);
  const [pilot, setPilot] = useState(null);
  const [savedDecision, setSavedDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form State
  const [selectedDecision, setSelectedDecision] = useState("SCALE"); // 'SCALE' | 'EXTEND' | 'STOP'
  const [reasoning, setReasoning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadDecisionData = useCallback(async () => {
    if (!challengeRouteId) return;
    try {
      setLoading(true);
      setFetchError(null);
      setErrorMessage("");

      // 1. Fetch Challenge Details
      const chalRes = await getChallengeById(challengeRouteId);
      const chData = chalRes?.data?.challenge || chalRes?.data || chalRes;
      setChallenge(chData);

      // 2. Fetch Pilot strictly scoped to this Challenge
      const pilotRes = await getChallengePilot(challengeRouteId).catch((err) => {
        console.warn("Could not fetch challenge pilot:", err);
        return null;
      });

      const pilotData = pilotRes?.data?.pilot !== undefined ? pilotRes.data.pilot : (pilotRes?.data || pilotRes);

      if (pilotData && pilotData.id) {
        setPilot(pilotData);

        // 3. Fetch existing ScaleDecision from PostgreSQL
        try {
          const decRes = await getScaleDecision(pilotData.id);
          const existingDecision = decRes?.data?.scaleDecision || decRes?.scaleDecision || decRes?.data || null;

          if (existingDecision && existingDecision.id) {
            setSavedDecision(existingDecision);
            setSelectedDecision(existingDecision.decision || "SCALE");
            setReasoning(existingDecision.reasoning || "");
          } else {
            setSavedDecision(null);
          }
        } catch (decErr) {
          console.warn("No previous scale decision found or error loading it:", decErr);
          setSavedDecision(null);
        }
      } else {
        setPilot(null);
        setSavedDecision(null);
      }
    } catch (err) {
      console.error("Failed to load scale decision data:", err);
      setFetchError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load challenge and pilot information from PostgreSQL."
      );
    } finally {
      setLoading(false);
    }
  }, [challengeRouteId]);

  useEffect(() => {
    loadDecisionData();
  }, [loadDecisionData]);

  // Submit Official Scale Decision
  const handleSubmitDecision = async (e) => {
    if (e) e.preventDefault();

    if (!pilot?.id) {
      setErrorMessage("Cannot record decision: No pilot found for this challenge.");
      return;
    }

    if (!selectedDecision || !["SCALE", "EXTEND", "STOP"].includes(selectedDecision)) {
      setErrorMessage("Please select a valid official decision (SCALE, EXTEND, or STOP).");
      return;
    }

    const trimmedReasoning = reasoning.trim();
    if (!trimmedReasoning || trimmedReasoning.length < 10) {
      setErrorMessage("Please provide official decision reasoning (at least 10 characters required).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const realScore =
        pilot.overall_score != null
          ? Number(pilot.overall_score)
          : pilot.kpi_score != null
          ? Number(pilot.kpi_score)
          : undefined;

      const payload = {
        decision: selectedDecision,
        reasoning: trimmedReasoning,
        ...(realScore !== undefined && !isNaN(realScore) ? { score: realScore } : {})
      };

      const res = await createScaleDecision(pilot.id, payload);
      const createdRecord = res?.data?.scaleDecision || res?.scaleDecision || res?.data;

      setSavedDecision(createdRecord || { ...payload, decision_date: new Date().toISOString() });
      setSuccessMessage(
        `Official scale decision '${selectedDecision}' recorded and finalized in PostgreSQL. Pilot status transitioned to ${DECISION_CONFIGS[selectedDecision]?.targetStatus}.`
      );

      // Reload authoritative challenge and pilot records
      await loadDecisionData();
    } catch (err) {
      console.error("Scale decision error:", err);
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to persist official scale decision to PostgreSQL."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout role="government">
        <div className="flex min-h-[450px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Resolving challenge pilot and scale decision ledger...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (fetchError) {
    return (
      <AppLayout role="government">
        <div className="mx-auto max-w-4xl py-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <h2 className="text-base font-bold text-red-900 dark:text-red-200">
                Data Loading Error
              </h2>
            </div>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={loadDecisionData}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const overallScore =
    pilot?.overall_score != null
      ? `${Number(pilot.overall_score)}%`
      : savedDecision?.score != null
      ? `${Number(savedDecision.score)}%`
      : null;

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl pb-12">
        {/* TOP BREADCRUMB & HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate(`/government/challenges/${challengeRouteId}/pilot`)}
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pilot Sandbox Management
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                <FileCheck2 className="h-3.5 w-3.5" />
                Post-Pilot Scale Governance & Sanction
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Government Scale Decision
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Evaluate empirical pilot trial results and record the department's official decision on national or state-wide scale.
              </p>
            </div>

            {pilot && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/government/challenges/${challengeRouteId}/pilot`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Layers className="h-4 w-4 text-slate-400" />
                  View Pilot Telemetry & KPIs
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* ALERTS */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Action Failed</p>
                <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Success</p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">{successMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CHALLENGE & PILOT METADATA CARD */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Building2 className="h-4 w-4" />
              Challenge Scope & Department
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              {challenge?.title || "Challenge Project"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {challenge?.problem_description || challenge?.problem_statement || "No description provided."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Department: <strong className="text-slate-700 dark:text-slate-300">{challenge?.department?.name || "Assigned Department"}</strong></span>
              <span>•</span>
              <span>Domain: <strong className="text-slate-700 dark:text-slate-300">{challenge?.domain || "General"}</strong></span>
              <span>•</span>
              <span>Budget Cap: <strong className="text-slate-700 dark:text-slate-300">₹{challenge?.budget_max ? Number(challenge.budget_max).toLocaleString("en-IN") : "—"}</strong></span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pilot Sandbox Status
            </div>
            {pilot ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {formatPilotStatus(pilot.status)}
                  </span>
                  {pilot.startup?.company_name && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                      by {pilot.startup.company_name}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <span className="text-slate-400">Empirical Score:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {overallScore || "Pending Evaluation"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  No active pilot registered
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  A pilot project must be initialized before scale decisions can be finalized.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* IF NO PILOT EXISTS: HONEST EMPTY STATE */}
        {!pilot ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No Pilot Project Linked
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
              Scale decisions can only be issued for challenges that have completed or verified empirical pilot sandboxes. Please select a startup and initialize a pilot project first.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to={`/government/challenges/${challengeRouteId}/pilot`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Go to Pilot Creation
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* RECORDED / FINALIZED SCALE DECISION CARD (IF EXISTS IN POSTGRESQL) */}
            {savedDecision && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white p-6 shadow-sm dark:border-indigo-500/20 dark:from-slate-900 dark:to-slate-950 sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Finalized Government Sanction
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                          {savedDecision.status || "FINALIZED"}
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                        Decision: {DECISION_CONFIGS[savedDecision.decision]?.label || savedDecision.decision}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold ${DECISION_CONFIGS[savedDecision.decision]?.badgeColor}`}>
                      {DECISION_CONFIGS[savedDecision.decision]?.shortLabel || savedDecision.decision}
                    </span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/90">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Official Justification & Empirical Rationale
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {savedDecision.reasoning}
                  </p>

                  <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Sanctioned by: <strong className="text-slate-700 dark:text-slate-300">{savedDecision.approver?.name || "Authorized Officer"}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Date: <strong className="text-slate-700 dark:text-slate-300">{savedDecision.decision_date ? new Date(savedDecision.decision_date).toLocaleDateString() : "Today"}</strong></span>
                    </div>

                    {savedDecision.score != null && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                        <span>Recorded Score: <strong className="text-slate-700 dark:text-slate-300">{Number(savedDecision.score)}%</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCALE DECISION FORM (IF NOT YET FINALIZED OR FOR UPDATING) */}
            <form onSubmit={handleSubmitDecision} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  {savedDecision ? "Amend / Update Scale Sanction" : "Record New Scale Decision"}
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {savedDecision ? "Revise Official Sanction" : "Select Scale Decision & Provide Justification"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select one canonical decision type and enter official justification. This action writes to PostgreSQL and updates the pilot lifecycle state.
                </p>
              </div>

              {/* DECISION SELECTION CARDS */}
              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(DECISION_CONFIGS).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedDecision === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDecision(key)}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/15 dark:border-blue-500 dark:bg-blue-600"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isSelected
                              ? "bg-white/15 text-white"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className={`mt-3.5 text-sm font-bold ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>
                          {config.label}
                        </h4>
                        <p className={`mt-1.5 text-xs leading-relaxed ${isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                          {config.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                          Target: {config.targetStatus}
                        </span>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* REASONING INPUT */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    Official Decision Reasoning & Empirical Justification *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {reasoning.trim().length} characters (min 10)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Detail the key metrics, compliance clearance, operational feasibility, and departmental approval that justifies this decision..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  required
                />
              </div>

              {/* ACTION FOOTER */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => navigate(`/government/challenges/${challengeRouteId}/pilot`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Pilot
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || reasoning.trim().length < 10}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-semibold text-white shadow-md shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Persisting to PostgreSQL...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {savedDecision ? "Update Final Decision" : "Submit Official Scale Decision"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ChallengeDecision;