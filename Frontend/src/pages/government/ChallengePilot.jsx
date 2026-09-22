import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Plus,
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
  LayoutDashboard,
  BarChart2,
  Flag,
  RefreshCw,
  Clock3,
  Building2,
  DollarSign,
  FileText,
  Info,
  Save,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import PageHeader from "../../components/layout/PageHeader";
import Pagination from "../../components/common/Pagination";
import {
  getPilots,
  getPilotById,
  getPilotDashboard,
  createPilot,
  startPilot,
  completePilot,
  createMilestone,
  createKpi,
  createScaleDecision,
  getScaleDecision,
  getComplianceChecklist,
  updateComplianceItem,
  getPilotFeedbacks,
  createPilotIssue,
  getPilotIssues,
  updatePilotIssue,
} from "../../services/pilotService";
import { getChallengeById, getChallengePilot, getChallengeApplications } from "../../services/challengeService";
import { analyzePilotWithAI, getScaleRecommendationWithAI } from "../../services/aiService";
import { formatPilotStatus } from "../../utils/filterUtils";

const pilotStatusTabs = [
  { id: "ALL", label: "All Pilots" },
  { id: "AT_RISK", label: "At Risk" },
  { id: "RUNNING", label: "Running" },
  { id: "PLANNED", label: "Planned" },
  { id: "VALIDATION", label: "In Validation" },
  { id: "COMPLETED", label: "Completed" },
  { id: "SCALED", label: "Scaled" },
  { id: "STOPPED", label: "Stopped" },
];

function ChallengePilot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramId, challengeId } = useParams();
  const routeId = paramId || challengeId;

  const [pilot, setPilot] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [pilotsList, setPilotsList] = useState([]);
  const [pilotsPagination, setPilotsPagination] = useState(null);

  // Pagination states
  const [pilotsListPage, setPilotsListPage] = useState(1);
  const [pilotsListPageSize, setPilotsListPageSize] = useState(6);

  const [compliancePage, setCompliancePage] = useState(1);
  const [compliancePageSize, setCompliancePageSize] = useState(6);

  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesPageSize, setIssuesPageSize] = useState(5);

  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackPageSize, setFeedbackPageSize] = useState(4);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const statusParam = searchParams.get("status");
  const isChallengeRoute = location.pathname.includes("/challenges/");
  const isDirectPilotRoute = !isChallengeRoute && routeId && routeId !== "pilots" && routeId !== "pilot";
  const isPilotsListRoute = !isChallengeRoute && !isDirectPilotRoute;

  const displayedPilots = useMemo(() => {
    if (!statusParam || statusParam === "ALL") {
      return pilotsList;
    }
    return pilotsList.filter((p) => p.status === statusParam);
  }, [pilotsList, statusParam]);

  // Reset page when filter changes
  useEffect(() => {
    setPilotsListPage(1);
  }, [statusParam]);

  const paginatedPilots = useMemo(() => {
    const start = (pilotsListPage - 1) * pilotsListPageSize;
    return displayedPilots.slice(start, start + pilotsListPageSize);
  }, [displayedPilots, pilotsListPage, pilotsListPageSize]);

  const handleStatusFilterChange = (statusKey) => {
    setPilotsListPage(1);
    if (statusKey === "ALL") {
      navigate("/government/pilots");
    } else {
      navigate(`/government/pilots?status=${statusKey}`);
    }
  };

  const handleSelectPilotFromList = (pilotId) => {
    navigate(`/government/pilots/${pilotId}`);
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [scaleRecommendation, setScaleRecommendation] = useState(null);

  const [complianceList, setComplianceList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'kpis' | 'milestones' | 'compliance' | 'issues' | 'feedback' | 'ai-intelligence'

  // Pilot Creation Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({
    location: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    budget: "",
  }));

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

  // Scale Decision Form State
  const [govDecision, setGovDecision] = useState({
    decision: "",
    justification: "",
    scaling_scope: "",
    budget_allocated: "",
  });
  const [savedScaleDecision, setSavedScaleDecision] = useState(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionErrors, setDecisionErrors] = useState({
    decision: "",
    scaling_scope: "",
    budget_allocated: "",
    justification: "",
  });

  // New KPI Form State (matching backend schema: baseline_value, target_value)
  const [newKpi, setNewKpi] = useState({
    name: "",
    unit: "%",
    baseline_value: "",
    target_value: "",
    description: "",
    weight: "1.0",
  });

  // New Milestone Form State (matching backend schema: name, description, due_date, payment_percentage)
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    due_date: "",
    payment_percentage: "",
  });

  const normalizePilot = (raw) => {
    if (!raw) return null;
    const data = raw.data || raw;
    if (!data) return null;
    if (data.pilot && typeof data.pilot === "object") {
      return {
        ...data.pilot,
        ...data,
        id: data.pilot.id,
        status: data.pilot.status,
        budget: data.pilot.budget,
        location: data.pilot.location,
        start_date: data.pilot.start_date,
        end_date: data.pilot.end_date,
        overall_score: data.pilot.overall_score,
        final_recommendation: data.pilot.final_recommendation,
        kpis: data.kpis || data.pilot.kpis || [],
        milestones: data.milestones || data.pilot.milestones || [],
        startup: data.startup || data.pilot.startup,
        challenge: data.challenge || data.pilot.challenge,
      };
    }
    return data;
  };

  const loadPilotData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      setActionError("");
      setActionSuccess("");

      let resolvedPilot = null;
      let parentChallenge = null;

      const isChallengeRoute = location.pathname.includes("/challenges/");
      const isDirectPilotRoute = !isChallengeRoute && routeId && routeId !== "pilots" && routeId !== "pilot";
      const isPilotsListRoute = !isChallengeRoute && !isDirectPilotRoute;

      const searchParams = new URLSearchParams(location.search);
      const statusParam = searchParams.get("status");

      if (isChallengeRoute && routeId) {
        // Scoped strictly to challenge
        const [pilotRes, chalRes, appsRes] = await Promise.allSettled([
          getChallengePilot(routeId),
          getChallengeById(routeId),
          getChallengeApplications(routeId),
        ]);

        if (chalRes.status === "fulfilled") {
          parentChallenge = chalRes.value?.data?.challenge || chalRes.value?.data || chalRes.value;
          setChallenge(parentChallenge);
        }

        if (appsRes.status === "fulfilled") {
          const apps = appsRes.value?.data || appsRes.value || [];
          const selected = Array.isArray(apps) ? apps.find((a) => a.status === "SELECTED") : null;
          setSelectedApp(selected || null);

          // Populate default create form values from challenge / application
          if (parentChallenge && selected) {
            setCreateForm({
              location: parentChallenge.pilot_location || parentChallenge.location || "",
              start_date: parentChallenge.pilot_start_date
                ? new Date(parentChallenge.pilot_start_date).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              end_date: parentChallenge.pilot_end_date
                ? new Date(parentChallenge.pilot_end_date).toISOString().split("T")[0]
                : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              budget: selected.estimated_cost
                ? String(selected.estimated_cost)
                : parentChallenge.budget_max
                  ? String(parentChallenge.budget_max)
                  : "",
            });
          }
        }

        if (pilotRes.status === "fulfilled" && pilotRes.value) {
          const rawPilotData =
            pilotRes.value?.data?.pilot !== undefined
              ? pilotRes.value.data.pilot
              : pilotRes.value?.data || pilotRes.value;

          if (rawPilotData?.id) {
            // Load full dashboard
            const dashRes = await getPilotDashboard(rawPilotData.id).catch(() => null);
            resolvedPilot = dashRes ? normalizePilot(dashRes) : normalizePilot(rawPilotData);
          }
        }
      } else if (isDirectPilotRoute) {
        // Direct pilot UUID lookup
        const dashRes = await getPilotDashboard(routeId).catch(() => null);
        if (dashRes) {
          resolvedPilot = normalizePilot(dashRes);
        } else {
          const singleRes = await getPilotById(routeId).catch(() => null);
          if (singleRes) resolvedPilot = normalizePilot(singleRes);
        }
        if (resolvedPilot?.challenge) {
          parentChallenge = resolvedPilot.challenge;
          setChallenge(parentChallenge);
        }
      } else if (isPilotsListRoute) {
        // Direct Government Pilots route /government/pilots — show ALL pilots as a card grid.
        // Do NOT auto-select or auto-load any single pilot's dashboard.
        // Request limit=100 to avoid silently truncating at the default 20-item page.
        const pilotsRes = await getPilots({ limit: 100 }).catch(() => ({ data: { pilots: [], pagination: null } }));
        const rawPilots =
          pilotsRes?.data?.pilots ||
          pilotsRes?.pilots ||
          (Array.isArray(pilotsRes?.data) ? pilotsRes.data : []) ||
          [];
        const rawPagination = pilotsRes?.data?.pagination || null;

        setPilotsList(rawPilots);
        setPilotsPagination(rawPagination);
        // Clean reset for pilots list route
        setChallenge(null);
        setSelectedApp(null);
        setAiAnalysis(null);
        setScaleRecommendation(null);
        setComplianceList([]);
        setFeedbackList([]);
        setIssuesList([]);
        resolvedPilot = null;
      }

      setPilot(resolvedPilot);

      // Load sub-resources if pilot is active
      if (resolvedPilot?.id) {
        const [compRes, fbRes, issuesRes, scaleRes] = await Promise.allSettled([
          getComplianceChecklist(resolvedPilot.id),
          getPilotFeedbacks(resolvedPilot.id),
          getPilotIssues(resolvedPilot.id),
          getScaleDecision(resolvedPilot.id),
        ]);

        if (compRes.status === "fulfilled") {
          const rawItems = compRes.value?.data?.items || compRes.value?.items || compRes.value?.data || [];
          setComplianceList(Array.isArray(rawItems) ? rawItems : []);
        }

        if (fbRes.status === "fulfilled") {
          const rawFb = fbRes.value?.data || fbRes.value || [];
          setFeedbackList(Array.isArray(rawFb) ? rawFb : []);
        }

        if (issuesRes.status === "fulfilled") {
          const rawIssues = issuesRes.value?.data?.issues || issuesRes.value?.issues || issuesRes.value?.data || [];
          setIssuesList(Array.isArray(rawIssues) ? rawIssues : []);
        }

        if (scaleRes.status === "fulfilled") {
          const existingDecision =
            scaleRes.value?.data?.scaleDecision ||
            scaleRes.value?.scaleDecision ||
            scaleRes.value?.data ||
            null;
          if (existingDecision && existingDecision.id) {
            setSavedScaleDecision(existingDecision);
          } else {
            setSavedScaleDecision(null);
          }
        } else {
          setSavedScaleDecision(null);
        }
      } else {
        setSavedScaleDecision(null);
      }
    } catch (err) {
      console.error("Failed to load pilot data:", err);
      setFetchError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load pilot project details from PostgreSQL."
      );
    } finally {
      setLoading(false);
    }
  }, [routeId, location.pathname, location.search]);

  useEffect(() => {
    loadPilotData();
  }, [loadPilotData]);

  // Handle Create Pilot Project
  const handleCreatePilot = async (e) => {
    e.preventDefault();
    if (!challenge?.id || !selectedApp?.startup_id) {
      setActionError("Cannot create pilot: Missing selected startup application.");
      return;
    }

    try {
      setIsSaving(true);
      setActionError("");
      setActionSuccess("");

      const payload = {
        challenge_id: challenge.id,
        startup_id: selectedApp.startup_id,
        location: createForm.location.trim(),
        start_date: new Date(createForm.start_date).toISOString(),
        end_date: new Date(createForm.end_date).toISOString(),
        budget: Number(createForm.budget),
      };

      const res = await createPilot(payload);
      setActionSuccess("Pilot sandbox created successfully and registered in PostgreSQL.");
      setShowCreateModal(false);
      await loadPilotData();
    } catch (err) {
      console.error("Create pilot error:", err);
      setActionError(
        err?.response?.data?.message || err?.message || "Failed to create pilot."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Normal Start Pilot (Readiness check enforced)
  const handleStartPilot = async () => {
    if (!pilot?.id) return;
    setActionError("");
    setActionSuccess("");

    const uncompliedItems = complianceList.filter((c) => c.status !== "COMPLIED");
    if (uncompliedItems.length > 0) {
      setActionError(
        `Readiness check blocked: ${uncompliedItems.length} compliance item(s) are not verified. Complete compliance items or authorize an administrative override.`
      );
      return;
    }

    try {
      setIsSaving(true);
      await startPilot(pilot.id, { readiness_override: false });
      setActionSuccess("Pilot project successfully transitioned to RUNNING status.");
      await loadPilotData();
    } catch (err) {
      console.error("Error starting pilot:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to start pilot.");
    } finally {
      setIsSaving(false);
    }
  };

  // Explicit Override Start Pilot
  const handleConfirmStartWithOverride = async () => {
    if (!pilot?.id) return;
    if (!overrideReason.trim()) {
      setActionError("Override justification is required to start pilot with unverified compliance.");
      return;
    }

    try {
      setIsSaving(true);
      setActionError("");
      setActionSuccess("");

      await startPilot(pilot.id, {
        readiness_override: true,
        override_reason: overrideReason.trim(),
      });

      setShowOverrideModal(false);
      setOverrideReason("");
      setActionSuccess("Pilot started with administrative readiness override.");
      await loadPilotData();
    } catch (err) {
      console.error("Error starting pilot with override:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to start pilot with override.");
    } finally {
      setIsSaving(false);
    }
  };

  // Conclude & Complete Pilot
  const handleCompletePilot = async () => {
    if (!pilot?.id) return;
    try {
      setIsSaving(true);
      setActionError("");
      setActionSuccess("");
      await completePilot(pilot.id);
      setActionSuccess("Pilot concluded successfully and transitioned to COMPLETED status.");
      await loadPilotData();
    } catch (err) {
      console.error("Error completing pilot:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to complete pilot.");
    } finally {
      setIsSaving(false);
    }
  };

  // Update Compliance Item (Canonical status: COMPLIED, PENDING, NON_COMPLIANT)
  const handleUpdateComplianceStatus = async (item, status) => {
    if (!pilot?.id || !item?.id) return;
    try {
      setActionError("");
      const res = await updateComplianceItem(pilot.id, item.id, {
        status,
        notes: `Updated by government officer on ${new Date().toLocaleDateString()}`,
      });
      const updatedItem = res?.data?.item || res?.item || { ...item, status };
      setComplianceList((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, ...updatedItem } : c))
      );
    } catch (err) {
      console.error("Failed to update compliance item:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to update compliance item.");
    }
  };

  // Add KPI (matching backend baseline_value, target_value)
  const handleAddKpi = async (e) => {
    e.preventDefault();
    if (!pilot?.id || !newKpi.name.trim()) return;

    try {
      setIsSaving(true);
      setActionError("");
      setActionSuccess("");

      const payload = {
        name: newKpi.name.trim(),
        unit: newKpi.unit.trim(),
        baseline_value: Number(newKpi.baseline_value),
        target_value: Number(newKpi.target_value),
        description: newKpi.description ? newKpi.description.trim() : undefined,
        weight: Number(newKpi.weight) || 1.0,
      };

      await createKpi(pilot.id, payload);
      setNewKpi({
        name: "",
        unit: "%",
        baseline_value: "",
        target_value: "",
        description: "",
        weight: "1.0",
      });
      setActionSuccess("Custom KPI registered and persisted to PostgreSQL.");
      await loadPilotData();
    } catch (err) {
      console.error("Error adding KPI:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to create KPI.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Milestone (matching backend name, due_date, payment_percentage)
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!pilot?.id || !newMilestone.name.trim()) return;

    try {
      setIsSaving(true);
      setActionError("");
      setActionSuccess("");

      const payload = {
        name: newMilestone.name.trim(),
        description: newMilestone.description ? newMilestone.description.trim() : undefined,
        due_date: newMilestone.due_date
          ? new Date(newMilestone.due_date).toISOString()
          : new Date().toISOString(),
        payment_percentage: Number(newMilestone.payment_percentage) || 0,
        completion_percentage: 0,
      };

      await createMilestone(pilot.id, payload);
      setNewMilestone({ name: "", description: "", due_date: "", payment_percentage: "" });
      setActionSuccess("Pilot milestone registered and persisted to PostgreSQL.");
      await loadPilotData();
    } catch (err) {
      console.error("Error adding milestone:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to create milestone.");
    } finally {
      setIsSaving(false);
    }
  };

  // Create Pilot Issue
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!pilot?.id || !newIssue.title.trim()) return;

    try {
      setIsSaving(true);
      setActionError("");
      await createPilotIssue(pilot.id, {
        title: newIssue.title.trim(),
        description: newIssue.description ? newIssue.description.trim() : "",
        severity: newIssue.severity,
        assigned_to: newIssue.assigned_to ? newIssue.assigned_to.trim() : undefined,
      });
      setNewIssue({ title: "", description: "", severity: "MEDIUM", assigned_to: "" });
      setShowNewIssueForm(false);
      setActionSuccess("Incident recorded in PostgreSQL.");
      await loadPilotData();
    } catch (err) {
      console.error("Error reporting issue:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to record issue.");
    } finally {
      setIsSaving(false);
    }
  };

  // Update Pilot Issue Status
  const handleUpdateIssueStatus = async (issueId, status, resolution = "") => {
    if (!pilot?.id || !issueId) return;
    try {
      setActionError("");
      await updatePilotIssue(pilot.id, issueId, {
        status,
        resolution: resolution || (status === "RESOLVED" ? "Resolved by Department Officer review" : undefined),
      });
      setIssuesList((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status, resolution: resolution || i.resolution } : i))
      );
    } catch (err) {
      console.error("Failed to update issue:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to update issue.");
    }
  };

  // AI Scaling Intelligence
  const handleRunBrain4Analysis = async () => {
    if (!pilot?.id) return;
    try {
      setIsAnalyzing(true);
      setActionError("");
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
      console.warn("Brain 4 analysis error:", err);
      setActiveTab("ai-intelligence");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Record Scale Decision
  const handleRecordOfficialScaleDecision = async (e) => {
    e.preventDefault();
    if (!pilot?.id) return;

    const errors = { decision: "", scaling_scope: "", budget_allocated: "", justification: "" };
    let hasError = false;

    if (!govDecision.decision) {
      errors.decision = "Please select an official decision.";
      hasError = true;
    }
    if (!govDecision.scaling_scope || !govDecision.scaling_scope.trim()) {
      errors.scaling_scope = "Scaling scope is required.";
      hasError = true;
    }
    const budgetNum = Number(govDecision.budget_allocated);
    if (!govDecision.budget_allocated || isNaN(budgetNum) || budgetNum <= 0) {
      errors.budget_allocated = "Enter a valid positive budget amount.";
      hasError = true;
    }
    if (!govDecision.justification || !govDecision.justification.trim()) {
      errors.justification = "Official sanction justification is required.";
      hasError = true;
    }

    setDecisionErrors(errors);
    if (hasError) return;

    try {
      setIsSubmittingDecision(true);
      setActionError("");
      const realScore =
        pilot?.overall_score != null
          ? Number(pilot.overall_score)
          : pilot?.kpi_score != null
            ? Number(pilot.kpi_score)
            : undefined;

      await createScaleDecision(pilot.id, {
        decision: govDecision.decision,
        reasoning: `${govDecision.justification.trim()} [Scope: ${govDecision.scaling_scope.trim()}, Allocated Budget: ₹${budgetNum}]`,
        ...(realScore !== undefined && !isNaN(realScore) ? { score: realScore } : {}),
      });
      setActionSuccess("Official Scale Decision recorded in PostgreSQL and logged to Platform Audit Trail.");
      await loadPilotData();
    } catch (err) {
      console.error("Failed to record scale decision:", err);
      setActionError(err?.response?.data?.message || err?.message || "Failed to record scale decision.");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Uncomplied items count for compliance badge and readiness check
  const uncompliedCount = complianceList.filter((c) => c.status !== "COMPLIED").length;

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
        {/* PAGE HEADER */}
        <PageHeader
          showBack
          onBack={() => {
            if (challenge?.id && location.pathname.includes("/challenges/")) {
              navigate(`/government/challenges/${challenge.id}/applications`);
            } else if (isDirectPilotRoute) {
              navigate("/government/pilots");
            } else {
              navigate("/government/dashboard");
            }
          }}
          backLabel={
            challenge?.id && location.pathname.includes("/challenges/")
              ? "Back to Challenge Applications"
              : isDirectPilotRoute
              ? "All Pilots"
              : "Back to Dashboard"
          }
          badge="Live Pilot Sandbox"
          badgeIcon={FlaskConical}
          title={pilot?.challenge?.title || challenge?.title || "Operational Pilot Execution Workspace"}
          description={
            pilot
              ? `Startup: ${pilot?.startup?.company_name || "Not specified"} · Location: ${pilot?.location || "Not specified"}`
              : "Challenge Pilot Lifecycle & Performance Management"
          }
          actions={
            pilot ? (
              <div className="flex flex-wrap items-center gap-2">
                {pilot?.status === "PLANNED" && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartPilot}
                      disabled={isSaving}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-60 transition"
                    >
                      <Play className="h-3.5 w-3.5" /> Start Pilot Sandbox
                    </button>

                    {uncompliedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowOverrideModal(true)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 transition"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        Start with Readiness Override
                      </button>
                    )}
                  </>
                )}

                {pilot?.status === "RUNNING" && (
                  <button
                    type="button"
                    onClick={handleCompletePilot}
                    disabled={isSaving}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-60 transition"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Conclude & Validate
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRunBrain4Analysis}
                  disabled={isAnalyzing}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-800 px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-900 disabled:opacity-60 transition"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Brain 4 Pilot Intelligence
                </button>
              </div>
            ) : null
          }
        />
        </motion.div>

        {/* PILOT STATUS FILTER TOOLBAR (Shown on /government/pilots list and direct pilot route) */}
        {!isChallengeRoute && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Status Filter Tabs & Proximity Count */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {pilotStatusTabs.map((tab) => {
                    const isActive = (statusParam || "ALL") === tab.id;
                    const count =
                      tab.id === "ALL"
                        ? pilotsList.length
                        : pilotsList.filter((p) => p.status === tab.id).length;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleStatusFilterChange(tab.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${isActive
                            ? tab.id === "AT_RISK"
                              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                              : "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                          }`}
                      >
                        {tab.id === "AT_RISK" && <AlertTriangle className="h-3.5 w-3.5" />}
                        {tab.label}
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Pilot count summary in proximity */}
                {isPilotsListRoute && pilotsList.length > 0 && (
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 shrink-0">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {displayedPilots.length} of {pilotsPagination?.total ?? pilotsList.length} pilot{(pilotsPagination?.total ?? pilotsList.length) !== 1 ? "s" : ""}
                    </span>
                    {pilotsPagination?.total > 100 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        Showing first 100
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PILOTS CARD GRID (list route only — /government/pilots) */}
        {!loading && !fetchError && isPilotsListRoute && pilotsList.length > 0 && (
          <div className="mb-6">
            {displayedPilots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
                <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  No {statusParam ? formatPilotStatus(statusParam) : ""} Pilots Found
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No pilots match this filter. Try a different status or view all pilots.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/government/pilots")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  <FlaskConical className="h-4 w-4" />
                  View All Pilots
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedPilots.map((p) => {
                    const statusColors = {
                      PLANNED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                      RUNNING: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                      AT_RISK: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                      VALIDATION: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
                      COMPLETED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
                      SCALED: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
                      STOPPED: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
                    };
                    const statusColor = statusColors[p.status] || statusColors.PLANNED;
                    const startupName = p.startup?.company_name || p.startup?.name || "Startup";
                    const challengeTitle = p.challenge?.title || "Pilot Project";
                    const pilotLocation = p.location || "Location not set";
                    const startDate = p.start_date ? new Date(p.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
                    const endDate = p.end_date ? new Date(p.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
                    const budget = p.budget ? `₹${Number(p.budget).toLocaleString("en-IN")}` : "—";

                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => navigate(`/government/pilots/${p.id}`)}
                        className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 cursor-pointer"
                      >
                        {/* Status badge */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
                            {p.status === "AT_RISK" && <AlertTriangle className="mr-1 h-3 w-3" />}
                            {formatPilotStatus(p.status)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition shrink-0 mt-0.5" />
                        </div>

                        {/* Challenge title */}
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
                          {challengeTitle}
                        </h2>

                        {/* Startup */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 truncate">{startupName}</span>
                        </div>

                        {/* Meta info */}
                        <div className="mt-auto space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{pilotLocation}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Clock3 className="h-3.5 w-3.5 shrink-0" />
                            <span>{startDate} → {endDate}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <DollarSign className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{budget}</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {displayedPilots.length > 0 && (
                  <Pagination
                    currentPage={pilotsListPage}
                    totalItems={displayedPilots.length}
                    pageSize={pilotsListPageSize}
                    pageSizeOptions={[6, 9, 18, 27]}
                    onPageChange={setPilotsListPage}
                    onPageSizeChange={(size) => {
                      setPilotsListPageSize(size);
                      setPilotsListPage(1);
                    }}
                    itemName="pilots"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* EMPTY STATE when no pilots exist at all on list route */}
        {!loading && !fetchError && isPilotsListRoute && pilotsList.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
            <FlaskConical className="mx-auto h-14 w-14 text-indigo-400 dark:text-indigo-600" />
            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No Pilot Projects Yet</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Pilot projects appear here once a startup application has been awarded SELECTED status and a pilot sandbox has been created.
            </p>
            <button
              type="button"
              onClick={() => navigate("/government/challenges")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              View Challenges
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* FEEDBACK BANNERS */}
        {actionSuccess && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess("")}
              className="text-xs font-semibold underline text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError("")}
              className="text-xs font-semibold underline text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading pilot project data from PostgreSQL...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && fetchError && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20 mb-6">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-3 text-lg font-bold text-red-900 dark:text-red-300">
              Unable to Load Pilot Project
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400 max-w-md mx-auto">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={loadPilotData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* NO PILOT YET STATE — only shown on challenge-scoped or direct pilot routes (not list route) */}
        {!loading && !fetchError && !pilot && !isPilotsListRoute && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
            {selectedApp ? (
              <>
                <FlaskConical className="mx-auto h-14 w-14 text-indigo-400 dark:text-indigo-600" />
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  No Pilot Project Created Yet
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  A startup application from{" "}
                  <b className="text-slate-900 dark:text-white">
                    {selectedApp.startup?.company_name || "Selected Startup"}
                  </b>{" "}
                  has been officially selected for this challenge. You can now instantiate the live pilot sandbox.
                </p>

                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Create Pilot Project
                  </button>

                  <Link
                    to={`/government/challenges/${challenge?.id || routeId}/applications`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    View Applications
                  </Link>
                </div>
              </>
            ) : (
              <>
                <FlaskConical className="mx-auto h-14 w-14 text-indigo-400 dark:text-indigo-600" />
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  No Pilot Project Created Yet
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  A pilot project can only be created once a startup application has been officially awarded the SELECTED status in the Pre-Award Decision stage.
                </p>

                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    to={`/government/challenges/${challenge?.id || routeId || ""}/decision`}
                    className="btn-primary inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
                  >
                    Go to Pre-Award Decision
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ACTIVE PILOT DASHBOARD */}
        {!loading && !fetchError && pilot && (
          <>
            {/* METRIC HIGHLIGHTS */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Pilot Status
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {formatPilotStatus(pilot.status)}
                </p>
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {pilot.status === "PLANNED"
                    ? "Onboarding & Readiness Check"
                    : pilot.status === "RUNNING"
                      ? "Active Operational Sandbox"
                      : pilot.status === "COMPLETED"
                        ? "Successfully Concluded"
                        : "Live Execution"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Allocated Budget
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {pilot.budget ? `₹${Number(pilot.budget).toLocaleString("en-IN")}` : "Not specified"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Milestone-linked escrow</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Milestones Progress
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {pilot.milestones?.filter((m) => m.status === "COMPLETED" || m.completion_percentage === 100).length || 0} /{" "}
                  {pilot.milestones?.length || 0}
                </p>
                <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  {pilot.milestones?.length
                    ? `${Math.round(
                      ((pilot.milestones?.filter((m) => m.status === "COMPLETED" || m.completion_percentage === 100).length || 0) /
                        pilot.milestones.length) *
                      100
                    )}% Completed`
                    : "No milestones configured"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tracked KPIs
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {pilot.kpis?.length || 0} Metrics
                </p>
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {pilot.kpis?.length ? "Telemetry Active" : "No KPIs configured"}
                </p>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "overview"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
              >
                <LayoutDashboard className="h-4 w-4 text-sky-500" />
                Sandbox Overview
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("kpis")}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "kpis"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
              >
                <BarChart2 className="h-4 w-4 text-cyan-500" />
                KPIs & Measurements ({pilot?.kpis?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("milestones")}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "milestones"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
              >
                <Flag className="h-4 w-4 text-violet-500" />
                Milestones ({pilot?.milestones?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("compliance")}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "compliance"
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
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "issues"
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
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "feedback"
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
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "ai-intelligence"
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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Pilot Scope & Execution Site</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {pilot?.challenge?.desired_outcome ||
                      "Operational deployment and empirical verification of startup solution in government facility sandbox."}
                  </p>

                  <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Execution Site</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {pilot?.location || "Not specified"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Start Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {pilot?.start_date ? new Date(pilot.start_date).toLocaleDateString() : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target End Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {pilot?.end_date ? new Date(pilot.end_date).toLocaleDateString() : "Not set"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Data & IP Governance Terms</h3>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Statutory procurement parameters and data rights binding this pilot sandbox deployment.
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <span className="text-xs text-slate-500">Data Classification</span>
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {pilot?.data_classification || pilot?.challenge?.data_classification || "RESTRICTED"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <span className="text-xs text-slate-500">IP Ownership</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {pilot?.ip_ownership || pilot?.challenge?.ip_ownership || "STARTUP_OWNED"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <span className="text-xs text-slate-500">Data Retention Period</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {pilot?.data_retention_period || pilot?.challenge?.data_retention_period || "3 Years Post-Pilot"}
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

                {(!pilot?.kpis || pilot.kpis.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Empirical KPIs Defined</p>
                    <p className="mt-1 text-xs text-slate-400">Add quantitative pilot evaluation metrics using the form above.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pilot.kpis.map((kpi) => (
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
                )}
              </div>
            )}

            {/* TAB 3: MILESTONES */}
            {activeTab === "milestones" && (
              <div className="space-y-6">
                <form
                  onSubmit={handleAddMilestone}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
                >
                  <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">Add Pilot Milestone</h3>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Milestone name (e.g. M1: Onsite Gateway Setup)"
                      value={newMilestone.name}
                      onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:col-span-2"
                      required
                    />
                    <input
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Payment % (e.g. 30)"
                      value={newMilestone.payment_percentage}
                      onChange={(e) => setNewMilestone({ ...newMilestone, payment_percentage: e.target.value })}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" /> Add Milestone
                    </button>
                  </div>
                </form>

                {(!pilot?.milestones || pilot.milestones.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                    <Flag className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No Milestones Configured for this Pilot
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Use the form above to add delivery checkpoints.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pilot.milestones.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</p>
                            <p className="text-xs text-slate-400">
                              Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : "Not set"}
                              {m.payment_percentage > 0 ? ` • Payment: ${m.payment_percentage}%` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.status === "COMPLETED" || m.completion_percentage === 100
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                        >
                          {m.status || (m.completion_percentage === 100 ? "COMPLETED" : "PLANNED")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: COMPLIANCE & SECURITY */}
            {activeTab === "compliance" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Security & Statutory Compliance Checklist
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Audit mandatory cybersecurity and statutory compliance criteria before sandbox activation.
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {complianceList.filter((c) => c.status === "COMPLIED").length} / {complianceList.length} Complied
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {complianceList.length === 0 ? (
                      <p className="text-xs text-slate-400">No compliance items registered.</p>
                    ) : (
                      complianceList
                        .slice((compliancePage - 1) * compliancePageSize, compliancePage * compliancePageSize)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {item.item_name}
                                </h4>
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {item.category || "Statutory"}
                                </span>
                              </div>
                              {item.description && (
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                              )}
                              {item.notes && (
                                <p className="mt-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                  Note: {item.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateComplianceStatus(item, "COMPLIED")}
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${item.status === "COMPLIED"
                                    ? "bg-emerald-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900"
                                  }`}
                              >
                                Complied
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateComplianceStatus(item, "PENDING")}
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${item.status === "PENDING"
                                    ? "bg-amber-500 text-white"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900"
                                  }`}
                              >
                                Pending
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateComplianceStatus(item, "NON_COMPLIANT")}
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${item.status === "NON_COMPLIANT"
                                    ? "bg-red-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900"
                                  }`}
                              >
                                Non-Compliant
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {complianceList.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Pagination
                        currentPage={compliancePage}
                        totalItems={complianceList.length}
                        pageSize={compliancePageSize}
                        pageSizeOptions={[4, 6, 12, 20]}
                        onPageChange={setCompliancePage}
                        onPageSizeChange={(size) => {
                          setCompliancePageSize(size);
                          setCompliancePage(1);
                        }}
                        itemName="checkpoints"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: PILOT ISSUES */}
            {activeTab === "issues" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Live Operational Issues & Incident Log
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Track blockers, site incidents, and telemetry issues during this pilot execution.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNewIssueForm((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700 transition"
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
                          placeholder="e.g. Gateway connectivity timeout"
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Severity</label>
                        <select
                          value={newIssue.severity}
                          onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="LOW">LOW (Informational)</option>
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
                          placeholder="e.g. Startup Technical Lead"
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                        <input
                          type="text"
                          value={newIssue.description}
                          onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                          placeholder="Context and observed impact"
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                        className="btn-primary rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
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
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Zero Active Pilot Issues</p>
                      <p className="mt-1 text-xs text-slate-400">All deployment systems operating normally.</p>
                    </div>
                  ) : (
                    issuesList
                      .slice((issuesPage - 1) * issuesPageSize, issuesPage * issuesPageSize)
                      .map((issue) => (
                        <div
                          key={issue.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{issue.title}</h4>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-slate-800">
                                {issue.severity}
                              </span>
                            </div>
                            {issue.description && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{issue.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${issue.status === "RESOLVED" || issue.status === "CLOSED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Field & Beneficiary Satisfaction Reviews
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Direct user ratings and qualitative feedback submitted from on-ground trials.
                    </p>
                  </div>

                  {feedbackList.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                      <Star className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No Beneficiary Feedback Recorded Yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Feedbacks submitted by citizens and end-users during active trials will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {feedbackList
                        .slice((feedbackPage - 1) * feedbackPageSize, feedbackPage * feedbackPageSize)
                        .map((fb) => (
                          <div
                            key={fb.id}
                            className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs">{"⭐".repeat(fb.rating || 5)}</span>
                              <span className="text-[10px] text-slate-400">
                                {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : "Recent"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-700 dark:text-slate-300">
                              "{fb.comments || fb.comment || "Beneficiary feedback recorded."}"
                            </p>
                            <p className="mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              — {fb.beneficiary_type || fb.citizen_name || "Beneficiary"}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: AI INTELLIGENCE & SCALING */}
            {activeTab === "ai-intelligence" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Brain 4 Empirical Scaling Intelligence
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    AI analytical advisory synthesizing milestone achievements, KPI performance, and scale readiness.
                  </p>

                  {aiAnalysis && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">Empirical Analysis:</p>
                      <p>{aiAnalysis.summary || aiAnalysis.analysis || JSON.stringify(aiAnalysis)}</p>
                    </div>
                  )}

                  {/* OFFICIAL SCALING DECISION */}
                  {savedScaleDecision ? (
                    <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                              <Award className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                  Official Decision Finalized
                                </span>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {savedScaleDecision.status || "FINALIZED"}
                                </span>
                              </div>
                              <h4 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                                Sanction Outcome: {savedScaleDecision.decision}
                              </h4>
                            </div>
                          </div>
                          <span className={`inline-flex self-start sm:self-auto rounded-lg px-3 py-1 text-xs font-bold ${savedScaleDecision.decision === "SCALE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : savedScaleDecision.decision === "STOP"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}>
                            {savedScaleDecision.decision === "SCALE" ? "SCALE (Full Department Rollout)" : savedScaleDecision.decision === "STOP" ? "STOP (Do Not Scale)" : savedScaleDecision.decision}
                          </span>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Official Sanction Justification
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                            {savedScaleDecision.reasoning}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            {savedScaleDecision.approver?.name && (
                              <span>Sanctioned by: <strong className="text-slate-700 dark:text-slate-300">{savedScaleDecision.approver.name}</strong></span>
                            )}
                            <span>Recorded: <strong className="text-slate-700 dark:text-slate-300">
                              {savedScaleDecision.decision_date ? new Date(savedScaleDecision.decision_date).toLocaleDateString("en-IN") : "Recorded"}
                            </strong></span>
                            {savedScaleDecision.score != null && (
                              <span>Recorded Score: <strong className="text-slate-700 dark:text-slate-300">{Number(savedScaleDecision.score)}%</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100/80 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-500" />
                          <span>
                            Official scale decision is recorded in PostgreSQL and the platform audit trail. To preserve governance integrity, this decision is finalized and cannot be re-submitted.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRecordOfficialScaleDecision} className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                        Record Official Government Scaling Decision
                      </h4>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Decision Outcome *</label>
                          <select
                            value={govDecision.decision}
                            onChange={(e) => setGovDecision({ ...govDecision, decision: e.target.value })}
                            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            required
                          >
                            <option value="">Select official decision</option>
                            <option value="SCALE">SCALE (Full Department Rollout)</option>
                            <option value="EXTEND">EXTEND (Further trial period)</option>
                            <option value="STOP">STOP (Do not scale)</option>
                          </select>
                          {decisionErrors.decision && <p className="mt-1 text-[10px] text-red-500">{decisionErrors.decision}</p>}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Scaling Scope *</label>
                          <input
                            type="text"
                            placeholder="e.g. 5 Municipal Administrative Zones"
                            value={govDecision.scaling_scope}
                            onChange={(e) => setGovDecision({ ...govDecision, scaling_scope: e.target.value })}
                            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            required
                          />
                          {decisionErrors.scaling_scope && <p className="mt-1 text-[10px] text-red-500">{decisionErrors.scaling_scope}</p>}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Allocated Budget (₹) *</label>
                          <input
                            type="number"
                            placeholder="e.g. 5000000"
                            value={govDecision.budget_allocated}
                            onChange={(e) => setGovDecision({ ...govDecision, budget_allocated: e.target.value })}
                            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            required
                          />
                          {decisionErrors.budget_allocated && <p className="mt-1 text-[10px] text-red-500">{decisionErrors.budget_allocated}</p>}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Justification *</label>
                        <textarea
                          rows={3}
                          value={govDecision.justification}
                          onChange={(e) => setGovDecision({ ...govDecision, justification: e.target.value })}
                          placeholder="Detail empirical findings, compliance verification, and rationale..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          required
                        />
                        {decisionErrors.justification && <p className="mt-1 text-[10px] text-red-500">{decisionErrors.justification}</p>}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingDecision}
                          className="btn-primary inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isSubmittingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Record Scale Decision
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL: CREATE PILOT PROJECT */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Instantiate Live Pilot Sandbox
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreatePilot} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Selected Startup</label>
                    <input
                      type="text"
                      disabled
                      value={selectedApp?.startup?.company_name || "Selected Startup"}
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pilot Site Location *</label>
                    <input
                      type="text"
                      value={createForm.location}
                      onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                      placeholder="e.g. Pune Demonstration Facility"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start Date *</label>
                      <input
                        type="date"
                        value={createForm.start_date}
                        onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">End Date *</label>
                      <input
                        type="date"
                        value={createForm.end_date}
                        onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pilot Budget (₹) *</label>
                    <input
                      type="number"
                      value={createForm.budget}
                      onChange={(e) => setCreateForm({ ...createForm, budget: e.target.value })}
                      placeholder="e.g. 500000"
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      required
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Create Pilot"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: READINESS OVERRIDE */}
        <AnimatePresence>
          {showOverrideModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/40 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
                  <ShieldAlert className="h-5 w-5" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Start Pilot with Readiness Override
                  </h3>
                </div>

                <div className="space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  <p>
                    Some compliance checkpoints (<b>{uncompliedCount}</b> item{uncompliedCount === 1 ? "" : "s"}) are incomplete.
                  </p>
                  <p>
                    The pilot can be started despite incomplete readiness only through an explicit administrative justification recorded in the platform audit trail.
                  </p>
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Note: Incomplete compliance checkpoints will remain unchanged and this override does NOT mark items as COMPLIED.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Override Justification *
                  </label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="State reason for starting sandbox prior to full compliance sign-off..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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
                    className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-amber-700 disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Start Pilot"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

export default ChallengePilot;