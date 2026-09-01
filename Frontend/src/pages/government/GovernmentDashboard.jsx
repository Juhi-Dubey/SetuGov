
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  ClipboardCheck,
  FlaskConical,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  Inbox,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import PageHeader from "../../components/layout/PageHeader";
import { governmentDashboardData } from "../../data/mockData";
import { getGovernmentDashboard } from "../../services/challengeService";

const kpiIcons = {
  challenges: FileText,
  applications: ClipboardCheck,
  pilots: FlaskConical,
  "at-risk": AlertTriangle,
};

function GovernmentDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setState("loading");
      setError("");

      /*
        Backend integration:

        When the backend is ready, this will return
        the actual dashboard data.

        For now, we use the mock data only as a
        development fallback.
      */

      try {
        const response = await getGovernmentDashboard();

        setData(response);
        setState("success");
      } catch {
        /*
          Temporary development fallback.

          Remove this fallback when backend integration
          is available.
        */

        setData(governmentDashboardData);
        setState("success");
      }
    } catch (err) {
      setError(
        err?.message || "Unable to load dashboard data."
      );
      setState("error");
    }
  };

  const handleCreateChallenge = () => {
    navigate("/government/challenges/new");
  };

  return (
    <AppLayout role="government">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title="Good morning"
          description="Here's an overview of your innovation procurement activity."
          action="Create Challenge"
          actionIcon={Plus}
          onAction={handleCreateChallenge}
        />

        {/* Loading */}
        {state === "loading" && <DashboardSkeleton />}

        {/* Error */}
        {state === "error" && (
          <ErrorState
            message={error}
            onRetry={loadDashboard}
          />
        )}

        {/* Success */}
        {state === "success" && data && (
          <>
            {/* KPI Cards */}
            <section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {data.kpis?.map((kpi, index) => (
                  <KPICard
                    key={kpi.id}
                    data={kpi}
                    index={index}
                  />
                ))}
              </div>
            </section>

            {/* Main Grid */}
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              {/* Challenges */}
              <ChallengeTable
                challenges={data.challenges || []}
                onCreateChallenge={handleCreateChallenge}
              />

              {/* Pilot Health */}
              <PilotHealth data={data.pilotHealth} />
            </div>

            {/* Primary CTA */}
            <CreateChallengeCTA
              onClick={handleCreateChallenge}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------ */
/* KPI CARD */
/* ------------------------------------------------ */

function KPICard({ data, index }) {
  const Icon = kpiIcons[data.id] || FileText;

  const trendIsPositive =
    data.trend === "up" || data.trend === "positive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
      }}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-5 w-5" />
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-500" />
      </div>

      <div className="mt-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data.label}
        </p>

        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold tracking-tight">
            {data.value}
          </p>

          {data.change !== undefined && data.change !== 0 && (
            <span
              className={`mb-1 text-xs font-semibold ${
                trendIsPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trendIsPositive ? "+" : ""}
              {data.change}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------ */
/* CHALLENGE TABLE */
/* ------------------------------------------------ */

function ChallengeTable({
  challenges,
  onCreateChallenge,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <div>
          <h2 className="font-semibold">
            Challenges
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Track your active procurement challenges.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateChallenge}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      {challenges.length === 0 ? (
        <EmptyChallenges
          onCreateChallenge={onCreateChallenge}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                <TableHeading>Challenge</TableHeading>
                <TableHeading>Department</TableHeading>
                <TableHeading>Applications</TableHeading>
                <TableHeading>Stage</TableHeading>
                <TableHeading>Status</TableHeading>
                <TableHeading>Action</TableHeading>
              </tr>
            </thead>

            <tbody>
              {challenges.map((challenge) => (
                <ChallengeRow
                  key={challenge.id}
                  challenge={challenge}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

function TableHeading({ children }) {
  return (
    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </th>
  );
}

function ChallengeRow({ challenge }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-semibold">
            {challenge.title}
          </p>

          {challenge.description && (
            <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
              {challenge.description}
            </p>
          )}
        </div>
      </td>

      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
        {challenge.department}
      </td>

      <td className="px-5 py-4 text-sm font-medium">
        {challenge.applications}
      </td>

      <td className="px-5 py-4">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {challenge.stage}
        </span>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={challenge.status} />
      </td>

      <td className="px-5 py-4">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  if (!status) {
    return null;
  }

  const normalized = status.toLowerCase();

  let classes =
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  if (
    normalized.includes("active") ||
    normalized.includes("published") ||
    normalized.includes("on track")
  ) {
    classes =
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review")
  ) {
    classes =
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }

  if (
    normalized.includes("risk") ||
    normalized.includes("critical")
  ) {
    classes =
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------ */
/* PILOT HEALTH */
/* ------------------------------------------------ */

function PilotHealth({ data }) {
  const healthItems = [
    {
      label: "On Track",
      value: data?.onTrack ?? 0,
      indicator: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "At Risk",
      value: data?.atRisk ?? 0,
      indicator: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Critical",
      value: data?.critical ?? 0,
      indicator: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
    },
  ];

  const total = healthItems.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.28 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h2 className="font-semibold">
          Pilot Health
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Current status of active pilots.
        </p>
      </div>

      <div className="mt-7 space-y-5">
        {healthItems.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${item.indicator}`}
                />

                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {item.label}
                </span>
              </div>

              <span
                className={`text-sm font-bold ${item.text}`}
              >
                {item.value}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width:
                    total > 0
                      ? `${(item.value / total) * 100}%`
                      : "0%",
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.3,
                }}
                className={`h-full rounded-full ${item.indicator}`}
              />
            </div>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div className="mt-7 rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
          <p className="text-xs text-slate-400">
            No active pilot data available.
          </p>
        </div>
      )}
    </motion.section>
  );
}

/* ------------------------------------------------ */
/* EMPTY STATE */
/* ------------------------------------------------ */

function EmptyChallenges({
  onCreateChallenge,
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Inbox className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        No challenges yet
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Create your first challenge to start discovering
        innovative startup solutions.
      </p>

      <button
        type="button"
        onClick={onCreateChallenge}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        <Plus className="h-4 w-4" />
        Create Challenge
      </button>
    </div>
  );
}

/* ------------------------------------------------ */
/* CTA */
/* ------------------------------------------------ */

function CreateChallengeCTA({ onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.35 }}
      className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white dark:bg-slate-900"
    >
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Ready to launch a new challenge?
          </h2>

          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Define an outcome-focused problem and discover
            innovative startup solutions.
          </p>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100"
        >
          Create Challenge
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------ */
/* LOADING STATE */
/* ------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />

        <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* ERROR STATE */
/* ------------------------------------------------ */

function ErrorState({
  message,
  onRetry,
}) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 text-center dark:border-red-500/20 dark:bg-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        Unable to load dashboard
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}

export default GovernmentDashboard;

