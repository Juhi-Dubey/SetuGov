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
    },
    {
      title: "Government Officers",
      value: String(usersBreakdown?.GOVERNMENT ?? 0),
      change: "Department nodal officers",
      icon: ShieldCheck,
    },
    {
      title: "Registered Startups",
      value: String(summary?.totalStartups ?? (usersBreakdown?.STARTUP ?? 0)),
      change: "Innovation enterprises",
      icon: Building2,
    },
    {
      title: "Domain Evaluators",
      value: String(summary?.totalEvaluators ?? (usersBreakdown?.EVALUATOR ?? 0)),
      change: "Technical experts",
      icon: UserCheck,
    },
  ];

  const systemStats = [
    {
      title: "Active Challenges",
      value: String(summary?.totalChallenges ?? 0),
      icon: ClipboardList,
    },
    {
      title: "Verified Startups",
      value: String(data?.startupsBreakdown?.VERIFIED ?? 0),
      icon: FileCheck2,
    },
    {
      title: "Total Pilots",
      value: String(summary?.totalPilots ?? 0),
      icon: Activity,
    },
    {
      title: "Audit Log Entries",
      value: String(data?.recentAuditLogs?.length ?? 0),
      icon: History,
    },
  ];

  const activities = (data?.recentAuditLogs || []).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Platform Governance & Administration
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
            System Administrator Overview
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time verification queue, role governance, system health, and complete audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
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
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {pendingVerifications.total} Official Verification Request(s) Pending Review
                </h3>
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
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Review Startups
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/admin/users")}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-200"
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{item.title}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.change}</div>
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{item.title}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* RECENT AUDIT LOGS PREVIEW */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            <p className="py-4 text-xs text-slate-400">No recent audit logs recorded.</p>
          ) : (
            activities.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {log.action}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    by {log.user?.name || "System"} ({log.user?.role || "ADMIN"})
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
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