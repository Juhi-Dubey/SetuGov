import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Save,
  Star,
  AlertCircle,
  FileText,
  Lightbulb,
  ShieldCheck,
  IndianRupee,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

const initialCriteria = [
  {
    id: "problemFit",
    title: "Problem Fit",
    description:
      "How well does the startup's solution address the government's stated problem?",
    weight: 25,
    score: 0,
  },
  {
    id: "innovation",
    title: "Innovation",
    description:
      "How innovative, differentiated and technically meaningful is the proposed solution?",
    weight: 20,
    score: 0,
  },
  {
    id: "feasibility",
    title: "Technical Feasibility",
    description:
      "Can the proposed solution realistically be implemented in the required environment?",
    weight: 20,
    score: 0,
  },
  {
    id: "scalability",
    title: "Scalability",
    description:
      "Can the solution scale across departments, locations or larger user volumes?",
    weight: 15,
    score: 0,
  },
  {
    id: "security",
    title: "Security & Compliance",
    description:
      "Does the solution address cybersecurity, privacy and data-compliance requirements?",
    weight: 10,
    score: 0,
  },
  {
    id: "value",
    title: "Value for Money",
    description:
      "Does the expected value justify the proposed implementation and pilot cost?",
    weight: 10,
    score: 0,
  },
];

function ChallengeEvaluation() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [criteria, setCriteria] = useState(
    initialCriteria
  );

  const [overallRemarks, setOverallRemarks] =
    useState("");

  const [recommendation, setRecommendation] =
    useState("");

  const [isSaving, setIsSaving] = useState(false);

  const updateScore = (criteriaId, score) => {
    setCriteria((previous) =>
      previous.map((item) =>
        item.id === criteriaId
          ? {
              ...item,
              score,
            }
          : item
      )
    );
  };

  const weightedScore = criteria.reduce(
    (total, item) =>
      total + (item.score * item.weight) / 100,
    0
  );

  const completedCriteria = criteria.filter(
    (item) => item.score > 0
  ).length;

  const allCompleted =
    completedCriteria === criteria.length;

  const getScoreLabel = (score) => {
    if (score === 0) return "Not rated";
    if (score <= 2) return "Poor";
    if (score === 3) return "Average";
    if (score === 4) return "Good";
    return "Excellent";
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Evaluation saved:", {
        challengeId: id,
        criteria,
        weightedScore,
        overallRemarks,
        recommendation,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    console.log("Evaluation submitted:", {
      challengeId: id,
      criteria,
      weightedScore,
      overallRemarks,
      recommendation,
    });

    navigate(
      `/government/challenges/${id}/pilot`
    );
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
          }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/applications`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Star className="h-3.5 w-3.5" />
                Technical Evaluation
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Evaluate Startup Solution
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Score the proposed solution against the
                challenge evaluation criteria.
              </p>
            </div>

            {/* SCORE */}

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Weighted Score
              </p>

              <p className="mt-1 text-3xl font-bold">
                {weightedScore.toFixed(1)}
                <span className="text-sm font-medium text-slate-400">
                  {" "}
                  / 5
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* STARTUP SUMMARY */}

        <motion.section
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            delay: 0.05,
          }}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Lightbulb className="h-7 w-7" />
              </div>

              <div>
                <p className="text-lg font-semibold">
                  GreenTech Solutions
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Smart Waste Management Platform
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Application APP-001
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <SummaryItem
                icon={FileText}
                label="Proposal"
                value="Submitted"
              />

              <SummaryItem
                icon={ShieldCheck}
                label="Eligibility"
                value="Passed"
              />

              <SummaryItem
                icon={IndianRupee}
                label="Pilot Budget"
                value="₹8.5L"
              />

              <SummaryItem
                icon={CheckCircle2}
                label="Review"
                value={`${completedCriteria}/${criteria.length}`}
              />

            </div>
          </div>
        </motion.section>

        {/* EVALUATION CRITERIA */}

        <section className="mb-6">

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Evaluation Criteria
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Rate each criterion from 1 to 5.
              </p>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {completedCriteria} of {criteria.length} rated
            </div>
          </div>

          <div className="space-y-4">

            {criteria.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.04,
                }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold dark:bg-slate-800">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">
                          {item.title}
                        </h3>

                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                          Weight: {item.weight}%
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  {/* SCORE BUTTONS */}

                  <div className="shrink-0">

                    <div className="mb-2 flex justify-end">
                      <span
                        className={`text-xs font-semibold ${
                          item.score >= 4
                            ? "text-emerald-600 dark:text-emerald-400"
                            : item.score === 3
                            ? "text-amber-600 dark:text-amber-400"
                            : item.score > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-400"
                        }`}
                      >
                        {getScoreLabel(item.score)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(
                        (score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() =>
                              updateScore(
                                item.id,
                                score
                              )
                            }
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition ${
                              item.score === score
                                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                                : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                            }`}
                          >
                            {score}
                          </button>
                        )
                      )}
                    </div>

                    <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>

                  </div>

                </div>

                {/* INDIVIDUAL COMMENT */}

                <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder={`Add a brief comment for ${item.title.toLowerCase()}...`}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600 dark:focus:ring-slate-800"
                  />
                </div>

              </motion.article>
            ))}

          </div>
        </section>

        {/* OVERALL REMARKS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div>
            <h2 className="text-sm font-semibold">
              Overall Evaluation
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Summarize the strengths, risks and important
              observations about the proposed solution.
            </p>
          </div>

          <textarea
            value={overallRemarks}
            onChange={(event) =>
              setOverallRemarks(event.target.value)
            }
            rows={6}
            placeholder="Write your overall evaluation..."
            className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600 dark:focus:ring-slate-800"
          />

        </section>

        {/* RECOMMENDATION */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <h2 className="text-sm font-semibold">
            Recommendation
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Select what should happen after technical evaluation.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">

            <RecommendationCard
              active={recommendation === "pilot"}
              onClick={() =>
                setRecommendation("pilot")
              }
              title="Recommend for Pilot"
              description="Solution should proceed to controlled pilot."
              type="success"
            />

            <RecommendationCard
              active={
                recommendation === "clarification"
              }
              onClick={() =>
                setRecommendation("clarification")
              }
              title="Request Clarification"
              description="Additional technical information is required."
              type="warning"
            />

            <RecommendationCard
              active={recommendation === "reject"}
              onClick={() =>
                setRecommendation("reject")
              }
              title="Do Not Recommend"
              description="Solution should not proceed further."
              type="danger"
            />

          </div>

          {!allCompleted && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Please rate all evaluation criteria before
              continuing.
            </div>
          )}

        </section>

        {/* FOOTER */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/applications`
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />
              {isSaving
                ? "Saving..."
                : "Save Evaluation"}
            </button>

            <button
              type="button"
              disabled={
                !allCompleted || !recommendation
              }
              onClick={handleContinue}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Continue to Pilot
              <ArrowRight className="h-4 w-4" />
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// SUMMARY ITEM
// =========================================================

function SummaryItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium">
          {label}
        </span>
      </div>

      <p className="mt-1 text-xs font-semibold">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// RECOMMENDATION CARD
// =========================================================

function RecommendationCard({
  active,
  onClick,
  title,
  description,
  type,
}) {
  const styles = {
    success: {
      active:
        "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
      icon:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    warning: {
      active:
        "border-amber-500 bg-amber-50 dark:bg-amber-500/10",
      icon:
        "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    danger: {
      active:
        "border-red-500 bg-red-50 dark:bg-red-500/10",
      icon:
        "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    },
  };

  const icons = {
    success: CheckCircle2,
    warning: AlertCircle,
    danger: AlertCircle,
  };

  const Icon = icons[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? styles[type].active
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
      }`}
    >
      <div className="flex items-start gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles[type].icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

      </div>
    </button>
  );
}

export default ChallengeEvaluation;