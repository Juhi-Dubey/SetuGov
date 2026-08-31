import { useState } from "react";
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
  UserRound,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  {
    title: "Total Users",
    value: "248",
    change: "+12 this month",
    icon: Users,
  },
  {
    title: "Government Users",
    value: "42",
    change: "+3 this month",
    icon: ShieldCheck,
  },
  {
    title: "Registered Startups",
    value: "126",
    change: "+8 this month",
    icon: Building2,
  },
  {
    title: "Evaluators",
    value: "80",
    change: "+1 this month",
    icon: UserCheck,
  },
];

const systemStats = [
  {
    title: "Active Challenges",
    value: "18",
    icon: ClipboardList,
  },
  {
    title: "Pending Verifications",
    value: "07",
    icon: FileCheck2,
  },
  {
    title: "Active Pilots",
    value: "11",
    icon: Activity,
  },
  {
    title: "System Alerts",
    value: "03",
    icon: AlertCircle,
  },
];

const recentUsers = [
  {
    name: "GreenTech Innovations",
    type: "Startup",
    email: "contact@greentech.in",
    status: "Verified",
    date: "31 Aug 2026",
  },
  {
    name: "Department of Urban Development",
    type: "Government",
    email: "urban@gov.in",
    status: "Verified",
    date: "30 Aug 2026",
  },
  {
    name: "Dr. Ananya Sharma",
    type: "Evaluator",
    email: "ananya@example.com",
    status: "Active",
    date: "29 Aug 2026",
  },
  {
    name: "EcoVision Technologies",
    type: "Startup",
    email: "hello@ecovision.in",
    status: "Pending",
    date: "28 Aug 2026",
  },
];

const activities = [
  {
    title: "New startup registered",
    description:
      "EcoVision Technologies completed startup registration.",
    time: "18 minutes ago",
  },
  {
    title: "Evaluator added",
    description:
      "Dr. Ananya Sharma was added to the evaluator pool.",
    time: "2 hours ago",
  },
  {
    title: "Challenge published",
    description:
      "Smart Waste Management challenge was published.",
    time: "5 hours ago",
  },
  {
    title: "Document verified",
    description:
      "GreenTech Innovations submitted a verified GST certificate.",
    time: "Yesterday",
  },
];

function AdminDashboard() {
  const navigate = useNavigate();

  const [selectedPeriod, setSelectedPeriod] =
    useState("This Month");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Administration
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Monitor users, startups, challenges,
              evaluators and platform activity from one
              centralized workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/startups")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <Building2 className="h-4 w-4" />
              View Startups
            </button>
          </div>
        </div>
      </section>

      {/* MAIN STATS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            index={index}
          />
        ))}
      </section>

      {/* SYSTEM OVERVIEW */}

      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Platform Overview
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Current platform activity and pending
            administrative actions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {systemStats.map((stat, index) => (
            <SystemStatCard
              key={stat.title}
              {...stat}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* QUICK ACTIONS */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Quick Actions
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Frequently used administration controls.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={Users}
            title="Manage Users"
            description="View and manage platform users."
            onClick={() => navigate("/admin/users")}
          />

          <QuickAction
            icon={Building2}
            title="Manage Startups"
            description="Review registered startups."
            onClick={() =>
              navigate("/admin/startups")
            }
          />

          <QuickAction
            icon={ClipboardList}
            title="Evaluation Criteria"
            description="Manage evaluation criteria."
            onClick={() =>
              navigate("/admin/criteria")
            }
          />

          <QuickAction
            icon={FileCheck2}
            title="Templates"
            description="Manage platform templates."
            onClick={() =>
              navigate("/admin/templates")
            }
          />
        </div>
      </section>

      {/* RECENT USERS + ACTIVITY */}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* RECENT USERS */}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Users
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Recently registered or updated users.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentUsers.map((user, index) => (
              <RecentUser
                key={`${user.name}-${index}`}
                user={user}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* ACTIVITY */}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Activity
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Latest platform events.
              </p>
            </div>

            <Activity className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="p-5 sm:p-6">
            <div className="space-y-6">
              {activities.map(
                (activity, index) => (
                  <ActivityItem
                    key={`${activity.title}-${index}`}
                    activity={activity}
                    index={index}
                  />
                )
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/audit")
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              View Audit Log
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ADMIN HEALTH */}

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Platform Status
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                All major platform services are operating
                normally.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All Systems Operational
          </span>
        </div>
      </section>

      {/* PERIOD SELECTOR */}

      <div className="flex justify-end pb-2">
        <select
          value={selectedPeriod}
          onChange={(event) =>
            setSelectedPeriod(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
        >
          <option>This Month</option>
          <option>Last Month</option>
          <option>Last 3 Months</option>
          <option>This Year</option>
        </select>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* STAT CARD                                             */
/* ===================================================== */

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  index,
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
      transition={{
        delay: index * 0.05,
      }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
          {change}
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>
    </motion.div>
  );
}

/* ===================================================== */
/* SYSTEM STAT CARD                                      */
/* ===================================================== */

function SystemStatCard({
  title,
  value,
  icon: Icon,
  index,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        delay: index * 0.05,
      }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>
    </motion.div>
  );
}

/* ===================================================== */
/* QUICK ACTION                                         */
/* ===================================================== */

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-400">
          <Icon className="h-4 w-4" />
        </div>

        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
      </div>

      <h3 className="mt-4 text-xs font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h3>

      <p className="mt-1 text-[10px] leading-5 text-slate-400">
        {description}
      </p>
    </button>
  );
}

/* ===================================================== */
/* RECENT USER                                          */
/* ===================================================== */

function RecentUser({
  user,
  index,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 8,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        delay: index * 0.05,
      }}
      className="flex items-center gap-3 p-5 sm:p-6"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        {user.type === "Startup" ? (
          <Building2 className="h-4 w-4" />
        ) : user.type === "Government" ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
          {user.name}
        </p>

        <p className="mt-0.5 truncate text-[9px] text-slate-400">
          {user.email}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-[9px] font-semibold text-indigo-500">
            {user.type}
          </span>

          <span className="text-[9px] text-slate-300">
            •
          </span>

          <span className="text-[9px] text-slate-400">
            {user.date}
          </span>
        </div>
      </div>

      <span
        className={`hidden rounded-full px-2 py-1 text-[8px] font-bold sm:inline-flex ${
          user.status === "Verified"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
        }`}
      >
        {user.status}
      </span>
    </motion.div>
  );
}

/* ===================================================== */
/* ACTIVITY ITEM                                         */
/* ===================================================== */

function ActivityItem({
  activity,
  index,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 8,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        delay: index * 0.05,
      }}
      className="flex gap-3"
    >
      <div className="relative flex flex-col items-center">
        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />

        {index !== activities.length - 1 && (
          <div className="mt-1 h-full w-px bg-slate-200 dark:bg-slate-800" />
        )}
      </div>

      <div className="pb-1">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {activity.title}
        </p>

        <p className="mt-1 text-[10px] leading-5 text-slate-400">
          {activity.description}
        </p>

        <p className="mt-1 text-[9px] font-semibold text-indigo-500">
          {activity.time}
        </p>
      </div>
    </motion.div>
  );
}

export default AdminDashboard;