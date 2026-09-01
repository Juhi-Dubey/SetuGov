import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialAuditLogs = [
  {
    id: 1,
    user: "Admin User",
    email: "admin@govplatform.gov",
    action: "Created",
    module: "Challenge",
    description:
      "Created a new government challenge for digital public services.",
    timestamp: "31 Aug 2026, 10:42 AM",
    status: "Success",
    ip: "192.168.1.10",
  },
  {
    id: 2,
    user: "Priya Sharma",
    email: "priya.evaluator@govplatform.gov",
    action: "Evaluated",
    module: "Evaluation",
    description:
      "Submitted evaluation score for startup application.",
    timestamp: "31 Aug 2026, 10:18 AM",
    status: "Success",
    ip: "192.168.1.24",
  },
  {
    id: 3,
    user: "Rahul Mehta",
    email: "rahul.startup@techlabs.com",
    action: "Submitted",
    module: "Application",
    description:
      "Submitted an application for an active government challenge.",
    timestamp: "31 Aug 2026, 09:54 AM",
    status: "Success",
    ip: "192.168.1.31",
  },
  {
    id: 4,
    user: "Admin User",
    email: "admin@govplatform.gov",
    action: "Updated",
    module: "Criteria",
    description:
      "Updated the weightage of Technical Feasibility criteria.",
    timestamp: "31 Aug 2026, 09:22 AM",
    status: "Success",
    ip: "192.168.1.10",
  },
  {
    id: 5,
    user: "Anita Verma",
    email: "anita.evaluator@govplatform.gov",
    action: "Viewed",
    module: "Evaluation",
    description:
      "Viewed startup evaluation details.",
    timestamp: "31 Aug 2026, 08:47 AM",
    status: "Success",
    ip: "192.168.1.42",
  },
  {
    id: 6,
    user: "System",
    email: "system@govplatform.gov",
    action: "Failed",
    module: "Authentication",
    description:
      "Failed login attempt detected.",
    timestamp: "31 Aug 2026, 08:31 AM",
    status: "Warning",
    ip: "103.82.14.20",
  },
  {
    id: 7,
    user: "Admin User",
    email: "admin@govplatform.gov",
    action: "Published",
    module: "Template",
    description:
      "Published the Startup Evaluation Template.",
    timestamp: "30 Aug 2026, 06:15 PM",
    status: "Success",
    ip: "192.168.1.10",
  },
  {
    id: 8,
    user: "Sanjay Kumar",
    email: "sanjay.startup@innovate.io",
    action: "Uploaded",
    module: "Documents",
    description:
      "Uploaded supporting documents for a pilot proposal.",
    timestamp: "30 Aug 2026, 05:48 PM",
    status: "Success",
    ip: "192.168.1.55",
  },
  {
    id: 9,
    user: "Admin User",
    email: "admin@govplatform.gov",
    action: "Disabled",
    module: "User",
    description:
      "Disabled an inactive evaluator account.",
    timestamp: "30 Aug 2026, 04:32 PM",
    status: "Success",
    ip: "192.168.1.10",
  },
  {
    id: 10,
    user: "Priya Sharma",
    email: "priya.evaluator@govplatform.gov",
    action: "Completed",
    module: "Evaluation",
    description:
      "Completed assigned evaluation for Challenge #CH-1024.",
    timestamp: "30 Aug 2026, 03:18 PM",
    status: "Success",
    ip: "192.168.1.24",
  },
  {
    id: 11,
    user: "Admin User",
    email: "admin@govplatform.gov",
    action: "Deleted",
    module: "Template",
    description:
      "Deleted an unused decision template.",
    timestamp: "30 Aug 2026, 02:51 PM",
    status: "Success",
    ip: "192.168.1.10",
  },
  {
    id: 12,
    user: "System",
    email: "system@govplatform.gov",
    action: "Failed",
    module: "API",
    description:
      "External API request returned an error response.",
    timestamp: "30 Aug 2026, 01:26 PM",
    status: "Warning",
    ip: "10.0.0.8",
  },
];

function AdminAudit() {
  const navigate = useNavigate();

  const [logs] = useState(initialAuditLogs);

  const [search, setSearch] =
    useState("");

  const [moduleFilter, setModuleFilter] =
    useState("All");

  const [actionFilter, setActionFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedLog, setSelectedLog] =
    useState(null);

  const [page, setPage] =
    useState(1);

  const logsPerPage = 6;

  const modules = [
    "All",
    ...new Set(
      logs.map((log) => log.module)
    ),
  ];

  const actions = [
    "All",
    ...new Set(
      logs.map((log) => log.action)
    ),
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        log.user
          .toLowerCase()
          .includes(searchText) ||
        log.email
          .toLowerCase()
          .includes(searchText) ||
        log.action
          .toLowerCase()
          .includes(searchText) ||
        log.module
          .toLowerCase()
          .includes(searchText) ||
        log.description
          .toLowerCase()
          .includes(searchText);

      const matchesModule =
        moduleFilter === "All" ||
        log.module === moduleFilter;

      const matchesAction =
        actionFilter === "All" ||
        log.action === actionFilter;

      const matchesStatus =
        statusFilter === "All" ||
        log.status === statusFilter;

      return (
        matchesSearch &&
        matchesModule &&
        matchesAction &&
        matchesStatus
      );
    });
  }, [
    logs,
    search,
    moduleFilter,
    actionFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredLogs.length / logsPerPage
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const startIndex =
    (safePage - 1) * logsPerPage;

  const visibleLogs =
    filteredLogs.slice(
      startIndex,
      startIndex + logsPerPage
    );

  const successfulActions =
    logs.filter(
      (log) => log.status === "Success"
    ).length;

  const warnings =
    logs.filter(
      (log) => log.status === "Warning"
    ).length;

  const todayActivities = logs.length;

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleModuleFilter = (value) => {
    setModuleFilter(value);
    setPage(1);
  };

  const handleActionFilter = (value) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("All");
    setActionFilter("All");
    setStatusFilter("All");
    setPage(1);
  };

  const hasFilters =
    search ||
    moduleFilter !== "All" ||
    actionFilter !== "All" ||
    statusFilter !== "All";

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
      {/* HEADER */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() =>
            navigate("/admin")
          }
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Security & Compliance
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Audit Logs
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Monitor important platform activities,
                user actions and system events for
                accountability and compliance.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Audit Monitoring Active
          </div>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Activity}
          title="Total Activities"
          value={todayActivities}
        />

        <SummaryCard
          icon={CheckCircle2}
          title="Successful"
          value={successfulActions}
          type="success"
        />

        <SummaryCard
          icon={AlertCircle}
          title="Warnings"
          value={warnings}
          type="warning"
        />

        <SummaryCard
          icon={Clock3}
          title="Latest Activity"
          value="10:42 AM"
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
                Activity Filters
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Search and filter platform activity.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {/* SEARCH */}

            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  handleSearch(
                    event.target.value
                  )
                }
                placeholder="Search user, action, module..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* MODULE */}

            <select
              value={moduleFilter}
              onChange={(event) =>
                handleModuleFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {modules.map((module) => (
                <option
                  key={module}
                  value={module}
                >
                  {module === "All"
                    ? "All Modules"
                    : module}
                </option>
              ))}
            </select>

            {/* ACTION */}

            <select
              value={actionFilter}
              onChange={(event) =>
                handleActionFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {actions.map((action) => (
                <option
                  key={action}
                  value={action}
                >
                  {action === "All"
                    ? "All Actions"
                    : action}
                </option>
              ))}
            </select>

            {/* STATUS */}

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="All">
                All Status
              </option>

              <option value="Success">
                Success
              </option>

              <option value="Warning">
                Warning
              </option>
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="self-start text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
            >
              Clear all filters
            </button>
          )}
        </div>
      </section>

      {/* LOG TABLE */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Audit Activity
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Showing {filteredLogs.length} matching
              activities.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Success

            <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" />
            Warning
          </div>
        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left dark:border-slate-800 dark:bg-slate-900/40">
                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  User
                </th>

                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Action
                </th>

                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Module
                </th>

                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Description
                </th>

                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Time
                </th>

                <th className="px-6 py-4 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  View
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleLogs.map(
                (log, index) => (
                  <AuditTableRow
                    key={log.id}
                    log={log}
                    index={index}
                    onView={() =>
                      setSelectedLog(log)
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE / TABLET CARDS */}

        <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
          {visibleLogs.map(
            (log, index) => (
              <AuditMobileCard
                key={log.id}
                log={log}
                index={index}
                onView={() =>
                  setSelectedLog(log)
                }
              />
            )
          )}
        </div>

        {visibleLogs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />

            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              No activity found
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Try changing your search or filters.
            </p>
          </div>
        )}

        {/* PAGINATION */}

        {filteredLogs.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-400">
              Page {safePage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-indigo-600 px-3 text-[10px] font-bold text-white">
                {safePage}
              </div>

              <button
                type="button"
                disabled={
                  safePage === totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                  )
                }
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}

      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() =>
            setSelectedLog(null)
          }
        />
      )}
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
  type,
}) {
  let iconClass =
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";

  if (type === "success") {
    iconClass =
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (type === "warning") {
    iconClass =
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  }

  if (type === "purple") {
    iconClass =
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400";
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>
    </div>
  );
}

/* ===================================================== */
/* TABLE ROW                                             */
/* ===================================================== */

function AuditTableRow({
  log,
  index,
  onView,
}) {
  return (
    <motion.tr
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        delay: index * 0.03,
      }}
      className="group hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            name={log.user}
          />

          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {log.user}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {log.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <ActionBadge
          action={log.action}
        />
      </td>

      <td className="px-6 py-4">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {log.module}
        </span>
      </td>

      <td className="max-w-xs px-6 py-4">
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {log.description}
        </p>
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
          {log.timestamp}
        </p>

        <StatusDot
          status={log.status}
        />
      </td>

      <td className="px-6 py-4 text-right">
        <button
          type="button"
          onClick={onView}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </motion.tr>
  );
}

/* ===================================================== */
/* MOBILE CARD                                           */
/* ===================================================== */

function AuditMobileCard({
  log,
  index,
  onView,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 5,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.03,
      }}
      className="p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            name={log.user}
          />

          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {log.user}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {log.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onView}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-800"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ActionBadge
          action={log.action}
        />

        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {log.module}
        </span>

        <StatusDot
          status={log.status}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {log.description}
      </p>

      <p className="mt-3 text-[9px] font-semibold text-slate-400">
        {log.timestamp}
      </p>
    </motion.div>
  );
}

/* ===================================================== */
/* AVATAR                                                */
/* ===================================================== */

function Avatar({
  name,
}) {
  const initial =
    name === "System"
      ? "S"
      : name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2);

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
      {initial}
    </div>
  );
}

/* ===================================================== */
/* ACTION BADGE                                          */
/* ===================================================== */

function ActionBadge({
  action,
}) {
  const styles = {
    Created:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Updated:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    Evaluated:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    Viewed:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    Failed:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    Published:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Uploaded:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
    Disabled:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    Completed:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Deleted:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <span
      className={`rounded-lg px-2.5 py-1.5 text-[9px] font-bold ${
        styles[action] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {action}
    </span>
  );
}

/* ===================================================== */
/* STATUS DOT                                            */
/* ===================================================== */

function StatusDot({
  status,
}) {
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-[9px] font-bold ${
        status === "Success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Success"
            ? "bg-emerald-500"
            : "bg-amber-500"
        }`}
      />

      {status}
    </span>
  );
}

/* ===================================================== */
/* DETAILS MODAL                                         */
/* ===================================================== */

function AuditDetailsModal({
  log,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                Audit Event
              </p>

              <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                Activity Details
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
          <DetailRow
            icon={User}
            label="User"
            value={log.user}
          />

          <DetailRow
            icon={FileText}
            label="Email"
            value={log.email}
          />

          <DetailRow
            icon={Activity}
            label="Action"
            value={log.action}
          />

          <DetailRow
            icon={FileText}
            label="Module"
            value={log.module}
          />

          <DetailRow
            icon={Clock3}
            label="Timestamp"
            value={log.timestamp}
          />

          <DetailRow
            icon={ShieldCheck}
            label="Status"
            value={log.status}
          />

          <DetailRow
            icon={Activity}
            label="IP Address"
            value={log.ip}
          />

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Description
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {log.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-bold text-white hover:bg-indigo-700"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* DETAIL ROW                                            */
/* ===================================================== */

function DetailRow({
  icon: Icon,
  label,
  value,
}) {
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