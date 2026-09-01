import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  Eye,
  Filter,
  Building2,
  CalendarDays,
  FileCheck2,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

const applicationsData = [
  {
    id: "APP-001",
    startup: "GreenTech Solutions",
    founder: "Ananya Sharma",
    submittedDate: "18 Sep 2026",
    eligibility: "Eligible",
    evaluation: "Pending",
    score: null,
    status: "Under Review",
  },
  {
    id: "APP-002",
    startup: "Urban AI Labs",
    founder: "Rahul Mehta",
    submittedDate: "17 Sep 2026",
    eligibility: "Eligible",
    evaluation: "Completed",
    score: 87,
    status: "Evaluated",
  },
  {
    id: "APP-003",
    startup: "CleanRoute Technologies",
    founder: "Vikram Singh",
    submittedDate: "16 Sep 2026",
    eligibility: "Pending",
    evaluation: "Not Started",
    score: null,
    status: "Eligibility Pending",
  },
  {
    id: "APP-004",
    startup: "EcoVision AI",
    founder: "Priya Nair",
    submittedDate: "15 Sep 2026",
    eligibility: "Eligible",
    evaluation: "Completed",
    score: 81,
    status: "Evaluated",
  },
  {
    id: "APP-005",
    startup: "CivicFlow",
    founder: "Arjun Kapoor",
    submittedDate: "14 Sep 2026",
    eligibility: "Rejected",
    evaluation: "Not Started",
    score: null,
    status: "Not Eligible",
  },
  {
    id: "APP-006",
    startup: "WasteLess Technologies",
    founder: "Neha Verma",
    submittedDate: "13 Sep 2026",
    eligibility: "Eligible",
    evaluation: "Pending",
    score: null,
    status: "Under Review",
  },
  {
    id: "APP-007",
    startup: "SmartCity Vision",
    founder: "Karan Malhotra",
    submittedDate: "12 Sep 2026",
    eligibility: "Eligible",
    evaluation: "Completed",
    score: 91,
    status: "Evaluated",
  },
  {
    id: "APP-008",
    startup: "GreenGrid Innovations",
    founder: "Sneha Das",
    submittedDate: "11 Sep 2026",
    eligibility: "Pending",
    evaluation: "Not Started",
    score: null,
    status: "Eligibility Pending",
  },
];

const statusOptions = [
  "All",
  "Under Review",
  "Evaluated",
  "Eligibility Pending",
  "Not Eligible",
];

function ChallengeApplications() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredApplications = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return applicationsData.filter((application) => {
      const matchesSearch =
        !search ||
        application.startup
          .toLowerCase()
          .includes(search) ||
        application.founder
          .toLowerCase()
          .includes(search) ||
        application.id
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const eligibleCount = applicationsData.filter(
    (item) => item.eligibility === "Eligible"
  ).length;

  const evaluatedCount = applicationsData.filter(
    (item) => item.evaluation === "Completed"
  ).length;

  const pendingCount = applicationsData.filter(
    (item) =>
      item.eligibility === "Pending" ||
      item.evaluation === "Pending"
  ).length;

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/overview`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Challenge Overview
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-3.5 w-3.5" />
                Applications
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Challenge Applications
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review startup applications submitted for this
                government challenge.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/government/challenges/${id}/eligibility`
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Eligibility Review
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* KPI CARDS */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            icon={Users}
            label="Total Applications"
            value={applicationsData.length}
            description="Submitted applications"
          />

          <StatCard
            icon={CheckCircle2}
            label="Eligible"
            value={eligibleCount}
            description="Passed eligibility"
          />

          <StatCard
            icon={FileCheck2}
            label="Evaluated"
            value={evaluatedCount}
            description="Evaluation completed"
          />

          <StatCard
            icon={Clock3}
            label="Pending"
            value={pendingCount}
            description="Needs action"
          />

        </div>

        {/* FILTER BAR */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search startup, founder or application ID..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600 dark:focus:ring-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none dark:border-slate-800 dark:bg-slate-950"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </section>

        {/* APPLICATION TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-semibold">
                Submitted Applications
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {filteredApplications.length} application
                {filteredApplications.length !== 1 ? "s" : ""} shown
              </p>
            </div>

            <div className="text-xs text-slate-400">
              Challenge #{id}
            </div>
          </div>

          {filteredApplications.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Startup
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Application
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Submitted
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Eligibility
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Evaluation
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredApplications.map(
                    (application, index) => (
                      <motion.tr
                        key={application.id}
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.03,
                        }}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                      >

                        {/* STARTUP */}

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                              <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                            </div>

                            <div>
                              <p className="text-sm font-semibold">
                                {application.startup}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {application.founder}
                              </p>
                            </div>

                          </div>
                        </td>

                        {/* APPLICATION ID */}

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {application.id}
                          </span>
                        </td>

                        {/* DATE */}

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {application.submittedDate}
                          </div>
                        </td>

                        {/* ELIGIBILITY */}

                        <td className="px-6 py-5">
                          <EligibilityBadge
                            status={
                              application.eligibility
                            }
                          />
                        </td>

                        {/* EVALUATION */}

                        <td className="px-6 py-5">
                          <EvaluationBadge
                            status={
                              application.evaluation
                            }
                            score={
                              application.score
                            }
                          />
                        </td>

                        {/* STATUS */}

                        <td className="px-6 py-5">
                          <StatusBadge
                            status={
                              application.status
                            }
                          />
                        </td>

                        {/* ACTION */}

                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/government/challenges/${id}/applications/${application.id}`
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>

                      </motion.tr>
                    )
                  )}
                </tbody>
              </table>

            </div>
          ) : (
            <EmptyState
              searchTerm={searchTerm}
              statusFilter={statusFilter}
            />
          )}

        </section>

        {/* NEXT WORKFLOW */}

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">

          <div>
            <p className="text-sm font-semibold">
              Ready for eligibility review?
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Verify startup eligibility before starting
              technical evaluation.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/eligibility`
              )
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            Continue to Eligibility
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
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
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">

        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>

      </div>
    </motion.div>
  );
}

// =========================================================
// ELIGIBILITY BADGE
// =========================================================

function EligibilityBadge({ status }) {
  if (status === "Eligible") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Eligible
      </span>
    );
  }

  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <Clock3 className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

// =========================================================
// EVALUATION BADGE
// =========================================================

function EvaluationBadge({
  status,
  score,
}) {
  if (status === "Completed") {
    return (
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Completed
        </span>

        {score !== null && (
          <p className="mt-1 text-xs text-slate-400">
            Score:{" "}
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {score}/100
            </span>
          </p>
        )}
      </div>
    );
  }

  if (status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <Clock3 className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-slate-400">
      Not Started
    </span>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({ status }) {
  const styles = {
    "Under Review":
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Evaluated:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    "Eligibility Pending":
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    "Not Eligible":
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({
  searchTerm,
  statusFilter,
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Users className="h-6 w-6 text-slate-400" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        No applications found
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
        {searchTerm || statusFilter !== "All"
          ? "Try changing your search or filter."
          : "No startup applications have been submitted yet."}
      </p>

    </div>
  );
}

export default ChallengeApplications;