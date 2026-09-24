import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  FlaskConical,
  Send,
  ShieldCheck,
  Target,
  AlertCircle,
  AlertTriangle,
  BarChart2,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPilotById,
  createValidation,
  getPilotValidations,
} from "../../services/pilotService";
import { openDocumentSecurely } from "../../utils/documentUtils.js";

function EvaluatorPilotDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [pilot, setPilot] = useState(null);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validation Form Scores (Authoritative Backend Rubric)
  const [scores, setScores] = useState({
    performance_score: "",
    kpi_achievement_score: "",
    evidence_quality_score: "",
    technical_stability_score: "",
    user_satisfaction_score: "",
  });
  const [validationStatus, setValidationStatus] = useState("VALIDATED");
  const [comments, setComments] = useState("");

  const rubric = [
    {
      key: "performance_score",
      label: "Operational Performance",
      weight: 25,
      description: "Overall deployment uptime, speed, throughput, and system stability under real government operational conditions.",
    },
    {
      key: "kpi_achievement_score",
      label: "KPI Target Achievement",
      weight: 25,
      description: "Extent to which quantifiable metrics, baseline benchmarks, and agreed success thresholds were achieved.",
    },
    {
      key: "evidence_quality_score",
      label: "Evidence & Empirical Data Quality",
      weight: 20,
      description: "Completeness, authenticity, reproducibility, and auditability of uploaded evidence logs and measurement datasets.",
    },
    {
      key: "technical_stability_score",
      label: "Technical Architecture & Stability",
      weight: 15,
      description: "Software robustness, security posture, zero critical defect tolerance, and maintainability.",
    },
    {
      key: "user_satisfaction_score",
      label: "Beneficiary / User Satisfaction",
      weight: 15,
      description: "End-user adoption feedback, administrative ease of use, and feedback from participating government department staff.",
    },
  ];

  useEffect(() => {
    loadPilotData();
  }, [id]);

  const loadPilotData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      const [pilotRes, valRes] = await Promise.all([
        getPilotById(id),
        getPilotValidations(id).catch(() => ({ data: [] })),
      ]);

      const rawPilot = pilotRes?.data?.pilot || pilotRes?.pilot || pilotRes?.data || pilotRes;
      setPilot(rawPilot);

      const valList = valRes?.data?.validations || valRes?.data || valRes || [];
      const list = Array.isArray(valList) ? valList : [];
      setValidations(list);

      // If already validated by this evaluator or overall
      if (list.length > 0) {
        const first = list[0];
        setScores({
          performance_score: first.performance_score ?? "",
          kpi_achievement_score: first.kpi_achievement_score ?? "",
          evidence_quality_score: first.evidence_quality_score ?? "",
          technical_stability_score: first.technical_stability_score ?? "",
          user_satisfaction_score: first.user_satisfaction_score ?? "",
        });
        if (first.comments) setComments(first.comments);
        if (first.status) setValidationStatus(first.status);
      }
    } catch (err) {
      setError(err.message || "Failed to load pilot project details.");
    } finally {
      setLoading(false);
    }
  };

  const isAlreadySubmitted = validations.length > 0;

  const totalScore = useMemo(() => {
    const p = Number(scores.performance_score) || 0;
    const k = Number(scores.kpi_achievement_score) || 0;
    const e = Number(scores.evidence_quality_score) || 0;
    const t = Number(scores.technical_stability_score) || 0;
    const u = Number(scores.user_satisfaction_score) || 0;

    const computed = p * 0.25 + k * 0.25 + e * 0.2 + t * 0.15 + u * 0.15;
    return parseFloat(computed.toFixed(2));
  }, [scores]);

  const handleScoreChange = (key, value) => {
    if (isAlreadySubmitted) return;
    if (value === "") {
      setScores((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    const num = Math.min(100, Math.max(0, Number(value)));
    setScores((prev) => ({ ...prev, [key]: num }));
  };

  const handleSubmitValidation = async (e) => {
    e.preventDefault();
    if (isAlreadySubmitted) return;

    // Verify all rubric factors
    for (const r of rubric) {
      if (scores[r.key] === "" || scores[r.key] === null) {
        setError(`Please assign a score for "${r.label}" (0-100).`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      await createValidation(id, {
        performance_score: Number(scores.performance_score),
        kpi_achievement_score: Number(scores.kpi_achievement_score),
        evidence_quality_score: Number(scores.evidence_quality_score),
        technical_stability_score: Number(scores.technical_stability_score),
        user_satisfaction_score: Number(scores.user_satisfaction_score),
        status: validationStatus,
        comments: comments.trim(),
      });

      setSuccessMessage("Pilot validation report submitted successfully. Pilot transitioned to VALIDATION stage.");
      loadPilotData();
    } catch (err) {
      setError(err.message || "Failed to submit pilot validation report.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="h-[500px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
          <div className="h-[600px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  if (error && !pilot) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Unable to load pilot evaluation
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/evaluator/pilot-evaluations")}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pilot Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* TOP NAVIGATION & HEADER */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/evaluator/pilot-evaluations")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Pilot Evaluations
        </button>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                Pilot Assessment
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Status: {pilot?.status || "ACTIVE"}
              </span>
            </div>

            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {pilot?.challenge?.title || "Pilot Deployment Review"}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{pilot?.challenge?.department?.name || "Government Department"}</span>
              </div>
              <div>
                Startup: <span className="font-semibold text-slate-800 dark:text-slate-200">{pilot?.startup?.company_name || "Startup"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* LEFT COLUMN: EMPIRICAL EVIDENCE, KPIS, MILESTONES */}
        <div className="space-y-6">
          {/* PILOT OVERVIEW CARD */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Objectives & Scope
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {pilot?.objectives || "Live deployment testing against specified problem statement requirements."}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-400">Budget</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {pilot?.budget ? `₹${Number(pilot.budget).toLocaleString("en-IN")}` : "Defined by MoU"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-400">Duration</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {pilot?.duration_days ? `${pilot.duration_days} Days` : "60 Days"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-400">Location</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {pilot?.location || pilot?.challenge?.department?.state || "National"}
                </p>
              </div>
            </div>
          </div>

          {/* KPIS & MEASUREMENTS */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Key Performance Indicators (KPIs)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Empirical targets set by the Government department and measured during the pilot.
            </p>

            {pilot?.kpis && pilot.kpis.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pilot.kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {kpi.name}
                      </h4>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        Target: {kpi.target_value} {kpi.unit}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {kpi.description}
                    </p>
                    {kpi.measurements && kpi.measurements.length > 0 && (
                      <div className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Latest Measured Value: {kpi.measurements[kpi.measurements.length - 1].value} {kpi.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                No individual KPIs recorded on this pilot.
              </div>
            )}
          </div>

          {/* EVIDENCE AUDIT TRAIL */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Uploaded Evidence Files
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Empirical data logs, test outputs, and validation certificates submitted by the startup.
            </p>

            {pilot?.evidence && pilot.evidence.length > 0 ? (
              <div className="mt-4 space-y-2">
                {pilot.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {ev.title || ev.filename || "Evidence Document"}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {ev.category || "Empirical Data"} • Submitted{" "}
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString("en-IN") : "—"}
                      </p>
                    </div>
                    {ev.file_url && (
                      <button
                        type="button"
                        onClick={() => openDocumentSecurely(ev.file_url, ev.title || "evidence_doc.pdf")}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <ExternalLink className="h-3 w-3" /> View File
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                No evidence documents uploaded yet for this pilot.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EVALUATOR VALIDATION REPORT FORM */}
        <div className="h-fit xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Pilot Validation Report
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Official 5-Factor Evaluator Rubric
                  </p>
                </div>

                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50">
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {totalScore}
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400">
                    Score
                  </span>
                </div>
              </div>

              {isAlreadySubmitted && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Validation report submitted and locked.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitValidation} className="p-5 space-y-4">
              {rubric.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.label} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      Weight: {item.weight}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {item.description}
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    disabled={isAlreadySubmitted || submitting}
                    value={scores[item.key]}
                    onChange={(e) => handleScoreChange(item.key, e.target.value)}
                    placeholder="Score (0-100)"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              ))}

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Validation Status Recommendation
                </label>
                <select
                  disabled={isAlreadySubmitted || submitting}
                  value={validationStatus}
                  onChange={(e) => setValidationStatus(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="VALIDATED">VALIDATED (Passed all requirements)</option>
                  <option value="VALIDATED_WITH_CONDITIONS">VALIDATED_WITH_CONDITIONS (Conditional approval)</option>
                  <option value="NOT_VALIDATED">NOT_VALIDATED (Failed deployment benchmarks)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Evaluator Remarks & Recommendations
                </label>
                <textarea
                  rows={4}
                  disabled={isAlreadySubmitted || submitting}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide technical evaluation remarks, observations on performance, and scale readiness..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {!isAlreadySubmitted && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Submitting Validation..." : "Submit Pilot Validation Report"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default EvaluatorPilotDetail;
