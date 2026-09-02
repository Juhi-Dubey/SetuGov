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
  FileCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPilots, getPilotDashboard, addPilotEvidence, getPilotEvidence } from "../../services/pilotService.js";

const pilotData = {
  challengeTitle: "Smart Waste Collection System",
  department: "Urban Development Department",
  location: "Jamshedpur Municipal Corporation",
  status: "Pilot Active",
  progress: 62,
  startDate: "01 Aug 2026",
  endDate: "30 Nov 2026",
  budget: "₹40 Lakhs",
};

const initialMilestones = [
  {
    id: 1,
    title: "Pilot Planning & Requirement Analysis",
    description:
      "Finalize requirements, deployment plan and implementation timeline.",
    dueDate: "15 Aug 2026",
    status: "Completed",
  },
  {
    id: 2,
    title: "Initial System Setup & Sensor Deployment",
    description:
      "Install IoT sensors on primary fleet vehicles and test data transmission.",
    dueDate: "30 Aug 2026",
    status: "Completed",
  },
  {
    id: 3,
    title: "AI Route Optimization Testing",
    description:
      "Run pilot routing algorithms across 5 critical wards and measure fuel savings.",
    dueDate: "30 Sep 2026",
    status: "In Progress",
  },
  {
    id: 4,
    title: "Citizen Feedback Integration",
    description:
      "Collect and analyze feedback from sanitation workers and municipal officers.",
    dueDate: "31 Oct 2026",
    status: "Pending",
  },
  {
    id: 5,
    title: "Final Pilot Performance Evaluation",
    description:
      "Submit consolidated report with KPI metrics for scaling decision.",
    dueDate: "30 Nov 2026",
    status: "Pending",
  },
];

const initialUpdates = [
  {
    id: 1,
    date: "24 Aug 2026",
    title: "Government feedback received",
    description:
      "The department requested additional monitoring metrics.",
  },
];

function StartupPilot() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activePilot, setActivePilot] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [isLoadingPilot, setIsLoadingPilot] = useState(true);

  const [milestones, setMilestones] = useState(initialMilestones);
  const [updates, setUpdates] = useState(initialUpdates);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateText, setUpdateText] = useState("");

  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState("DEPLOYMENT_REPORT");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceSuccess, setEvidenceSuccess] = useState("");

  const completedMilestones = milestones.filter(
    (m) => m.status === "Completed"
  ).length;

  const handleAddUpdate = () => {
    if (!updateText.trim()) return;
    const newUpdate = {
      id: Date.now(),
      date: formatCurrentDate(),
      title: "Startup Progress Update",
      description: updateText.trim(),
    };
    setUpdates((prev) => [newUpdate, ...prev]);
    setUpdateText("");
    setShowUpdateForm(false);
  };

  // Load pilot & real evidence from Backend
  useEffect(() => {
    let mounted = true;
    const fetchPilotData = async () => {
      try {
        setIsLoadingPilot(true);
        const pilotsRes = await getPilots();
        const pilots = pilotsRes?.data?.pilots || [];
        if (pilots.length > 0 && mounted) {
          const firstPilot = pilots[0];
          setActivePilot(firstPilot);

          // Fetch evidence for this pilot
          try {
            const evRes = await getPilotEvidence(firstPilot.id);
            if (evRes?.data?.evidence && mounted) {
              setEvidenceList(evRes.data.evidence);
            }
          } catch (err) {
            console.warn("Evidence fetch warning:", err);
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
  }, []);

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

  const handleMilestoneClick = (id) => {
    setMilestones((previous) =>
      previous.map((milestone) => {
        if (milestone.id !== id) {
          return milestone;
        }

        if (
          milestone.status ===
          "In Progress"
        ) {
          return {
            ...milestone,
            status: "Completed",
          };
        }

        return milestone;
      })
    );
  };

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

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl dark:bg-indigo-500/10" />

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              navigate("/startup")
            }
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Dashboard
          </button>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Rocket className="h-6 w-6" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Pilot Workspace
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {pilotData.status}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {pilotData.challengeTitle}
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {pilotData.department}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowUpdateForm(
                  (previous) => !previous
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Progress Update
            </button>
          </div>

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

              <textarea
                value={updateText}
                onChange={(event) =>
                  setUpdateText(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Describe the latest progress, achievements or issues..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowUpdateForm(false)
                  }
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-900"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAddUpdate}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Post Update
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* PILOT SUMMARY                                     */}
      {/* ================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Target}
          title="Pilot Progress"
          value={`${pilotData.progress}%`}
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
          value={pilotData.startDate}
          description="Pilot commencement"
        />

        <SummaryCard
          icon={Flag}
          title="End Date"
          value={pilotData.endDate}
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
            {pilotData.progress}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            initial={{
              width: 0,
            }}
            animate={{
              width: `${pilotData.progress}%`,
            }}
            transition={{
              duration: 0.8,
            }}
            className="h-full rounded-full bg-indigo-600"
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-[10px] text-slate-400">
          <span>
            Started: {pilotData.startDate}
          </span>

          <span>
            Target: {pilotData.endDate}
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
              <div className="absolute bottom-5 left-5 top-5 w-px bg-slate-200 dark:bg-slate-800" />

              {milestones.map(
                (milestone, index) => (
                  <Milestone
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                    onClick={() =>
                      handleMilestoneClick(
                        milestone.id
                      )
                    }
                  />
                )
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
              value={pilotData.department}
            />

            <DetailRow
              label="Pilot Location"
              value={pilotData.location}
            />

            <DetailRow
              label="Start Date"
              value={pilotData.startDate}
            />

            <DetailRow
              label="End Date"
              value={pilotData.endDate}
            />

            <DetailRow
              label="Approved Budget"
              value={pilotData.budget}
            />
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

          <button
            type="button"
            onClick={() => {
              setShowEvidenceForm((previous) => !previous);
              setEvidenceError("");
              setEvidenceSuccess("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            {showEvidenceForm ? "Close Form" : "Upload Evidence File"}
          </button>
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
          {updates.map((update) => (
            <div
              key={update.id}
              className="p-5 sm:p-6"
            >
              <div className="flex gap-4">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {update.title}
                    </h3>

                    <span className="text-[9px] text-slate-400">
                      {update.date}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {update.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
      window.open(evidence.file_url, "_blank", "noopener,noreferrer");
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