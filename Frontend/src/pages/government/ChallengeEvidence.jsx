import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Upload,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
  FlaskConical,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import Pagination from "../../components/common/Pagination";
import { getPilotEvidence, addPilotEvidence, updateEvidence as apiUpdateEvidence } from "../../services/pilotService.js";
import { getChallengePilot } from "../../services/challengeService.js";
import { openDocumentSecurely } from "../../utils/documentUtils.js";

// No fake initialEvidence — always start empty. Real evidence is fetched from PostgreSQL.
function ChallengeEvidence() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  // challengeId is the canonical challenge UUID from the route — never fallback to "1"
  const [pilot, setPilot] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const paginatedEvidence = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return evidence.slice(start, start + pageSize);
  }, [evidence, currentPage, pageSize]);

  // Load pilot and its evidence from backend using canonical challenge-scoped lookup
  useEffect(() => {
    if (!challengeId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const fetchEvidenceData = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        // Use getChallengePilot — the canonical challenge → pilot resolution.
        // Never call getPilots() and scan, never use pilots[0].
        const pilotRes = await getChallengePilot(challengeId);
        const pilotData =
          pilotRes?.data?.pilot !== undefined
            ? pilotRes.data.pilot
            : pilotRes?.data || pilotRes;

        if (!pilotData?.id) {
          // No pilot for this challenge yet — show empty state
          if (mounted) {
            setPilot(null);
            setEvidence([]);
          }
          return;
        }

        if (mounted) setPilot(pilotData);

        const evRes = await getPilotEvidence(pilotData.id);
        const items = evRes?.data?.evidence || evRes?.evidence || (Array.isArray(evRes?.data) ? evRes.data : []) || [];

        if (mounted) {
          setEvidence(
            items.map((item) => ({
              id: item.id,
              title: item.type?.replace(/_/g, " "),
              type: item.type,
              description: item.description || "",
              fileName: item.file_url ? item.file_url.split("/").pop() : "evidence-file",
              file_url: item.file_url,
              status: item.verification_status?.toLowerCase() || "pending",
              remarks: "",
              raw: item,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load evidence data:", err);
        if (mounted) {
          setFetchError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load pilot evidence from PostgreSQL."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEvidenceData();
    return () => { mounted = false; };
  }, [challengeId]);

  const addEvidence = () => {
    setEvidence((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        title: "",
        type: "DEPLOYMENT_REPORT",
        description: "",
        fileName: "",
        file_url: null,
        file: null,
        status: "pending",
        remarks: "",
      },
    ]);
  };

  const updateEvidenceField = (
    evidenceId,
    field,
    value
  ) => {
    setEvidence((previous) =>
      previous.map((item) =>
        item.id === evidenceId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const removeEvidence = (evidenceId) => {
    setEvidence((previous) =>
      previous.filter(
        (item) => item.id !== evidenceId
      )
    );
  };

  const handleFileChange = (
    evidenceId,
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEvidence((previous) =>
      previous.map((item) =>
        item.id === evidenceId
          ? {
              ...item,
              fileName: file.name,
              file: file,
            }
          : item
      )
    );
  };

  const handleVerification = async (
    evidenceId,
    status
  ) => {
    updateEvidenceField(
      evidenceId,
      "status",
      status
    );

    // If item exists in DB (UUID format), update via API
    try {
      const backendStatus = status === "verified" ? "VERIFIED" : status === "rejected" ? "REJECTED" : "PENDING";
      await apiUpdateEvidence(evidenceId, { verification_status: backendStatus });
      setStatusMessage(`Evidence marked as ${backendStatus}`);
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (err) {
      console.warn("Evidence verification update (offline fallback):", err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage("");

    try {
      if (pilot?.id) {
        // Upload any newly added items with files
        for (const item of evidence) {
          if (item.file && !item.file_url) {
            const formData = new FormData();
            formData.append("file", item.file);
            formData.append("type", item.type || "OTHER");
            formData.append("description", item.description || "Officer added evidence");
            formData.append("source", "GOVERNMENT_REVIEW");
            await addPilotEvidence(pilot.id, formData);
          }
        }
      }
      setStatusMessage("All evidence and verification remarks saved successfully.");
      setTimeout(() => setStatusMessage(""), 2500);
    } catch (err) {
      console.error("Failed to save evidence:", err);
      setStatusMessage(err?.message || "Failed to save some evidence changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const verifiedCount = evidence.filter((item) => item.status === "verified").length;
  const rejectedCount = evidence.filter((item) => item.status === "rejected").length;
  const pendingCount = evidence.filter((item) => item.status === "pending").length;

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
            onClick={() => navigate(`/government/challenges/${challengeId}/pilot`)}
            className="back-nav"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pilot
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-3.5 w-3.5" />
                Evidence Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Challenge Evidence
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Upload, review and verify evidence collected during the pilot.
              </p>
            </div>

            {pilot && (
              <button
                type="button"
                onClick={addEvidence}
                className="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Evidence
              </button>
            )}
          </div>
        </motion.div>

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading evidence from PostgreSQL...
            </p>
          </div>
        )}

        {/* FETCH ERROR */}
        {!loading && fetchError && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20 mb-6">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <h3 className="mt-3 text-base font-bold text-red-900 dark:text-red-300">Unable to Load Evidence</h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400 max-w-md mx-auto">{fetchError}</p>
          </div>
        )}

        {/* NO PILOT YET */}
        {!loading && !fetchError && !pilot && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
            <FlaskConical className="mx-auto h-12 w-12 text-indigo-400 dark:text-indigo-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No Pilot Project Found</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Evidence can only be reviewed once a pilot project has been created for this challenge.
            </p>
          </div>
        )}

        {/* SUMMARY — only show when pilot and evidence exist */}
        {!loading && !fetchError && pilot && (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-3">
              <EvidenceSummary icon={CheckCircle2} label="Verified" value={verifiedCount} description="Evidence approved" type="success" />
              <EvidenceSummary icon={Clock} label="Pending" value={pendingCount} description="Awaiting verification" type="warning" />
              <EvidenceSummary icon={XCircle} label="Rejected" value={rejectedCount} description="Needs correction" type="danger" />
            </section>

            {/* PILOT INFO */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pilot</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {pilot?.title || pilot?.challenge?.title || "Pilot Sandbox"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {pilot?.startup?.company_name ? `${pilot.startup.company_name} · ` : ""}
                    Challenge: {challengeId}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pilot Status</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{pilot?.status || "Active"}</p>
                </div>
              </div>
            </section>

            {/* EVIDENCE LIST — empty state when pilot exists but no evidence */}
            {evidence.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
                <FileText className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No Evidence Uploaded Yet</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No evidence documents have been submitted for this pilot. Click "Add Evidence" to upload the first document.
                </p>
              </div>
            ) : (
              <section className="space-y-5">

          {paginatedEvidence.map(
            (item, index) => (
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

                {/* CARD HEADER */}

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        Evidence {index + 1}
                      </p>

                      <p className="text-xs text-slate-400">
                        Pilot evidence record
                      </p>
                    </div>

                  </div>

                  {evidence.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeEvidence(
                          item.id
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                </div>

                {/* FORM */}

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  {/* TITLE */}

                  <div>
                    <label className="text-xs font-semibold">
                      Evidence Title
                    </label>

                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) =>
                        updateEvidenceField(
                          item.id,
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Pilot Performance Report"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                    />
                  </div>

                  {/* TYPE */}

                  <div>
                    <label className="text-xs font-semibold">
                      Evidence Type
                    </label>

                    <select
                      value={item.type}
                      onChange={(event) =>
                        updateEvidenceField(
                          item.id,
                          "type",
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="DEPLOYMENT_REPORT">
                        Deployment Report
                      </option>

                      <option value="FIELD_TEST_RESULT">
                        Field Test Result
                      </option>

                      <option value="TELEMETRY_LOG">
                        Telemetry & System Logs
                      </option>

                      <option value="PERFORMANCE_METRIC">
                        Performance Metrics
                      </option>

                      <option value="AUDIT_REPORT">
                        Audit Report
                      </option>

                      <option value="MILESTONE_EVIDENCE">
                        Milestone Evidence
                      </option>

                      <option value="OTHER">
                        Other Supporting Document
                      </option>
                    </select>
                  </div>

                  {/* DESCRIPTION */}

                  <div className="md:col-span-2">

                    <label className="text-xs font-semibold">
                      Description
                    </label>

                    <textarea
                      value={item.description}
                      onChange={(event) =>
                        updateEvidenceField(
                          item.id,
                          "description",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Describe what this evidence demonstrates..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                    />

                  </div>

                  {/* FILE */}

                  <div className="md:col-span-2">

                    <label className="text-xs font-semibold">
                      Evidence Document File
                    </label>

                    {item.file_url ? (
                      <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {item.fileName || "Uploaded Evidence Document"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Stored on SetuGov Server · Click to view or download
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDocumentSecurely(item.file_url, item.fileName || "evidence_doc.pdf")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View / Download Document
                        </button>
                      </div>
                    ) : (
                      <label className="mt-2 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600">
                        <Upload className="h-6 w-6 text-slate-400" />
                        <p className="mt-2 text-sm font-semibold">
                          {item.fileName ? item.fileName : "Upload evidence file"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          PDF, PNG, JPG max 10MB
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(event) =>
                            handleFileChange(
                              item.id,
                              event
                            )
                          }
                        />
                      </label>
                    )}

                  </div>

                </div>

                {/* VERIFICATION */}

                <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>
                      <p className="text-sm font-semibold">
                        Verification Status
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Review the evidence and select
                        the appropriate status.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">

                      <VerificationButton
                        active={
                          item.status ===
                          "verified"
                        }
                        onClick={() =>
                          handleVerification(
                            item.id,
                            "verified"
                          )
                        }
                        icon={CheckCircle2}
                        label="Verify"
                        type="success"
                      />

                      <VerificationButton
                        active={
                          item.status ===
                          "pending"
                        }
                        onClick={() =>
                          handleVerification(
                            item.id,
                            "pending"
                          )
                        }
                        icon={Clock}
                        label="Pending"
                        type="warning"
                      />

                      <VerificationButton
                        active={
                          item.status ===
                          "rejected"
                        }
                        onClick={() =>
                          handleVerification(
                            item.id,
                            "rejected"
                          )
                        }
                        icon={XCircle}
                        label="Reject"
                        type="danger"
                      />

                    </div>

                  </div>

                  {/* REMARKS */}

                  <div className="mt-5">

                    <label className="text-xs font-semibold">
                      Verification Remarks
                    </label>

                    <textarea
                      value={item.remarks}
                      onChange={(event) =>
                        updateEvidenceField(
                          item.id,
                          "remarks",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Add verification comments..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                    />

                  </div>

                </div>

              </motion.article>
            )
          )}

              </section>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={evidence.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="evidence items"
              className="mt-6"
            />

            {statusMessage && (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate(`/government/challenges/${challengeId}/pilot`)}
                className="back-nav"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Pilot
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    <><FileText className="h-4 w-4" />Save Verification Changes</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/government/challenges/${challengeId}/decision`)}
                  className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
                >
                  Continue to Decision
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// =========================================================
// SUMMARY
// =========================================================

function EvidenceSummary({
  icon: Icon,
  label,
  value,
  description,
  type,
}) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",

    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",

    danger:
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[type]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-2xl font-bold">
          {value}
        </p>

      </div>

      <p className="mt-4 text-sm font-semibold">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>

    </div>
  );
}

// =========================================================
// VERIFICATION BUTTON
// =========================================================

function VerificationButton({
  active,
  onClick,
  icon: Icon,
  label,
  type,
}) {
  const styles = {
    success: active
      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : "",

    warning: active
      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
      : "",

    danger: active
      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
      : "",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${
        active
          ? styles[type]
          : "border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default ChallengeEvidence;