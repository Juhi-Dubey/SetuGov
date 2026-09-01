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
  Flag,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const defaultEvaluations = [
  {
    id: 1,
    challengeTitle: "AI-Based Citizen Grievance Management",
    startupName: "TechNova Solutions",
    domain: "Artificial Intelligence",
    dueDate: "05 Sep 2026",
    status: "Pending",
    priority: "High",
  },
  {
    id: 2,
    challengeTitle: "Smart Waste Collection System",
    startupName: "GreenGrid Technologies",
    domain: "Smart City",
    dueDate: "12 Sep 2026",
    status: "Completed",
    priority: "Medium",
  },
  {
    id: 3,
    challengeTitle: "Digital Healthcare Access Platform",
    startupName: "MediPulse AI",
    domain: "Healthcare",
    dueDate: "15 Sep 2026",
    status: "Pending",
    priority: "High",
  },
  {
    id: 4,
    challengeTitle: "Agricultural Market Intelligence",
    startupName: "AgriConnect Labs",
    domain: "Agriculture",
    dueDate: "20 Sep 2026",
    status: "Completed",
    priority: "Low",
  },
  {
    id: 5,
    challengeTitle: "Digital Public Transport Monitoring",
    startupName: "UrbanTransit Tech",
    domain: "Transportation",
    dueDate: "28 Aug 2026",
    status: "Overdue",
    priority: "High",
  },
];

function EvaluatorAssignments({ evaluations: propEvaluations }) {
  const navigate = useNavigate();

  const [evaluations, setEvaluations] = useState(() => {
    if (propEvaluations && propEvaluations.length > 0) {
      return propEvaluations;
    }
    try {
      const saved = localStorage.getItem("setugov_evaluator_assignments");
      return saved ? JSON.parse(saved) : defaultEvaluations;
    } catch {
      return defaultEvaluations;
    }
  });

  useEffect(() => {
    localStorage.setItem("setugov_evaluator_assignments", JSON.stringify(evaluations));
  }, [evaluations]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        String(evaluation.challengeTitle || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(evaluation.startupName || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(evaluation.domain || "")
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        status === "All" ||
        String(evaluation.status || "").toLowerCase() ===
          status.toLowerCase();

      const matchesPriority =
        priority === "All" ||
        String(evaluation.priority || "").toLowerCase() ===
          priority.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [evaluations, search, status, priority]);

  const handleOpenEvaluation = (evaluation) => {
    if (!evaluation?.id) return;

    navigate(
      `/evaluator/evaluations/${evaluation.id}`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() =>
            navigate("/evaluator/dashboard")
          }
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Evaluator Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ClipboardCheck className="h-5 w-5" />
              </div>

              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Evaluator Workspace
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Evaluation Assignments
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Review your assigned startup proposals,
              manage evaluation deadlines and complete
              independent assessments.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Assignments
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {evaluations.length}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* FILTER BAR                                        */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search challenge, startup or domain..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            />
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
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

          {/* Priority */}
          <div className="relative">
            <Flag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value)
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="All">
                All Priority
              </option>
              <option value="High">
                High
              </option>
              <option value="Medium">
                Medium
              </option>
              <option value="Low">
                Low
              </option>
            </select>
          </div>
        </div>

        {/* Filter summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">
            Showing{" "}
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {filteredEvaluations.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {evaluations.length}
            </span>{" "}
            assignments
          </p>

          {(search ||
            status !== "All" ||
            priority !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("All");
                setPriority("All");
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* ASSIGNMENT LIST                                   */}
      {/* ================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Assigned Evaluations
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Each evaluation contains the startup proposal
            and assessment criteria assigned to you.
          </p>
        </div>

        {filteredEvaluations.length === 0 ? (
          <EmptyState
            hasFilters={
              Boolean(search) ||
              status !== "All" ||
              priority !== "All"
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEvaluations.map(
              (evaluation, index) => (
                <AssignmentCard
                  key={
                    evaluation.id ?? index
                  }
                  evaluation={evaluation}
                  index={index}
                  onOpen={() =>
                    handleOpenEvaluation(
                      evaluation
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
}

/* ===================================================== */
/* ASSIGNMENT CARD                                      */
/* ===================================================== */

function AssignmentCard({
  evaluation,
  index,
  onOpen,
}) {
  const normalizedStatus =
    String(
      evaluation.status || ""
    ).toLowerCase();

  const isCompleted =
    normalizedStatus === "completed";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
      }}
      className="group p-5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40 sm:p-6"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        {/* Main information */}
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="max-w-xl truncate text-sm font-bold text-slate-900 dark:text-white">
                {evaluation.challengeTitle ||
                  "Untitled Challenge"}
              </h3>

              <StatusBadge
                status={evaluation.status}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
              <MetaItem
                icon={Building2}
                value={
                  evaluation.startupName ||
                  "Startup information unavailable"
                }
              />

              <MetaItem
                icon={CalendarDays}
                value={formatDate(
                  evaluation.dueDate
                )}
              />

              {evaluation.domain && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  {evaluation.domain}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {evaluation.priority && (
            <PriorityBadge
              priority={
                evaluation.priority
              }
            />
          )}

          <button
            type="button"
            onClick={onOpen}
            disabled={!evaluation.id}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCompleted
              ? "View Evaluation"
              : "Evaluate"}

            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Additional details */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <DetailBox
          label="Assignment"
          value={
            evaluation.assignmentType ||
            "Evaluation"
          }
          icon={ClipboardCheck}
        />

        <DetailBox
          label="Due Date"
          value={formatDate(
            evaluation.dueDate
          )}
          icon={CalendarDays}
        />

        <DetailBox
          label="Status"
          value={
            evaluation.status ||
            "Pending"
          }
          icon={
            isCompleted
              ? CheckCircle2
              : Clock3
          }
        />
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* META ITEM                                            */
/* ===================================================== */

function MetaItem({
  icon: Icon,
  value,
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Icon className="h-3.5 w-3.5 shrink-0" />

      <span className="max-w-xs truncate">
        {value}
      </span>
    </div>
  );
}

/* ===================================================== */
/* DETAIL BOX                                           */
/* ===================================================== */

function DetailBox({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>

      <p className="mt-1.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                         */
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
/* PRIORITY BADGE                                       */
/* ===================================================== */

function PriorityBadge({
  priority,
}) {
  const normalized =
    String(priority || "").toLowerCase();

  if (normalized === "high") {
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <Flag className="h-3 w-3" />
        High Priority
      </span>
    );
  }

  if (normalized === "medium") {
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <Flag className="h-3 w-3" />
        Medium Priority
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
      <Flag className="h-3 w-3" />
      Low Priority
    </span>
  );
}

/* ===================================================== */
/* EMPTY STATE                                          */
/* ===================================================== */

function EmptyState({
  hasFilters,
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
        {hasFilters ? (
          <Search className="h-6 w-6" />
        ) : (
          <ClipboardCheck className="h-6 w-6" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
        {hasFilters
          ? "No matching evaluations"
          : "No assignments yet"}
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasFilters
          ? "Try changing your search or filters to find the evaluation you are looking for."
          : "Assigned startup evaluations will appear here when they are provided by the backend."}
      </p>
    </div>
  );
}

/* ===================================================== */
/* DATE FORMATTER                                        */
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

export default EvaluatorAssignments;