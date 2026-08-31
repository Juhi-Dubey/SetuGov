import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flag,
  MessageSquare,
  Plus,
  Rocket,
  Target,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const pilotData = {
  challengeTitle: "Smart Waste Collection System",
  department: "Urban Development Department",
  location: "Jamshedpur Municipal Corporation",
  status: "Pilot Active",
  progress: 62,
  startDate: "01 Aug 2026",
  endDate: "30 Nov 2026",
  budget: "₹40 Lakhs",
};

const initialMilestones = [
  {
    id: 1,
    title: "Pilot Planning & Requirement Analysis",
    description:
      "Finalize requirements, deployment plan and implementation timeline.",
    dueDate: "15 Aug 2026",
    status: "Completed",
  },
  {
    id: 2,
    title: "Technology Deployment",
    description:
      "Deploy the solution and configure the required infrastructure.",
    dueDate: "10 Sep 2026",
    status: "In Progress",
  },
  {
    id: 3,
    title: "Field Testing",
    description:
      "Run the solution in selected pilot locations and collect results.",
    dueDate: "15 Oct 2026",
    status: "Upcoming",
  },
  {
    id: 4,
    title: "Pilot Evaluation & Final Report",
    description:
      "Submit performance results, evidence and final pilot report.",
    dueDate: "30 Nov 2026",
    status: "Upcoming",
  },
];

const initialUpdates = [
  {
    id: 1,
    date: "28 Aug 2026",
    title: "Deployment update submitted",
    description:
      "Initial deployment has been completed in the selected pilot area.",
  },
  {
    id: 2,
    date: "24 Aug 2026",
    title: "Government feedback received",
    description:
      "The department requested additional monitoring metrics.",
  },
];

function StartupPilot() {
  const navigate = useNavigate();

  const [milestones, setMilestones] =
    useState(initialMilestones);

  const [updates, setUpdates] =
    useState(initialUpdates);

  const [showUpdateForm, setShowUpdateForm] =
    useState(false);

  const [updateText, setUpdateText] =
    useState("");

  const [showEvidenceForm, setShowEvidenceForm] =
    useState(false);

  const [evidenceName, setEvidenceName] =
    useState("");

  const completedMilestones =
    milestones.filter(
      (item) => item.status === "Completed"
    ).length;

  const handleAddUpdate = () => {
    if (!updateText.trim()) return;

    const newUpdate = {
      id: Date.now(),
      date: formatCurrentDate(),
      title: "Pilot progress update",
      description: updateText.trim(),
    };

    setUpdates((previous) => [
      newUpdate,
      ...previous,
    ]);

    setUpdateText("");
    setShowUpdateForm(false);
  };

  const handleEvidenceSubmit = () => {
    if (!evidenceName.trim()) return;

    setEvidenceName("");
    setShowEvidenceForm(false);

    alert(
      "Evidence submitted successfully."
    );
  };

  const handleMilestoneClick = (id) => {
    setMilestones((previous) =>
      previous.map((milestone) => {
        if (milestone.id !== id) {
          return milestone;
        }

        if (
          milestone.status ===
          "In Progress"
        ) {
          return {
            ...milestone,
            status: "Completed",
          };
        }

        return milestone;
      })
    );
  };

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
        duration: 0.35,
      }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl dark:bg-indigo-500/10" />

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              navigate("/startup")
            }
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Dashboard
          </button>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Rocket className="h-6 w-6" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Pilot Workspace
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {pilotData.status}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {pilotData.challengeTitle}
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {pilotData.department}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowUpdateForm(
                  (previous) => !previous
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Progress Update
            </button>
          </div>

          {/* UPDATE FORM */}

          {showUpdateForm && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              className="relative mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5"
            >
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Progress Update
              </label>

              <textarea
                value={updateText}
                onChange={(event) =>
                  setUpdateText(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Describe the latest progress, achievements or issues..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowUpdateForm(false)
                  }
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-900"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAddUpdate}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Post Update
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* PILOT SUMMARY                                     */}
      {/* ================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Target}
          title="Pilot Progress"
          value={`${pilotData.progress}%`}
          description="Overall completion"
        />

        <SummaryCard
          icon={CheckCircle2}
          title="Milestones"
          value={`${completedMilestones}/${milestones.length}`}
          description="Milestones completed"
        />

        <SummaryCard
          icon={CalendarDays}
          title="Start Date"
          value={pilotData.startDate}
          description="Pilot commencement"
        />

        <SummaryCard
          icon={Flag}
          title="End Date"
          value={pilotData.endDate}
          description="Target completion"
        />
      </section>

      {/* ================================================= */}
      {/* PROGRESS                                          */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Progress
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Track the overall progress of your
              pilot implementation.
            </p>
          </div>

          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {pilotData.progress}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            initial={{
              width: 0,
            }}
            animate={{
              width: `${pilotData.progress}%`,
            }}
            transition={{
              duration: 0.8,
            }}
            className="h-full rounded-full bg-indigo-600"
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-[10px] text-slate-400">
          <span>
            Started: {pilotData.startDate}
          </span>

          <span>
            Target: {pilotData.endDate}
          </span>
        </div>
      </section>

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ================================================= */}
        {/* MILESTONES                                       */}
        {/* ================================================= */}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Milestones
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Monitor each phase of the pilot.
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="relative space-y-5">
              <div className="absolute bottom-5 left-5 top-5 w-px bg-slate-200 dark:bg-slate-800" />

              {milestones.map(
                (milestone, index) => (
                  <Milestone
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                    onClick={() =>
                      handleMilestoneClick(
                        milestone.id
                      )
                    }
                  />
                )
              )}
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* PILOT INFORMATION                                */}
        {/* ================================================= */}

        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Pilot Information
          </h2>

          <div className="mt-5 space-y-4">
            <DetailRow
              label="Government Department"
              value={pilotData.department}
            />

            <DetailRow
              label="Pilot Location"
              value={pilotData.location}
            />

            <DetailRow
              label="Start Date"
              value={pilotData.startDate}
            />

            <DetailRow
              label="End Date"
              value={pilotData.endDate}
            />

            <DetailRow
              label="Approved Budget"
              value={pilotData.budget}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/startup/documents"
              )
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <FileText className="h-4 w-4" />
            View Pilot Documents
          </button>
        </section>
      </div>

      {/* ================================================= */}
      {/* EVIDENCE                                          */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pilot Evidence
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Submit evidence and supporting material
              for pilot evaluation.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowEvidenceForm(
                (previous) => !previous
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            Submit Evidence
          </button>
        </div>

        {showEvidenceForm && (
          <motion.div
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Evidence Description
            </label>

            <input
              type="text"
              value={evidenceName}
              onChange={(event) =>
                setEvidenceName(
                  event.target.value
                )
              }
              placeholder="e.g. Deployment report, field test results..."
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowEvidenceForm(false)
                }
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-950"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleEvidenceSubmit
                }
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Submit
              </button>
            </div>
          </motion.div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <EvidenceCard
            title="Deployment Report"
            type="PDF"
            status="Submitted"
          />

          <EvidenceCard
            title="Field Test Results"
            type="PDF"
            status="Submitted"
          />

          <EvidenceCard
            title="Performance Metrics"
            type="Report"
            status="Pending"
          />
        </div>
      </section>

      {/* ================================================= */}
      {/* RECENT UPDATES                                    */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <MessageSquare className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pilot Updates
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Recent communication and progress
                updates.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {updates.map((update) => (
            <div
              key={update.id}
              className="p-5 sm:p-6"
            >
              <div className="flex gap-4">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {update.title}
                    </h3>

                    <span className="text-[9px] text-slate-400">
                      {update.date}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {update.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

/* ===================================================== */
/* SUMMARY CARD                                          */
/* ===================================================== */

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ===================================================== */
/* MILESTONE                                             */
/* ===================================================== */

function Milestone({
  milestone,
  index,
  onClick,
}) {
  const completed =
    milestone.status === "Completed";

  const inProgress =
    milestone.status === "In Progress";

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
        delay: index * 0.05,
      }}
      className="relative flex gap-4"
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white dark:border-slate-950 ${
          completed
            ? "bg-emerald-500 text-white"
            : inProgress
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-400 dark:bg-slate-900"
        }`}
        title={
          inProgress
            ? "Mark as completed"
            : "Milestone status"
        }
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span className="text-[10px] font-bold">
            {index + 1}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {milestone.title}
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-slate-400">
              {milestone.description}
            </p>
          </div>

          <StatusBadge
            status={milestone.status}
          />
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[9px] text-slate-400">
          <CalendarDays className="h-3 w-3" />
          Due {milestone.dueDate}
        </div>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                          */
/* ===================================================== */

function StatusBadge({ status }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Completed
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Clock3 className="h-2.5 w-2.5" />
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Upcoming
    </span>
  );
}

/* ===================================================== */
/* DETAIL ROW                                            */
/* ===================================================== */

function DetailRow({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* EVIDENCE CARD                                         */
/* ===================================================== */

function EvidenceCard({
  title,
  type,
  status,
}) {
  const submitted =
    status === "Submitted";

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <FileText className="h-4 w-4" />
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[9px] font-bold ${
            submitted
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="mt-4 text-xs font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h3>

      <p className="mt-1 text-[9px] text-slate-400">
        {type}
      </p>

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
      >
        {submitted
          ? "View Evidence"
          : "Add Evidence"}

        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ===================================================== */
/* DATE HELPER                                            */
/* ===================================================== */

function formatCurrentDate() {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date());
}

export default StartupPilot;