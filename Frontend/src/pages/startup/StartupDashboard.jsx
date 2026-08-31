import { useMemo } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function StartupDashboard() {
  const navigate = useNavigate();

  /*
   * Temporary startup data.
   * Later this will come from AuthContext/backend.
   */
  const startup = {
    name: "InnovateTech Solutions",
    founder: "Startup Founder",
    sector: "Artificial Intelligence",
    location: "Bengaluru, India",
  };

  /*
   * Temporary dashboard data.
   * Later this will come from startupService.js.
   */
  const applications = [
    {
      id: 1,
      challenge:
        "AI-Based Citizen Grievance Management",
      department:
        "Department of Public Services",
      status: "Under Evaluation",
      submittedOn: "18 Aug 2026",
      deadline: "05 Sep 2026",
    },
    {
      id: 2,
      challenge:
        "Smart Waste Collection System",
      department:
        "Urban Development Department",
      status: "Pilot Selected",
      submittedOn: "12 Aug 2026",
      deadline: "01 Sep 2026",
    },
    {
      id: 3,
      challenge:
        "Digital Healthcare Access Platform",
      department:
        "Department of Health",
      status: "Draft",
      submittedOn: "—",
      deadline: "15 Sep 2026",
    },
  ];

  const stats = useMemo(
    () => [
      {
        title: "Active Applications",
        value: "03",
        description:
          "Applications currently in progress",
        icon: FileText,
      },
      {
        title: "Under Evaluation",
        value: "01",
        description:
          "Waiting for evaluator assessment",
        icon: Clock3,
      },
      {
        title: "Pilot Selected",
        value: "01",
        description:
          "Ready for pilot execution",
        icon: Rocket,
      },
      {
        title: "Total Funding",
        value: "₹12.5L",
        description:
          "Approved / allocated amount",
        icon: Wallet,
      },
    ],
    []
  );

  const handleExploreChallenges = () => {
    navigate("/startup/challenges");
  };

  const handleViewApplications = () => {
    navigate("/startup/application");
  };

  const handleViewPilot = () => {
    navigate("/startup/pilot");
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* WELCOME HEADER                                   */}
      {/* ================================================= */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl dark:bg-indigo-500/10" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Rocket className="h-5 w-5" />
              </div>

              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Startup Workspace
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back,{" "}
              {startup.founder} 👋
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage your government challenge
              applications, pilots, documents and
              payments from one place.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill
                icon={Building2}
                text={startup.name}
              />

              <InfoPill
                icon={BriefcaseBusiness}
                text={startup.sector}
              />

              <InfoPill
                icon={Building2}
                text={startup.location}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExploreChallenges}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            <Search className="h-4 w-4" />
            Explore Challenges
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ================================================= */}
      {/* STATISTICS                                        */}
      {/* ================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            stat={stat}
            index={index}
          />
        ))}
      </section>

      {/* ================================================= */}
      {/* MAIN GRID                                         */}
      {/* ================================================= */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ================================================= */}
        {/* RECENT APPLICATIONS                              */}
        {/* ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Applications
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Track the latest applications submitted
                by your startup.
              </p>
            </div>

            <button
              type="button"
              onClick={handleViewApplications}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {applications.map(
              (application, index) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  index={index}
                  onClick={
                    handleViewApplications
                  }
                />
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* QUICK ACTIONS                                    */}
        {/* ================================================= */}

        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Frequently used startup actions.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <QuickAction
              icon={Search}
              title="Explore Challenges"
              description="Find new opportunities"
              onClick={
                handleExploreChallenges
              }
            />

            <QuickAction
              icon={FileText}
              title="My Applications"
              description="Track submitted applications"
              onClick={
                handleViewApplications
              }
            />

            <QuickAction
              icon={Rocket}
              title="Pilot Workspace"
              description="Manage your active pilot"
              onClick={handleViewPilot}
            />

            <QuickAction
              icon={Building2}
              title="Startup Profile"
              description="Update company information"
              onClick={() =>
                navigate(
                  "/startup/profile"
                )
              }
            />
          </div>
        </section>
      </div>

      {/* ================================================= */}
      {/* PILOT STATUS + UPCOMING DEADLINES                */}
      {/* ================================================= */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PILOT */}

        <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Rocket className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                Active Pilot
              </p>

              <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                Smart Waste Collection System
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Your solution has been selected for
                pilot implementation.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Pilot Active
                </span>

                <span className="text-[10px] text-slate-400">
                  Progress: 62%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{
                    width: "62%",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleViewPilot}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Open Pilot
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* DEADLINES */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming Deadlines
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Important dates for your applications.
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <DeadlineRow
              title="Smart Waste Collection System"
              date="01 Sep 2026"
              type="Pilot milestone"
            />

            <DeadlineRow
              title="AI-Based Citizen Grievance Management"
              date="05 Sep 2026"
              type="Application"
            />

            <DeadlineRow
              title="Digital Healthcare Access Platform"
              date="15 Sep 2026"
              type="Application"
            />
          </div>
        </section>
      </div>

      {/* ================================================= */}
      {/* INSIGHT BANNER                                    */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />

              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                Platform Insight
              </span>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Keep your company profile and documents
              updated to improve your eligibility for
              upcoming government challenges.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/startup/documents"
              )
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            Manage Documents
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
  stat,
  index,
}) {
  const Icon = stat.icon;

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
        delay: index * 0.05,
      }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>

        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          Active
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
        {stat.value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {stat.title}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-slate-400">
        {stat.description}
      </p>
    </motion.div>
  );
}

/* ===================================================== */
/* APPLICATION ROW                                       */
/* ===================================================== */

function ApplicationRow({
  application,
  index,
  onClick,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 10,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.25,
        delay: index * 0.05,
      }}
      className="group p-5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {application.challenge}
            </h3>

            <p className="mt-1 text-[10px] text-slate-400">
              {application.department}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={
                  application.status
                }
              />

              <span className="text-[9px] text-slate-400">
                Submitted:{" "}
                {application.submittedOn}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          View
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
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
      className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {title}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-400">
          {description}
        </p>
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" />
    </button>
  );
}

/* ===================================================== */
/* DEADLINE ROW                                         */
/* ===================================================== */

function DeadlineRow({
  title,
  date,
  type,
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        <CalendarDays className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">
          {title}
        </p>

        <p className="mt-0.5 text-[9px] text-slate-400">
          {type}
        </p>
      </div>

      <span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">
        {date}
      </span>
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

  if (
    normalized.includes("pilot")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-2.5 w-2.5" />
        {status}
      </span>
    );
  }

  if (
    normalized.includes("evaluation")
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Clock3 className="h-2.5 w-2.5" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <FileText className="h-2.5 w-2.5" />
      {status}
    </span>
  );
}

/* ===================================================== */
/* INFO PILL                                             */
/* ===================================================== */

function InfoPill({
  icon: Icon,
  text,
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
      <Icon className="h-3 w-3 shrink-0" />

      <span className="truncate">
        {text}
      </span>
    </span>
  );
}

export default StartupDashboard;