import { useState, useEffect } from "react";
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
  FolderOpen
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import { getAdminAuditLogs } from "../../services/adminService";

function ChallengeAudit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await getAdminAuditLogs({ limit: 50 });
        const rawLogs = res?.data?.auditLogs || res?.data?.logs || (Array.isArray(res?.data) ? res.data : []) || [];
        
        // Filter by challenge ID if relevant or show system events
        const relevantLogs = id
          ? rawLogs.filter(l => l.entity_id === id || l.details?.challenge_id === id || !l.entity_id)
          : rawLogs;

        if (mounted) {
          setAuditLogs(
            relevantLogs.map((log) => ({
              id: log.id,
              action: log.action?.replace(/_/g, " "),
              description: log.details ? JSON.stringify(log.details) : `Action ${log.action} recorded.`,
              user: log.user?.name || log.user?.email || "System",
              time: new Date(log.created_at).toLocaleString("en-IN"),
              status: "completed",
            }))
          );
        }
      } catch (err) {
        console.warn("Could not load audit logs:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLogs();
    return () => { mounted = false; };
  }, [id]);

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
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading audit history...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No audit records found</p>
                <p className="text-xs text-slate-500 mt-1">Actions performed on this challenge will be tracked here.</p>
              </div>
            ) : (
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
            )}
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}

export default ChallengeAudit;