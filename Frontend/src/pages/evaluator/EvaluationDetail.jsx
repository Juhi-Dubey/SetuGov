import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getEvaluationById,
  saveEvaluationDraft,
  submitEvaluation,
  declareConflictOfInterest,
  getConflictDeclaration,
} from "../../services/evaluationService";
import { analyzeApplicationWithAI } from "../../services/aiService";

function EvaluationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [scores, setScores] = useState({
    technicalFeasibility: "",
    innovation: "",
    expectedImpact: "",
    scalability: "",
    costEffectiveness: "",
  });

  const [comments, setComments] = useState("");
  const [submissionState, setSubmissionState] = useState("Draft");
  const [conflictDeclaration, setConflictDeclaration] = useState(null);
  const [conflictReason, setConflictReason] = useState("");
  const [declaringConflict, setDeclaringConflict] = useState(false);

  const criteria = [
    {
      key: "technicalFeasibility",
      title: "Technical Feasibility",
      weight: 25,
      description:
        "Assess technical architecture, implementation feasibility and technology readiness.",
    },
    {
      key: "innovation",
      title: "Innovation",
      weight: 20,
      description:
        "Assess originality, differentiation and innovative value of the proposed solution.",
    },
    {
      key: "expectedImpact",
      title: "Expected Impact",
      weight: 25,
      description:
        "Assess the expected measurable impact against the challenge objectives.",
    },
    {
      key: "scalability",
      title: "Scalability",
      weight: 15,
      description:
        "Assess whether the solution can scale across departments, locations or users.",
    },
    {
      key: "costEffectiveness",
      title: "Cost Effectiveness",
      weight: 15,
      description:
        "Assess value for money, implementation cost and long-term sustainability.",
    },
  ];

  /* ================================================= */
  /* LOAD EVALUATION & CONFLICT DECLARATION            */
  /* ================================================= */

  useEffect(() => {
    let mounted = true;

    const loadEvaluation = async () => {
      if (!id) {
        setError("Application ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [data, conflictRes] = await Promise.all([
          getEvaluationById(id).catch((e) => {
            console.error("Failed to load evaluation by id:", e);
            throw e;
          }),
          getConflictDeclaration(id).catch(() => null)
        ]);

        if (!mounted) return;

        if (conflictRes?.data) {
          setConflictDeclaration(conflictRes.data);
        }

        const raw = data?.data?.application || data?.application || data?.data || data;
        if (raw) {
          // Map application fields to evaluation workspace format
          const propData = raw.proposal_data || {};
          const mapped = {
            id: raw.id,
            challengeTitle: raw.challenge?.title || raw.challengeTitle || "Challenge Application",
            startupName: raw.startup?.company_name || raw.startupName || "Startup",
            domain: raw.challenge?.domain || raw.domain || "Technology",
            suitability: raw.proposal || propData.suitability || raw.suitability,
            technicalApproach: raw.technical_approach || propData.technical_approach || propData.technicalApproach || raw.technicalApproach,
            expectedImpact: raw.expected_impact || propData.expected_impact || propData.expectedImpact || raw.expectedImpact,
            estimatedCost: raw.estimated_cost != null ? `₹${Number(raw.estimated_cost).toLocaleString('en-IN')}` : (propData.estimated_cost || propData.estimatedCost),
            timeline: raw.timeline || propData.timeline || raw.timeline,
            documents: raw.startup?.documents || raw.documents || [],
            ...raw,
          };

          setEvaluation(mapped);

          // If there is an existing evaluation record for this evaluator
          const myEval = Array.isArray(raw.evaluations) && raw.evaluations.length > 0 ? raw.evaluations[0] : null;
          if (myEval) {
            setScores({
              technicalFeasibility: myEval.technical_score ?? "",
              innovation: myEval.innovation_score ?? "",
              expectedImpact: myEval.impact_score ?? "",
              scalability: myEval.scalability_score ?? "",
              costEffectiveness: myEval.cost_score ?? "",
            });
            if (myEval.comments) setComments(myEval.comments);
            setSubmissionState(myEval.is_submitted ? "Submitted" : "Draft");
          } else if (raw.scores) {
            setScores({
              technicalFeasibility: raw.scores.technicalFeasibility ?? raw.scores.technical_score ?? "",
              innovation: raw.scores.innovation ?? raw.scores.innovation_score ?? "",
              expectedImpact: raw.scores.expectedImpact ?? raw.scores.impact_score ?? "",
              scalability: raw.scores.scalability ?? raw.scores.scalability_score ?? "",
              costEffectiveness: raw.scores.costEffectiveness ?? raw.scores.cost_score ?? "",
            });
            if (raw.comments) setComments(raw.comments);
            if (raw.status) setSubmissionState(raw.status);
          }
        }
      } catch (err) {
        console.error("Failed to load evaluation:", err);
        if (mounted) {
          setError(err.message || "Failed to load application details.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEvaluation();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleConflictDeclaration = async (hasConflict, isRecused) => {
    try {
      setDeclaringConflict(true);
      setError("");
      const res = await declareConflictOfInterest(id, {
        has_conflict: hasConflict,
        is_recused: isRecused,
        conflict_details: conflictReason
      });
      const decl = res?.data || res;
      setConflictDeclaration(decl);
      setSuccessMessage(hasConflict ? "Conflict of interest declared. You have recused from this evaluation." : "No-conflict declaration successfully certified.");
    } catch (err) {
      setError(err.message || "Failed to submit conflict of interest declaration.");
    } finally {
      setDeclaringConflict(false);
    }
  };


  /* ================================================= */
  /* CALCULATE TOTAL SCORE                            */
  /* ================================================= */

  const totalScore = useMemo(() => {
    let total = 0;

    criteria.forEach(
      (criterion) => {
        const score = Number(
          scores[criterion.key]
        );

        if (
          !Number.isNaN(score) &&
          score >= 0
        ) {
          total +=
            (score / 100) *
            criterion.weight;
        }
      }
    );

    return Math.round(total);
  }, [scores]);

  const completedCriteria =
    criteria.filter(
      (criterion) =>
        scores[criterion.key] !== "" &&
        scores[criterion.key] !== null &&
        scores[criterion.key] !==
          undefined
    ).length;

  /* ================================================= */
  /* SCORE CHANGE                                     */
  /* ================================================= */

  const handleScoreChange = (
    key,
    value
  ) => {
    if (value === "") {
      setScores((previous) => ({
        ...previous,
        [key]: "",
      }));

      return;
    }

    const numericValue = Math.min(
      100,
      Math.max(0, Number(value))
    );

    setScores((previous) => ({
      ...previous,
      [key]: numericValue,
    }));

    setError("");
    setSuccessMessage("");
  };

  /* ================================================= */
  /* SAVE DRAFT                                       */
  /* ================================================= */

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const evaluationData = {
        scores,
        comments,
        totalScore,
        status: "Draft",
      };

      await saveEvaluationDraft(
        id,
        evaluationData
      );

      setSubmissionState("Draft");

      setSuccessMessage(
        "Evaluation draft saved successfully."
      );
    } catch (err) {
      console.error(
        "Failed to save evaluation:",
        err
      );

      setError(
        err.message ||
          "Failed to save evaluation draft."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ================================================= */
  /* SUBMIT EVALUATION                                */
  /* ================================================= */

  const handleSubmit = async () => {
    const allCompleted =
      criteria.every(
        (criterion) =>
          scores[criterion.key] !== "" &&
          scores[criterion.key] !== null &&
          scores[criterion.key] !==
            undefined
      );

    if (!allCompleted) {
      setError(
        "Please complete all evaluation criteria before submitting."
      );

      setSuccessMessage("");

      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const evaluationData = {
        scores,
        comments,
        totalScore,
        status: "Submitted",
      };

      await submitEvaluation(
        id,
        evaluationData
      );

      setSubmissionState(
        "Submitted"
      );

      setSuccessMessage(
        "Evaluation submitted successfully."
      );
    } catch (err) {
      console.error(
        "Failed to submit evaluation:",
        err
      );

      setError(
        err.message ||
          "Failed to submit evaluation."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ================================================= */
  /* LOADING STATE                                    */
  /* ================================================= */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="h-[500px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />

          <div className="h-[700px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  /* ================================================= */
  /* ERROR STATE                                      */
  /* ================================================= */

  if (error && !evaluation) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Unable to load evaluation
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/evaluator/assignments"
              )
            }
            className="back-nav mt-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/evaluator/assignments"
              )
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ClipboardCheck className="h-4 w-4" />
              </div>

              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Evaluation Workspace
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {evaluation?.challengeTitle ||
                "Evaluation Detail"}
            </h1>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Review the startup proposal and
              submit your independent
              assessment.
            </p>
          </div>
        </div>

        <SubmissionBadge
          state={submissionState}
        />
      </section>

      {/* ================================================= */}
      {/* GLOBAL SUCCESS / ERROR                            */}
      {/* ================================================= */}

      {error && evaluation && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* ================================================= */}
        {/* LEFT SIDE                                         */}
        {/* ================================================= */}

        <section className="space-y-6">
          <ProposalPanel
            evaluation={evaluation}
          />

          <AIScreening
            evaluation={evaluation}
          />
        </section>

        {/* ================================================= */}
        {/* RIGHT SIDE                                        */}
        {/* ================================================= */}

        <section className="h-fit xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {/* Form Header */}

            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Evaluation Form
                  </h2>

                  <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    Score each criterion from
                    0 to 100. Weighted scores
                    contribute to the final
                    assessment.
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {totalScore}
                  </span>

                  <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400">
                    Score
                  </span>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${totalScore}%`,
                  }}
                  transition={{
                    duration: 0.5,
                  }}
                  className="h-full rounded-full bg-indigo-500"
                />
              </div>

              <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>
                  {completedCriteria}/
                  {criteria.length} criteria
                  completed
                </span>

                <span>
                  100 points
                </span>
              </div>
            </div>

            {/* CONFLICT OF INTEREST BANNER / DECLARATION */}
            <div className="border-b border-slate-200 p-5 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" /> Conflict of Interest Declaration
                </span>
                {conflictDeclaration?.declared_at && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    conflictDeclaration.is_recused
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {conflictDeclaration.is_recused ? "Recused" : "No Conflict Certified"}
                  </span>
                )}
              </div>

              {!conflictDeclaration?.declared_at ? (
                <div className="mt-3 space-y-2.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Before evaluating, public procurement regulations require certifying that you have no personal, commercial, or institutional conflict of interest with this startup candidate.
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      disabled={declaringConflict}
                      onClick={() => handleConflictDeclaration(false, false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> I Certify NO Conflict of Interest
                    </button>
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Specify conflict details if applicable..."
                        value={conflictReason}
                        onChange={(e) => setConflictReason(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={declaringConflict}
                        onClick={() => handleConflictDeclaration(true, true)}
                        className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Declare Conflict & Recuse
                      </button>
                    </div>
                  </div>
                </div>
              ) : conflictDeclaration.is_recused ? (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  You have declared a conflict of interest for this application. Scoring is locked and you have been formally recused from this evaluation.
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>Certified on {new Date(conflictDeclaration.declared_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setConflictDeclaration(null)}
                    className="text-[10px] text-slate-400 underline hover:text-slate-600"
                  >
                    Change Declaration
                  </button>
                </div>
              )}
            </div>

            {/* Criteria */}

            <div className="space-y-3 p-5">
              {criteria.map(
                (
                  criterion,
                  index
                ) => (
                  <CriterionCard
                    key={
                      criterion.key
                    }
                    criterion={
                      criterion
                    }
                    value={
                      scores[
                        criterion.key
                      ]
                    }
                    index={index}
                    onChange={(
                      value
                    ) =>
                      handleScoreChange(
                        criterion.key,
                        value
                      )
                    }
                  />
                )
              )}
            </div>

            {/* Comments */}

            <div className="border-t border-slate-200 p-5 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Evaluator Comments
              </label>

              <textarea
                value={comments}
                onChange={(
                  event
                ) => {
                  setComments(
                    event.target.value
                  );
                  setError("");
                  setSuccessMessage(
                    ""
                  );
                }}
                rows={5}
                placeholder="Add your assessment comments..."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
              />
            </div>

            {/* Actions */}

            <div className="border-t border-slate-200 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    handleSaveDraft
                  }
                  disabled={saving || conflictDeclaration?.is_recused}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <Save className="h-4 w-4" />

                  {saving
                    ? "Saving..."
                    : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleSubmit
                  }
                  disabled={saving || conflictDeclaration?.is_recused || (!conflictDeclaration?.declared_at && !conflictDeclaration)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />

                  {conflictDeclaration?.is_recused ? "Recused" : saving ? "Submitting..." : "Submit Evaluation"}
                </button>
              </div>

              <p className="mt-3 text-center text-[9px] leading-4 text-slate-400">
                Your evaluation is an
                independent assessment.
                Final decisions remain
                with authorized government
                officials.
              </p>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* PROPOSAL PANEL                                        */
/* ===================================================== */

function ProposalPanel({
  evaluation,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Startup Proposal
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {evaluation?.challengeTitle ||
                "Challenge title"}
            </h2>

            <div className="mt-2 flex flex-wrap gap-2">
              {evaluation?.startupName && (
                <InfoBadge
                  icon={Building2}
                  text={
                    evaluation.startupName
                  }
                />
              )}

              {evaluation?.domain && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {evaluation.domain}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <ProposalField
          title="Why are you suitable?"
          value={
            evaluation?.suitability
          }
        />

        <ProposalField
          title="Technical Approach"
          value={
            evaluation?.technicalApproach
          }
        />

        <ProposalField
          title="Expected Impact"
          value={
            evaluation?.expectedImpact
          }
        />

        <ProposalField
          title="Estimated Cost"
          value={
            evaluation?.estimatedCost
          }
        />

        <ProposalField
          title="Timeline"
          value={
            evaluation?.timeline
          }
        />

        <ProposalField
          title="Documents"
          value={
            Array.isArray(
              evaluation?.documents
            )
              ? `${evaluation.documents.length} document(s)`
              : evaluation?.documents
                ? "Documents available"
                : null
          }
        />
      </div>
    </div>
  );
}

/* ===================================================== */
/* PROPOSAL FIELD                                        */
/* ===================================================== */

function ProposalField({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {value ||
          "Information will be provided by backend."}
      </p>
    </div>
  );
}

/* ===================================================== */
/* AI SCREENING                                          */
/* ===================================================== */

function AIScreening({ evaluation }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleRunBrain3 = async () => {
    if (!evaluation?.id) return;
    try {
      setAnalyzing(true);
      const res = await analyzeApplicationWithAI(evaluation.id);
      setAnalysisResult(res?.data || res);
    } catch (err) {
      console.warn("Brain 3 analysis unavailable:", err);
      setAnalysisResult({
        _ai_unavailable: true,
        _error_message: "AI Proposal Analysis is currently unavailable. Please evaluate using the candidate's submitted documentation.",
        strengths: [],
        weaknesses: [],
        concerns: [],
        questions_for_evaluator: [],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const aiUnavailable = analysisResult?._ai_unavailable === true;

  const strengths =
    analysisResult?.strengths ||
    evaluation?.aiScreening?.strengths || [];

  const weaknesses = analysisResult?.weaknesses || [];

  const concerns =
    analysisResult?.concerns ||
    evaluation?.aiScreening?.concerns || [];

  const questions = analysisResult?.questions_for_evaluator || analysisResult?.recommended_questions_for_evaluator || [];

  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-500/20 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                AI-Assisted Proposal Screening
              </h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Advisory Input
              </span>
            </div>

            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Technical feasibility, innovation, and risk analysis to assist official evaluator scoring.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunBrain3}
          disabled={analyzing}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {analyzing ? "Analyzing..." : "Run AI Analysis"}
        </button>
      </div>

      {aiUnavailable && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              AI Proposal Analysis Unavailable
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              {analysisResult?._error_message || "AI Proposal Analysis is currently unavailable. Please evaluate using the candidate's submitted documentation."}
            </p>
          </div>
        </div>
      )}

      {analysisResult?.problem_understanding_assessment && (
        <div className="border-b border-indigo-50 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Technical & Innovation Summary
          </p>
          <div className="mt-2 grid gap-2 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Feasibility: </span>
              {analysisResult.technical_feasibility_assessment}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Innovation: </span>
              {analysisResult.innovation_assessment}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <AIScreeningColumn
          type="strength"
          title="Evaluated Strengths"
          items={strengths}
        />

        <AIScreeningColumn
          type="concern"
          title="Risk & Gap Considerations"
          items={[...concerns, ...weaknesses]}
        />
      </div>

      {questions.length > 0 && (
        <div className="border-t border-indigo-100/70 bg-indigo-50/30 p-5 dark:border-indigo-900/30 dark:bg-indigo-950/20">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Recommended Questions for Evaluator Panel:
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {questions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Q{idx + 1}:</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ===================================================== */
/* AI SCREENING COLUMN                                   */
/* ===================================================== */

function AIScreeningColumn({
  type,
  title,
  items,
}) {
  const isStrength =
    type === "strength";

  return (
    <div>
      <div className="flex items-center gap-2">
        {isStrength ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}

        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {title}
        </h3>
      </div>

      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map(
            (item, index) => (
              <div
                key={index}
                className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                {item}
              </div>
            )
          )
        ) : (
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-400 dark:bg-slate-900">
            AI screening information
            will be provided by the
            backend.
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================== */
/* CRITERION CARD                                        */
/* ===================================================== */

function CriterionCard({
  criterion,
  value,
  onChange,
  index,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 10,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
      }}
      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {criterion.title}
          </h3>

          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            {criterion.description}
          </p>
        </div>

        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {criterion.weight}%
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          value={
            value === ""
              ? 0
              : value
          }
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="h-1.5 flex-1 cursor-pointer accent-indigo-600"
        />

        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder="—"
          className="h-9 w-16 rounded-lg border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />

        <span className="text-[10px] font-semibold text-slate-400">
          /100
        </span>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* INFO BADGE                                             */
/* ===================================================== */

function InfoBadge({
  icon: Icon,
  text,
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
      <Icon className="h-3 w-3 shrink-0" />

      <span className="truncate">
        {text}
      </span>
    </span>
  );
}

/* ===================================================== */
/* SUBMISSION BADGE                                      */
/* ===================================================== */

function SubmissionBadge({
  state,
}) {
  if (
    String(state).toLowerCase() ===
    "submitted"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Submitted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <Save className="h-3.5 w-3.5" />
      Draft
    </span>
  );
}

export default EvaluationDetail;