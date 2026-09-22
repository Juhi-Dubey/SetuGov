import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ClipboardCheck,
  Building2,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Send,
  Globe,
  Loader2,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getMyAssignments,
  updateAssignmentStatus,
  getOpenChallengesForEvaluator,
  applyToEvaluateChallenge,
  getMyEvaluatorApplications,
} from "../../services/evaluatorService";
import Pagination from "../../components/common/Pagination";

function EvaluatorAssignments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments"); // "assignments" | "discovery"

  // Assignments State
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Discovery & Self-Application State
  const [openChallenges, setOpenChallenges] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [discoveryError, setDiscoveryError] = useState("");
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [applyingChallengeId, setApplyingChallengeId] = useState(null);
  const [applyStatement, setApplyStatement] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyActionMsg, setApplyActionMsg] = useState("");

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (activeTab === "discovery") {
      fetchDiscoveryData();
    }
  }, [activeTab]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyAssignments();
      const raw = res?.data?.assignments || res?.data || res || [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list.map((a) => ({
        id: a.id,
        application_id: a.application_id || a.application?.id,
        challenge_title:
          a.application?.challenge?.title || a.challenge_title || "Innovation Challenge",
        department_name:
          a.application?.challenge?.department?.name ||
          a.department_name ||
          "Government Department",
        state: a.application?.challenge?.department?.state || a.state || "National",
        startup_name:
          a.application?.startup?.company_name || a.startup_name || "Startup Innovator",
        domain: a.application?.startup?.domain || a.domain || "GovTech",
        assigned_at: a.assigned_at || a.created_at,
        status: a.status || "PENDING",
        is_recused:
          a.status === "RECUSED" || Boolean(a.application?.conflict_declarations?.length),
        is_evaluated:
          a.status === "COMPLETED" || Boolean(a.application?.evaluations?.length),
        has_conflict: Boolean(a.application?.conflict_declarations?.length),
      }));

      setAssignments(mapped);
    } catch (err) {
      console.warn("Error fetching evaluator assignments:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load assigned evaluations.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscoveryData = async () => {
    try {
      setLoadingDiscovery(true);
      setDiscoveryError("");
      const [challengesRes, appsRes] = await Promise.all([
        getOpenChallengesForEvaluator().catch(() => ({ data: [] })),
        getMyEvaluatorApplications().catch(() => ({ data: [] })),
      ]);

      const chList = challengesRes?.data || challengesRes || [];
      const appList = appsRes?.data || appsRes || [];

      setOpenChallenges(Array.isArray(chList) ? chList : []);
      setMyApplications(Array.isArray(appList) ? appList : []);
    } catch (err) {
      console.warn("Error fetching discovery challenges:", err);
      setDiscoveryError(err?.message || "Failed to load open challenges for evaluation.");
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      await updateAssignmentStatus(assignmentId, newStatus);
      fetchAssignments();
    } catch (err) {
      alert(`Error updating assignment: ${err.message}`);
    }
  };

  const handleOpenApplyModal = (challengeId) => {
    setApplyingChallengeId(challengeId);
    setApplyStatement("");
    setApplyActionMsg("");
  };

  const handleSubmitSelfApplication = async (e, challengeId) => {
    e.preventDefault();
    if (!applyStatement || applyStatement.trim().length < 15) {
      alert("Please provide a brief statement of domain expertise (minimum 15 characters).");
      return;
    }

    try {
      setSubmittingApply(true);
      setApplyActionMsg("");
      await applyToEvaluateChallenge(challengeId, {
        statement: applyStatement.trim(),
      });
      setApplyActionMsg("Application submitted successfully! Government nodal officers will review your credentials.");
      setApplyingChallengeId(null);
      setApplyStatement("");
      await fetchDiscoveryData();
    } catch (err) {
      alert(`Application failed: ${err?.response?.data?.message || err?.message || "Error submitting application"}`);
    } finally {
      setSubmittingApply(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.challenge_title || "").toLowerCase().includes(q) ||
        (item.startup_name || "").toLowerCase().includes(q) ||
        (item.domain || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" ||
        String(item.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [assignments, search, statusFilter]);

  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsPageSize, setAssignmentsPageSize] = useState(10);

  useEffect(() => {
    setAssignmentsPage(1);
  }, [search, statusFilter]);

  const paginatedAssignments = useMemo(() => {
    const start = (assignmentsPage - 1) * assignmentsPageSize;
    return filteredAssignments.slice(start, start + assignmentsPageSize);
  }, [filteredAssignments, assignmentsPage, assignmentsPageSize]);

  const filteredChallenges = useMemo(() => {
    return openChallenges.filter((ch) => {
      const q = discoverySearch.toLowerCase().trim();
      if (!q) return true;
      return (
        (ch.title || "").toLowerCase().includes(q) ||
        (ch.department?.name || "").toLowerCase().includes(q) ||
        (ch.sector || "").toLowerCase().includes(q) ||
        (ch.problem_description || "").toLowerCase().includes(q)
      );
    });
  }, [openChallenges, discoverySearch]);

  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [discoveryPageSize, setDiscoveryPageSize] = useState(6);

  useEffect(() => {
    setDiscoveryPage(1);
  }, [discoverySearch]);

  const paginatedDiscovery = useMemo(() => {
    const start = (discoveryPage - 1) * discoveryPageSize;
    return filteredChallenges.slice(start, start + discoveryPageSize);
  }, [filteredChallenges, discoveryPage, discoveryPageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Evaluator Workspace & Discovery
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Review official assignments from government nodal officers or discover and apply for open innovation challenges.
          </p>
        </div>

        <button
          onClick={activeTab === "assignments" ? fetchAssignments : fetchDiscoveryData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading || loadingDiscovery ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {applyActionMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{applyActionMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "assignments"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          My Assigned Evaluations ({assignments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("discovery")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "discovery"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Globe className="h-4 w-4" />
          Open Challenges & Self-Application ({openChallenges.length})
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by challenge, startup, or domain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="All">All Assignment Status</option>
                <option value="PENDING">Pending Evaluation</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="COMPLETED">Completed</option>
                <option value="RECUSED">Conflict Recused</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2 text-purple-600" />
                Loading your evaluations from PostgreSQL...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Assignments Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  There are currently no evaluation assignments matching your criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 bg-slate-200 text-left text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
                    <tr>
                      <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Challenge & Department</th>
                      <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Startup Candidate</th>
                      <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Assigned On</th>
                      <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Status</th>
                      <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Conflict Status</th>
                      <th className="py-2.5 px-4 text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {a.challenge_title || "Innovation Challenge"}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {a.department_name} • {a.state}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {a.startup_name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{a.domain}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {a.assigned_at
                            ? new Date(a.assigned_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          {a.status === "COMPLETED" || a.is_evaluated ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Completed
                            </span>
                          ) : a.status === "RECUSED" || a.is_recused ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              Recused
                            </span>
                          ) : a.status === "ACCEPTED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              Accepted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {a.is_recused ? (
                            <span className="text-red-500 font-semibold text-[11px]">Conflict Declared</span>
                          ) : a.has_conflict === false && a.is_evaluated ? (
                            <span className="text-emerald-600 font-semibold text-[11px]">Certified Clean</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Pending Declaration</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {a.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(a.id, "ACCEPTED")}
                                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(a.id, "DECLINED")}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => navigate(`/evaluator/evaluation/${a.application_id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {a.is_evaluated ? "View Scorecard" : "Evaluate"}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredAssignments.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3">
                <Pagination
                  currentPage={assignmentsPage}
                  totalItems={filteredAssignments.length}
                  pageSize={assignmentsPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={setAssignmentsPage}
                  onPageSizeChange={(newSize) => {
                    setAssignmentsPageSize(newSize);
                    setAssignmentsPage(1);
                  }}
                  itemName="assignments"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DISCOVERY & SELF-APPLICATION */}
      {activeTab === "discovery" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search open challenges by title or domain..."
              value={discoverySearch}
              onChange={(e) => setDiscoverySearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {loadingDiscovery ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2 text-purple-600" />
              Loading open problem statements...
            </div>
          ) : discoveryError ? (
            <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {discoveryError}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Globe className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Open Challenges Available</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no active problem statements open for evaluator self-application.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {paginatedDiscovery.map((ch) => {
                  const existingApp = myApplications.find((app) => app.challenge_id === ch.id);
                  const isApplying = applyingChallengeId === ch.id;

                  return (
                    <div
                      key={ch.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                              <Building2 className="h-3 w-3" />
                              {ch.department?.name || "Government Department"}
                            </span>
                            {ch.sector && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {ch.sector}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Posted {new Date(ch.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>

                          <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                            {ch.title}
                          </h3>

                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {ch.problem_description || "Detailed public sector problem statement."}
                          </p>
                        </div>

                        {/* Application Status Badge or Action Button */}
                        <div className="shrink-0 flex items-center">
                          {existingApp ? (
                            existingApp.status === "SHORTLISTED" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                Approved into Pool
                              </span>
                            ) : existingApp.status === "REJECTED" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                Application Declined
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                                Application Submitted
                              </span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenApplyModal(ch.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Self-Apply to Evaluate
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Self-Apply Expandable Statement Form */}
                      {isApplying && (
                        <form
                          onSubmit={(e) => handleSubmitSelfApplication(e, ch.id)}
                          className="mt-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-950/20 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-purple-900 dark:text-purple-300">
                              Apply as Independent Evaluator for this Problem Statement
                            </p>
                            <button
                              type="button"
                              onClick={() => setApplyingChallengeId(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                              Describe your domain expertise, technical qualifications, and relevance to this challenge:
                            </label>
                            <textarea
                              rows={3}
                              value={applyStatement}
                              onChange={(e) => setApplyStatement(e.target.value)}
                              placeholder="e.g. 8+ years leading AI/ML public health deployments; previously evaluated smart municipal sanitation pipelines..."
                              className="w-full text-xs rounded-xl border border-purple-200 bg-white p-2.5 outline-none focus:border-purple-500 dark:border-purple-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setApplyingChallengeId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingApply}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {submittingApply ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Submit Application
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
                <Pagination
                  currentPage={discoveryPage}
                  totalItems={filteredChallenges.length}
                  pageSize={discoveryPageSize}
                  pageSizeOptions={[4, 6, 12, 20]}
                  onPageChange={setDiscoveryPage}
                  onPageSizeChange={(newSize) => {
                    setDiscoveryPageSize(newSize);
                    setDiscoveryPage(1);
                  }}
                  itemName="challenges"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EvaluatorAssignments;