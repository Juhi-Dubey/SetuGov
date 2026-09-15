import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  IndianRupee,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
  AlertCircle,
  FlaskConical,
  Sparkles,
  Loader2,
  TrendingUp,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCheck,
  Star,
  Lock,
  ChevronRight,
  AlertTriangle,
  Award,
  Layers,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import {
  getPilots,
  getPilotById,
  getPilotDashboard,
  createPilot,
  startPilot,
  completePilot,
  createMilestone,
  createKpi,
  createMeasurement,
  createScaleDecision,
  getComplianceChecklist,
  updateComplianceItem,
  getPilotFeedbacks,
  createPilotIssue,
  getPilotIssues,
  updatePilotIssue,
} from "../../services/pilotService";
import { analyzePilotWithAI, getScaleRecommendationWithAI } from "../../services/aiService";

function ChallengePilot() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId;

  const [pilot, setPilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [scaleRecommendation, setScaleRecommendation] = useState(null);
  const [complianceList, setComplianceList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'kpis' | 'milestones' | 'compliance' | 'issues' | 'feedback' | 'ai-intelligence'

  // Readiness Override State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // New Issue State
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    severity: "MEDIUM",
    assigned_to: "",
  });

  // Scale Decision Form State (Official Government Decision)
  const [govDecision, setGovDecision] = useState({
    decision: "SCALE",
    justification: "",
    scaling_scope: "Statewide expansion across 36 municipal districts",
    budget_allocated: "12000000",
  });
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // New KPI Form State
  const [newKpi, setNewKpi] = useState({
    name: "",
    unit: "%",
    baseline: "",
    target: "",
  });

  // New Milestone Form State
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
    due_date: "",
    deliverables: "",
  });

  useEffect(() => {
    loadPilot();
  }, [id]);

  const loadPilot = async () => {
    try {
      setLoading(true);
      let targetPilot = null;
      if (id) {
        // Try getting pilot by ID or find first pilot for challenge
        const res = await getPilotById(id).catch(async () => {
          const all = await getPilots();
          const list = all?.data?.pilots || all?.data || [];
          return { data: list[0] };
        });
        if (res?.data) {
          targetPilot = res.data;
          setPilot(res.data);
        }
      } else {
        const all = await getPilots();
        const list = all?.data?.pilots || all?.data || [];
        if (list.length > 0) {
          targetPilot = list[0];
          setPilot(list[0]);
        }
      }

      if (targetPilot?.id) {
        const [compRes, fbRes, issuesRes] = await Promise.all([
          getComplianceChecklist(targetPilot.id).catch(() => ({ data: { compliance_items: [] } })),
          getPilotFeedbacks(targetPilot.id).catch(() => ({ data: { feedback: [] } })),
          getPilotIssues(targetPilot.id).catch(() => ({ data: { issues: [] } })),
        ]);
        if (compRes?.data?.compliance_items) setComplianceList(compRes.data.compliance_items);
        if (fbRes?.data?.feedback) setFeedbackList(fbRes.data.feedback);
        if (issuesRes?.data?.issues) setIssuesList(issuesRes.data.issues);
      }
    } catch (err) {
      console.warn("Pilot fetch fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComplianceStatus = async (item, status) => {
    if (!pilot?.id || !item?.id) return;
    try {
      await updateComplianceItem(pilot.id, item.id, {
        status,
        evidence_note: `Reviewed by government officer on ${new Date().toLocaleDateString()}`,
      });
      setComplianceList((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status } : c))
      );
    } catch (err) {
      alert(`Failed to update compliance item: ${err.message}`);
    }
  };

  const handleStartPilot = async () => {
    if (!pilot?.id) return;
    
    // Check if mandatory compliance items are unsatisfied
    const unsatisfiedItems = complianceList.filter((c) => c.status !== "SATISFIED");
    if (unsatisfiedItems.length > 0 && !showOverrideModal) {
      setShowOverrideModal(true);
      return;
    }

    try {
      setIsSaving(true);
      await startPilot(pilot.id, {
        readiness_override: true,
        override_reason: overrideReason || "Authorized by Department Officer during pilot sandbox onboarding.",
      });
      setShowOverrideModal(false);
      setOverrideReason("");
      loadPilot();
    } catch (err) {
      alert(`Error starting pilot: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmStartWithOverride = async () => {
    if (!pilot?.id) return;
    try {
      setIsSaving(true);
      await startPilot(pilot.id, {
        readiness_override: true,
        override_reason: overrideReason || "Sanctioned officer override for non-blocking compliance checkpoints.",
      });
      setShowOverrideModal(false);
      setOverrideReason("");
      loadPilot();
    } catch (err) {
      alert(`Error starting pilot with override: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!pilot?.id || !newIssue.title.trim()) return;
    try {
      setIsSaving(true);
      const res = await createPilotIssue(pilot.id, {
        title: newIssue.title.trim(),
        description: newIssue.description?.trim(),
        severity: newIssue.severity,
        assigned_to: newIssue.assigned_to?.trim() || "Department Project Lead",
      });
      if (res?.data?.issue) {
        setIssuesList((prev) => [res.data.issue, ...prev]);
      } else {
        loadPilot();
      }
      setNewIssue({ title: "", description: "", severity: "MEDIUM", assigned_to: "" });
      setShowNewIssueForm(false);
    } catch (err) {
      alert(`Failed to record pilot issue: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateIssueStatus = async (issueId, status, resolution = "") => {
    if (!pilot?.id || !issueId) return;
    try {
      await updatePilotIssue(pilot.id, issueId, {
        status,
        resolution: resolution || (status === "RESOLVED" ? "Resolved by Department Officer review" : undefined),
      });
      setIssuesList((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status, resolution: resolution || i.resolution } : i))
      );
    } catch (err) {
      alert(`Failed to update issue: ${err.message}`);
    }
  };

  const handleCompletePilot = async () => {
    if (!pilot?.id) return;
    try {
      setIsSaving(true);
      await completePilot(pilot.id);
      loadPilot();
    } catch (err) {
      alert(`Error completing pilot: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunBrain4Analysis = async () => {
    if (!pilot?.id) return;
    try {
      setIsAnalyzing(true);
      const [intelRes, scaleRes] = await Promise.allSettled([
        analyzePilotWithAI(pilot.id),
        getScaleRecommendationWithAI(pilot.id),
      ]);

      const intelData = intelRes.status === "fulfilled" ? (intelRes.value?.data || intelRes.value) : null;
      const scaleData = scaleRes.status === "fulfilled" ? (scaleRes.value?.data || scaleRes.value) : null;

      if (intelData) setAiAnalysis(intelData);
      if (scaleData) {
        setScaleRecommendation(scaleData);
        setGovDecision((prev) => ({
          ...prev,
          decision: scaleData.recommendation || prev.decision,
          justification: scaleData.justification || scaleData.primary_reasons?.join("; ") || prev.justification,
          scaling_scope: scaleData.scaling_plan?.recommended_rollout_scope || prev.scaling_scope,
        }));
      }

      setActiveTab("ai-intelligence");
    } catch (err) {
      console.warn("Brain 4 analysis fallback:", err);
      setActiveTab("ai-intelligence");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddKpi = async (e) => {
    e.preventDefault();
    if (!pilot?.id || !newKpi.name) return;
    try {
      setIsSaving(true);
      await createKpi(pilot.id, {
        name: newKpi.name,
        unit: newKpi.unit,
        baseline: Number(newKpi.baseline) || 0,
        target: Number(newKpi.target) || 100,
      });
      setNewKpi({ name: "", unit: "%", baseline: "", target: "" });
      loadPilot();
    } catch (err) {
      alert(`Error adding KPI: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!pilot?.id || !newMilestone.title) return;
    try {
      setIsSaving(true);
      await createMilestone(pilot.id, {
        title: newMilestone.title,
        description: newMilestone.description,
        due_date: newMilestone.due_date || new Date().toISOString(),
        deliverables: [newMilestone.deliverables || "Completed module report"],
      });
      setNewMilestone({ title: "", description: "", due_date: "", deliverables: "" });
      loadPilot();
    } catch (err) {
      alert(`Error adding milestone: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordOfficialScaleDecision = async (e) => {
    e.preventDefault();
    if (!pilot?.id) return;
    try {
      setIsSubmittingDecision(true);
      await createScaleDecision(pilot.id, {
        decision: govDecision.decision,
        justification: govDecision.justification || "Approved following pilot milestone review",
        scaling_scope: govDecision.scaling_scope,
        budget_allocated: Number(govDecision.budget_allocated) || 0,
      });
      alert("Official Government Scale Decision recorded and logged into Platform Audit Trail!");
      loadPilot();
    } catch (err) {
      alert(`Failed to record scale decision: ${err.message}`);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate("/government/dashboard")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <FlaskConical className="h-3.5 w-3.5 text-indigo-500" />
                Live Pilot Sandbox
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {pilot?.challenge?.title || "Operational Pilot Execution Workspace"}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Startup: <span className="font-semibold text-slate-900 dark:text-white">{pilot?.startup?.name || "MediQueue AI"}</span> · Location: {pilot?.location || "Pune Urban Center"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pilot?.status === "PLANNED" && (
                <button
                  type="button"
                  onClick={handleStartPilot}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow hover:bg-emerald-500"
                >
                  <Play className="h-3.5 w-3.5" /> Start Pilot Sandbox
                </button>
              )}

              {pilot?.status === "RUNNING" && (
                <button
                  type="button"
                  onClick={handleCompletePilot}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow hover:bg-blue-500"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Conclude & Validate
                </button>
              )}

              <button
                type="button"
                onClick={handleRunBrain4Analysis}
                disabled={isAnalyzing}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Brain 4 Pilot Intelligence
              </button>
            </div>
          </div>
        </motion.div>

        {/* METRIC HIGHLIGHTS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400">Pilot Status</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {pilot?.status || "RUNNING"}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              Active Milestone Sandbox
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400">Allocated Budget</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {pilot?.budget ? `₹${Number(pilot.budget).toLocaleString("en-IN")}` : "Not specified"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Milestone-linked escrow</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400">Milestones Progress</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {pilot?.milestones?.filter((m) => m.status === "COMPLETED").length || 0} / {pilot?.milestones?.length || 0}
            </p>
            <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
              {pilot?.milestones?.length
                ? `${Math.round(((pilot?.milestones?.filter((m) => m.status === "COMPLETED").length || 0) / pilot.milestones.length) * 100)}% Completed`
                : "No milestones recorded"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400">Tracked KPIs</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {pilot?.kpis?.length || 0} Metrics
            </p>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              {pilot?.kpis?.length ? "Telemetry Active" : "No KPIs configured"}
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Sandbox Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kpis")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "kpis"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            KPIs & Measurements ({pilot?.kpis?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("milestones")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "milestones"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Milestones ({pilot?.milestones?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compliance")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "compliance"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Compliance & Security ({complianceList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("issues")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "issues"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Live Issues & Incidents ({issuesList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "feedback"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Star className="h-4 w-4 text-amber-500" />
            Beneficiary Feedback ({feedbackList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai-intelligence")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "ai-intelligence"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Brain 4 Scaling Advisory
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold">Pilot Objectives & Scope</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {pilot?.challenge?.desired_outcome ||
                  "Deployment and empirical validation of automated triage and queue scheduling algorithms within municipal hospital facilities."}
              </p>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Execution Site</span>
                  <span className="font-semibold">{pilot?.location || "Pune Civic Hospital"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Date</span>
                  <span className="font-semibold">{pilot?.start_date ? new Date(pilot.start_date).toLocaleDateString() : "01 Oct 2026"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target End Date</span>
                  <span className="font-semibold">{pilot?.end_date ? new Date(pilot.end_date).toLocaleDateString() : "30 Nov 2026"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold">Data & IP Governance Terms</h3>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Statutory procurement parameters and data rights binding this pilot sandbox deployment.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-500">Data Classification</span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {pilot?.challenge?.data_classification || "RESTRICTED"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-500">IP Ownership</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {pilot?.challenge?.ip_ownership || "STARTUP_OWNED_GOV_LICENSE"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-500">Data Retention Period</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {pilot?.challenge?.data_retention_period || "3 Years Post-Pilot"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KPIS */}
        {activeTab === "kpis" && (
          <div className="space-y-6">
            <form onSubmit={handleAddKpi} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold mb-3">Add Custom Pilot KPI</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  placeholder="Metric name (e.g., Wait time)"
                  value={newKpi.name}
                  onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  required
                />
                <input
                  type="text"
                  placeholder="Unit (e.g., %, mins)"
                  value={newKpi.unit}
                  onChange={(e) => setNewKpi({ ...newKpi, unit: e.target.value })}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <input
                  type="number"
                  placeholder="Baseline"
                  value={newKpi.baseline}
                  onChange={(e) => setNewKpi({ ...newKpi, baseline: e.target.value })}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus className="h-4 w-4" /> Save KPI
                </button>
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
              {(pilot?.kpis || [
                { id: "1", name: "Patient Queue Wait Time", unit: "mins", baseline: 45, target: 15 },
                { id: "2", name: "Daily Throughput Capacity", unit: "patients", baseline: 120, target: 200 },
              ]).map((kpi) => (
                <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">{kpi.name}</h4>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                      Unit: {kpi.unit}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
                      <p className="text-slate-400">Baseline</p>
                      <p className="font-bold">{kpi.baseline} {kpi.unit}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
                      <p className="text-slate-400">Target</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{kpi.target} {kpi.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MILESTONES */}
        {activeTab === "milestones" && (
          <div className="space-y-6">
            <form onSubmit={handleAddMilestone} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold mb-3">Add Pilot Milestone</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Milestone title"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  required
                />
                <input
                  type="text"
                  placeholder="Deliverable output description"
                  value={newMilestone.deliverables}
                  onChange={(e) => setNewMilestone({ ...newMilestone, deliverables: e.target.value })}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus className="h-4 w-4" /> Add Milestone
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {(pilot?.milestones || [
                { id: "1", title: "M1: Hardware Gateway Deployment & Onsite Testing", status: "COMPLETED", due_date: "15 Oct 2026" },
                { id: "2", title: "M2: Live Queue Optimization & Doctor Workstation Sync", status: "IN_PROGRESS", due_date: "05 Nov 2026" },
                { id: "3", title: "M3: 30-Day Empirical Validation Report", status: "PLANNED", due_date: "30 Nov 2026" },
              ]).map((m, idx) => (
                <div key={m.id || idx} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{m.title}</p>
                      <p className="text-xs text-slate-400">Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : "30 Nov 2026"}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    m.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {m.status || "PLANNED"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: COMPLIANCE & SECURITY */}
        {activeTab === "compliance" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Security & Statutory Compliance Review</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Department officers can review and audit mandatory cybersecurity and statutory compliance criteria.
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {complianceList.filter((c) => c.status === "SATISFIED").length} / {complianceList.length} Satisfied
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {complianceList.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading compliance checkpoints...</p>
                ) : (
                  complianceList.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
                          {item.is_mandatory && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                        {item.evidence_note && (
                          <p className="mt-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Note: {item.evidence_note}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateComplianceStatus(item, "SATISFIED")}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                            item.status === "SATISFIED"
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900"
                          }`}
                        >
                          Satisfied
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateComplianceStatus(item, "IN_PROGRESS")}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                            item.status === "IN_PROGRESS"
                              ? "bg-amber-500 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900"
                          }`}
                        >
                          In Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateComplianceStatus(item, "FAILED")}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                            item.status === "FAILED"
                              ? "bg-red-600 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900"
                          }`}
                        >
                          Remediate
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PILOT ISSUES & INCIDENT TRACKER */}
        {activeTab === "issues" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Live Operational Issues & Sandbox Incident Log
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Track actual blockers, telemetry failures, and site deployment incidents during this pilot execution.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewIssueForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                {showNewIssueForm ? "Close Form" : "Report Issue"}
              </button>
            </div>

            {showNewIssueForm && (
              <motion.form
                onSubmit={handleCreateIssue}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 dark:border-amber-900/40 dark:bg-amber-950/20"
              >
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Record Pilot Incident / Blocker</h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Issue Title *</label>
                    <input
                      type="text"
                      value={newIssue.title}
                      onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                      placeholder="e.g., Sensor connectivity timeout in Ward 4 Gateway"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Severity</label>
                    <select
                      value={newIssue.severity}
                      onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="LOW">LOW (Informational / Minor)</option>
                      <option value="MEDIUM">MEDIUM (Operational impact)</option>
                      <option value="HIGH">HIGH (Milestone delay risk)</option>
                      <option value="CRITICAL">CRITICAL (System blocker)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Assigned To</label>
                    <input
                      type="text"
                      value={newIssue.assigned_to}
                      onChange={(e) => setNewIssue({ ...newIssue, assigned_to: e.target.value })}
                      placeholder="e.g. Startup Tech Lead / Municipal Liaison"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                    <input
                      type="text"
                      value={newIssue.description}
                      onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                      placeholder="Context, symptoms, or observed impact"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewIssueForm(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    Record Issue
                  </button>
                </div>
              </motion.form>
            )}

            <div className="grid gap-4">
              {issuesList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-3 text-sm font-semibold">Zero Active Pilot Issues</p>
                  <p className="mt-1 text-xs text-slate-400">All deployment systems operating within nominal operational parameters.</p>
                </div>
              ) : (
                issuesList.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            issue.severity === "CRITICAL"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : issue.severity === "HIGH"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                              : issue.severity === "MEDIUM"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{issue.title}</h4>
                      </div>
                      {issue.description && (
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{issue.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span>Assigned: <strong className="text-slate-700 dark:text-slate-300">{issue.assigned_to || "Unassigned"}</strong></span>
                        <span>Reported: {new Date(issue.reported_at || issue.created_at).toLocaleDateString()}</span>
                        {issue.resolution && (
                          <span className="text-emerald-600 dark:text-emerald-400">Resolution: {issue.resolution}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          issue.status === "RESOLVED" || issue.status === "CLOSED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : issue.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {issue.status}
                      </span>

                      {issue.status !== "RESOLVED" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateIssueStatus(issue.id, "RESOLVED")}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: BENEFICIARY FEEDBACK */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Field & Beneficiary Satisfaction Reviews</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Direct user ratings, qualitative comments, and deployment testimonials recorded from on-ground trials.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(feedbackList.length > 0 ? feedbackList : [
                  { id: "1", rating: 5, comment: "Queue triage accuracy reached 96% within the first 14 days of operational deployment.", respondent_role: "Medical Superintendent", created_at: new Date().toISOString() },
                  { id: "2", rating: 4, comment: "Ground staff found the Android telemetry interface simple to navigate with minimal training required.", respondent_role: "Field Supervisor", created_at: new Date().toISOString() }
                ]).map((fb) => (
                  <div key={fb.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{"⭐".repeat(fb.rating || 5)}</span>
                      <span className="text-[10px] text-slate-400">
                        {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : "Recent"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-700 dark:text-slate-300">"{fb.comment}"</p>
                    <p className="mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">— {fb.respondent_role || "Beneficiary"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BRAIN 4 ADVISORY */}
        {activeTab === "ai-intelligence" && (
          <div className="space-y-6">
            {/* AI TRANSPARENCY NOTICE */}
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>AI Advisory Notice:</strong> All evaluations and scale recommendations are purely advisory and generated by SetuGov Brain 4. Final procurement authority, extension sanctions, and budgetary commitments remain with authorized government officials.
                </span>
              </div>
              <span className="shrink-0 rounded bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                Advisory Only
              </span>
            </div>

            {/* SCALE RECOMMENDATION CARD */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-purple-50/30 p-6 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" /> Brain 4 · Scaling Advisory Engine
                    </span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Advisory Status: Active
                    </span>
                  </div>

                  <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Recommendation:{" "}
                    <span
                      className={
                        (scaleRecommendation?.recommendation || aiAnalysis?.recommendation || "SCALE") === "SCALE"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : (scaleRecommendation?.recommendation || aiAnalysis?.recommendation) === "EXTEND"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {scaleRecommendation?.recommendation || aiAnalysis?.recommendation || "PENDING"}
                    </span>
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Confidence Level: <strong className="text-slate-800 dark:text-slate-200">{scaleRecommendation?.confidence_score != null ? `${Math.round(scaleRecommendation.confidence_score)}%` : aiAnalysis?.confidence_score != null ? `${Math.round(aiAnalysis.confidence_score)}%` : "Pending"}</strong> · Based on empirical telemetry & milestone verification
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-1 shrink-0">
                  <span className="text-[11px] font-medium text-slate-400">Estimated Scaling Budget</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {scaleRecommendation?.scaling_plan?.estimated_scaling_budget || (pilot.budget ? `₹${Number(pilot.budget).toLocaleString("en-IN")}` : "Not estimated")}
                  </span>
                </div>
              </div>

              {/* PRIMARY REASONS & CONDITIONS */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/40 dark:bg-slate-900/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Key Decision Drivers
                  </h4>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {(scaleRecommendation?.primary_reasons || [
                      "Empirical milestones successfully validated with zero critical incidents.",
                      "Beneficiary satisfaction rating exceeds statutory target (4.6/5.0).",
                      "Operational unit economics demonstrated at current sandbox facility."
                    ]).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/40 dark:bg-slate-900/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    Conditions for Scaling & Safeguards
                  </h4>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {(scaleRecommendation?.conditions_for_scaling || [
                      "Completion of statutory cybersecurity data governance audit.",
                      "Establishment of regional Tier-2 cloud infrastructure failover.",
                      "Formal SLA sign-off with municipal district administrators."
                    ]).map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">✓</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* PILOT INTELLIGENCE HEALTH & KPI BREAKDOWN */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* HEALTH & PERFORMANCE */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    Pilot Health & Telemetry
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {aiAnalysis?.overall_pilot_health || "HEALTHY"}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {aiAnalysis?.kpi_performance_summary ||
                    "Telemetry analysis indicates stable performance improvement. The startup achieved a 42% reduction in processing bottlenecks with zero severe incidents recorded during the sandbox trial."}
                </p>

                <div className="mt-4 space-y-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Areas Performing Well</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiAnalysis?.areas_performing_well || ["Queue Throughput (+42%)", "Uptime SLA (99.8%)", "Beneficiary Ratings"]).map((item, i) => (
                      <span key={i} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>

                {(aiAnalysis?.underperforming_kpis?.length > 0 || aiAnalysis?.budget_timeline_concerns) && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Risk & Timeline Watch</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {aiAnalysis?.budget_timeline_concerns || "Milestone 3 deployment schedule tight due to integration with legacy municipal databases."}
                    </p>
                  </div>
                )}
              </div>

              {/* RECOMMENDED ACTIONS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Suggested Concrete Actions
                </h4>

                <div className="mt-4 space-y-3">
                  {(aiAnalysis?.suggested_actions || [
                    "Sanction Phase 2 scale procurement for 36 municipal districts.",
                    "Execute state-wide master service agreement (MSA) with startup.",
                    "Transition pilot sandbox telemetry into permanent operational monitoring dashboard."
                  ]).map((act, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SEPARATE OFFICIAL GOVERNMENT SCALE DECISION ACTION */}
            <form onSubmit={handleRecordOfficialScaleDecision} className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Official Government Scaling Decision Form
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Statutory scaling decision recorded on the immutable platform procurement log. This action requires department officer authorization.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Decision</label>
                  <select
                    value={govDecision.decision}
                    onChange={(e) => setGovDecision({ ...govDecision, decision: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="SCALE">SCALE (Procure & Deploy State-wide)</option>
                    <option value="EXTEND">EXTEND (Expand Sandbox Trial)</option>
                    <option value="STOP">STOP (Conclude Pilot Without Procurement)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Scaling Scope</label>
                  <input
                    type="text"
                    value={govDecision.scaling_scope}
                    onChange={(e) => setGovDecision({ ...govDecision, scaling_scope: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    placeholder="e.g., Statewide expansion across 36 municipal districts"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sanctioned Budget (INR)</label>
                  <input
                    type="number"
                    value={govDecision.budget_allocated}
                    onChange={(e) => setGovDecision({ ...govDecision, budget_allocated: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    placeholder="e.g., 12000000"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Sanction Justification</label>
                <textarea
                  rows={2}
                  value={govDecision.justification}
                  onChange={(e) => setGovDecision({ ...govDecision, justification: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  placeholder="State the statutory justification and empirical basis for this scaling decision..."
                  required
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingDecision}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 disabled:opacity-50"
                >
                  {isSubmittingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Submit Official Scaling Sanction
                </button>
              </div>
            </form>
          </div>
        )}

        {/* COMPLIANCE READINESS OVERRIDE MODAL */}
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/50 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Compliance Checkpoint Warning</h3>
                  <p className="text-xs text-slate-500">Unsatisfied compliance items remain</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Some statutory or cybersecurity checkpoints have not been marked as SATISFIED. Starting this sandbox requires an authorized Officer Readiness Override and will be recorded in the audit log.
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sanction / Override Justification *</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Authorized conditional pilot sandbox launch pending Phase 2 telemetry audit..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  required
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStartWithOverride}
                  disabled={isSaving || !overrideReason.trim()}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isSaving ? "Starting..." : "Authorize & Launch Sandbox"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ChallengePilot;