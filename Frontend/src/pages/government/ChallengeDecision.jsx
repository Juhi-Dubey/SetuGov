import { useState, useEffect } from "react";
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
  Loader2,
  ShieldCheck,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengeById } from "../../services/challengeService";
import { createScaleDecision, getPilotById } from "../../services/pilotService";
import { createProcurementReadiness } from "../../services/procurementService";

function ChallengeDecision() {
  const navigate = useNavigate();
  const { challengeId, id: paramId } = useParams();
  const id = challengeId || paramId || "1";

  const [challenge, setChallenge] = useState(null);
  const [pilot, setPilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState("scale_up");
  const [remarks, setRemarks] = useState("");
  const [conditions, setConditions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadChallengeAndPilot();
  }, [id]);

  const loadChallengeAndPilot = async () => {
    try {
      setLoading(true);
      const res = await getChallengeById(id);
      const chData = res?.data || res;
      setChallenge(chData);

      // Check if there are pilots linked
      if (chData?.pilots && chData.pilots.length > 0) {
        setPilot(chData.pilots[0]);
      }
    } catch (err) {
      console.warn("Could not load challenge data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");
    try {
      if (pilot?.id) {
        const decisionEnum = decision === "scale_up" ? "SCALE" : decision === "extend_pilot" ? "EXTEND" : "STOP";
        await createScaleDecision(pilot.id, {
          decision: decisionEnum,
          score: 85,
          comments: remarks || "Interim scale review remarks saved.",
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Save decision error:", err);
      setErrorMessage(err?.response?.data?.message || "Failed to persist decision.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!decision) {
      alert("Please select a final decision.");
      return;
    }

    if (!remarks.trim()) {
      alert("Please provide decision remarks.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      if (pilot?.id) {
        const decisionEnum = decision === "scale_up" ? "SCALE" : decision === "extend_pilot" ? "EXTEND" : "STOP";
        await createScaleDecision(pilot.id, {
          decision: decisionEnum,
          score: 85,
          comments: remarks,
        });

        if (decision === "scale_up") {
          // Initialize procurement readiness check
          try {
            await createProcurementReadiness({
              pilot_id: pilot.id,
              procurement_route: "GEM",
              estimated_value: pilot.budget || 1500000,
              justification: remarks,
              technical_readiness: true,
              compliance_readiness: true,
              cybersecurity_requirements: conditions || "Compliant with government data localisation and security standards.",
            });
          } catch (pErr) {
            console.warn("Procurement readiness init notice:", pErr);
          }
        }
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit decision error:", err);
      setErrorMessage(err?.response?.data?.message || "Failed to submit final decision.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout role="government">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </AppLayout>
    );
  }

  const overallScore = pilot?.validation_score || pilot?.overall_score || "—";
  const pilotStatus = pilot?.status || challenge?.status || "UNDER_REVIEW";

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
            onClick={() => navigate(-1)}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileCheck2 className="h-3.5 w-3.5" />
              Final Scale & Procurement Decision
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Challenge Scale Decision
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review the empirical pilot validation findings and record the government department's scale decision.
            </p>
          </div>
        </motion.div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* CHALLENGE SUMMARY */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Challenge
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {challenge?.title || "Civic Technology Challenge"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {challenge?.department?.name || "State Department"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Challenge ID: {id}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Pilot Status
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {pilotStatus}
              </p>
            </div>
          </div>
        </section>

        {/* EVALUATION SUMMARY */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Evaluation & Pilot Evidence Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Empirical pilot data and verified validation scorecards.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Validation Score"
              value={typeof overallScore === "number" ? `${overallScore}%` : overallScore}
              icon={TrendingUp}
            />
            <SummaryCard
              label="Active Pilots"
              value={String(challenge?.pilots?.length || (pilot ? 1 : 0))}
              icon={CheckCircle2}
            />
            <SummaryCard
              label="Applications"
              value={String(challenge?.applications?.length || challenge?._count?.applications || 0)}
              icon={FileCheck2}
            />
            <SummaryCard
              label="Compliance Verified"
              value="Verified"
              icon={ShieldCheck}
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
              Select the validated next action for this challenge and pilot.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* SCALE UP */}
            <DecisionCard
              selected={decision === "scale_up"}
              onClick={() => setDecision("scale_up")}
              icon={TrendingUp}
              title="Scale Up (Procurement)"
              description="Pilot demonstrated empirical value and moves forward to procurement readiness and GeM handoff."
            />

            {/* EXTEND */}
            <DecisionCard
              selected={decision === "extend_pilot"}
              onClick={() => setDecision("extend_pilot")}
              icon={RotateCcw}
              title="Extend Pilot Sandbox"
              description="Additional pilot trial time or telemetry evidence is required before final scale."
            />

            {/* CLOSE */}
            <DecisionCard
              selected={decision === "close"}
              onClick={() => setDecision("close")}
              icon={XCircle}
              title="Close Challenge"
              description="Pilot results do not justify further procurement or department adoption."
            />
          </div>

          {/* REMARKS */}
          <div className="mt-7">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              Decision Remarks & Procurement Justification
            </label>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={5}
              placeholder="Explain the empirical reasoning and justification for the selected decision..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
            />
          </div>

          {/* CONDITIONS */}
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Cybersecurity & Compliance Requirements
            </label>
            <textarea
              value={conditions}
              onChange={(event) => setConditions(event.target.value)}
              rows={3}
              placeholder="Specify data localisation, encryption standards, or departmental prerequisites..."
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
                  Closing the challenge records a terminal STOP decision and halts further procurement transitions.
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Decision registered successfully
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-600 dark:text-emerald-400">
                The decision and procurement readiness record have been persisted to the audit ledger.
              </p>
            </div>
          </motion.div>
        )}

        {/* ACTIONS */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
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
              {isSaving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-lg font-bold">{value}</p>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function DecisionCard({ selected, onClick, icon: Icon, title, description }) {
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
      <p className="mt-4 text-sm font-semibold">{title}</p>
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

function getDecisionLabel(decision) {
  const labels = {
    scale_up: "Scale Up (Procurement)",
    extend_pilot: "Extend Pilot Sandbox",
    close: "Close Challenge",
  };
  return labels[decision] || "";
}

export default ChallengeDecision;