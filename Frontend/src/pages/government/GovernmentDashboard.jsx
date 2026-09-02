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
import { getChallenges } from "../../services/challengeService";
import { getPilots } from "../../services/pilotService";
import { useAuth } from "../../context/AuthContext";

const kpiIcons = {
  challenges: FileText,
  applications: ClipboardCheck,
  pilots: FlaskConical,
  "at-risk": AlertTriangle,
};

function GovernmentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

      const [challengesRes, pilotsRes] = await Promise.all([
        getChallenges().catch(() => ({ data: { challenges: [] } })),
        getPilots().catch(() => ({ data: { pilots: [] } })),
      ]);

      const rawChallenges =
        challengesRes?.data?.challenges ||
        challengesRes?.challenges ||
        (Array.isArray(challengesRes?.data) ? challengesRes.data : []) ||
        [];

      const rawPilots =
        pilotsRes?.data?.pilots ||
        pilotsRes?.pilots ||
        (Array.isArray(pilotsRes?.data) ? pilotsRes.data : []) ||
        [];

      // Calculate total applications
      const totalApplications = rawChallenges.reduce((sum, ch) => {
        const count = ch._count?.applications ?? (Array.isArray(ch.applications) ? ch.applications.length : 0);
        return sum + count;
      }, 0);

      // Pilot status counts
      const atRiskPilots = rawPilots.filter((p) => p.status === "AT_RISK").length;
      const onTrackPilots = rawPilots.filter((p) => ["RUNNING", "VALIDATION", "SCALED", "COMPLETED"].includes(p.status)).length;
      const criticalPilots = rawPilots.filter((p) => p.status === "STOPPED").length;

      const formattedChallenges = rawChallenges.map((ch) => ({
        id: ch.id,
        title: ch.title,
        description: ch.problem_description || "",
        department: ch.department?.name || user?.department?.name || "Government",
        applications: ch._count?.applications ?? (Array.isArray(ch.applications) ? ch.applications.length : 0),
        stage: ch.status,
        status: ch.status,
        budget: ch.budget_max ? `₹${Number(ch.budget_max).toLocaleString("en-IN")}` : "—",
      }));

      const dashboardData = {
        user: {
          name: user?.name || "Government Official",
          email: user?.email || "",
          role: "Government Officer",
        },
        kpis: [
          {
            id: "challenges",
            label: "Total Challenges",
            value: rawChallenges.length,
            trend: "up",
          },
          {
            id: "applications",
            label: "Proposals Received",
            value: totalApplications,
            trend: "up",
          },
          {
            id: "pilots",
            label: "Active Pilots",
            value: rawPilots.length,
            trend: "up",
          },
          {
            id: "at-risk",
            label: "At-Risk Pilots",
            value: atRiskPilots,
            trend: atRiskPilots > 0 ? "down" : "neutral",
          },
        ],
        challenges: formattedChallenges,
        pilotHealth: {
          onTrack: onTrackPilots,
          atRisk: atRiskPilots,
          critical: criticalPilots,
        },
      };

      setData(dashboardData);
      setState("success");
    } catch (err) {
      setError(err?.message || "Unable to load dashboard data.");
      setState("error");
    }
  };

  const handleCreateChallenge = () => {
    navigate("/government/challenges/new");
  };

  const handleSelectChallenge = (id) => {
    navigate(`/government/challenges/${id}`);
  };

  return (
    <AppLayout role="government">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title={`Welcome, ${user?.name || "Officer"}`}
          description="Real-time innovation procurement monitoring, startup matching, and milestone intelligence."
          action="Create Challenge"
          actionIcon={Plus}
          onAction={handleCreateChallenge}
        />

        {/* Loading */}
        {state === "loading" && <DashboardSkeleton />}

        {/* Error */}
        {state === "error" && (
          <ErrorState message={error} onRetry={loadDashboard} />
        )}

        {/* Success */}
        {state === "success" && data && (
          <>
            {/* KPI Cards */}
            <section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {data.kpis?.map((kpi, index) => (
                  <KPICard key={kpi.id} data={kpi} index={index} />
                ))}
              </div>
            </section>

            {/* Main Grid */}
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              {/* Challenges */}
              <ChallengeTable
                challenges={data.challenges || []}
                onCreateChallenge={handleCreateChallenge}
                onSelectChallenge={handleSelectChallenge}
              />

              {/* Pilot Health */}
              <PilotHealth data={data.pilotHealth} />
            </div>

            {/* Primary CTA */}
            <CreateChallengeCTA onClick={handleCreateChallenge} />
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
  const trendIsPositive = data.trend === "up" || data.trend === "positive";

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
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------ */
/* CHALLENGE TABLE */
/* ------------------------------------------------ */

function ChallengeTable({ challenges, onCreateChallenge, onSelectChallenge }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Procurement Challenges
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Active department problem statements and capability matching.
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
        <EmptyChallenges onCreateChallenge={onCreateChallenge} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                <TableHeading>Challenge</TableHeading>
                <TableHeading>Department</TableHeading>
                <TableHeading>Applications</TableHeading>
                <TableHeading>Status</TableHeading>
                <TableHeading>Action</TableHeading>
              </tr>
            </thead>

            <tbody>
              {challenges.map((challenge) => (
                <ChallengeRow
                  key={challenge.id}
                  challenge={challenge}
                  onSelectChallenge={onSelectChallenge}
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

function ChallengeRow({ challenge, onSelectChallenge }) {
  return (
    <tr
      onClick={() => onSelectChallenge(challenge.id)}
      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50"
    >
      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
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
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {challenge.applications} proposals
        </span>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={challenge.status} />
      </td>

      <td className="px-5 py-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectChallenge(challenge.id);
          }}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;

  const statusMap = {
    PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    EVALUATION: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-800",
    PILOT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
    COMPLETED: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-800",
    CLOSED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
  };

  const badgeClass = statusMap[status] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------ */
/* PILOT HEALTH */
/* ------------------------------------------------ */

function PilotHealth({ data }) {
  const total = (data?.onTrack || 0) + (data?.atRisk || 0) + (data?.critical || 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h2 className="font-semibold text-slate-900 dark:text-white">Pilot Health Summary</h2>
        <p className="mt-1 text-xs text-slate-400">
          Tracking milestone KPI delivery across active sandbox pilots.
        </p>

        <div className="mt-6 space-y-4">
          <HealthItem
            label="On Track / Validated"
            count={data?.onTrack || 0}
            total={total}
            color="bg-emerald-500"
          />

          <HealthItem
            label="At Risk (Needs Attention)"
            count={data?.atRisk || 0}
            total={total}
            color="bg-amber-500"
          />

          <HealthItem
            label="Critical / Stopped"
            count={data?.critical || 0}
            total={total}
            color="bg-red-500"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        Total {total} tracked pilot project{total === 1 ? "" : "s"} across statewide departments.
      </div>
    </motion.section>
  );
}

function HealthItem({ label, count, total, color }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold">{count}</span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* CTA & STATES */
/* ------------------------------------------------ */

function CreateChallengeCTA({ onClick }) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 p-6 dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-blue-950/20 sm:flex-row">
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Have an operational problem in your department?
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Use the AI Challenge Copilot to define measurable outcomes and discover verified startups.
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        New Challenge
      </button>
    </div>
  );
}

function EmptyChallenges({ onCreateChallenge }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">No Challenges Found</h3>
      <p className="mt-1 text-xs text-slate-400">
        Get started by creating your department's first innovation challenge.
      </p>
      <button
        type="button"
        onClick={onCreateChallenge}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        <Plus className="h-4 w-4" />
        Create Challenge
      </button>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-950/30">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
      <h3 className="mt-3 text-sm font-semibold text-red-800 dark:text-red-300">
        Failed to load dashboard data
      </h3>
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default GovernmentDashboard;
