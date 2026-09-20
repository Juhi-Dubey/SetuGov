import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  IndianRupee,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getChallenges } from "../../services/challengeService";
import { getStartupApplications, getStartupPilots, getStartupPerformance } from "../../services/startupService";
import Pagination from "../../components/common/Pagination";
import { formatApplicationStatus, formatPublishDate } from "../../utils/filterUtils";

function StartupDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challenges, setChallenges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [challengesPage, setChallengesPage] = useState(1);
  const [challengesPageSize, setChallengesPageSize] = useState(4);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsPageSize, setApplicationsPageSize] = useState(4);

  const startupId = user?.startups?.[0]?.id || user?.id;
  const startupName = user?.startups?.[0]?.name || user?.name || "Startup Portal";

  useEffect(() => {
    loadData();
  }, [startupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chRes, appsRes, pilotsRes, perfRes] = await Promise.all([
        getChallenges().catch(() => ({ data: { challenges: [] } })),
        startupId ? getStartupApplications(startupId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        startupId ? getStartupPilots(startupId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        startupId ? getStartupPerformance(startupId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);

      const chList = chRes?.data?.challenges || chRes?.challenges || [];
      const appList = appsRes?.data?.applications || appsRes?.data || [];
      const pilotList = pilotsRes?.data?.pilots || pilotsRes?.data || [];
      const perfData = perfRes?.data?.performance || perfRes?.data || null;

      setChallenges(chList);
      setApplications(appList);
      setPilots(pilotList);
      setPerformance(perfData);
    } catch (err) {
      console.warn("Startup dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const underReview = applications.filter((a) => ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"].includes(a.status)).length;
    const selectedCount = applications.filter((a) => a.status === "SELECTED").length + pilots.length;
    const totalBudget = pilots.reduce((sum, p) => sum + Number(p.budget || 0), 0);

    return [
      {
        title: "Active Applications",
        value: String(applications.length),
        description: "Submitted procurement proposals",
        icon: FileText,
      },
      {
        title: "Under Evaluation",
        value: String(underReview),
        description: "Awaiting evaluator scoring",
        icon: Clock3,
      },
      {
        title: "Pilot Sandboxes",
        value: String(selectedCount),
        description: "Active government field trials",
        icon: Rocket,
      },
      {
        title: "Milestone Funding",
        value: totalBudget > 0 ? `₹${(totalBudget / 100000).toFixed(1)}L` : "₹0.0L",
        description: "Committed escrow grants",
        icon: Wallet,
      },
    ];
  }, [applications, pilots]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* WELCOME BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Startup Innovation Workspace
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {startupName}
            </h1>

            <p className="text-xs sm:text-sm leading-5 text-slate-500 dark:text-slate-400">
              Discover verified state government challenges, submit AI-assisted proposals, and track milestone validation pilots.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/startup/challenges")}
              className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              Browse Challenges
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/startup/pilot")}
              className="inline-flex h-9.5 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <Rocket className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Pilot Sandboxes
            </button>
          </div>
        </div>
      </motion.div>

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{item.title}</span>
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* MAIN TWO-COLUMN SECTION */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* RECOMMENDED CHALLENGES */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Open Government Challenges</h2>
                <p className="text-xs text-slate-400">Problem statements accepting innovation proposals</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/startup/challenges")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {challenges.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  No active challenges open for application at this moment.
                </div>
              ) : (
                challenges
                  .slice((challengesPage - 1) * challengesPageSize, challengesPage * challengesPageSize)
                  .map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {ch.department?.name || "State Department"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            <CalendarDays className="h-3 w-3 text-indigo-500" />
                            Published: {formatPublishDate(ch)}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold truncate">{ch.title}</h3>
                        <p className="text-xs text-slate-400">
                          Budget: ₹{ch.budget_max ? Number(ch.budget_max).toLocaleString("en-IN") : "25,00,000"} · {ch.location || "National"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/startup/application/${ch.id}`)}
                        className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                      >
                        Apply
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          <Pagination
            currentPage={challengesPage}
            totalItems={challenges.length}
            pageSize={challengesPageSize}
            pageSizeOptions={[2, 4, 8, 12]}
            onPageChange={setChallengesPage}
            onPageSizeChange={setChallengesPageSize}
            itemName="challenges"
            className="mt-4 border-t-0 p-2 sm:p-3"
          />
        </div>

        {/* ACTIVE PROPOSALS & PILOTS */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Your Applications & Status</h2>
                <p className="text-xs text-slate-400">Real-time status in procurement evaluation lifecycle</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {applications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No Applications Submitted</p>
                  <p className="mt-1 text-xs text-slate-400">Discover open problem statements and submit your first procurement proposal.</p>
                  <button
                    onClick={() => navigate("/startup/challenges")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Explore Challenges <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                applications
                  .slice((applicationsPage - 1) * applicationsPageSize, applicationsPage * applicationsPageSize)
                  .map((app, idx) => (
                    <div
                      key={app.id || idx}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                    >
                      <div>
                        <h3 className="text-sm font-semibold">
                          {app.challenge?.title || "Department Innovation Pilot"}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Submitted: {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "Recent"}
                        </p>
                      </div>

                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        app.status === "SELECTED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : app.status === "REJECTED"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {formatApplicationStatus(app.status)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {applications.length > applicationsPageSize && (
            <Pagination
              currentPage={applicationsPage}
              totalItems={applications.length}
              pageSize={applicationsPageSize}
              pageSizeOptions={[2, 4, 8, 12]}
              onPageChange={setApplicationsPage}
              onPageSizeChange={setApplicationsPageSize}
              itemName="applications"
              className="mt-4 border-t-0 p-2 sm:p-3"
            />
          )}
        </div>
      </div>

      {/* STARTUP PROCUREMENT TRACK RECORD & CREDENTIALS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Public Procurement Track Record & Readiness
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {performance?.dpiit_verified ? "DPIIT Recognized Startup" : (user?.verification_status === "VERIFIED" ? "Verified Enterprise" : "Registered Startup")}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Audited performance metrics across state and municipal innovation sandbox deployments
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pilots Completed / Scaled</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {performance ? performance.completed_pilots ?? 0 : 0} <span className="text-xs font-normal text-slate-400">/ {performance ? performance.total_pilots ?? 0 : 0}</span>
            </p>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Validated sandbox field deployments</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Validation Score</p>
            <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {performance?.average_validation_score != null && performance?.average_validation_score > 0
                ? `${performance.average_validation_score} / 100`
                : "N/A"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Independent expert pilot evaluation</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scale-Ready Pilots</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {performance ? performance.scale_ready_count ?? 0 : 0}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Authorized for statewide rollout</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gov Compliance Status</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {user?.verification_status === "VERIFIED" ? "Verified" : (user?.verification_status || "Pending Verification")}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Government procurement readiness</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartupDashboard;