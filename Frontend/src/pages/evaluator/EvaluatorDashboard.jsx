import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function EvaluatorDashboard({ evaluations = [] }) {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  /*
   * Backend-ready data structure.
   *
   * evaluations will later come from:
   * evaluationService.js
   *
   * Example backend object:
   *
   * {
   *   id: "evaluation-id",
   *   challengeTitle: "...",
   *   startupName: "...",
   *   domain: "...",
   *   dueDate: "...",
   *   status: "Pending",
   *   priority: "High"
   * }
   *
   * No business data is hardcoded here.
   */

  const stats = useMemo(() => {
    const assigned = evaluations.length;

    const completed = evaluations.filter(
      (item) =>
        String(item.status || "").toLowerCase() ===
        "completed"
    ).length;

    const pending = evaluations.filter(
      (item) =>
        String(item.status || "").toLowerCase() ===
        "pending"
    ).length;

    const overdue = evaluations.filter(
      (item) =>
        String(item.status || "").toLowerCase() ===
        "overdue"
    ).length;

    return {
      assigned,
      completed,
      pending,
      overdue,
    };
  }, [evaluations]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        !searchText ||
        String(item.challengeTitle || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.startupName || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.domain || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        String(item.status || "").toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [evaluations, search, statusFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* PAGE HEADER                                        */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ClipboardCheck className="h-5 w-5" />
            </span>

            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Evaluator Workspace
            </p>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Good morning
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review assigned startup proposals and submit
            independent evaluations.
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* KPI CARDS                                          */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Evaluations"
          value={stats.assigned}
          description="Total evaluations assigned"
          icon={ClipboardCheck}
          iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          delay={0}
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          description="Evaluations submitted"
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          delay={0.05}
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          description="Awaiting your assessment"
          icon={Clock3}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          delay={0.1}
        />

        <StatCard
          title="Overdue"
          value={stats.overdue}
          description="Past evaluation deadline"
          icon={AlertCircle}
          iconClass="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          delay={0.15}
        />
      </div>

      {/* ================================================= */}
      {/* OVERVIEW / QUICK ACTION                           */}
      {/* ================================================= */}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Evaluation Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Track your assigned evaluation workload.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
              <TrendingUp className="h-4 w-4 text-indigo-500" />

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Independent Assessment
              </span>
            </div>
          </div>

          <div className="mt-6">
            <EvaluationProgress
              completed={stats.completed}
              assigned={stats.assigned}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ClipboardCheck className="h-5 w-5" />
          </div>

          <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            Evaluation Workspace
          </h2>

          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Review proposals, assess technical feasibility,
            innovation, impact, scalability and cost
            effectiveness.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/evaluator/assignments")
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            View Assignments
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      {/* ================================================= */}
      {/* ASSIGNED EVALUATIONS                              */}
      {/* ================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Assigned Evaluations
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Evaluations currently assigned to you.
              </p>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search evaluations..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 sm:w-64"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:w-36"
                >
                  <option value="All">
                    All Status
                  </option>
                  <option value="Pending">
                    Pending
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Overdue">
                    Overdue
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredEvaluations.length === 0 ? (
          <EmptyEvaluations />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left dark:border-slate-800 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Challenge
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Startup
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Domain
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Due Date
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEvaluations.map(
                    (evaluation, index) => (
                      <EvaluationRow
                        key={
                          evaluation.id ??
                          index
                        }
                        evaluation={
                          evaluation
                        }
                        onOpen={() =>
                          navigate(
                            `/evaluator/evaluations/${evaluation.id}`
                          )
                        }
                      />
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile/tablet cards */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
              {filteredEvaluations.map(
                (evaluation, index) => (
                  <EvaluationMobileCard
                    key={
                      evaluation.id ??
                      index
                    }
                    evaluation={
                      evaluation
                    }
                    onOpen={() =>
                      navigate(
                        `/evaluator/evaluations/${evaluation.id}`
                      )
                    }
                  />
                )
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() =>
              navigate("/evaluator/assignments")
            }
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400"
          >
            View all assignments
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
    </motion.div>
  );
}

/* ===================================================== */
/* STAT CARD                                             */
/* ===================================================== */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  delay,
}) {
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
        duration: 0.3,
        delay,
      }}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-[10px] font-semibold text-slate-400">
          Evaluator
        </span>
      </div>

      <div className="mt-5">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* EVALUATION PROGRESS                                   */
/* ===================================================== */

function EvaluationProgress({
  completed,
  assigned,
}) {
  const percentage =
    assigned > 0
      ? Math.round(
          (completed / assigned) * 100
        )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Completion Progress
        </span>

        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {percentage}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        <motion.div
          initial={{
            width: 0,
          }}
          animate={{
            width: `${percentage}%`,
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="h-full rounded-full bg-indigo-600"
        />
      </div>

      <p className="mt-2 text-[10px] text-slate-400">
        {completed} of {assigned} evaluations completed
      </p>
    </div>
  );
}

/* ===================================================== */
/* DESKTOP ROW                                           */
/* ===================================================== */

function EvaluationRow({
  evaluation,
  onOpen,
}) {
  return (
    <motion.tr
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
    >
      <td className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="max-w-xs truncate text-xs font-bold text-slate-800 dark:text-slate-200">
              {evaluation.challengeTitle ||
                "Untitled Challenge"}
            </p>

            {evaluation.priority && (
              <p className="mt-1 text-[10px] text-slate-400">
                Priority:{" "}
                {evaluation.priority}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />

          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {evaluation.startupName ||
              "—"}
          </span>
        </div>
      </td>

      <td className="px-6 py-5">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          {evaluation.domain ||
            "—"}
        </span>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />

          {formatDate(
            evaluation.dueDate
          )}
        </div>
      </td>

      <td className="px-6 py-5">
        <StatusBadge
          status={evaluation.status}
        />
      </td>

      <td className="px-6 py-5 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 transition-all hover:bg-indigo-600 hover:text-white dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-indigo-600 dark:hover:text-white"
        >
          {String(
            evaluation.status || ""
          ).toLowerCase() ===
          "completed"
            ? "View"
            : "Evaluate"}

          <ArrowRight className="h-3 w-3" />
        </button>
      </td>
    </motion.tr>
  );
}

/* ===================================================== */
/* MOBILE CARD                                           */
/* ===================================================== */

function EvaluationMobileCard({
  evaluation,
  onOpen,
}) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
              {evaluation.challengeTitle ||
                "Untitled Challenge"}
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              {evaluation.startupName ||
                "—"}
            </p>
          </div>
        </div>

        <StatusBadge
          status={evaluation.status}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoItem
          icon={Building2}
          label="Domain"
          value={
            evaluation.domain ||
            "—"
          }
        />

        <InfoItem
          icon={CalendarDays}
          label="Due Date"
          value={formatDate(
            evaluation.dueDate
          )}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
      >
        {String(
          evaluation.status || ""
        ).toLowerCase() ===
        "completed"
          ? "View Evaluation"
          : "Start Evaluation"}

        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ===================================================== */
/* INFO ITEM                                             */
/* ===================================================== */

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>

      <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                          */
/* ===================================================== */

function StatusBadge({
  status,
}) {
  const normalized =
    String(status || "").toLowerCase();

  if (normalized === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  }

  if (normalized === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <Clock3 className="h-3 w-3" />
      Pending
    </span>
  );
}

/* ===================================================== */
/* EMPTY STATE                                           */
/* ===================================================== */

function EmptyEvaluations() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
        <ClipboardCheck className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
        No evaluations found
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Assigned evaluations will appear here when
        they are provided by the backend.
      </p>
    </div>
  );
}

/* ===================================================== */
/* DATE FORMATTER                                         */
/* ===================================================== */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default EvaluatorDashboard;