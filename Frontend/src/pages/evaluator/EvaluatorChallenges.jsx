import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  Search,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Tag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  getOpenChallengesForEvaluator,
  applyToEvaluateChallenge,
} from "../../services/evaluatorService";
import Pagination from "../../components/common/Pagination";

function EvaluatorChallenges() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Application modal state
  const [applyingChallenge, setApplyingChallenge] = useState(null);
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchChallenges();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDomain]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getOpenChallengesForEvaluator();
      const list = res?.data || res || [];
      setChallenges(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load open Problem Statements.");
    } finally {
      setLoading(false);
    }
  };

  const domains = useMemo(() => {
    const set = new Set();
    challenges.forEach((c) => {
      if (c.domain) set.add(c.domain);
    });
    return ["All", ...Array.from(set)];
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.department?.name && c.department.name.toLowerCase().includes(q)) ||
        (c.domain && c.domain.toLowerCase().includes(q));

      const matchDomain = selectedDomain === "All" || c.domain === selectedDomain;

      return matchSearch && matchDomain;
    });
  }, [challenges, search, selectedDomain]);

  const paginatedChallenges = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChallenges.slice(start, start + pageSize);
  }, [filteredChallenges, currentPage, pageSize]);

  const handleOpenApplyModal = (challenge) => {
    setApplyingChallenge(challenge);
    setStatement("");
    setModalMessage({ type: "", text: "" });
  };

  const handleCloseModal = () => {
    setApplyingChallenge(null);
    setStatement("");
    setModalMessage({ type: "", text: "" });
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!applyingChallenge) return;

    try {
      setSubmitting(true);
      setModalMessage({ type: "", text: "" });

      await applyToEvaluateChallenge(applyingChallenge.id, {
        statement_of_interest: statement.trim(),
      });

      setModalMessage({
        type: "success",
        text: "Your application to evaluate this Problem Statement has been submitted. Government nodal officers will review your profile.",
      });

      setTimeout(() => {
        handleCloseModal();
        fetchChallenges();
      }, 2000);
    } catch (err) {
      setModalMessage({
        type: "error",
        text: err.message || "Failed to submit evaluator application.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Compass className="h-4.5 w-4.5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Problem Statement Discovery
            </p>
          </div>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Available Problem Statements
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Discover Government Problem Statements open for expert evaluator participation.
          </p>
        </div>

        <button
          onClick={fetchChallenges}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Challenges
        </button>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, department, description, or domain..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Domain:
          </label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CHALLENGES LIST */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
            <Compass className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No active Problem Statements available for evaluator participation.
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            When government departments publish open innovation challenges requiring independent technical evaluation, they will be listed here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedChallenges.map((challenge) => {
              // The /evaluators/open-challenges DTO shape:
              // id, title, problem_description, department (string), state (string),
              // required_technologies, application_deadline, finalist_submission_deadline,
              // my_application, is_in_pool, match_score
              // NOTE: No "status", "domain", or "description" field in this DTO.

              const deadlineRaw = challenge.application_deadline || challenge.finalist_submission_deadline;
              const isOpen = (() => {
                if (!deadlineRaw) return true; // no deadline = treat as open
                const d = new Date(deadlineRaw);
                return !isNaN(d.getTime()) && d > new Date();
              })();

              const deadlineLabel = (() => {
                if (!deadlineRaw) return null;
                const d = new Date(deadlineRaw);
                return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              })();

              const hasApplied = !!challenge.my_application;

              return (
              <div
                key={challenge.id}
                onClick={() => navigate(`/evaluator/challenges/${challenge.id}`)}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all cursor-pointer hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    {/* Open / Closed badge */}
                    {isOpen ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Closed
                      </span>
                    )}
                    {hasApplied && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        Applied
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600">
                    {challenge.title}
                  </h3>

                  {/* Department name (plain string in this DTO) */}
                  {challenge.department && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {challenge.department}
                        {challenge.state ? ` (${challenge.state})` : ""}
                      </span>
                    </div>
                  )}

                  {/* Problem description excerpt */}
                  {challenge.problem_description && (
                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
                      {challenge.problem_description}
                    </p>
                  )}

                  {/* Technologies */}
                  {challenge.required_technologies && challenge.required_technologies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {challenge.required_technologies.slice(0, 4).map((tech, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Tag className="h-2.5 w-2.5 text-indigo-500" />
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {/* Deadline */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {deadlineLabel ? `Deadline: ${deadlineLabel}` : "No deadline set"}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenApplyModal(challenge);
                    }}
                    disabled={!isOpen || hasApplied}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {hasApplied ? "Applied" : "Apply to Evaluate"}
                    {!hasApplied && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {filteredChallenges.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredChallenges.length}
              pageSize={pageSize}
              pageSizeOptions={[4, 6, 12, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemName="challenges"
            />
          )}
        </div>
      )}

      {/* APPLICATION MODAL */}
      <AnimatePresence>
        {applyingChallenge && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {applyingChallenge.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Statement of Interest & Domain Expertise
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

                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span>
                    By applying, you certify that you are willing to declare any conflict of interest before reviewing proposals. The department nodal officer maintains final authority over evaluator selection.
                  </span>
                </div>

                {modalMessage.text && (
                  <div
                    className={`rounded-xl p-3 text-xs font-medium flex items-center gap-2 ${
                      modalMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    {modalMessage.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{modalMessage.text}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
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
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EvaluatorChallenges;
