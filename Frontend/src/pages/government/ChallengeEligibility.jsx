import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock3,
  FileCheck2,
  Building2,
  ShieldCheck,
  AlertCircle,
  Save,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

const initialChecks = [
  {
    id: "incorporation",
    title: "Startup Incorporation",
    description:
      "Valid certificate of incorporation has been submitted.",
    status: "pending",
  },
  {
    id: "gst",
    title: "GST Registration",
    description:
      "GST registration details are available and valid.",
    status: "pending",
  },
  {
    id: "startupRecognition",
    title: "Startup Recognition",
    description:
      "Startup recognition certificate or equivalent proof is available.",
    status: "pending",
  },
  {
    id: "financial",
    title: "Financial Eligibility",
    description:
      "The startup satisfies the financial eligibility criteria.",
    status: "pending",
  },
  {
    id: "experience",
    title: "Relevant Experience",
    description:
      "The startup demonstrates relevant experience for this challenge.",
    status: "pending",
  },
  {
    id: "compliance",
    title: "Compliance Requirements",
    description:
      "Required legal, cybersecurity and data-compliance documents are available.",
    status: "pending",
  },
];

function ChallengeEligibility() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [checks, setChecks] = useState(initialChecks);
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateCheck = (checkId, status) => {
    setChecks((previous) =>
      previous.map((check) =>
        check.id === checkId
          ? {
              ...check,
              status,
            }
          : check
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Eligibility review:", {
        challengeId: id,
        checks,
        remarks,
        decision,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completedChecks = checks.filter(
    (check) =>
      check.status === "passed" ||
      check.status === "failed"
  ).length;

  const passedChecks = checks.filter(
    (check) => check.status === "passed"
  ).length;

  const failedChecks = checks.filter(
    (check) => check.status === "failed"
  ).length;

  const allCompleted =
    completedChecks === checks.length;

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
                <ShieldCheck className="h-3.5 w-3.5" />
                Eligibility Review
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Startup Eligibility
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Verify whether the startup satisfies the
                eligibility requirements before technical
                evaluation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Challenge
              </p>

              <p className="mt-1 text-sm font-semibold">
                #{id}
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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Building2 className="h-7 w-7 text-slate-600 dark:text-slate-300" />
              </div>

              <div>
                <p className="text-lg font-semibold">
                  GreenTech Solutions
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Application APP-001
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Founder: Ananya Sharma
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <Clock3 className="h-3.5 w-3.5" />
                Review Pending
              </span>
            </div>

          </div>
        </motion.section>

        {/* PROGRESS */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                Eligibility Checklist
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Complete every check before making a final
                eligibility decision.
              </p>
            </div>

            <div className="text-sm font-semibold">
              {completedChecks}/{checks.length} completed
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-300 dark:bg-white"
              style={{
                width: `${
                  (completedChecks / checks.length) * 100
                }%`,
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Passed: {passedChecks}
            </span>

            <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Failed: {failedChecks}
            </span>

            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock3 className="h-4 w-4" />
              Pending:{" "}
              {checks.length - completedChecks}
            </span>
          </div>
        </section>

        {/* CHECKLIST */}

        <div className="space-y-4">

          {checks.map((check, index) => (
            <motion.section
              key={check.id}
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
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      check.status === "passed"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : check.status === "failed"
                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}
                  >
                    {check.status === "passed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : check.status === "failed" ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <Clock3 className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      {check.title}
                    </h3>

                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {check.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      updateCheck(
                        check.id,
                        "passed"
                      )
                    }
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                      check.status === "passed"
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Pass
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateCheck(
                        check.id,
                        "failed"
                      )
                    }
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                      check.status === "failed"
                        ? "bg-red-600 text-white"
                        : "border border-slate-200 hover:bg-red-50 hover:text-red-700 dark:border-slate-800 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Fail
                  </button>

                </div>

              </div>

              {/* DOCUMENT ACTION */}

              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  <FileCheck2 className="h-4 w-4" />
                  View supporting document
                </button>
              </div>
            </motion.section>
          ))}

        </div>

        {/* REMARKS */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <AlertCircle className="h-4 w-4 text-slate-500" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Reviewer Remarks
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add notes explaining the eligibility decision
                or any clarification required from the startup.
              </p>
            </div>
          </div>

          <textarea
            value={remarks}
            onChange={(event) =>
              setRemarks(event.target.value)
            }
            rows={5}
            placeholder="Enter reviewer remarks..."
            className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600 dark:focus:ring-slate-800"
          />

        </section>

        {/* FINAL DECISION */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div>
            <h2 className="text-sm font-semibold">
              Eligibility Decision
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select the appropriate outcome after reviewing
              all eligibility requirements.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">

            <DecisionButton
              active={decision === "eligible"}
              onClick={() =>
                setDecision("eligible")
              }
              icon={CheckCircle2}
              title="Eligible"
              description="Startup can proceed to evaluation."
              type="success"
            />

            <DecisionButton
              active={decision === "clarification"}
              onClick={() =>
                setDecision("clarification")
              }
              icon={Clock3}
              title="Request Clarification"
              description="Ask startup for additional information."
              type="warning"
            />

            <DecisionButton
              active={decision === "not_eligible"}
              onClick={() =>
                setDecision("not_eligible")
              }
              icon={XCircle}
              title="Not Eligible"
              description="Startup does not satisfy requirements."
              type="danger"
            />

          </div>

          {!allCompleted && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Complete all eligibility checks before finalizing
              the decision.
            </div>
          )}

        </section>

        {/* FOOTER ACTIONS */}

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
              {isSaving ? "Saving..." : "Save Review"}
            </button>

            <button
              type="button"
              disabled={!allCompleted || !decision}
              onClick={() => {
                console.log(
                  "Eligibility decision submitted:",
                  {
                    challengeId: id,
                    checks,
                    remarks,
                    decision,
                  }
                );

                navigate(
                  `/government/challenges/${id}/evaluation`
                );
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Continue to Evaluation
              <ArrowRight className="h-4 w-4" />
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// DECISION BUTTON
// =========================================================

function DecisionButton({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  type,
}) {
  const activeStyles = {
    success:
      "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/10",
    warning:
      "border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-500/10",
    danger:
      "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-500/10",
  };

  const iconStyles = {
    success:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    warning:
      "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    danger:
      "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? activeStyles[type]
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
      }`}
    >
      <div className="flex items-start gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            iconStyles[type]
          }`}
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

export default ChallengeEligibility;