import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyEvaluatorApplications } from "../../services/evaluatorService";
import Pagination from "../../components/common/Pagination";
import PageHeader from "../../components/layout/PageHeader";

function EvaluatorMyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const fetchMyApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyEvaluatorApplications();
      const list = res?.data || res || [];
      setApplications(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load evaluator applications.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const q = search.toLowerCase().trim();
      const title = app.challenge?.title || "";
      const dept = app.challenge?.department?.name || "";
      const domain = app.challenge?.domain || "";

      const matchSearch =
        !q ||
        title.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        domain.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "All" ||
        String(app.status || "").toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [applications, search, statusFilter]);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const getStatusBadge = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "SHORTLISTED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Shortlisted / Selected
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <XCircle className="h-3 w-3" /> Not Selected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <Clock className="h-3 w-3" /> Under Review
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
      <PageHeader
        badge="Evaluator Participation"
        badgeIcon={ClipboardCheck}
        title="My Applications"
        description="Track your submitted applications to evaluate Government Problem Statements."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMyApplications}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate("/evaluator/challenges")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              Discover Challenges
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      {/* SEARCH & FILTERS */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your applications..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="All">All status</option>
            <option value="SUBMITTED">Under Review</option>
            <option value="SHORTLISTED">Shortlisted / Selected</option>
            <option value="REJECTED">Not Selected</option>
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

      {/* CONTENT LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            You have not applied to any Problem Statement yet.
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Browse published Problem Statements in the Challenges section to apply for evaluator assignments matching your domain expertise.
          </p>
          <button
            type="button"
            onClick={() => navigate("/evaluator/challenges")}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Browse Available Challenges
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {paginatedApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        {app.challenge?.domain || "Technology"}
                      </span>
                      {getStatusBadge(app.status)}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "—"}
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                      {app.challenge?.title || "Problem Statement"}
                    </h3>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        {app.challenge?.department?.name || "Government Department"}
                        {app.challenge?.department?.state ? ` (${app.challenge.department.state})` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      Challenge Lifecycle
                    </span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {app.challenge?.status || "ACTIVE"}
                    </p>
                  </div>
                </div>

                {app.statement_of_interest && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Your Statement: </span>
                    {app.statement_of_interest}
                  </div>
                )}

                {app.review_reason && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-200">
                    <MessageSquare className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
                    <div>
                      <span className="font-semibold">Department Nodal Remarks: </span>
                      <span>{app.review_reason}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizeOptions={[4, 6, 12, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemName="applications"
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

export default EvaluatorMyApplications;
