import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  FileText,
  Send,
  ShieldCheck,
  X,
  RefreshCw,
  Banknote,
  ClipboardList,
  Layers,
  Cpu,
} from "lucide-react";
import { getChallengeById } from "../../services/challengeService";
import { applyToEvaluateChallenge } from "../../services/evaluatorService";

// ─── Deadline / Status helpers ─────────────────────────────────────────────────

/**
 * The full challenge object (from GET /challenges/:id) contains:
 *   status: 'DRAFT' | 'PUBLISHED' | 'EVALUATION' | 'CLOSED' | 'COMPLETED'
 *   application_deadline: DateTime | null
 *
 * Returns "OPEN" | "CLOSED" | "UNKNOWN"
 */
function resolveStatus(ch) {
  if (!ch) return "UNKNOWN";
  const s = (ch.status || "").toUpperCase();
  if (s === "PUBLISHED" || s === "EVALUATION") return "OPEN";
  if (s === "CLOSED" || s === "COMPLETED") return "CLOSED";
  // DRAFT — shouldn't be visible to evaluators, but handle gracefully
  if (s === "DRAFT") return "CLOSED";
  // Fallback: check deadline
  const dl = ch.application_deadline;
  if (!dl) return "UNKNOWN";
  const d = new Date(dl);
  return isNaN(d.getTime()) ? "UNKNOWN" : d > new Date() ? "OPEN" : "CLOSED";
}

function StatusBadge({ status }) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Open
      </span>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Closed
      </span>
    );
  }
  return null;
}

function formatDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, accent = "indigo", children }) {
  const colors = {
    indigo: "text-indigo-500 dark:text-indigo-400",
    emerald: "text-emerald-500 dark:text-emerald-400",
    amber:   "text-amber-500  dark:text-amber-400",
    blue:    "text-blue-500   dark:text-blue-400",
    purple:  "text-purple-500 dark:text-purple-400",
    slate:   "text-slate-400  dark:text-slate-500",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${colors[accent] || colors.indigo}`} />}
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

// ─── Render arbitrary Json/string/array list ───────────────────────────────────

function FieldList({ value }) {
  if (!value) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i}>
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (entries.length === 0) return null;
    return (
      <ul className="list-disc list-inside space-y-1">
        {entries.map(([k, v]) => (
          <li key={k}><span className="font-medium">{k}:</span> {String(v)}</li>
        ))}
      </ul>
    );
  }
  return <p className="whitespace-pre-wrap">{String(value)}</p>;
}

// ─── Main component ────────────────────────────────────────────────────────────

function EvaluatorChallengeDetail() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalMsg, setModalMsg] = useState({ type: "", text: "" });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getChallengeById(challengeId);
      const ch = res?.data?.challenge ?? res?.challenge ?? null;
      if (!ch) {
        setError("not_found");
      } else {
        setChallenge(ch);
      }
    } catch (err) {
      console.error("[EvaluatorChallengeDetail] fetch error:", err);
      setError(err?.status === 404 ? "not_found" : err?.message || "Unable to load challenge details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (challengeId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  const openApply = () => {
    setStatement("");
    setModalMsg({ type: "", text: "" });
    setApplyOpen(true);
  };

  const closeApply = () => {
    setApplyOpen(false);
    setStatement("");
    setModalMsg({ type: "", text: "" });
  };

  const submitApply = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalMsg({ type: "", text: "" });
      await applyToEvaluateChallenge(challenge.id, {
        statement_of_interest: statement.trim(),
      });
      setModalMsg({
        type: "success",
        text: "Application submitted. The government nodal officer will review your profile.",
      });
      setTimeout(closeApply, 2200);
    } catch (err) {
      setModalMsg({
        type: "error",
        text: err?.message || "Failed to submit application.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading challenge details…</p>
      </div>
    );
  }

  if (error === "not_found" || (!challenge && !error)) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <FileText className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Challenge not found.</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          The challenge you are looking for does not exist or is no longer available.
        </p>
        <button
          type="button"
          onClick={() => navigate("/evaluator/challenges")}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Challenges
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Unable to load challenge details.</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{error}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/evaluator/challenges")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = resolveStatus(challenge);
  const isClosed = status === "CLOSED";
  const deadlineDate = formatDate(challenge.application_deadline);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="mx-auto max-w-4xl space-y-5"
      >
        {/* ── Back ── */}
        <button
          type="button"
          onClick={() => navigate("/evaluator/challenges")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Challenges
        </button>

        {/* ── Hero card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <StatusBadge status={status} />

          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {challenge.title}
          </h1>

          {challenge.department && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>
                {challenge.department.name}
                {challenge.department.state ? ` — ${challenge.department.state}` : ""}
              </span>
            </div>
          )}

          {/* Deadline */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {deadlineDate ? (
              <span>
                Submission Deadline:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{deadlineDate}</span>
                {status === "OPEN" && <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">· Open</span>}
                {status === "CLOSED" && <span className="ml-2 font-semibold text-red-500 dark:text-red-400">· Closed</span>}
              </span>
            ) : (
              <span>Deadline not specified</span>
            )}
          </div>

          {/* Technologies */}
          {challenge.required_technologies && challenge.required_technologies.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {challenge.required_technologies.map((tech, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Cpu className="h-2.5 w-2.5 text-indigo-500" />
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Single Apply CTA */}
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            {isClosed ? (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                This challenge is closed. New evaluator applications are no longer accepted.
              </div>
            ) : (
              <button
                type="button"
                onClick={openApply}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <Send className="h-4 w-4" />
                Apply to Evaluate
              </button>
            )}
          </div>
        </div>

        {/* ── Problem Statement ── */}
        {challenge.problem_description && (
          <Section icon={FileText} title="Problem Statement" accent="indigo">
            <p className="whitespace-pre-wrap">{challenge.problem_description}</p>
          </Section>
        )}

        {/* ── Current Process ── */}
        {challenge.current_process && (
          <Section icon={ClipboardList} title="Current Process" accent="blue">
            <p className="whitespace-pre-wrap">{challenge.current_process}</p>
          </Section>
        )}

        {/* ── Current Baseline ── */}
        {challenge.current_baseline && (
          <Section icon={Layers} title="Current Baseline" accent="blue">
            <p className="whitespace-pre-wrap">{challenge.current_baseline}</p>
          </Section>
        )}

        {/* ── Desired Outcome ── */}
        {challenge.desired_outcome && (
          <Section icon={Target} title="Desired Outcome / Objectives" accent="emerald">
            <p className="whitespace-pre-wrap">{challenge.desired_outcome}</p>
          </Section>
        )}

        {/* ── KPIs ── */}
        {challenge.kpis && (
          (() => {
            const kpis = Array.isArray(challenge.kpis) ? challenge.kpis : typeof challenge.kpis === "object" ? Object.values(challenge.kpis) : null;
            if (!kpis || kpis.length === 0) return null;
            return (
              <Section icon={Target} title="Key Performance Indicators (KPIs)" accent="emerald">
                <FieldList value={challenge.kpis} />
              </Section>
            );
          })()
        )}

        {/* ── Eligibility Requirements ── */}
        {challenge.eligibility_requirements && (
          (() => {
            const elig = Array.isArray(challenge.eligibility_requirements)
              ? challenge.eligibility_requirements
              : typeof challenge.eligibility_requirements === "object"
              ? Object.values(challenge.eligibility_requirements)
              : null;
            if (!elig || elig.length === 0) return null;
            return (
              <Section icon={ShieldCheck} title="Eligibility Requirements" accent="purple">
                <FieldList value={challenge.eligibility_requirements} />
              </Section>
            );
          })()
        )}

        {/* ── Startup Requirements ── */}
        {challenge.startup_requirements && (
          <Section icon={ClipboardList} title="Startup / Applicant Requirements" accent="purple">
            <p className="whitespace-pre-wrap">{challenge.startup_requirements}</p>
          </Section>
        )}

        {/* ── Required Documents ── */}
        {challenge.required_documents && (
          (() => {
            const docs = Array.isArray(challenge.required_documents)
              ? challenge.required_documents
              : typeof challenge.required_documents === "object"
              ? Object.values(challenge.required_documents)
              : null;
            if (!docs || docs.length === 0) return null;
            return (
              <Section icon={FileText} title="Required Documents" accent="slate">
                <FieldList value={challenge.required_documents} />
              </Section>
            );
          })()
        )}

        {/* ── Compliance ── */}
        {(challenge.cybersecurity_requirements || challenge.data_compliance) && (
          <Section icon={ShieldCheck} title="Compliance & Security Requirements" accent="amber">
            {challenge.cybersecurity_requirements && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Cybersecurity</p>
                <p className="whitespace-pre-wrap">{challenge.cybersecurity_requirements}</p>
              </div>
            )}
            {challenge.data_compliance && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Data Compliance</p>
                <p className="whitespace-pre-wrap">{challenge.data_compliance}</p>
              </div>
            )}
          </Section>
        )}

        {/* ── Budget & Pilot ── */}
        {(challenge.budget_min != null || challenge.budget_max != null || challenge.pilot_duration_days) && (
          <Section icon={Banknote} title="Budget & Pilot Information" accent="emerald">
            <div className="grid gap-4 sm:grid-cols-3">
              {challenge.budget_min != null && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Budget (Min)</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    &#8377;{Number(challenge.budget_min).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              {challenge.budget_max != null && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Budget (Max)</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    &#8377;{Number(challenge.budget_max).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              {challenge.pilot_duration_days && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Pilot Duration</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{challenge.pilot_duration_days} days</p>
                </div>
              )}
            </div>
            {(challenge.location || challenge.pilot_location) && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Location: {challenge.location || "—"}
                {challenge.pilot_location && challenge.pilot_location !== challenge.location
                  ? ` · Pilot: ${challenge.pilot_location}`
                  : ""}
              </p>
            )}
          </Section>
        )}

        {/* ── Submission Deadline ── */}
        <Section icon={Calendar} title="Submission Deadline" accent="blue">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-900 dark:text-white">
              {deadlineDate || "Deadline not specified"}
            </span>
            <StatusBadge status={status} />
          </div>
        </Section>
      </motion.div>

      {/* ── Application Modal ── */}
      <AnimatePresence>
        {applyOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={closeApply}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-8"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    Evaluator Application
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    Apply to Evaluate Problem Statement
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{challenge.title}</p>
                </div>
                <button
                  type="button"
                  onClick={closeApply}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={submitApply} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Statement of Interest &amp; Domain Expertise
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Explain your background, relevant domain experience, and readiness to evaluate startup proposals for this problem statement.
                  </p>
                  <textarea
                    rows={4}
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Describe your technical expertise, track record, or specific background in this domain..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span>
                    By applying, you certify that you are willing to declare any conflict of interest before reviewing proposals. The department nodal officer maintains final authority over evaluator selection.
                  </span>
                </div>

                {modalMsg.text && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                      modalMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    {modalMsg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {modalMsg.text}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeApply}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Submitting…" : "Submit Application"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default EvaluatorChallengeDetail;

