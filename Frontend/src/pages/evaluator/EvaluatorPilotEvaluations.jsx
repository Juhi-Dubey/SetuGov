import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  FileCheck,
  Target,
  BarChart2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPilots } from "../../services/pilotService";

function EvaluatorPilotEvaluations() {
  const navigate = useNavigate();
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchPilots();
  }, []);

  const fetchPilots = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getPilots();
      const list = res?.data?.pilots || res?.data || res?.pilots || [];
      setPilots(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load pilot evaluations.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return pilots.filter((p) => {
      const q = search.toLowerCase().trim();
      const title = p.challenge?.title || "";
      const startup = p.startup?.company_name || "";
      const dept = p.challenge?.department?.name || "";

      const matchSearch =
        !q ||
        title.toLowerCase().includes(q) ||
        startup.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "All" ||
        String(p.status || "").toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [pilots, search, statusFilter]);

  const getStatusBadge = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "VALIDATION" || s === "COMPLETED" || s === "SCALED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> {s}
        </span>
      );
    }
    if (s === "STOPPED" || s === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-3 w-3" /> {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Clock className="h-3 w-3" /> {s || "ACTIVE"}
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
              <FlaskConical className="h-4.5 w-4.5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Pilot Monitoring & Validation
            </p>
          </div>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Pilot Evaluations
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monitor real-world deployment performance, examine empirical evidence, and submit independent validation reports.
          </p>
        </div>

        <button
          onClick={fetchPilots}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
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
            placeholder="Search by challenge, startup, or department..."
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
            <option value="All">All Statuses</option>
            <option value="INITIATED">Initiated</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VALIDATION">Validation Stage</option>
            <option value="COMPLETED">Completed</option>
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

      {/* PILOT CARDS */}
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
            <FlaskConical className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No pilot evaluations assigned.
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            When startups enter the government pilot deployment stage on challenges you are assigned to, their pilot progress and validation duties will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pilot) => (
            <div
              key={pilot.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    {pilot.startup?.domain || "Technology"}
                  </span>
                  {getStatusBadge(pilot.status)}
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Started: {pilot.started_at ? new Date(pilot.started_at).toLocaleDateString("en-IN") : "Pending"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {pilot.challenge?.title || "Pilot Deployment"}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {pilot.challenge?.department?.name || "Government Department"}
                    </span>
                  </div>
                  <div>
                    Startup: <span className="font-semibold text-slate-800 dark:text-slate-200">{pilot.startup?.company_name || "Startup"}</span>
                  </div>
                </div>

                {/* COUNTS OF KPIs, EVIDENCE, MILESTONES */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-indigo-500" />
                    {pilot._count?.kpis ?? 0} KPIs
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart2 className="h-3.5 w-3.5 text-emerald-500" />
                    {pilot._count?.milestones ?? 0} Milestones
                  </span>
                  <span className="flex items-center gap-1">
                    <FileCheck className="h-3.5 w-3.5 text-purple-500" />
                    {pilot._count?.evidence ?? 0} Evidence Files
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                    {pilot._count?.validations ?? 0} Validations Submitted
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800 lg:mt-0 lg:border-none lg:pt-0">
                {pilot.overall_score != null && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Overall Score</p>
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {pilot.overall_score}%
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/evaluator/pilot-evaluations/${pilot.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Review & Validate Pilot
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default EvaluatorPilotEvaluations;
