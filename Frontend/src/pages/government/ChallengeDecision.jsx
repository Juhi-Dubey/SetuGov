import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  Save,
  Send,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  XCircle,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

function ChallengeDecision() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [conditions, setConditions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Decision saved:", {
        challengeId: id,
        decision,
        remarks,
        conditions,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!decision) {
      alert("Please select a final decision.");
      return;
    }

    if (!remarks.trim()) {
      alert("Please provide decision remarks.");
      return;
    }

    setSubmitted(true);

    console.log("Decision submitted:", {
      challengeId: id,
      decision,
      remarks,
      conditions,
    });
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
            onClick={() =>
              navigate(
                `/government/challenges/${id}/evidence`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Evidence
          </button>

          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileCheck2 className="h-3.5 w-3.5" />
              Final Decision
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Challenge Decision
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review the pilot results and record the
              government's final decision.
            </p>
          </div>
        </motion.div>

        {/* CHALLENGE SUMMARY */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Challenge
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Smart Waste Management
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                GreenTech Solutions
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Challenge ID: {id}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Pilot Result
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Pilot Completed
              </p>
            </div>

          </div>

        </section>

        {/* EVALUATION SUMMARY */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Evaluation Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Summary of the pilot performance and
              verified evidence.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <SummaryCard
              label="Overall Score"
              value="86%"
              icon={TrendingUp}
            />

            <SummaryCard
              label="KPIs Achieved"
              value="8 / 10"
              icon={CheckCircle2}
            />

            <SummaryCard
              label="Evidence"
              value="6 / 6"
              icon={FileCheck2}
            />

            <SummaryCard
              label="Risk Level"
              value="Low"
              icon={AlertTriangle}
            />

          </div>

        </section>

        {/* DECISION */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">

          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Final Decision
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Select the recommended next action for
              this challenge.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            {/* SCALE UP */}

            <DecisionCard
              selected={decision === "scale_up"}
              onClick={() =>
                setDecision("scale_up")
              }
              icon={TrendingUp}
              title="Scale Up"
              description="Pilot has demonstrated sufficient value and can proceed to wider implementation."
            />

            {/* EXTEND */}

            <DecisionCard
              selected={decision === "extend_pilot"}
              onClick={() =>
                setDecision("extend_pilot")
              }
              icon={RotateCcw}
              title="Extend Pilot"
              description="Additional pilot time or evidence is required before making a final scale decision."
            />

            {/* CLOSE */}

            <DecisionCard
              selected={decision === "close"}
              onClick={() =>
                setDecision("close")
              }
              icon={XCircle}
              title="Close Challenge"
              description="Pilot results do not justify further implementation or investment."
            />

          </div>

          {/* REMARKS */}

          <div className="mt-7">

            <label className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              Decision Remarks
            </label>

            <textarea
              value={remarks}
              onChange={(event) =>
                setRemarks(event.target.value)
              }
              rows={5}
              placeholder="Explain the reasoning behind the selected decision..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
            />

          </div>

          {/* CONDITIONS */}

          <div className="mt-5">

            <label className="text-sm font-semibold">
              Conditions / Next Steps
            </label>

            <textarea
              value={conditions}
              onChange={(event) =>
                setConditions(event.target.value)
              }
              rows={4}
              placeholder="Add conditions, compliance requirements, timelines or next steps..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
            />

          </div>

          {/* WARNING */}

          {decision === "close" && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Close Challenge
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600 dark:text-red-300">
                  Closing the challenge will indicate that
                  the pilot should not proceed to further
                  implementation.
                </p>
              </div>

            </div>
          )}

          {/* SELECTED DECISION */}

          {decision && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">

              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Selected Decision
              </p>

              <p className="mt-1 text-sm font-semibold">
                {getDecisionLabel(decision)}
              </p>

            </div>
          )}

        </section>

        {/* SUBMITTED */}

        {submitted && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Decision submitted successfully
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-600 dark:text-emerald-400">
                The final decision has been recorded for
                challenge {id}.
              </p>
            </div>
          </motion.div>
        )}

        {/* ACTIONS */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/evidence`
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Evidence
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
                : "Save Decision"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Send className="h-4 w-4" />
              Submit Decision
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">

      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>

        <p className="text-lg font-bold">
          {value}
        </p>

      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </p>

    </div>
  );
}

// =========================================================
// DECISION CARD
// =========================================================

function DecisionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all ${
        selected
          ? "border-slate-900 bg-slate-900 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-900"
          : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          selected
            ? "bg-white/10 dark:bg-slate-900/10"
            : "bg-slate-100 dark:bg-slate-800"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm font-semibold">
        {title}
      </p>

      <p
        className={`mt-2 text-xs leading-5 ${
          selected
            ? "text-slate-300 dark:text-slate-600"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {description}
      </p>

      {selected && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Selected
        </div>
      )}
    </button>
  );
}

// =========================================================
// DECISION LABEL
// =========================================================

function getDecisionLabel(decision) {
  const labels = {
    scale_up: "Scale Up",
    extend_pilot: "Extend Pilot",
    close: "Close Challenge",
  };

  return labels[decision] || "";
}

export default ChallengeDecision;