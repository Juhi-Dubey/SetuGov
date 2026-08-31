import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  ShieldCheck,
  ClipboardCheck,
  FlaskConical,
  FileSignature,
  CreditCard,
  FolderCheck,
  Gavel,
  History,
  MapPin,
  Calendar,
  IndianRupee,
  Target,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

const challengeData = {
  id: "1",
  title: "Smart Waste Management System",
  department: "Urban Development Department",
  status: "Published",
  location: "Jamshedpur",
  description:
    "Develop an innovative technology solution to improve municipal waste collection, monitoring, route optimization and operational efficiency.",
  desiredOutcome:
    "Improve waste collection efficiency, reduce unnecessary travel and provide real-time visibility into municipal waste operations.",
  budget: "₹25,00,000",
  startDate: "01 Oct 2026",
  endDate: "31 Mar 2027",
  applications: 24,
  eligibleStartups: 12,
  evaluationProgress: 65,
};

const workflowItems = [
  {
    title: "Applications",
    description:
      "Review startup applications submitted for this challenge.",
    icon: Users,
    path: "applications",
  },
  {
    title: "Eligibility",
    description:
      "Check eligibility requirements and startup compliance.",
    icon: ShieldCheck,
    path: "eligibility",
  },
  {
    title: "Evaluation",
    description:
      "Evaluate eligible startups using defined criteria.",
    icon: ClipboardCheck,
    path: "evaluation",
  },
  {
    title: "Pilot",
    description:
      "Manage pilot execution, milestones and outcomes.",
    icon: FlaskConical,
    path: "pilot",
  },
  {
    title: "Contract",
    description:
      "Manage pilot agreement and contractual information.",
    icon: FileSignature,
    path: "contract",
  },
  {
    title: "Payments",
    description:
      "Track milestone-based payments and financial status.",
    icon: CreditCard,
    path: "payments",
  },
  {
    title: "Evidence",
    description:
      "Review pilot evidence, documents and verification.",
    icon: FolderCheck,
    path: "evidence",
  },
  {
    title: "Decision",
    description:
      "Record final decision and scale-up recommendation.",
    icon: Gavel,
    path: "decision",
  },
  {
    title: "Audit",
    description:
      "Review complete challenge activity and audit trail.",
    icon: History,
    path: "audit",
  },
];

function ChallengeOverview() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || challengeData.id;

  const handleWorkflowNavigation = (path) => {
    navigate(`/government/challenges/${id}/${path}`);
  };

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
              navigate("/government/dashboard")
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {challengeData.status}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Challenge #{id}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {challengeData.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {challengeData.department}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/government/challenges/${id}/applications`
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              View Applications
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* SUMMARY CARDS */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            icon={Users}
            label="Applications"
            value={challengeData.applications}
            description="Total submitted"
          />

          <SummaryCard
            icon={ShieldCheck}
            label="Eligible Startups"
            value={challengeData.eligibleStartups}
            description="Passed eligibility"
          />

          <SummaryCard
            icon={ClipboardCheck}
            label="Evaluation"
            value={`${challengeData.evaluationProgress}%`}
            description="Evaluation progress"
          />

          <SummaryCard
            icon={IndianRupee}
            label="Pilot Budget"
            value={challengeData.budget}
            description="Allocated budget"
          />

        </div>

        {/* MAIN GRID */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* LEFT */}

          <div className="space-y-6">

            {/* CHALLENGE DETAILS */}

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <FileText className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Challenge Details
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Problem and challenge information
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Problem Statement
                </p>

                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {challengeData.description}
                </p>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Desired Outcome
                </p>

                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {challengeData.desiredOutcome}
                </p>
              </div>
            </motion.section>

            {/* CHALLENGE INFORMATION */}

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.05,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Target className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Challenge Information
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Key operational details
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">

                <InfoItem
                  icon={MapPin}
                  label="Location"
                  value={challengeData.location}
                />

                <InfoItem
                  icon={Calendar}
                  label="Pilot Period"
                  value={`${challengeData.startDate} – ${challengeData.endDate}`}
                />

                <InfoItem
                  icon={IndianRupee}
                  label="Budget"
                  value={challengeData.budget}
                />

                <InfoItem
                  icon={FileText}
                  label="Department"
                  value={challengeData.department}
                />

              </div>
            </motion.section>

          </div>

          {/* RIGHT */}

          <div className="space-y-6">

            {/* STATUS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">
                Challenge Status
              </h2>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Overall progress
                  </span>

                  <span className="text-xs font-semibold">
                    {challengeData.evaluationProgress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-slate-900 dark:bg-white"
                    style={{
                      width: `${challengeData.evaluationProgress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Challenge is active
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                      Startups can participate according
                      to the published challenge workflow.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* QUICK ACTIONS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Quick Actions
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Continue challenge management
                </p>
              </div>

              <div className="space-y-2">
                <QuickAction
                  icon={Users}
                  label="Review Applications"
                  onClick={() =>
                    handleWorkflowNavigation(
                      "applications"
                    )
                  }
                />

                <QuickAction
                  icon={ClipboardCheck}
                  label="Open Evaluation"
                  onClick={() =>
                    handleWorkflowNavigation(
                      "evaluation"
                    )
                  }
                />

                <QuickAction
                  icon={FlaskConical}
                  label="Manage Pilot"
                  onClick={() =>
                    handleWorkflowNavigation(
                      "pilot"
                    )
                  }
                />

                <QuickAction
                  icon={Gavel}
                  label="Final Decision"
                  onClick={() =>
                    handleWorkflowNavigation(
                      "decision"
                    )
                  }
                />
              </div>
            </section>

          </div>
        </div>

        {/* WORKFLOW */}

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: 0.1,
          }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
        >
          <div className="mb-6">
            <h2 className="font-semibold">
              Challenge Workflow
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage every stage of the challenge lifecycle.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {workflowItems.map(
              (item, index) => {
                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.path}
                    type="button"
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.25,
                      delay: index * 0.03,
                    }}
                    onClick={() =>
                      handleWorkflowNavigation(
                        item.path
                      )
                    }
                    className="group rounded-xl border border-slate-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:group-hover:bg-white dark:group-hover:text-slate-900">
                        <Icon className="h-5 w-5" />
                      </div>

                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 dark:text-slate-600" />

                    </div>

                    <h3 className="mt-4 text-sm font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </motion.button>
                );
              }
            )}

          </div>
        </motion.section>

      </div>
    </AppLayout>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
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
// INFO ITEM
// =========================================================

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

// =========================================================
// QUICK ACTION
// =========================================================

function QuickAction({
  icon: Icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />

        <span className="text-sm font-medium">
          {label}
        </span>
      </span>

      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 dark:text-slate-600" />
    </button>
  );
}

export default ChallengeOverview;