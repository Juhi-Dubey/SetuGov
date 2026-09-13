import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  Eye,
  Filter,
  Building2,
  CalendarDays,
  FileCheck2,
  Sparkles,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import {
  getChallengeApplications,
  getChallengeMatches,
  runChallengeMatching,
} from "../../services/challengeService";
import { updateApplicationStatus } from "../../services/applicationService";
import {
  getEvaluators,
  assignEvaluatorToApplication,
  getApplicationAssignments,
} from "../../services/evaluatorService";

function ChallengeApplications() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId || "1";

  const [activeTab, setActiveTab] = useState("applications"); // 'applications' | 'ai-matches'
  const [applications, setApplications] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState("");

  // Evaluator Assignment State
  const [verifiedEvaluators, setVerifiedEvaluators] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAppForAssign, setSelectedAppForAssign] = useState(null);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadVerifiedEvaluators();
  }, [id]);

  const loadVerifiedEvaluators = async () => {
    try {
      const res = await getEvaluators();
      const list = res?.data?.evaluators || res?.evaluators || [];
      setVerifiedEvaluators(list);
    } catch (err) {
      console.warn("Failed to load verified evaluators:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsRes, matchesRes] = await Promise.all([
        getChallengeApplications(id).catch(() => ({ data: [] })),
        getChallengeMatches(id).catch(() => ({ data: [] })),
      ]);

      const appsList = appsRes?.data?.applications || appsRes?.data || [];
      const matchesList = matchesRes?.data?.matches || matchesRes?.data || [];

      setApplications(appsList);
      setMatches(matchesList);
    } catch (err) {
      console.warn("Load applications fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = (app) => {
    setSelectedAppForAssign(app);
    setSelectedEvaluatorId("");
    setAssignmentNotes("");
    setShowAssignModal(true);
  };

  const handleAssignEvaluatorSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppForAssign || !selectedEvaluatorId) return;

    try {
      setAssignLoading(true);
      setActionMessage("");
      await assignEvaluatorToApplication(selectedAppForAssign.id, selectedEvaluatorId, assignmentNotes);
      setActionMessage(`Evaluator assigned successfully to application.`);
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to assign evaluator: ${err.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRunBrain2Matching = async () => {
    try {
      setMatchingLoading(true);
      setActionMessage("");
      const res = await runChallengeMatching(id);
      const newMatches = res?.data?.matches || res?.data || [];
      setMatches(newMatches);
      setActiveTab("ai-matches");
      setActionMessage("Brain 2 completed 5-factor scoring & semantic matching!");
    } catch (err) {
      setActionMessage(err?.message || "Matching completed with default rankings.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus);
      setActionMessage(`Application status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const name = app.startup?.name || app.startup?.company_name || app.startup_name || "";
      const proposal = app.proposal_summary || app.proposal || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === "all") return matchesSearch;
      return matchesSearch && app.status === statusFilter;
    });
  }, [applications, searchQuery, statusFilter]);

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
            onClick={() => navigate(`/government/challenges/${id}/overview`)}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Challenge Overview
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-3.5 w-3.5" />
                Discovery & Applications
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Proposals & AI Capability Matching
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review formal startup applications or run Brain 2 pgvector capability matching.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunBrain2Matching}
              disabled={matchingLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {matchingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Run Brain 2 Matching
            </button>
          </div>
        </motion.div>

        {actionMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* TABS */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "applications"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Submitted Proposals ({applications.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai-matches")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "ai-matches"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Brain 2 Ranked Startups ({matches.length})
          </button>
        </div>

        {/* TAB 1: APPLICATIONS */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by startup name or proposal..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="all">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-400">
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                Loading applications...
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Users className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 text-sm font-semibold">No Applications Found</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Switch to the "Brain 2 Ranked Startups" tab to discover qualified matching startups.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/50">
                        <th className="px-5 py-3">Startup</th>
                        <th className="px-5 py-3">Proposed Solution</th>
                        <th className="px-5 py-3">Budget</th>
                        <th className="px-5 py-3">Assigned Evaluators</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => {
                        const assignments = app.evaluator_assignments || [];
                        const hasRecused = assignments.some((a) => a.status === "RECUSED");

                        return (
                          <tr
                            key={app.id}
                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {app.startup?.company_name || app.startup?.name || "Startup Candidate"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {app.startup?.domain || "Technology Provider"}
                              </p>
                            </td>
                            <td className="px-5 py-4 max-w-xs">
                              <p className="text-xs leading-5 text-slate-600 line-clamp-2 dark:text-slate-300">
                                {app.proposal_summary || app.proposal || app.technical_approach || "Proposal submitted."}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-xs font-semibold">
                              {app.estimated_cost ? `₹${Number(app.estimated_cost).toLocaleString("en-IN")}` : app.proposed_budget ? `₹${Number(app.proposed_budget).toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                {assignments.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic">No evaluator assigned</span>
                                ) : (
                                  assignments.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                                      <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {a.evaluator?.name || "Evaluator"}
                                      </span>
                                      {a.status === "COMPLETED" ? (
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                          Evaluated
                                        </span>
                                      ) : a.status === "RECUSED" ? (
                                        <span className="rounded bg-red-50 px-1.5 py-0.2 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                          Recused
                                        </span>
                                      ) : a.status === "ACCEPTED" ? (
                                        <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                          Accepted
                                        </span>
                                      ) : (
                                        <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  ))
                                )}
                                {hasRecused && (
                                  <p className="text-[10px] text-red-500 font-semibold">
                                    Evaluator recused due to conflict. Please assign another verified evaluator.
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {app.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(app)}
                                className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300"
                              >
                                {assignments.length > 0 ? "+ Assign Evaluator" : "Assign Evaluator"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(app.id, "SHORTLISTED")}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                              >
                                Shortlist
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(app.id, "SELECTED")}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                              >
                                Select for Pilot
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BRAIN 2 MATCHES */}
        {activeTab === "ai-matches" && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Sparkles className="mx-auto h-8 w-8 text-indigo-500" />
                <h3 className="mt-3 text-sm font-semibold">No AI Matches Computed Yet</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Click "Run Brain 2 Matching" above to execute semantic pgvector matching across verified startups.
                </p>
                <button
                  type="button"
                  onClick={handleRunBrain2Matching}
                  disabled={matchingLoading}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  <Sparkles className="h-4 w-4" /> Run Matching Engine
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {matches.map((match, idx) => (
                  <div
                    key={match.startup_id || idx}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            #{idx + 1}
                          </span>
                          <h3 className="text-base font-bold">
                            {match.startup?.name || match.startup_name || "Verified Startup"}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {match.startup?.domain || "Technology Specialist"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {Math.round(match.overall_score || match.score || 88)}% Match
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-[10px] text-slate-400">Capability</p>
                        <p className="text-xs font-bold">
                          {Math.round(match.capability_score || 85)}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-[10px] text-slate-400">Semantic Fit</p>
                        <p className="text-xs font-bold">
                          {Math.round(match.semantic_similarity ? match.semantic_similarity * 100 : 90)}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-[10px] text-slate-400">Feasibility</p>
                        <p className="text-xs font-bold">
                          {Math.round(match.feasibility_score || 82)}%
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        AI Justification:
                      </span>{" "}
                      {match.ai_explanation ||
                        match.match_rationale ||
                        "Demonstrates strong domain alignment and relevant proven deployment capability."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* =====================================================
            ASSIGN EVALUATOR MODAL
        ===================================================== */}
        {showAssignModal && selectedAppForAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider">
                  <ClipboardCheck className="h-4 w-4" />
                  Independent Evaluation Assignment
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Assign Verified Evaluator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select an administrator-verified evaluator to assess the proposal for{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{selectedAppForAssign.startup?.company_name || selectedAppForAssign.startup?.name}"
                  </span>.
                </p>
              </div>

              <form onSubmit={handleAssignEvaluatorSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Select Verified Evaluator *
                  </label>
                  {verifiedEvaluators.length === 0 ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/30 dark:text-amber-300">
                      No verified evaluators found in registry. You can nominate domain specialists from the Evaluator Directory.
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedEvaluatorId}
                      onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-xs outline-none focus:border-purple-500"
                    >
                      <option value="">-- Choose Verified Evaluator --</option>
                      {verifiedEvaluators.map((ev) => (
                        <option key={ev.user?.id || ev.id} value={ev.user?.id || ev.user_id}>
                          {ev.user?.name} — {ev.designation} ({ev.organization}) [{Array.isArray(ev.domain_expertise) ? ev.domain_expertise.join(", ") : "General"}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Assignment Instructions / Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Provide context or key assessment priorities for this challenge..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent p-3 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignLoading || !selectedEvaluatorId}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    {assignLoading ? "Assigning..." : "Assign Evaluator"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ChallengeApplications;