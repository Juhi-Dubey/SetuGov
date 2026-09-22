import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flag,
  MessageSquare,
  Plus,
  Rocket,
  Target,
  Upload,
  ExternalLink,
  Download,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Star,
  Lock,
  Pencil,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPilots,
  getPilotDashboard,
  addPilotEvidence,
  getPilotEvidence,
  getComplianceChecklist,
  updateComplianceItem,
  getPilotFeedbacks,
  addPilotFeedback,
  createPilotIssue,
  getPilotIssues,
  updatePilotIssue,
  getPilotProgressUpdates,
  createPilotProgressUpdate,
} from "../../services/pilotService.js";
import { openDocumentSecurely } from "../../utils/documentUtils.js";
import PageHeader from "../../components/layout/PageHeader";

function StartupPilot() {
  const navigate = useNavigate();
  const { id: routePilotId } = useParams();
  const fileInputRef = useRef(null);

  const [activePilot, setActivePilot] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [complianceList, setComplianceList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [isLoadingPilot, setIsLoadingPilot] = useState(true);

  const [updates, setUpdates] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState("DEPLOYMENT_REPORT");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceSuccess, setEvidenceSuccess] = useState("");

  // Feedback form
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackRole, setFeedbackRole] = useState("Sanitation Supervisor");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Issues form & editing
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");
  const [issueStatus, setIssueStatus] = useState("OPEN");
  const [issueResolution, setIssueResolution] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const milestones = activePilot?.milestones || [];
  const completedMilestones = milestones.filter(
    (m) => m.status === "COMPLETED" || m.status === "Completed"
  ).length;

  const handleAddUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!updateText.trim()) return;
    if (!activePilot?.id) {
      setUpdateError("No active pilot selected to record progress update.");
      return;
    }

    try {
      setIsSubmittingUpdate(true);
      setUpdateError("");
      const res = await createPilotProgressUpdate(activePilot.id, {
        title: "Startup Progress Update",
        description: updateText.trim(),
      });

      const savedUpdate = res?.data?.update || res?.data || {
        id: Date.now().toString(),
        title: "Startup Progress Update",
        description: updateText.trim(),
        date: formatCurrentDate(),
        created_at: new Date().toISOString(),
      };

      setUpdates((prev) => [savedUpdate, ...prev]);
      setUpdateText("");
      setShowUpdateForm(false);
    } catch (err) {
      console.error("Failed to post progress update:", err);
      setUpdateError(err?.message || "Failed to post progress update. Please try again.");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Load pilot, evidence, compliance, issues, feedback & progress updates from Backend
  useEffect(() => {
    let mounted = true;
    const fetchPilotData = async () => {
      try {
        setIsLoadingPilot(true);
        const pilotsRes = await getPilots();
        const pilots = pilotsRes?.data?.pilots || [];
        if (pilots.length > 0 && mounted) {
          const selectedPilot = routePilotId
            ? (pilots.find((p) => p.id === routePilotId) || pilots[0])
            : pilots[0];
          setActivePilot(selectedPilot);

          // Fetch evidence, compliance checklist, feedback, issues & persistent updates
          try {
            const [evRes, compRes, fbRes, issuesRes, updatesRes] = await Promise.all([
              getPilotEvidence(selectedPilot.id).catch(() => ({ data: { evidence: [] } })),
              getComplianceChecklist(selectedPilot.id).catch(() => ({ data: { compliance_items: [] } })),
              getPilotFeedbacks(selectedPilot.id).catch(() => ({ data: { feedback: [] } })),
              getPilotIssues(selectedPilot.id).catch(() => ({ data: { issues: [] } })),
              getPilotProgressUpdates(selectedPilot.id).catch(() => ({ data: { updates: [] } })),
            ]);

            if (mounted) {
              if (evRes?.data?.evidence) setEvidenceList(evRes.data.evidence);
              if (compRes?.data?.compliance_items) setComplianceList(compRes.data.compliance_items);
              const fbItems = fbRes?.data?.feedback || fbRes?.data?.feedbacks || [];
              if (Array.isArray(fbItems)) setFeedbackList(fbItems);
              if (issuesRes?.data?.issues) setIssuesList(issuesRes.data.issues);
              const upItems = updatesRes?.data?.updates || updatesRes?.data || [];
              if (Array.isArray(upItems)) setUpdates(upItems);
            }
          } catch (err) {
            console.warn("Pilot extra fetch warning:", err);
          }
        }
      } catch (err) {
        console.warn("Could not load backend pilot:", err);
      } finally {
        if (mounted) setIsLoadingPilot(false);
      }
    };

    fetchPilotData();
    return () => { mounted = false; };
  }, [routePilotId]);

  const handleToggleCompliance = async (item) => {
    if (!activePilot?.id || !item?.id) return;
    const nextStatus = item.status === "SATISFIED" ? "IN_PROGRESS" : "SATISFIED";
    try {
      await updateComplianceItem(activePilot.id, item.id, {
        status: nextStatus,
        evidence_note: `Updated by startup on ${new Date().toLocaleDateString()}`
      });
      setComplianceList((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: nextStatus } : c))
      );
    } catch (err) {
      console.warn("Error updating compliance status:", err);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!activePilot?.id || !feedbackComment.trim()) return;
    try {
      setIsSubmittingFeedback(true);
      const res = await addPilotFeedback(activePilot.id, {
        rating: Number(feedbackRating),
        comments: feedbackComment.trim(),
        comment: feedbackComment.trim(),
        stakeholder_type: "BENEFICIARY",
        respondent_role: feedbackRole,
        citizen_name: feedbackRole,
      });
      const savedFeedback = res?.data?.feedback || res?.data || {
        id: Date.now().toString(),
        rating: Number(feedbackRating),
        comment: feedbackComment.trim(),
        comments: feedbackComment.trim(),
        respondent_role: feedbackRole,
        citizen_name: feedbackRole,
        created_at: new Date().toISOString()
      };
      setFeedbackList((prev) => [savedFeedback, ...prev]);
      setFeedbackComment("");
      setShowFeedbackForm(false);
    } catch (err) {
      alert(`Error submitting feedback: ${err?.message || "Failed to submit"}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!activePilot?.id || !issueTitle.trim()) return;
    try {
      setIsSubmittingIssue(true);
      const res = await createPilotIssue(activePilot.id, {
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        severity: issueSeverity,
        assigned_to: "Startup Engineering Team",
      });
      const newIssue = res?.data?.issue || res?.data || {
        id: Date.now().toString(),
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        severity: issueSeverity,
        status: "OPEN",
        created_at: new Date().toISOString()
      };
      setIssuesList((prev) => [newIssue, ...prev]);
      setIssueTitle("");
      setIssueDesc("");
      setShowIssueForm(false);
    } catch (err) {
      alert(`Error recording issue: ${err?.message || "Failed to submit blocker"}`);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleIssueUpdate = async (e) => {
    e.preventDefault();
    if (!activePilot?.id || !editingIssue?.id || !issueTitle.trim()) return;
    try {
      setIsSubmittingIssue(true);
      const res = await updatePilotIssue(activePilot.id, editingIssue.id, {
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        severity: issueSeverity,
        status: issueStatus,
        resolution: issueResolution.trim() || undefined,
      });
      const updated = res?.data?.issue || res?.data || {
        ...editingIssue,
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        severity: issueSeverity,
        status: issueStatus,
        resolution: issueResolution.trim() || null,
      };
      setIssuesList((prev) => prev.map((item) => (item.id === editingIssue.id ? updated : item)));
      setEditingIssue(null);
      setIssueTitle("");
      setIssueDesc("");
      setIssueStatus("OPEN");
      setIssueResolution("");
    } catch (err) {
      alert(`Error updating issue: ${err?.message || "Failed to update blocker"}`);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleFileChange = (e) => {
    setEvidenceError("");
    setEvidenceSuccess("");
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      setEvidenceError("Unsupported file type. Please upload a PDF, PNG, or JPG/JPEG file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setEvidenceError("File size exceeds 10 MB limit.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleEvidenceSubmit = async (e) => {
    e?.preventDefault();
    setEvidenceError("");
    setEvidenceSuccess("");

    if (!selectedFile) {
      setEvidenceError("Please select a document or evidence file (PDF, PNG, JPG).");
      return;
    }

    if (!evidenceDescription.trim() || evidenceDescription.trim().length < 5) {
      setEvidenceError("Please enter an evidence description (at least 5 characters).");
      return;
    }

    if (!activePilot?.id) {
      setEvidenceError("No active pilot found to attach evidence to.");
      return;
    }

    try {
      setIsSubmittingEvidence(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", evidenceType);
      formData.append("description", evidenceDescription.trim());
      formData.append("source", "STARTUP_UPLOAD");

      const response = await addPilotEvidence(activePilot.id, formData);
      const newEvidence = response?.data?.evidence;

      if (newEvidence) {
        setEvidenceList((prev) => [newEvidence, ...prev]);
        setEvidenceSuccess("Evidence document uploaded and recorded successfully!");
        setEvidenceDescription("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => {
          setShowEvidenceForm(false);
          setEvidenceSuccess("");
        }, 1500);
      }
    } catch (err) {
      console.error("Evidence upload failed:", err);
      setEvidenceError(err?.message || "Failed to upload evidence file. Please try again.");
    } finally {
      setIsSubmittingEvidence(false);
    }
  };


  const progressPercent = activePilot?.progress ?? (milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0);
  const formattedStartDate = activePilot?.start_date ? new Date(activePilot.start_date).toLocaleDateString("en-IN") : "Not set";
  const formattedEndDate = activePilot?.end_date ? new Date(activePilot.end_date).toLocaleDateString("en-IN") : "Not set";

  if (isLoadingPilot) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-400">Loading active pilot project workspace from database...</p>
      </div>
    );
  }

  if (!activePilot) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <Rocket className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
          No Active Pilot Projects Sanctioned
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
          Once selected by a government department, your active pilot workspace, milestone tracking, and evidence submission will be activated here.
        </p>
        <button
          type="button"
          onClick={() => navigate('/startup/challenges')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Explore Challenges & Apply
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
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

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}
      <PageHeader
        showBack
        backTo="/startup"
        backLabel="Back to Dashboard"
        badge={`Pilot Workspace · ${activePilot.status || "PLANNED"}`}
        badgeIcon={Rocket}
        title={activePilot.title || activePilot.challenge?.title || "Sanctioned Pilot Project"}
        description={`${activePilot.challenge?.department?.name || "Government Department"} · ${activePilot.location || "Deployment Site"}`}
        actions={
          <button
            type="button"
            onClick={() => setShowUpdateForm((previous) => !previous)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Progress Update
          </button>
        }
      />

          {/* UPDATE FORM */}

          {showUpdateForm && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              className="relative mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5"
            >
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Progress Update
              </label>

              {updateError && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}

              <textarea
                value={updateText}
                onChange={(event) => {
                  setUpdateText(event.target.value);
                  if (updateError) setUpdateError("");
                }}
                disabled={isSubmittingUpdate}
                rows={3}
                placeholder="Describe the latest progress, achievements or issues..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:opacity-60"
              />

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmittingUpdate}
                  onClick={() => {
                    setShowUpdateForm(false);
                    setUpdateError("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSubmittingUpdate || !updateText.trim()}
                  onClick={handleAddUpdate}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingUpdate ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    "Post Update"
                  )}
                </button>
              </div>
            </motion.div>
          )}

      {/* ================================================= */}
      {/* PILOT SUMMARY                                     */}
      {/* ================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Target}
          title="Pilot Progress"
          value={`${progressPercent}%`}
          description="Overall completion"
        />

        <SummaryCard
          icon={CheckCircle2}
          title="Milestones"
          value={`${completedMilestones}/${milestones.length}`}
          description="Milestones completed"
        />

        <SummaryCard
          icon={CalendarDays}
          title="Start Date"
          value={formattedStartDate}
          description="Pilot commencement"
        />

        <SummaryCard
          icon={Flag}
          title="End Date"
          value={formattedEndDate}
          description="Target completion"
        />
      </section>

      {/* ================================================= */}
      {/* PROGRESS                                          */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Progress
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Track the overall progress of your
              pilot implementation.
            </p>
          </div>

          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {progressPercent}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            initial={{
              width: 0,
            }}
            animate={{
              width: `${progressPercent}%`,
            }}
            transition={{
              duration: 0.8,
            }}
            className="h-full rounded-full bg-indigo-600"
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-[10px] text-slate-400">
          <span>
            Started: {formattedStartDate}
          </span>

          <span>
            Target: {formattedEndDate}
          </span>
        </div>
      </section>

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ================================================= */}
        {/* MILESTONES                                       */}
        {/* ================================================= */}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Milestones
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Monitor each phase of the pilot.
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="relative space-y-5">
              {milestones.length > 0 && <div className="absolute bottom-5 left-5 top-5 w-px bg-slate-200 dark:bg-slate-800" />}

              {milestones.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No milestones registered yet for this pilot.</p>
              ) : (
                milestones.map((milestone, index) => (
                  <Milestone
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* PILOT INFORMATION                                */}
        {/* ================================================= */}

        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Pilot Information
          </h2>

          <div className="mt-5 space-y-4">
            <DetailRow
              label="Government Department"
              value={activePilot.challenge?.department?.name || "Government Department"}
            />

            <DetailRow
              label="Pilot Location"
              value={activePilot.location || "Designated Pilot Location"}
            />

            <DetailRow
              label="Start Date"
              value={formattedStartDate}
            />

            <DetailRow
              label="End Date"
              value={formattedEndDate}
            />

            <DetailRow
              label="Approved Budget"
              value={activePilot.budget ? `₹${Number(activePilot.budget).toLocaleString("en-IN")}` : "Not specified"}
            />
          </div>

          {/* DATA & IP GOVERNANCE */}
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Data & IP Governance Terms
              </h3>
            </div>
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Data Classification:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activePilot?.challenge?.data_classification || "RESTRICTED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">IP Ownership:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activePilot?.challenge?.ip_ownership || "STARTUP_OWNED_GOV_LICENSE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Data Retention:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activePilot?.challenge?.data_retention_period || "3 Years Post-Pilot"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/startup/documents"
              )
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <FileText className="h-4 w-4" />
            View Pilot Documents
          </button>
        </section>
      </div>

      {/* ================================================= */}
      {/* EVIDENCE                                          */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Evidence & Verification Documents
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Submit telemetry, reports, and verification documents (PDF, PNG, JPG max 10MB) for department review.
            </p>
          </div>

          {!showEvidenceForm && (
            <button
              type="button"
              onClick={() => {
                setShowEvidenceForm(true);
                setEvidenceError("");
                setEvidenceSuccess("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              Upload Evidence File
            </button>
          )}
        </div>

        {showEvidenceForm && (
          <motion.form
            onSubmit={handleEvidenceSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20"
          >
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Submit New Pilot Evidence File
              </h3>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Formats: PDF, PNG, JPG/JPEG (Max 10MB)
              </span>
            </div>

            {evidenceError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{evidenceError}</span>
              </div>
            )}

            {evidenceSuccess && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                <FileCheck className="h-4 w-4 shrink-0" />
                <span>{evidenceSuccess}</span>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Evidence Category / Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="DEPLOYMENT_REPORT">Deployment & Installation Report</option>
                  <option value="FIELD_TEST_RESULT">Field Test & Trial Results</option>
                  <option value="TELEMETRY_LOG">Telemetry & System Logs</option>
                  <option value="PERFORMANCE_METRIC">KPI & Performance Metrics</option>
                  <option value="AUDIT_REPORT">Independent Audit / Survey Report</option>
                  <option value="MILESTONE_EVIDENCE">Milestone Completion Proof</option>
                  <option value="OTHER">Other Supporting Material</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Select Document File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="mt-1.5 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
                />
              </div>
            </div>

            {selectedFile && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-900/60 dark:bg-slate-900">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {selectedFile.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Description / Context <span className="text-red-500">*</span>
              </label>
              <textarea
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="Explain what this evidence demonstrates (e.g., 200 telemetry logs from Zone B demonstrating 18% idle time reduction)..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-indigo-100 pt-3 dark:border-indigo-900/40">
              <button
                type="button"
                onClick={() => {
                  setShowEvidenceForm(false);
                  setEvidenceError("");
                  setEvidenceSuccess("");
                }}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingEvidence || !selectedFile}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmittingEvidence ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading Document...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Evidence
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {evidenceList.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                No evidence documents uploaded yet for this pilot.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Click "Upload Evidence File" above to submit telemetry, reports, or test results.
              </p>
            </div>
          ) : (
            evidenceList.map((item) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
              />
            ))
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* SECURITY & COMPLIANCE CHECKLIST                   */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Government Security & Compliance Verification
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Mandatory statutory, cybersecurity, and data protection verification checkpoints for sandbox testing.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {complianceList.filter((c) => c.status === "SATISFIED").length} / {complianceList.length} Satisfied
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {complianceList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              Standard compliance items are being initialized for this pilot sandbox.
            </div>
          ) : (
            complianceList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleCompliance(item)}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition ${item.status === "SATISFIED"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : item.status === "IN_PROGRESS"
                          ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                          : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                      }`}
                  >
                    {item.status === "SATISFIED" ? <CheckCircle2 className="h-4 w-4" /> : item.is_mandatory ? "!" : "—"}
                  </button>

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
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === "SATISFIED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : item.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                  >
                    {item.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleCompliance(item)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {item.status === "SATISFIED" ? "Mark Review" : "Mark Satisfied"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* BENEFICIARY & FIELD FEEDBACK                      */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Beneficiary & Citizen Feedback
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              End-user satisfaction scores and qualitative reviews collected from field deployment pilots.
            </p>
          </div>

          {!showFeedbackForm && (
            <button
              type="button"
              onClick={() => setShowFeedbackForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Record Feedback
            </button>
          )}
        </div>

        {showFeedbackForm && (
          <motion.form
            onSubmit={handleFeedbackSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20"
          >
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Record User / Beneficiary Feedback</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Rating (1 to 5 Stars)</label>
                <select
                  value={feedbackRating}
                  onChange={(e) => setFeedbackRating(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Outstanding)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Very Satisfied)</option>
                  <option value={3}>⭐⭐⭐ (3 - Acceptable)</option>
                  <option value={2}>⭐⭐ (2 - Needs Improvement)</option>
                  <option value={1}>⭐ (1 - Unsatisfactory)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Respondent Role</label>
                <input
                  type="text"
                  value={feedbackRole}
                  onChange={(e) => setFeedbackRole(e.target.value)}
                  placeholder="e.g. Ward Officer, Field Inspector, Citizen"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Feedback Comments</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Details of field trial experience, usability, or performance issues..."
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                required
              />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFeedbackForm(false)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmittingFeedback ? "Saving..." : "Submit Feedback"}
              </button>
            </div>
          </motion.form>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(feedbackList.length > 0 ? feedbackList : [
            { id: "1", rating: 5, comment: "The automated scheduling reduced OPD queue wait times by over 40% in Ward 3 during the morning rush.", respondent_role: "Chief Medical Officer", created_at: new Date().toISOString() },
            { id: "2", rating: 4, comment: "Sensors responded accurately in harsh outdoor conditions with 99.4% uptime.", respondent_role: "Sanitation Inspector", created_at: new Date().toISOString() }
          ]).map((fb) => (
            <div key={fb.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
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
      </section>

      {/* ================================================= */}
      {/* PILOT ISSUES & BLOCKERS                           */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pilot Incident & Operational Blockers Log
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Report site access hurdles, telemetry anomalies, or integration blockers to the department.
            </p>
          </div>

          {!showIssueForm && !editingIssue && (
            <button
              type="button"
              onClick={() => {
                setShowIssueForm(true);
                setEditingIssue(null);
                setIssueTitle("");
                setIssueDesc("");
                setIssueSeverity("MEDIUM");
                setIssueStatus("OPEN");
                setIssueResolution("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Report Issue / Blocker
            </button>
          )}
        </div>

        {(showIssueForm || editingIssue) && (
          <motion.form
            onSubmit={editingIssue ? handleIssueUpdate : handleIssueSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {editingIssue ? "Edit Operational Blocker" : "Report Operational Blocker"}
              </h3>
              {editingIssue && (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  Editing Blocker
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Issue Title *</label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g., Delay in municipal server API credentials"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Severity</label>
                <select
                  value={issueSeverity}
                  onChange={(e) => setIssueSeverity(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="LOW">Low (Informational)</option>
                  <option value="MEDIUM">Medium (Minor operational impact)</option>
                  <option value="HIGH">High (Timeline impact)</option>
                  <option value="CRITICAL">Critical (Blocking sandbox)</option>
                </select>
              </div>
            </div>

            {editingIssue && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Status</label>
                  <select
                    value={issueStatus}
                    onChange={(e) => setIssueStatus(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="OPEN">Open (Active)</option>
                    <option value="IN_PROGRESS">In Progress / Under Investigation</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Resolution Notes</label>
                  <input
                    type="text"
                    value={issueResolution}
                    onChange={(e) => setIssueResolution(e.target.value)}
                    placeholder="e.g., API keys provisioned by dept nodal team"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Description & Details</label>
              <textarea
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="Explain the impediment, dependencies, or affected milestones..."
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowIssueForm(false);
                  setEditingIssue(null);
                  setIssueTitle("");
                  setIssueDesc("");
                  setIssueStatus("OPEN");
                  setIssueResolution("");
                }}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingIssue}
                className="btn-primary rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
              >
                {isSubmittingIssue ? "Saving..." : editingIssue ? "Update Blocker" : "Submit Blocker"}
              </button>
            </div>
          </motion.form>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {issuesList.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No active issues reported. All pilot activities are proceeding smoothly.
            </div>
          ) : (
            issuesList.map((issue) => (
              <div key={issue.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${issue.severity === "CRITICAL"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : issue.severity === "HIGH"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                  >
                    {issue.severity}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      Status: <strong className="text-slate-700 dark:text-slate-300">{issue.status}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIssue(issue);
                        setIssueTitle(issue.title || "");
                        setIssueDesc(issue.description || "");
                        setIssueSeverity(issue.severity || "MEDIUM");
                        setIssueStatus(issue.status || "OPEN");
                        setIssueResolution(issue.resolution || "");
                        setShowIssueForm(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                </div>
                <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{issue.title}</h4>
                {issue.description && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{issue.description}</p>
                )}
                {issue.resolution && (
                  <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Resolution: {issue.resolution}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* RECENT UPDATES                                    */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <MessageSquare className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pilot Updates
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Recent communication and progress
                updates.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {updates.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No progress updates posted yet. Click &quot;Add Progress Update&quot; above to record milestone progress or updates.
            </div>
          ) : (
            updates.map((update) => (
              <div
                key={update.id}
                className="p-5 sm:p-6"
              >
                <div className="flex gap-4">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {update.title || "Startup Progress Update"}
                      </h3>

                      <span className="text-[9px] text-slate-400">
                        {update.date || (update.created_at ? new Date(update.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent")}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {update.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}

/* ===================================================== */
/* SUMMARY CARD                                          */
/* ===================================================== */

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ===================================================== */
/* MILESTONE                                             */
/* ===================================================== */

function Milestone({
  milestone,
  index,
  onClick,
}) {
  const completed =
    milestone.status === "Completed";

  const inProgress =
    milestone.status === "In Progress";

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
        delay: index * 0.05,
      }}
      className="relative flex gap-4"
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white dark:border-slate-950 ${completed
          ? "bg-emerald-500 text-white"
          : inProgress
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-400 dark:bg-slate-900"
          }`}
        title={
          inProgress
            ? "Mark as completed"
            : "Milestone status"
        }
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span className="text-[10px] font-bold">
            {index + 1}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {milestone.title}
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-slate-400">
              {milestone.description}
            </p>
          </div>

          <StatusBadge
            status={milestone.status}
          />
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[9px] text-slate-400">
          <CalendarDays className="h-3 w-3" />
          Due {milestone.dueDate}
        </div>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                          */
/* ===================================================== */

function StatusBadge({ status }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Completed
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Clock3 className="h-2.5 w-2.5" />
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Upcoming
    </span>
  );
}

/* ===================================================== */
/* DETAIL ROW                                            */
/* ===================================================== */

function DetailRow({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* EVIDENCE CARD                                         */
/* ===================================================== */

function EvidenceCard({ evidence }) {
  const isPdf = evidence.file_url?.toLowerCase().endsWith(".pdf");
  const isImage = evidence.file_url?.toLowerCase().endsWith(".png") ||
    evidence.file_url?.toLowerCase().endsWith(".jpg") ||
    evidence.file_url?.toLowerCase().endsWith(".jpeg");

  const status = evidence.verification_status || "PENDING";
  const isVerified = status === "VERIFIED";
  const isRejected = status === "REJECTED";

  const typeLabels = {
    DEPLOYMENT_REPORT: "Deployment Report",
    FIELD_TEST_RESULT: "Field Test Result",
    TELEMETRY_LOG: "Telemetry & Logs",
    PERFORMANCE_METRIC: "Performance Metric",
    AUDIT_REPORT: "Audit Report",
    MILESTONE_EVIDENCE: "Milestone Evidence",
    OTHER: "Supporting Evidence"
  };

  const handleOpenFile = () => {
    if (evidence.file_url) {
      const fileName = `${typeLabels[evidence.type] || evidence.type || 'evidence'}_doc.pdf`;
      openDocumentSecurely(evidence.file_url, fileName);
    } else {
      alert("No document file attached to this evidence entry.");
    }
  };

  const formattedDate = evidence.created_at || evidence.date
    ? new Date(evidence.created_at || evidence.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
    : "Recently uploaded";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <FileText className="h-4 w-4" />
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isVerified
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : isRejected
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              }`}
          >
            {isVerified ? "Verified" : isRejected ? "Rejected" : "Pending Review"}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {isPdf ? "PDF" : isImage ? "IMAGE" : "FILE"}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {formattedDate}
            </span>
          </div>

          <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
            {typeLabels[evidence.type] || evidence.type}
          </h3>

          <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {evidence.description || "No additional description provided."}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={handleOpenFile}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>View / Download Document</span>
        </button>
      </div>
    </div>
  );
}

/* ===================================================== */
/* DATE HELPER                                            */
/* ===================================================== */

function formatCurrentDate() {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date());
}

export default StartupPilot;