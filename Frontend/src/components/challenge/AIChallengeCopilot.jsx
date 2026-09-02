import { useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { generateChallengeWithAI } from "../../services/aiService";

const PROMPT_EXAMPLES = [
  {
    label: "🏥 Hospital OPD Queuing",
    prompt:
      "Civil hospital OPD wait times exceed 90 minutes in district hospitals due to manual registration queues, affecting over 1,200 patients daily. We need an AI-powered smart queue routing and patient triage solution to reduce wait times by 40% and improve patient satisfaction.",
  },
  {
    label: "🚦 Adaptive Traffic Control",
    prompt:
      "Urban junction traffic congestion causes 45-minute peak commute delays. We require a computer vision based real-time adaptive traffic signal system to dynamically adjust green light duration based on live vehicle density.",
  },
  {
    label: "🌾 Crop Pest & Disease Early Warning",
    prompt:
      "Smallholder farmers face 30% yield loss from unmonitored pest outbreaks. We need a smartphone AI diagnostic tool to detect crop diseases from leaf photos and provide regional advisory to 10,000 farmers.",
  },
];

function AIChallengeCopilot({ formData, onAutofill }) {
  const [roughPrompt, setRoughPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [showConfirmRegen, setShowConfirmRegen] = useState(false);

  const hasExistingData =
    Boolean(formData?.title?.trim()) ||
    Boolean(formData?.problemDescription?.trim()) ||
    Boolean(formData?.desiredOutcome?.trim()) ||
    (formData?.kpis && formData.kpis.length > 0);

  const handleGenerate = async (force = false) => {
    if (!roughPrompt.trim()) {
      setGenerationError("Please describe your challenge problem statement first.");
      return;
    }

    if (roughPrompt.trim().length < 15) {
      setGenerationError("Please enter a few more details (at least 15 characters) describing the problem.");
      return;
    }

    if (hasExistingData && !force && !showConfirmRegen) {
      setShowConfirmRegen(true);
      return;
    }

    setShowConfirmRegen(false);
    setIsGenerating(true);
    setGenerationError("");

    try {
      const payload = {
        problem: {
          title:
            roughPrompt.split("\n")[0].slice(0, 80) ||
            "Government Innovation Challenge",
          description:
            roughPrompt.length >= 20
              ? roughPrompt
              : `${roughPrompt} — Government operational problem requiring innovation.`,
          current_process: formData?.currentProcess || null,
          baseline: formData?.currentBaseline || null,
          location: formData?.location || "Maharashtra",
        },
        outcome: {
          desired_outcome: formData?.desiredOutcome || null,
          success_definition: "Measurable operational turnaround time and quality improvement",
        },
        measurement: {
          kpis: (formData?.kpis || []).map((k) => ({
            name: k.name || "Efficiency Metric",
            unit: k.unit || "%",
            baseline: k.baseline ? Number(k.baseline) : null,
            target: k.target ? Number(k.target) : null,
            direction: k.direction || "DECREASE",
            weight: k.weight ? Number(k.weight) : 25,
          })),
        },
        pilot: {
          duration: `${formData?.pilotDurationDays || 60} days`,
          sites: [formData?.location || "District Center"],
          budget: formData?.budget ? `₹${formData.budget}` : "₹15,00,000",
        },
        requirements: {
          technologies: (formData?.requiredTechnologies || []).map((t) =>
            typeof t === "string" ? t : t.name
          ),
          domain: formData?.department || "Public Administration",
        },
      };

      const response = await generateChallengeWithAI(payload);
      const data = response?.data || response;

      if (!data) {
        throw new Error("No data returned from AI Copilot service.");
      }

      setAiResult(data);

      // Construct mapped form values from Backend Brain 1 response
      const mappedData = {
        // Step 1: Problem
        title:
          data.enhanced_challenge?.title ||
          (data.problem_summary
            ? data.problem_summary.length > 70
              ? `${data.problem_summary.slice(0, 67)}...`
              : data.problem_summary
            : "") ||
          roughPrompt.split("\n")[0].slice(0, 80),
        department:
          formData.department ||
          data.domain ||
          "Department of Public Health",
        location:
          formData.location ||
          data.pilot_recommendation?.suggested_sites?.[0] ||
          "District Civil Hospital, Pune",
        problemDescription: data.problem_summary || roughPrompt,
        currentProcess:
          data.root_cause_hypotheses && data.root_cause_hypotheses.length > 0
            ? `Current Operational Bottlenecks:\n• ${data.root_cause_hypotheses.join("\n• ")}`
            : "Manual registration queues and uncoordinated doctor schedules causing peak-hour congestion.",
        currentBaseline:
          data.baseline ||
          (data.suggested_kpis?.[0]?.baseline != null
            ? `Average waiting time is ${data.suggested_kpis[0].baseline} ${data.suggested_kpis[0].unit || "mins"} with 100% manual processing`
            : "Average waiting time: 90 minutes; 100% manual check-in"),

        // Step 2: Outcome & KPIs
        desiredOutcome:
          data.desired_outcome ||
          data.success_definition ||
          "Reduce average OPD waiting time by 40% with smart automated queue management and triage.",
        kpis:
          data.suggested_kpis && data.suggested_kpis.length > 0
            ? data.suggested_kpis.map((kpi, idx) => ({
                id: crypto.randomUUID(),
                name: kpi.name || `KPI ${idx + 1}`,
                unit: kpi.unit || "minutes",
                baseline:
                  kpi.baseline != null ? String(kpi.baseline) : (idx === 0 ? "90" : "0"),
                target:
                  kpi.target != null ? String(kpi.target) : (idx === 0 ? "45" : "85"),
                direction: kpi.direction || "DECREASE",
                weight:
                  kpi.suggested_weight != null
                    ? String(kpi.suggested_weight)
                    : (idx === 0 ? "40" : "30"),
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  name: "Average OPD Waiting Time",
                  unit: "minutes",
                  baseline: "90",
                  target: "45",
                  direction: "DECREASE",
                  weight: "40",
                },
                {
                  id: crypto.randomUUID(),
                  name: "Digital Queue Adoption Rate",
                  unit: "%",
                  baseline: "0",
                  target: "85",
                  direction: "INCREASE",
                  weight: "35",
                },
                {
                  id: crypto.randomUUID(),
                  name: "Patient Satisfaction Index",
                  unit: "/5",
                  baseline: "2.4",
                  target: "4.5",
                  direction: "INCREASE",
                  weight: "25",
                },
              ],

        // Step 3: Pilot
        startup: formData.startup || "Open for Qualified Startup Applications",
        pilotLocation:
          data.pilot_recommendation?.suggested_sites?.[0] ||
          formData.location ||
          "District Civil Hospital, Pune",
        pilotStartDate:
          formData.pilotStartDate ||
          new Date().toISOString().split("T")[0],
        pilotEndDate:
          formData.pilotEndDate ||
          new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        budget: "1500000",
        budgetMin: 500000,
        budgetMax: 2000000,
        pilotDurationDays: 60,
        milestones:
          formData.milestones && formData.milestones.length > 0
            ? formData.milestones
            : [
                {
                  id: crypto.randomUUID(),
                  name: "Phase 1: Architecture & Queue Integration",
                  description:
                    "Deploy edge kiosks, mobile queue link, and integrate with hospital registration.",
                  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  paymentPercentage: "30",
                  status: "not_started",
                },
                {
                  id: crypto.randomUUID(),
                  name: "Phase 2: Live Pilot Triage & Routing",
                  description:
                    "Live rollout with 1,000+ daily OPD patients and real-time dashboard telemetry.",
                  dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  paymentPercentage: "40",
                  status: "not_started",
                },
                {
                  id: crypto.randomUUID(),
                  name: "Phase 3: Outcome Validation & Scaling Review",
                  description:
                    "Measure telemetry KPIs against baseline and prepare final scaling recommendation.",
                  dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  paymentPercentage: "30",
                  status: "not_started",
                },
              ],

        // Step 4: Requirements
        requiredTechnologies:
          data.technology_categories && data.technology_categories.length > 0
            ? data.technology_categories.map((tech) => ({
                id: crypto.randomUUID(),
                name: tech,
              }))
            : [
                { id: crypto.randomUUID(), name: "Artificial Intelligence & ML" },
                { id: crypto.randomUUID(), name: "Queue Optimization Algorithms" },
                { id: crypto.randomUUID(), name: "Cloud & Edge Deployment" },
              ],
        eligibilityRequirements:
          data.eligibility_considerations && data.eligibility_considerations.length > 0
            ? data.eligibility_considerations.map((el) => ({
                id: crypto.randomUUID(),
                name: el,
                description: "Eligibility criterion for pilot sandbox entry.",
                required: true,
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  name: "DPIIT-recognized Startup entity",
                  description: "Must be certified by Startup India / DPIIT.",
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  name: "Proven Queue / Telemetry Deployment",
                  description: "Demonstrated technical capability in high-load operational setups.",
                  required: true,
                },
              ],
        requiredDocuments:
          data.suggested_documents && data.suggested_documents.length > 0
            ? data.suggested_documents.map((doc) => ({
                id: crypto.randomUUID(),
                name: doc,
                description: "Required for evaluator review and sandbox onboarding.",
                verificationStatus: "pending",
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  name: "Technical Architecture & Security Plan",
                  description: "Detailed system architecture and data privacy policy.",
                  verificationStatus: "pending",
                },
                {
                  id: crypto.randomUUID(),
                  name: "Implementation Milestone Schedule",
                  description: "Breakdown of 60-day pilot execution.",
                  verificationStatus: "pending",
                },
                {
                  id: crypto.randomUUID(),
                  name: "Cost Breakdown & Budget Proposal",
                  description: "Detailed itemized milestone budget.",
                  verificationStatus: "pending",
                },
              ],
      };

      onAutofill(mappedData);
    } catch (err) {
      console.error("AI Challenge Copilot generation failed:", err);
      setGenerationError(
        err.message ||
          "AI suggestions could not be generated. Please check your connection and try again, or fill the form manually."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyExample = (examplePrompt) => {
    setRoughPrompt(examplePrompt);
    setGenerationError("");
  };

  const readinessScore = aiResult?.readiness?.score ?? 85;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 p-6 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-sky-950/20">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                AI Challenge Copilot
              </h2>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                Brain 1
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Enter a rough problem description. The AI will formulate measurable objectives, suggest KPIs, and autofill the entire challenge form.
            </p>
          </div>
        </div>

        {aiResult && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-white px-4 py-2 shadow-xs dark:border-indigo-800 dark:bg-slate-900">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                AI Readiness Score
              </p>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {readinessScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PROMPT INPUT */}
      <div className="mt-5 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Describe your challenge in a few lines
        </label>
        <textarea
          value={roughPrompt}
          onChange={(e) => {
            setRoughPrompt(e.target.value);
            if (generationError) setGenerationError("");
          }}
          disabled={isGenerating}
          rows={4}
          placeholder="Describe the problem you want to solve, who is affected, and what improvement you hope to achieve (e.g. 'Civil hospital OPD wait times exceed 90 minutes. We need an AI smart queue routing system to reduce wait times by 40%...')"
          className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        />

        {/* QUICK PRESET PILLS */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-400">Quick examples:</span>
          {PROMPT_EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyExample(ex.prompt)}
              disabled={isGenerating}
              className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {generationError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">AI Generation Notice</p>
            <p className="mt-0.5">{generationError}</p>
          </div>
        </div>
      )}

      {/* REGENERATION WARNING MODAL / INLINE BANNER */}
      {showConfirmRegen && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Generate new suggestions?</strong> Existing form values will be replaced with fresh AI suggestions.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Confirm & Replace
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmRegen(false)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 font-medium transition-colors hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS POPULATION BANNER */}
      {aiResult && !isGenerating && !showConfirmRegen && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold">Form successfully populated with AI suggestions!</p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                Problem framing, measurable outcome, {aiResult.suggested_kpis?.length || 3} KPIs, pilot parameters, and requirements have been loaded. You can review and edit every field below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ACTIONS */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 pt-4 dark:border-indigo-900/30">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          💡 AI outputs are suggestions. You maintain complete control to edit, add, or remove fields before saving.
        </p>

        <div className="flex items-center gap-2">
          {aiResult && (
            <button
              type="button"
              onClick={() => {
                setRoughPrompt("");
                setAiResult(null);
                setGenerationError("");
              }}
              disabled={isGenerating}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Copilot
            </button>
          )}

          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating challenge...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {aiResult ? "Regenerate Challenge with AI" : "✨ Generate Challenge with AI"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChallengeCopilot;
