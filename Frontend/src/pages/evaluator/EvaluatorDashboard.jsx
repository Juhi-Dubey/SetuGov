import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Clock3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  CalendarDays,
  Building2,
  FileText,
  TrendingUp,
  Filter,
  RefreshCw,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyAssignments, updateAssignmentStatus } from "../../services/evaluatorService";

function StatCard({ title, value, description, icon: Icon, iconClass, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function EvaluatorDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

  const stats = useMemo(() => {
    const assigned = assignments.length;
    const completed = assignments.filter((item) => item.status === "COMPLETED" || item.is_evaluated).length;
    const pending = assignments.filter((item) => item.status === "PENDING" && !item.is_evaluated).length;
    const recused = assignments.filter((item) => item.status === "RECUSED" || item.is_recused).length;

    return { assigned, completed, pending, recused };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const searchText = search.toLowerCase().trim();
      const matchesSearch =
        !searchText ||
        String(item.challenge_title || "").toLowerCase().includes(searchText) ||
        String(item.startup_name || "").toLowerCase().includes(searchText) ||
        String(item.domain || "").toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        String(item.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [assignments, search, statusFilter]);

  const handleQuickAccept = async (assignmentId) => {
    try {
      await updateAssignmentStatus(assignmentId, "ACCEPTED");
      fetchAssignments();
    } catch (err) {
      alert(`Error accepting assignment: ${err.message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* PAGE HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              Evaluator Workspace
            </p>
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Welcome to Evaluation Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review assigned innovation proposals, certify conflict declarations, and score solutions.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </section>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Evaluations"
          value={stats.assigned}
          description="Total evaluations assigned"
          icon={ClipboardCheck}
          iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
          delay={0}
        />
        <StatCard
          title="Completed Scorecards"
          value={stats.completed}
          description="Evaluations finalized"
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          delay={0.05}
        />
        <StatCard
          title="Pending Assessment"
          value={stats.pending}
          description="Awaiting your review"
          icon={Clock3}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          delay={0.1}
        />
        <StatCard
          title="Recused / Conflict"
          value={stats.recused}
          description="Recused due to COI"
          icon={AlertCircle}
          iconClass="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          delay={0.15}
        />
      </div>

      {/* RECENT ASSIGNMENTS SECTION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Assigned Evaluations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned by Government department nodal officers for independent evaluation.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="COMPLETED">Completed</option>
              <option value="RECUSED">Recused</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-purple-500" />
            Loading evaluator assignments...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Assignments Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              When Government officers assign applications to you, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="py-3 px-4">Challenge & Department</th>
                  <th className="py-3 px-4">Startup</th>
                  <th className="py-3 px-4">Assigned Date</th>
                  <th className="py-3 px-4">Assignment Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {a.challenge_title || "Innovation Challenge"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {a.department_name} ({a.state || "National"})
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <div>{a.startup_name || "Startup Candidate"}</div>
                      <div className="text-[11px] text-slate-400">{a.domain}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {a.status === "COMPLETED" || a.is_evaluated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : a.status === "RECUSED" || a.is_recused ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          <XCircle className="h-3 w-3" /> Recused (COI)
                        </span>
                      ) : a.status === "ACCEPTED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Pending Accept
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {a.evaluation_total_score ? `${a.evaluation_total_score}%` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {a.status === "PENDING" ? (
                        <button
                          onClick={() => handleQuickAccept(a.id)}
                          className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                        >
                          Accept
                        </button>
                      ) : null}

                      <button
                        onClick={() => navigate(`/evaluator/evaluation/${a.application_id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {a.is_evaluated ? "View Scorecard" : "Evaluate"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default EvaluatorDashboard;