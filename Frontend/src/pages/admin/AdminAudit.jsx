import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
  Database,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAdminAuditLogs } from "../../services/adminService";
import Pagination from "../../components/common/Pagination";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/common/StatCard";

export function AdminAudit() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pageSize,
      };

      if (search.trim()) {
        params.search = search.trim();
      }
      if (moduleFilter !== "All") {
        params.entity_type = moduleFilter;
      }
      if (actionFilter !== "All") {
        params.action = actionFilter;
      }

      const res = await getAdminAuditLogs(params);
      const data = res?.data || res;
      const rawLogs = data?.logs || [];
      const pag = data?.pagination || {
        total: rawLogs.length,
        page,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(rawLogs.length / pageSize)),
      };

      setLogs(rawLogs);
      setPagination(pag);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError(err?.message || "Failed to fetch audit records from server");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, moduleFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleModuleChange = (value) => {
    setModuleFilter(value);
    setPage(1);
  };

  const handleActionChange = (value) => {
    setActionFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("All");
    setActionFilter("All");
    setPage(1);
  };

  const hasFilters = search || moduleFilter !== "All" || actionFilter !== "All";

  // Dynamic modules and actions from logs or standard list
  const knownModules = [
    "All",
    "CHALLENGE",
    "APPLICATION",
    "EVALUATION",
    "PILOT",
    "PROCUREMENT",
    "USER",
    "DEPARTMENT",
    "STARTUP",
    "EVALUATOR",
    "DOCUMENT",
    "SYSTEM",
  ];

  const knownActions = [
    "All",
    "CREATE",
    "UPDATE",
    "DELETE",
    "SUBMIT",
    "EVALUATE",
    "APPROVE",
    "REJECT",
    "PUBLISH",
    "START",
    "COMPLETE",
    "LOGIN",
  ];

  // Summary statistics from current page & pagination
  const totalAuditRecords = pagination.total || logs.length;
  const warningCount = logs.filter(
    (l) =>
      l.action?.includes("FAIL") ||
      l.action?.includes("ERROR") ||
      l.action?.includes("REJECT")
  ).length;
  const successCount = Math.max(0, logs.length - warningCount);
  const latestTimestamp = logs[0]?.created_at
    ? new Date(logs[0].created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <PageHeader
        showBack
        backTo="/admin/dashboard"
        backLabel="Back to Admin Dashboard"
        badge="Security, Compliance & Immutability"
        badgeIcon={ShieldCheck}
        title="Authoritative Audit Logs"
        description="Authoritative, server-persisted audit trail recording administrative, government, evaluator, and startup lifecycle mutations across PostgreSQL."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Database className="h-3.5 w-3.5 text-emerald-500" />
              PostgreSQL Persisted Source
            </div>
          </div>
        }
      />

      {/* SUMMARY STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Activity}
          title="Total Persisted Records"
          value={totalAuditRecords}
        />
        <SummaryCard
          icon={CheckCircle2}
          title="Standard Events"
          value={successCount}
          type="success"
        />
        <SummaryCard
          icon={AlertCircle}
          title="Warnings / Exceptions"
          value={warningCount}
          type="warning"
        />
        <SummaryCard
          icon={Clock3}
          title="Latest Event"
          value={latestTimestamp}
          type="purple"
        />
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Server Filters
              </h2>
              <p className="text-xs text-slate-400">
                Filter authoritative audit records by actor, action, or entity module.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* SEARCH */}
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by action, actor, or IP address..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* MODULE */}
            <select
              value={moduleFilter}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              {knownModules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod === "All" ? "All Modules / Entities" : mod}
                </option>
              ))}
            </select>

            {/* ACTION */}
            <select
              value={actionFilter}
              onChange={(e) => handleActionChange(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              {knownActions.map((act) => (
                <option key={act} value={act}>
                  {act === "All" ? "All Actions" : act}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="self-start text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
            >
              Clear active filters
            </button>
          )}
        </div>
      </section>

      {/* TABLE SECTION */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Persisted Audit Records
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Showing {logs.length} records (Total in query: {pagination.total})
            </p>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Standard
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Warning / Exception
            </span>
          </div>
        </div>

        {error && (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 text-center">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
            <button
              type="button"
              onClick={fetchLogs}
              className="mt-2 text-xs font-bold text-red-800 underline dark:text-red-300"
            >
              Retry loading
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Retrieving authoritative audit records from database...
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <Search className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              No audit records found
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              No audit logs matched your current filters. Clear the search or perform operational workflows to generate persisted records.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left dark:border-slate-800 dark:bg-slate-900/40">
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Actor / User
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Module
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Target Entity / Details
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log, index) => {
                    const actorName = log.user?.name || log.user?.email || (log.user_id ? `User #${log.user_id.slice(0, 8)}` : "System Automated");
                    const actorRole = log.user?.role || (log.user_id ? "Authenticated" : "SYSTEM");
                    const isWarning = log.action?.includes("FAIL") || log.action?.includes("ERROR") || log.action?.includes("REJECT");
                    const timeStr = log.created_at ? new Date(log.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A";
                    const descStr = (typeof log.details === "object" && (log.details?.message || log.details?.title || log.details?.name)) || (log.entity_id ? `Target ID: ${log.entity_id}` : "System Operation");

                    return (
                      <tr key={log.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={actorName} />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {actorName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {actorRole}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            {log.entity_type || "GENERAL"}
                          </span>
                        </td>
                        <td className="max-w-xs px-6 py-4">
                          <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                            {descStr}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {timeStr}
                          </p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${isWarning ? "text-amber-600" : "text-emerald-600"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isWarning ? "bg-amber-500" : "bg-emerald-500"}`} />
                            {isWarning ? "Warning" : "Recorded"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
              {logs.map((log) => {
                const actorName = log.user?.name || log.user?.email || "System";
                const timeStr = log.created_at ? new Date(log.created_at).toLocaleString() : "N/A";
                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {log.action}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 dark:border-slate-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{actorName}</span>
                      <span>•</span>
                      <span className="font-semibold">{log.entity_type}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{timeStr}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(newPage) => setPage(newPage)}
          itemName="audit records"
        />
      )}

      {/* DETAIL MODAL */}
      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </motion.div>
  );
}

function SummaryCard({ icon: Icon, title, value, type, description }) {
  const colorMap = {
    success: "emerald",
    warning: "amber",
    purple: "violet",
  };
  const color = colorMap[type] || "blue";

  return (
    <StatCard
      icon={Icon}
      title={title}
      value={value}
      description={description}
      color={color}
    />
  );
}

function Avatar({ name }) {
  const initial =
    name === "System Automated" || name === "System"
      ? "SYS"
      : name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "U";

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
      {initial}
    </div>
  );
}

function AuditDetailsModal({ log, onClose }) {
  const actorName = log.user?.name || log.user?.email || (log.user_id ? `User #${log.user_id}` : "System Automated");
  const actorRole = log.user?.role || (log.user_id ? "Authenticated User" : "SYSTEM");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                Authoritative Persisted Record
              </p>
              <h2 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                Event Details: {log.action}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <DetailRow icon={User} label="Actor" value={`${actorName} (${actorRole})`} />
          <DetailRow icon={FileText} label="Actor Email / ID" value={log.user?.email || log.user_id || "SYSTEM_DAEMON"} />
          <DetailRow icon={Activity} label="Action" value={log.action} />
          <DetailRow icon={FileText} label="Entity Type" value={log.entity_type || "N/A"} />
          <DetailRow icon={Database} label="Entity Target ID" value={log.entity_id || "N/A"} />
          <DetailRow icon={Clock3} label="Recorded Timestamp" value={log.created_at ? new Date(log.created_at).toISOString() : "N/A"} />
          <DetailRow icon={ShieldCheck} label="IP Address" value={log.ip_address || "Internal"} />

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Persisted Audit Payload (Details)
            </p>
            <pre className="text-xs font-mono bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {typeof log.details === "object"
                ? JSON.stringify(log.details, null, 2)
                : String(log.details || "{}")}
            </pre>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700 transition"
        >
          Close Detail View
        </button>
      </motion.div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

export default AdminAudit;