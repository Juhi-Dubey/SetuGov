import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  Users,
  AlertCircle,
  Loader2,
  History,
  Award,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAdminDashboard } from "../../services/adminService";
import ArchitectureStatus from "../../components/admin/ArchitectureStatus";

function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getAdminDashboard();
      setData(res?.data || res);
    } catch (err) {
      console.warn("Admin dashboard load fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const usersBreakdown = data?.usersBreakdown || {};
  const pendingVerifications = summary?.pendingVerifications || { government: 0, startups: 0, evaluators: 0, total: 0 };

  const userStats = [
    {
      title: "Total Users",
      value: String(summary?.totalUsers ?? 0),
      change: "Active in platform",
      icon: Users,
      iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    },
    {
      title: "Government Officers",
      value: String(usersBreakdown?.GOVERNMENT ?? 0),
      change: "Department nodal officers",
      icon: ShieldCheck,
      iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
    {
      title: "Registered Startups",
      value: String(summary?.totalStartups ?? (usersBreakdown?.STARTUP ?? 0)),
      change: "Innovation enterprises",
      icon: Building2,
      iconClass: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    },
    {
      title: "Domain Evaluators",
      value: String(summary?.totalEvaluators ?? (usersBreakdown?.EVALUATOR ?? 0)),
      change: "Technical experts",
      icon: UserCheck,
      iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    },
  ];

  const systemStats = [
    {
      title: "Active Challenges",
      value: String(summary?.totalChallenges ?? 0),
      change: "Procurement opportunities",
      icon: ClipboardList,
      iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    },
    {
      title: "Verified Startups",
      value: String(data?.startupsBreakdown?.VERIFIED ?? 0),
      change: "DPIIT recognized",
      icon: FileCheck2,
      iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
    {
      title: "Total Pilots",
      value: String(summary?.totalPilots ?? 0),
      change: "Active & completed trials",
      icon: Activity,
      iconClass: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    },
    {
      title: "Audit Log Entries",
      value: String(data?.recentAuditLogs?.length ?? 0),
      change: "Tamper-evident records",
      icon: History,
      iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    },
  ];

  const activities = (data?.recentAuditLogs || []).slice(0, 6);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Platform Governance & Administration
          </span>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl text-slate-900 dark:text-white">
            System Administrator Overview
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Real-time verification queue, role governance, system health, and complete audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Users className="h-4 w-4" /> Manage Directory & Roles
          </button>
        </div>
      </div>

      {/* PENDING VERIFICATION ACTION BAR */}
      {pendingVerifications.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 sm:p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {pendingVerifications.total} Official Verification Request(s) Pending Review
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Government Departments: {pendingVerifications.government} | Startups (DPIIT): {pendingVerifications.startups} | Evaluators: {pendingVerifications.evaluators}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingVerifications.startups > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/admin/startups")}
                  className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
                >
                  Review Startups
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/admin/users")}
                className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
              >
                Review Directory
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* USER STATS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {userStats.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span className="text-[14px] font-medium">{item.title}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconClass || "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{item.value}</div>
              <div className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">{item.change}</div>
            </motion.div>
          );
        })}
      </div>

      {/* SYSTEM STATS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {systemStats.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 + index * 0.08 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span className="text-[14px] font-medium">{item.title}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconClass || "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{item.value}</div>
              <div className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">{item.change}</div>
            </motion.div>
          );
        })}
      </div>

      {/* ARCHITECTURE STATUS OBSERVABILITY SECTION */}
      <section>
        <ArchitectureStatus />
      </section>

      {/* RECENT AUDIT LOGS PREVIEW */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Real-time Administrative Audit Trail
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/audit")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View All Logs <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {activities.length === 0 ? (
            <p className="py-4 text-xs text-slate-500 dark:text-slate-400">No recent audit logs recorded.</p>
          ) : (
            activities.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {log.action}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    by {log.user?.name || "System"} ({log.user?.role || "ADMIN"})
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;