import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getMyAssignments,
  updateAssignmentStatus,
} from "../../services/evaluatorService";

function EvaluatorEvaluations() {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyAssignments();
      const list = res?.data || res || [];
      setAssignments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load assigned evaluations.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      setActionLoading(assignmentId);
      await updateAssignmentStatus(assignmentId, newStatus);
      fetchAssignments();
    } catch (err) {
      alert(err.message || `Failed to update assignment to ${newStatus}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    return assignments.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        String(item.startup_name || "").toLowerCase().includes(q) ||
        String(item.challenge_title || "").toLowerCase().includes(q) ||
        String(item.department_name || "").toLowerCase().includes(q) ||
        String(item.domain || "").toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "All" ||
        String(item.status || "").toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [assignments, search, statusFilter]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === "COMPLETED" || a.is_evaluated).length;
    const pending = assignments.filter((a) => a.status === "PENDING").length;
    const accepted = assignments.filter((a) => a.status === "ACCEPTED" && !a.is_evaluated).length;
    const recused = assignments.filter((a) => a.status === "RECUSED" || a.is_recused).length;

    return { total, completed, pending, accepted, recused };
  }, [assignments]);

  const getAssignmentBadge = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    }
    if (s === "RECUSED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <XCircle className="h-3 w-3" /> Recused
        </span>
      );
    }
    if (s === "ACCEPTED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Clock className="h-3 w-3" /> Accepted / Ready
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <Clock className="h-3 w-3" /> Pending Acceptance
      </span>
    );
  };

  const getCoiBadge = (item) => {
    if (item.is_recused || item.has_conflict) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <ShieldAlert className="h-3 w-3" /> Conflict Declared
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <ShieldCheck className="h-3 w-3 text-indigo-500" /> COI Step Active
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <UserCheck className="h-4.5 w-4.5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Official Evaluator Queue
            </p>
          </div>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Proposal Evaluation
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Assigned proposals for conflict certification, Brain 3 AI-assisted analysis, and independent 5-factor rubric scoring.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </button>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by startup name, challenge, or department..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="All">All Assignments ({stats.total})</option>
            <option value="PENDING">Pending Acceptance ({stats.pending})</option>
            <option value="ACCEPTED">Accepted ({stats.accepted})</option>
            <option value="COMPLETED">Completed ({stats.completed})</option>
            <option value="RECUSED">Recused ({stats.recused})</option>
          </select>
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ASSIGNMENTS QUEUE */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No proposal evaluations assigned.
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            When Government department nodal officers assign innovation proposals to you, they will appear in your evaluation queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    {item.domain || "Technology"}
                  </span>
                  {getAssignmentBadge(item.status)}
                  {getCoiBadge(item)}
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Assigned: {item.assigned_at ? new Date(item.assigned_at).toLocaleDateString("en-IN") : "—"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {item.challenge_title || "Innovation Challenge"}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {item.department_name || "Government Department"}
                      {item.state ? ` (${item.state})` : ""}
                    </span>
                  </div>
                  <div>
                    Startup: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.startup_name || "Startup"}</span>
                  </div>
                </div>

                {item.proposal_summary && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">
                    "{item.proposal_summary}"
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800 lg:border-none lg:pt-0">
                {item.evaluation_total_score != null && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {item.evaluation_total_score}%
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {item.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading === item.id}
                        onClick={() => handleUpdateStatus(item.id, "DECLINED")}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === item.id}
                        onClick={() => handleUpdateStatus(item.id, "ACCEPTED")}
                        className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                      >
                        Accept Assignment
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/evaluator/evaluation/${item.application_id || item.id}`)
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {item.is_evaluated ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        View Scorecard
                      </>
                    ) : (
                      <>
                        Evaluate Proposal
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default EvaluatorEvaluations;
