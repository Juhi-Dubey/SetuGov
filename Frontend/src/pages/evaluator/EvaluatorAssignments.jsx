import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ClipboardCheck,
  Building2,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
function EvaluatorAssignments() {
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
      const raw = res?.data?.assignments || res?.data || res || [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list.map((a) => ({
        id: a.id,
        application_id: a.application_id || a.application?.id,
        challenge_title: a.application?.challenge?.title || a.challenge_title || "Innovation Challenge",
        department_name: a.application?.challenge?.department?.name || a.department_name || "Government Department",
        state: a.application?.challenge?.department?.state || a.state || "National",
        startup_name: a.application?.startup?.company_name || a.startup_name || "Startup Innovator",
        domain: a.application?.startup?.domain || a.domain || "GovTech",
        assigned_at: a.assigned_at || a.created_at,
        status: a.status || "PENDING",
        is_recused: a.status === "RECUSED" || Boolean(a.application?.conflict_declarations?.length),
        is_evaluated: a.status === "COMPLETED" || Boolean(a.application?.evaluations?.length),
        has_conflict: Boolean(a.application?.conflict_declarations?.length)
      }));

      setAssignments(mapped);
    } catch (err) {
      console.warn("Error fetching evaluator assignments:", err);
      setError(err?.response?.data?.message || "Failed to load assigned evaluations.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.challenge_title || "").toLowerCase().includes(q) ||
        (item.startup_name || "").toLowerCase().includes(q) ||
        (item.domain || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" ||
        String(item.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [assignments, search, statusFilter]);

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      await updateAssignmentStatus(assignmentId, newStatus);
      fetchAssignments();
    } catch (err) {
      alert(`Error updating assignment: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Evaluation Assignments
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Official evaluation assignments assigned to you by Government nodal officers.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by challenge, startup, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-900"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="All">All Assignment Statuses</option>
            <option value="PENDING">Pending Acceptance</option>
            <option value="ACCEPTED">Accepted / Ready to Evaluate</option>
            <option value="COMPLETED">Completed Evaluations</option>
            <option value="RECUSED">Recused (COI)</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-purple-500" />
            Loading assigned evaluations...
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
              There are currently no evaluation assignments matching your criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="py-3.5 px-4">Challenge & Department</th>
                  <th className="py-3.5 px-4">Startup Candidate</th>
                  <th className="py-3.5 px-4">Assigned On</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Conflict Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{a.startup_name}</div>
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
                          <XCircle className="h-3 w-3" /> Recused
                        </span>
                      ) : a.status === "ACCEPTED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {a.is_recused ? (
                        <span className="text-red-500 font-semibold text-[11px]">Conflict Declared</span>
                      ) : a.has_conflict === false && a.is_evaluated ? (
                        <span className="text-emerald-600 font-semibold text-[11px]">Certified Clean</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending Declaration</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {a.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(a.id, "ACCEPTED")}
                            className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(a.id, "DECLINED")}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                          >
                            Decline
                          </button>
                        </>
                      )}

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
      </div>
    </div>
  );
}

export default EvaluatorAssignments;