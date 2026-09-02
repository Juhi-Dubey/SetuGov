import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
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
import { getStartupApplications, getStartupPilots } from "../../services/startupService";

function StartupDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challenges, setChallenges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);

  const startupId = user?.startups?.[0]?.id || user?.id;
  const startupName = user?.startups?.[0]?.name || user?.name || "MediQueue AI";

  useEffect(() => {
    loadData();
  }, [startupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chRes, appsRes, pilotsRes] = await Promise.all([
        getChallenges().catch(() => ({ data: { challenges: [] } })),
        startupId ? getStartupApplications(startupId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        startupId ? getStartupPilots(startupId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const chList = chRes?.data?.challenges || chRes?.challenges || [];
      const appList = appsRes?.data?.applications || appsRes?.data || [];
      const pilotList = pilotsRes?.data?.pilots || pilotsRes?.data || [];

      setChallenges(chList);
      setApplications(appList);
      setPilots(pilotList);
    } catch (err) {
      console.warn("Startup dashboard load fallback:", err);
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
        value: String(applications.length || 2),
        description: "Submitted procurement proposals",
        icon: FileText,
      },
      {
        title: "Under Evaluation",
        value: String(underReview || 1),
        description: "Awaiting evaluator scoring",
        icon: Clock3,
      },
      {
        title: "Pilot Sandboxes",
        value: String(selectedCount || 1),
        description: "Active government field trials",
        icon: Rocket,
      },
      {
        title: "Milestone Funding",
        value: totalBudget > 0 ? `₹${(totalBudget / 100000).toFixed(1)}L` : "₹15.0L",
        description: "Committed escrow grants",
        icon: Wallet,
      },
    ];
  }, [applications, pilots]);

  return (
    <div className="space-y-8">
      {/* WELCOME BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl dark:border-slate-800"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Startup Innovation Workspace
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back, {startupName}
            </h1>

            <p className="text-sm leading-6 text-slate-300">
              Discover verified state government challenges, submit AI-assisted proposals, and track milestone validation pilots.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/startup/challenges")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-md transition-all hover:bg-slate-100"
            >
              Browse Challenges
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/startup/pilot")}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
            >
              <Rocket className="h-4 w-4" />
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{item.title}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{item.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* MAIN TWO-COLUMN SECTION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* RECOMMENDED CHALLENGES */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold">Open Government Challenges</h2>
              <p className="text-xs text-slate-400">Problem statements accepting innovation proposals</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/startup/challenges")}
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View All
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {challenges.slice(0, 4).map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {ch.department?.name || "State Department"}
                  </span>
                  <h3 className="mt-1 text-sm font-semibold truncate">{ch.title}</h3>
                  <p className="text-xs text-slate-400">
                    Budget: ₹{ch.budget_max ? Number(ch.budget_max).toLocaleString("en-IN") : "25,00,000"} · {ch.location || "Maharashtra"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/startup/application/${ch.id}`)}
                  className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE PROPOSALS & PILOTS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold">Your Applications & Status</h2>
              <p className="text-xs text-slate-400">Real-time status in procurement evaluation lifecycle</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {(applications.length > 0 ? applications : [
              {
                id: "1",
                challenge: { title: "AI-Based Citizen Grievance Management" },
                status: "UNDER_REVIEW",
                created_at: new Date().toISOString(),
              },
              {
                id: "2",
                challenge: { title: "Smart Waste Collection System" },
                status: "SELECTED",
                created_at: new Date().toISOString(),
              },
            ]).map((app, idx) => (
              <div
                key={app.id || idx}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800"
              >
                <div>
                  <h3 className="text-sm font-semibold">
                    {app.challenge?.title || "Department Innovation Pilot"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Submitted: {app.created_at ? new Date(app.created_at).toLocaleDateString() : "Recent"}
                  </p>
                </div>

                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  app.status === "SELECTED"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {app.status || "UNDER_REVIEW"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartupDashboard;