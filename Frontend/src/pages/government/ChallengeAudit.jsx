import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Clock3,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";

function ChallengeAudit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const auditLogs = [
    {
      id: 1,
      action: "Challenge created",
      description: "Government challenge was created.",
      user: "Government Officer",
      time: "Today, 10:30 AM",
      status: "completed",
    },
    {
      id: 2,
      action: "Challenge details updated",
      description: "Problem statement and desired outcomes were updated.",
      user: "Government Officer",
      time: "Today, 11:15 AM",
      status: "completed",
    },
    {
      id: 3,
      action: "Requirements reviewed",
      description: "Technology and eligibility requirements were reviewed.",
      user: "Government Officer",
      time: "Today, 12:05 PM",
      status: "completed",
    },
    {
      id: 4,
      action: "Pending approval",
      description: "Challenge is waiting for the next approval step.",
      user: "System",
      time: "Today, 12:30 PM",
      status: "pending",
    },
  ];

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() =>
              navigate(`/government/challenges/${id}/overview`)
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Challenge
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Challenge Audit
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review the activity history and audit trail for this
              government challenge.
            </p>
          </div>
        </motion.div>

        {/* Challenge information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 grid gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audit Status
                </p>

                <p className="mt-1 text-sm font-semibold">
                  Active
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Challenge ID
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {id || "CH-001"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last Activity
                </p>

                <p className="mt-1 text-sm font-semibold">
                  Today
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Audit timeline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 p-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Audit Trail
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Complete activity history for this challenge.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {auditLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="relative flex gap-4"
                >
                  {/* Timeline line */}
                  {index !== auditLogs.length - 1 && (
                    <div className="absolute left-5 top-10 h-full w-px bg-slate-200 dark:bg-slate-800" />
                  )}

                  {/* Status icon */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    {log.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {log.action}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {log.description}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                          log.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {log.status === "completed"
                          ? "Completed"
                          : "Pending"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {log.user}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {log.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}

export default ChallengeAudit;