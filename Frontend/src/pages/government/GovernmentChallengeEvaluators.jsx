import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  UserCheck,
  ShieldCheck,
  Building2,
  CalendarDays,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Sparkles,
  ArrowRight,
  UserX,
  AlertTriangle
} from "lucide-react";

import BackButton from "../../components/common/BackButton";
import StatCard from "../../components/common/StatCard";
import {
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
  closeEvaluatorRecruitment,
  reopenEvaluatorRecruitment,
  updateChallengeEvaluatorRecruitment,
  getChallengeEvaluatorPool,
  assignEvaluatorToApplication
} from "../../services/evaluatorService";

export default function GovernmentChallengeEvaluators() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId;

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [challenge, setChallenge] = useState(null);
  const [metrics, setMetrics] = useState({
    required_evaluator_count: 3,
    shortlisted_count: 0,
    assignments_accepted_count: 0,
    assignments_pending_count: 0,
    still_required_count: 3,
    total_applications_count: 0,
    recruitment_status: "OPEN"
  });
  const [applications, setApplications] = useState([]);
  const [evaluatorPool, setEvaluatorPool] = useState([]);

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showEditCountModal, setShowEditCountModal] = useState(false);
  const [editCountVal, setEditCountVal] = useState(3);
  const [rejectModalApp, setRejectModalApp] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [appsRes, poolRes] = await Promise.allSettled([
        getChallengeEvaluatorApplications(id),
        getChallengeEvaluatorPool(id)
      ]);

      if (appsRes.status === "fulfilled") {
        const raw = appsRes.value?.data || appsRes.value || {};
        if (raw.challenge) setChallenge(raw.challenge);
        if (raw.metrics) {
          setMetrics(raw.metrics);
          setEditCountVal(raw.metrics.required_evaluator_count || 3);
        }
        const appList = Array.isArray(raw.applications)
          ? raw.applications
          : Array.isArray(raw)
          ? raw
          : [];
        setApplications(appList);
      } else {
        throw appsRes.reason;
      }

      if (poolRes.status === "fulfilled") {
        const pData = poolRes.value?.data || poolRes.value || [];
        setEvaluatorPool(Array.isArray(pData) ? pData : []);
      }
    } catch (err) {
      console.error("Failed to load evaluator applications:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load evaluator applications for this Problem Statement."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear toast notifications
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(""), 4500);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === "ALL" || app.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        app.name?.toLowerCase().includes(query) ||
        app.email?.toLowerCase().includes(query) ||
        app.organization?.toLowerCase().includes(query) ||
        app.designation?.toLowerCase().includes(query) ||
        (Array.isArray(app.domain_expertise) &&
          app.domain_expertise.some((d) => d.toLowerCase().includes(query)));

      return matchesStatus && matchesQuery;
    });
  }, [applications, statusFilter, searchQuery]);

  // Handle Shortlist single application
  const handleShortlist = async (applicationId) => {
    try {
      setActionLoading(true);
      await reviewEvaluatorApplication(
        id,
        applicationId,
        "SHORTLISTED",
        "Shortlisted for Problem Statement evaluation panel"
      );
      setActionSuccess("Evaluator shortlisted successfully.");
      await loadData();
    } catch (err) {
      alert(`Error shortlisting evaluator: ${err?.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject single application
  const handleReject = async () => {
    if (!rejectModalApp) return;
    try {
      setActionLoading(true);
      await reviewEvaluatorApplication(
        id,
        rejectModalApp.id,
        "REJECTED",
        rejectReason.trim() || "Evaluator profile did not match target requirements."
      );
      setActionSuccess("Evaluator application rejected.");
      setRejectModalApp(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      alert(`Error rejecting evaluator: ${err?.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Close Evaluator Recruitment in Bulk
  const handleCloseRecruitment = async () => {
    try {
      setActionLoading(true);
      const res = await closeEvaluatorRecruitment(id, {
        closing_notes: closeNotes.trim() || undefined
      });
      setShowCloseModal(false);
      setCloseNotes("");
      setActionSuccess(
        res?.data?.message ||
          res?.message ||
          "Evaluator recruitment closed! Remaining applicants marked NOT_SELECTED."
      );
      await loadData();
    } catch (err) {
      alert(`Cannot close recruitment: ${err?.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reopen Evaluator Recruitment
  const handleReopenRecruitment = async () => {
    try {
      setActionLoading(true);
      await reopenEvaluatorRecruitment(id);
      setShowReopenModal(false);
      setActionSuccess("Evaluator recruitment has been reopened. New applications can now be received.");
      await loadData();
    } catch (err) {
      alert(`Error reopening recruitment: ${err?.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Required Evaluator Count
  const handleSaveRequiredCount = async (e) => {
    e.preventDefault();
    const count = parseInt(editCountVal, 10);
    if (isNaN(count) || count < 1) {
      alert("Please enter a valid positive number of evaluators.");
      return;
    }
    try {
      setActionLoading(true);
      await updateChallengeEvaluatorRecruitment(id, {
        required_evaluator_count: count
      });
      setShowEditCountModal(false);
      setActionSuccess(`Required evaluator target updated to ${count}.`);
      await loadData();
    } catch (err) {
      alert(`Error updating target count: ${err?.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const isRecruitmentOpen = metrics.recruitment_status === "OPEN";
  const canClose = metrics.shortlisted_count >= metrics.required_evaluator_count;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="mb-2">
            <BackButton
              to={`/government/challenges/${id}/overview`}
              label="Back to Challenge Overview"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Evaluator Applications & Intake
            </h1>
            {isRecruitmentOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Intake OPEN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                <Lock className="h-3 w-3" />
                Intake CLOSED
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {challenge?.title || "Problem Statement"} • {challenge?.department_name || "Department"}
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isRecruitmentOpen ? (
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              disabled={!canClose || actionLoading}
              title={
                !canClose
                  ? `Shortlist at least ${metrics.required_evaluator_count} evaluators before closing intake`
                  : "Close intake and finalize non-selected applications"
              }
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm transition-all ${
                canClose
                  ? "bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
              }`}
            >
              <Lock className="h-4 w-4" />
              Close Evaluator Applications
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowReopenModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Unlock className="h-4 w-4" />
              Reopen Recruitment
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-white" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs sm:text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          index={0}
          title="Required Quorum"
          value={metrics.required_evaluator_count}
          description="Target evaluation quorum (Click to edit)"
          icon={Users}
          color="violet"
          onClick={() => setShowEditCountModal(true)}
        />
        <StatCard
          index={1}
          title="Shortlisted"
          value={metrics.shortlisted_count}
          description={
            metrics.shortlisted_count >= metrics.required_evaluator_count
              ? "✓ Quorum met"
              : `${metrics.still_required_count} more needed`
          }
          icon={UserCheck}
          color="violet"
          valueColor="text-violet-700 dark:text-violet-400"
        />
        <StatCard
          index={2}
          title="Accepted"
          value={metrics.assignments_accepted_count}
          description="Invitations accepted"
          icon={CheckCircle2}
          color="emerald"
          valueColor="text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          index={3}
          title="Still Needed"
          value={metrics.still_required_count}
          description="Pending selection"
          icon={Clock3}
          color="amber"
          valueColor={metrics.still_required_count > 0 ? "text-amber-700 dark:text-amber-400" : undefined}
        />
        <StatCard
          index={4}
          className="col-span-2 sm:col-span-1"
          title="Total Intake"
          value={metrics.total_applications_count}
          description="Self-applications received"
          icon={Users}
          color="blue"
        />
      </div>

      {/* Recruitment Status Notice Banner */}
      {!canClose && isRecruitmentOpen && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold">Recruitment In Progress:</span> You have shortlisted{" "}
            <span className="font-bold">{metrics.shortlisted_count}</span> of the{" "}
            <span className="font-bold">{metrics.required_evaluator_count}</span> required evaluators.
            Please review applicants and shortlist at least{" "}
            <span className="font-bold">{metrics.still_required_count}</span> more evaluator(s) before closing applications.
          </div>
        </div>
      )}

      {canClose && isRecruitmentOpen && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50/80 p-4 text-xs sm:text-sm text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-purple-600" />
            <span>
              Target quorum of <span className="font-bold">{metrics.required_evaluator_count}</span> evaluators has been shortlisted! You can now close evaluator recruitment to finalize the panel.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="shrink-0 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
          >
            Close Intake Now
          </button>
        </div>
      )}

      {/* Applicants Intake Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Header & Filter Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "ALL", label: "All Applicants", count: applications.length },
              {
                key: "SUBMITTED",
                label: "Submitted",
                count: applications.filter((a) => a.status === "SUBMITTED").length
              },
              {
                key: "SHORTLISTED",
                label: "Shortlisted",
                count: applications.filter((a) => a.status === "SHORTLISTED").length
              },
              {
                key: "NOT_SELECTED",
                label: "Not Selected",
                count: applications.filter((a) => a.status === "NOT_SELECTED").length
              },
              {
                key: "REJECTED",
                label: "Rejected",
                count: applications.filter((a) => a.status === "REJECTED").length
              }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === tab.key
                    ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, expertise, org..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        {/* Loading / Error / Empty States */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-600 mb-2" />
            Loading evaluator applications...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No evaluator applications found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? "Try adjusting your search criteria or clear active filters."
                : "No evaluators have submitted applications for this Problem Statement yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredApplicants.map((app) => {
              const isShortlisted = app.status === "SHORTLISTED";
              const isNotSelected = app.status === "NOT_SELECTED";
              const isRejected = app.status === "REJECTED";
              const isSubmitted = app.status === "SUBMITTED";

              return (
                <div
                  key={app.id}
                  className="py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between hover:bg-slate-50/40 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                >
                  {/* Evaluator Credentials & Pitch */}
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {app.name || "Evaluator"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {app.designation} • {app.organization}
                      </span>
                      {app.years_experience != null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Briefcase className="h-3 w-3" />
                          {app.years_experience} yrs exp
                        </span>
                      )}

                      {/* Status Badges */}
                      {isShortlisted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          SHORTLISTED
                        </span>
                      )}
                      {isNotSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                          <Lock className="h-3 w-3" />
                          NOT SELECTED
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                          <XCircle className="h-3 w-3" />
                          REJECTED
                        </span>
                      )}
                      {isSubmitted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                          <Clock3 className="h-3 w-3" />
                          SUBMITTED
                        </span>
                      )}
                    </div>

                    {/* Domain Expertise Badges */}
                    {Array.isArray(app.domain_expertise) && app.domain_expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {app.domain_expertise.map((dom, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-100 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300"
                          >
                            {dom}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Statement / Pitch */}
                    {app.statement && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-2 border-slate-300 dark:border-slate-700 pl-2 mt-1">
                        "{app.statement}"
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>
                        Applied on:{" "}
                        {app.created_at
                          ? new Date(app.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          : "—"}
                      </span>
                      {app.review_reason && (
                        <span>• Note: {app.review_reason}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions for this Applicant */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isSubmitted && isRecruitmentOpen && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleShortlist(app.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:ring-2 focus:ring-purple-500"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          SHORTLIST
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectModalApp(app)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {isShortlisted && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Panel Member
                        </span>
                        {isRecruitmentOpen && (
                          <button
                            type="button"
                            onClick={() => setRejectModalApp(app)}
                            className="text-[11px] text-slate-400 hover:text-rose-600 underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}

                    {isNotSelected && (
                      <span className="text-[11px] text-slate-400 italic">
                        Not selected (intake closed)
                      </span>
                    )}

                    {isRejected && (
                      <span className="text-[11px] text-rose-500 font-medium">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Close Evaluator Applications Confirmation */}
      <AnimatePresence>
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Close Evaluator Recruitment</h3>
                  <p className="text-xs text-slate-500">
                    Finalize the evaluator panel for this Problem Statement
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 space-y-2">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-700">
                  <span>Shortlisted Evaluators:</span>
                  <span className="font-bold text-emerald-600">
                    {metrics.shortlisted_count} confirmed
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-700">
                  <span>Required Evaluator Quorum:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {metrics.required_evaluator_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Submitted Applicants:</span>
                  <span className="font-bold text-amber-600">
                    {applications.filter((a) => a.status === "SUBMITTED").length} will become NOT_SELECTED
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                When you close recruitment:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1">
                <li>Selected evaluators will be added to the official Challenge Evaluator Pool.</li>
                <li>All remaining submitted applicants will be marked <strong>NOT_SELECTED</strong> in bulk automatically.</li>
                <li>New evaluator self-applications will be blocked.</li>
              </ul>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Closing Notes / Resolution (Optional)
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. Quorum satisfied with domain experts in ABDM and clinical workflows."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  disabled={actionLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCloseRecruitment}
                  disabled={actionLoading}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
                >
                  {actionLoading ? "Closing Intake..." : "Confirm & Close Applications"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Reopen Evaluator Recruitment Confirmation */}
      <AnimatePresence>
        {showReopenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Unlock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Reopen Evaluator Intake</h3>
                  <p className="text-xs text-slate-500">
                    Allow new evaluator self-applications for this Challenge
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Reopening recruitment allows verified evaluators to submit new applications for this Problem Statement. Previously non-selected applicants will remain NOT_SELECTED unless they explicitly submit a new application.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  disabled={actionLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReopenRecruitment}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {actionLoading ? "Reopening..." : "Reopen Recruitment"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Edit Required Evaluator Target Count */}
      <AnimatePresence>
        {showEditCountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Target Evaluators Count</h3>
                  <p className="text-xs text-slate-500">
                    Set required evaluator quorum
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveRequiredCount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Number of Required Evaluators
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editCountVal}
                    onChange={(e) => setEditCountVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Government will need to shortlist at least this many evaluators before closing applications.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditCountModal(false)}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
                  >
                    {actionLoading ? "Saving..." : "Save Target"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Reject Evaluator Applicant */}
      <AnimatePresence>
        {rejectModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Reject Evaluator Application</h3>
                  <p className="text-xs text-slate-500">
                    {rejectModalApp.name} ({rejectModalApp.organization})
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rejection Justification / Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Domain expertise did not match AI triage clinical focus."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-rose-500 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalApp(null);
                    setRejectReason("");
                  }}
                  disabled={actionLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
