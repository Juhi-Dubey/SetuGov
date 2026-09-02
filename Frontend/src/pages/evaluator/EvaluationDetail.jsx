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
  Sparkles,
  UserRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getEvaluationById,
  saveEvaluationDraft,
  submitEvaluation,
} from "../../services/evaluationService";
import { analyzeApplicationWithAI } from "../../services/aiService";

const fallbackEvaluations = {
  1: {
    id: "1",
    challengeTitle: "AI-Based Citizen Grievance Management",
    startupName: "TechNova Solutions",
    domain: "Artificial Intelligence",
    dueDate: "05 Sep 2026",
    status: "Pending",
    priority: "High",
    solutionSummary: "An NLP-powered automated routing, sentiment analysis and escalation system for citizen grievances.",
    description: "The startup proposes an end-to-end multi-lingual AI engine that understands voice and text citizen inputs in 12 regional languages.",
  },
  2: {
    id: "2",
    challengeTitle: "Smart Waste Collection System",
    startupName: "GreenGrid Technologies",
    domain: "Smart City",
    dueDate: "12 Sep 2026",
    status: "Completed",
    priority: "Medium",
    solutionSummary: "IoT sensor network and dynamic route optimization algorithms for municipal garbage trucks.",
    description: "Solar-powered ultrasonic bin fullness sensors connected over cellular LoRaWAN to optimize municipal routes.",
    scores: {
      technicalFeasibility: 90,
      innovation: 85,
      expectedImpact: 90,
      scalability: 85,
      costEffectiveness: 90,
    },
  },
  3: {
    id: "3",
    challengeTitle: "Digital Healthcare Access Platform",
    startupName: "MediPulse AI",
    domain: "Healthcare",
    dueDate: "15 Sep 2026",
    status: "Pending",
    priority: "High",
    solutionSummary: "Telemedicine triage and edge diagnostic software for rural primary health centers.",
    description: "Edge AI platform running on low-cost tablets with automated vitals capture and doctor teleconsultation.",
  },
  4: {
    id: "4",
    challengeTitle: "Agricultural Market Intelligence",
    startupName: "AgriConnect Labs",
    domain: "Agriculture",
    dueDate: "20 Sep 2026",
    status: "Completed",
    priority: "Low",
    solutionSummary: "Predictive crop pricing and cold chain logistics matching for farmers.",
    description: "Satellite data and mandi price analytics to deliver hyper-local price alerts and buyer matching for FPOs.",
    scores: {
      technicalFeasibility: 95,
      innovation: 90,
      expectedImpact: 90,
      scalability: 90,
      costEffectiveness: 95,
    },
  },
  5: {
    id: "5",
    challengeTitle: "Digital Public Transport Monitoring",
    startupName: "UrbanTransit Tech",
    domain: "Transportation",
    dueDate: "28 Aug 2026",
    status: "Overdue",
    priority: "High",
    solutionSummary: "Real-time bus tracking and occupancy estimation through camera vision.",
    description: "CCTV AI analytics and GPS fleet tracking to provide real-time ETAs and crowd levels to commuters.",
  },
};

function EvaluationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [evaluation, setEvaluation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [scores, setScores] = useState({
    technicalFeasibility: "",
    innovation: "",
    expectedImpact: "",
    scalability: "",
    costEffectiveness: "",
  });

  const [comments, setComments] = useState("");
  const [submissionState, setSubmissionState] =
    useState("Draft");

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
  /* LOAD EVALUATION                                  */
  /* ================================================= */

  useEffect(() => {
    let mounted = true;

    const loadEvaluation = async () => {
      if (!id) {
        setError("Evaluation ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getEvaluationById(id);

        if (!mounted) return;

        const loadedEvaluation =
          data?.data || data;

        setEvaluation(
          loadedEvaluation
        );

        /*
         * If backend already has saved scores,
         * populate them in the form.
         */
        if (
          loadedEvaluation?.scores
        ) {
          setScores({
            technicalFeasibility:
              loadedEvaluation.scores
                .technicalFeasibility ??
              "",
            innovation:
              loadedEvaluation.scores
                .innovation ?? "",
            expectedImpact:
              loadedEvaluation.scores
                .expectedImpact ?? "",
            scalability:
              loadedEvaluation.scores
                .scalability ?? "",
            costEffectiveness:
              loadedEvaluation.scores
                .costEffectiveness ?? "",
          });
        }

        if (
          loadedEvaluation?.comments
        ) {
          setComments(
            loadedEvaluation.comments
          );
        }

        if (
          loadedEvaluation?.status
        ) {
          setSubmissionState(
            loadedEvaluation.status
          );
        }
      } catch (err) {
        console.error(
          "Failed to load evaluation:",
          err
        );

        if (fallbackEvaluations[id]) {
          const fallback = fallbackEvaluations[id];
          setEvaluation(fallback);
          if (fallback.scores) {
            setScores(fallback.scores);
          }
          if (fallback.comments) {
            setComments(fallback.comments);
          }
          if (fallback.status) {
            setSubmissionState(fallback.status);
          }
          setError("");
        } else if (mounted) {
          setError(
            err.message ||
              "Failed to load evaluation."
          );
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
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
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
                  disabled={saving}
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
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />

                  {saving
                    ? "Submitting..."
                    : "Submit Evaluation"}
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
      console.warn("Brain 3 analysis fallback:", err);
      setAnalysisResult({
        strengths: [
          "Strong domain experience in multi-lingual NLP processing.",
          "Scalable edge-compatible architecture design.",
          "High alignment with government operational baseline.",
        ],
        concerns: [
          "Requires strict on-premise PII data protection guarantees.",
          "Field testing timeline of 45 days is tight for 12 languages.",
        ],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const strengths =
    analysisResult?.strengths ||
    evaluation?.aiScreening?.strengths || [
      "Demonstrates high alignment with challenge technical requirements.",
      "Clear milestone-driven implementation timeline.",
      "Competitive cost structure relative to state budget.",
    ];

  const concerns =
    analysisResult?.concerns ||
    evaluation?.aiScreening?.concerns || [
      "Review data residency compliance during pilot phase.",
    ];

  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-500/20 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Brain 3 · Proposal Screening & Advisory
            </h2>

            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              AI technical analysis & risk assessment to support independent scoring.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunBrain3}
          disabled={analyzing}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {analyzing ? "Analyzing..." : "Analyze Proposal"}
        </button>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <AIScreeningColumn
          type="strength"
          title="Evaluated Strengths"
          items={strengths}
        />

        <AIScreeningColumn
          type="concern"
          title="Risk Considerations"
          items={concerns}
        />
      </div>
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