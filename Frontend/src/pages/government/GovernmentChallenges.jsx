import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Building2,
  Calendar,
  IndianRupee,
  Wallet,
  Users,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Check,
  X,
  Share2,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Tag,
  Cpu,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import PageHeader from "../../components/layout/PageHeader";
import {
  getChallenges,
  publishChallenge,
  closeChallenge,
} from "../../services/challengeService";
import { useAuth } from "../../context/AuthContext";
import { formatPublishDate } from "../../utils/filterUtils";

const statusTabs = [
  { id: "ALL", label: "All Challenges" },
  { id: "PUBLISHED", label: "Published & Open" },
  { id: "EVALUATION", label: "In Evaluation" },
  { id: "PILOT", label: "Active Pilots" },
  { id: "DRAFT", label: "Drafts" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CLOSED", label: "Closed" },
];

export default function GovernmentChallenges() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [actionFeedback, setActionFeedback] = useState(null);

  // Pagination Controls
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // 9 items fits 3-column grid cleanly

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getChallenges({ limit: 500 });

      const raw =
        res?.data?.challenges ||
        res?.challenges ||
        (Array.isArray(res?.data) ? res.data : []) ||
        [];

      const formatted = raw.map((ch, idx) => ({
        id: ch.id || `ch-${idx + 1}`,
        title: ch.title || "Government Challenge",
        problem_description:
          ch.problem_description ||
          ch.description ||
          "",
        department: {
          name:
            ch.department?.name ||
            ch.department_name ||
            user?.department?.name ||
            "Government Administration",
        },
        status: ch.status || "PUBLISHED",
        budget_min: Number(ch.budget_min) || 0,
        budget_max: Number(ch.budget_max) || 0,
        pilot_duration_days: ch.pilot_duration_days || 0,
        required_technologies: Array.isArray(ch.required_technologies)
          ? ch.required_technologies
          : [],
        applications_count:
          ch._count?.applications ??
          (Array.isArray(ch.applications) ? ch.applications.length : 0),
        pilots_count:
          ch._count?.pilots ??
          (Array.isArray(ch.pilots) ? ch.pilots.length : ch.status === "PILOT" ? 1 : 0),
        created_at: ch.created_at || new Date().toISOString(),
        published_at: ch.published_at || ch.created_at || new Date().toISOString(),
        published_date: formatPublishDate(ch),
        deadline: ch.application_deadline || ch.deadline || "Open Rolling",
        category: ch.sector || ch.category || "GovTech Innovation",
      }));
      setChallenges(formatted);
    } catch (err) {
      console.error("Failed to load challenges from backend", err);
      setError(err?.message || "Failed to load challenges.");
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Publish
  const handlePublish = async (e, id) => {
    e.stopPropagation();
    try {
      await publishChallenge(id).catch(() => null);
      setChallenges((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, status: "PUBLISHED" } : ch))
      );
      showFeedback("Challenge published successfully! Startups can now discover and apply.", "success");
    } catch {
      showFeedback("Failed to publish challenge.", "error");
    }
  };

  // Handle Quick Close
  const handleClose = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to close this challenge to new applications?")) return;
    try {
      await closeChallenge(id).catch(() => null);
      setChallenges((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, status: "CLOSED" } : ch))
      );
      showFeedback("Challenge marked as Closed.", "info");
    } catch {
      showFeedback("Failed to close challenge.", "error");
    }
  };

  const showFeedback = (msg, type) => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    challenges.forEach((ch) => {
      if (ch.department?.name) set.add(ch.department.name);
    });
    return ["ALL", ...Array.from(set)];
  }, [challenges]);

  // Filtered and Sorted Challenges
  const filteredChallenges = useMemo(() => {
    return challenges
      .filter((ch) => {
        // Status filter
        if (statusFilter !== "ALL" && ch.status !== statusFilter) {
          return false;
        }
        // Dept filter
        if (selectedDept !== "ALL" && ch.department?.name !== selectedDept) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = ch.title.toLowerCase().includes(q);
          const matchDesc = ch.problem_description?.toLowerCase().includes(q);
          const matchDept = ch.department?.name?.toLowerCase().includes(q);
          const matchTech = ch.required_technologies?.some((t) =>
            t.toLowerCase().includes(q)
          );
          if (!matchTitle && !matchDesc && !matchDept && !matchTech) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        if (sortBy === "budget-desc") {
          return (b.budget_max || 0) - (a.budget_max || 0);
        }
        if (sortBy === "applications-desc") {
          return (b.applications_count || 0) - (a.applications_count || 0);
        }
        if (sortBy === "title-asc") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [challenges, statusFilter, selectedDept, searchQuery, sortBy]);

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedDept, sortBy]);

  const totalPages = Math.ceil(filteredChallenges.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedChallenges = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredChallenges.slice(start, start + pageSize);
  }, [filteredChallenges, safePage, pageSize]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = challenges.length;
    const published = challenges.filter((c) => c.status === "PUBLISHED").length;
    const evaluation = challenges.filter((c) => c.status === "EVALUATION").length;
    const pilots = challenges.filter((c) => c.status === "PILOT").length;
    const totalApps = challenges.reduce((sum, c) => sum + (c.applications_count || 0), 0);
    const totalBudget = challenges.reduce((sum, c) => sum + (c.budget_max || 0), 0);

    return { total, published, evaluation, pilots, totalApps, totalBudget };
  }, [challenges]);

  const formatBudget = (val) => {
    if (!val) return "₹0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)} Lakhs`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <AppLayout role="government">
      <div className="space-y-5 pb-6">
        {/* Toast Feedback */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl border text-sm font-semibold backdrop-blur-md ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50/95 border-emerald-300 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200"
                  : actionFeedback.type === "error"
                  ? "bg-red-50/95 border-red-300 text-red-800 dark:bg-red-950/90 dark:border-red-800 dark:text-red-200"
                  : "bg-indigo-50/95 border-indigo-300 text-indigo-800 dark:bg-indigo-950/90 dark:border-indigo-800 dark:text-indigo-200"
              }`}
            >
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {actionFeedback.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <PageHeader
          title="Innovation & Procurement Challenges"
          description="Create problem statements, monitor incoming startup proposals, run 5-factor AI evaluations, and fast-track sandbox pilots."
          action="New Challenge"
          actionIcon={Plus}
          onAction={() => navigate("/government/challenges/new")}
        />

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Challenges
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-slate-500">Across all departments</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Open for Proposals
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.published}
            </p>
            <p className="mt-1 text-xs text-slate-500">Active public challenges</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                In Evaluation
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.evaluation}
            </p>
            <p className="mt-1 text-xs text-slate-500">Committee scoring phase</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Active Pilots
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <FlaskConical className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {stats.pilots}
            </p>
            <p className="mt-1 text-xs text-slate-500">Live sandbox execution</p>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm transition-all hover:shadow-md lg:col-span-1 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Budget
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {formatBudget(stats.totalBudget)}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {stats.totalApps} startup proposals
            </p>
          </div>
        </div>  

        {/* Filter & Search Toolbar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
            {/* Search Input with tightened icon proximity */}
            <div className="relative w-full flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search challenges, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter Dropdown */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
              className="h-10 w-full sm:w-[220px] lg:w-[220px] shrink-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "ALL" ? "All Departments" : dept}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort challenges"
              className="h-10 w-full sm:w-[165px] lg:w-[165px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="budget-desc">Budget: High to Low</option>
              <option value="applications-desc">Most Proposals</option>
              <option value="title-asc">Alphabetical (A-Z)</option>
            </select>

            {/* Actions: Refresh & Segmented Grid/List Toggle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={fetchChallenges}
                title="Refresh challenges"
                aria-label="Refresh challenges"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              <div className="flex h-10 w-[76px] shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Card Grid View"
                  aria-label="Card Grid View"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    viewMode === "table"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Table View"
                  aria-label="Table View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3.5 scrollbar-none dark:border-slate-800/80">
            {statusTabs.map((tab) => {
              const count =
                tab.id === "ALL"
                  ? challenges.length
                  : challenges.filter((c) => c.status === tab.id).length;

              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white"
                      : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-blue-700/60 text-white dark:bg-blue-500/40 dark:text-white"
                        : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Indicators */}
          {(searchQuery.trim() || statusFilter !== "ALL" || selectedDept !== "ALL") && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Status: {statusTabs.find((t) => t.id === statusFilter)?.label || statusFilter}
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    aria-label="Remove status filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedDept !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Dept: {selectedDept}
                  <button
                    onClick={() => setSelectedDept("ALL")}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    aria-label="Remove department filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setSelectedDept("ALL");
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 ml-1"
              >
                Reset all
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
              />
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No matching challenges found
            </h2>
            <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search query, department filter, or status tab.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setSelectedDept("ALL");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear Filters
              </button>
              <button
                onClick={() => navigate("/government/challenges/new")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Create New Challenge
              </button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* =====================================================
             GRID VIEW
          ===================================================== */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedChallenges.map((challenge, idx) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                index={idx}
                onSelect={() => navigate(`/government/challenges/${challenge.id}/overview`)}
                onPublish={(e) => handlePublish(e, challenge.id)}
                onClose={(e) => handleClose(e, challenge.id)}
                formatBudget={formatBudget}
              />
            ))}
          </div>
        ) : (
          /* =====================================================
             TABLE VIEW
          ===================================================== */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
                    <th className="px-4 py-2.5">Challenge & Details</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5">Budget</th>
                    <th className="px-4 py-2.5">Proposals</th>
                    <th className="px-4 py-2.5">Pilot Duration</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedChallenges.map((challenge) => (
                    <tr
                      key={challenge.id}
                      onClick={() => navigate(`/government/challenges/${challenge.id}/overview`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2.5">
                        <div className="max-w-xs">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {challenge.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                              <Calendar className="h-3 w-3 text-indigo-500" />
                              Published: {challenge.published_date}
                            </span>
                            <span>·</span>
                            <span>Deadline: {challenge.deadline}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                            {challenge.problem_description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {challenge.required_technologies?.slice(0, 2).map((tech, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {tech}
                              </span>
                            ))}
                            {challenge.required_technologies?.length > 2 && (
                              <span className="text-[10px] text-slate-400">
                                +{challenge.required_technologies.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {challenge.department?.name}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white">
                        {formatBudget(challenge.budget_max)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                          <Users className="h-3 w-3" />
                          {challenge.applications_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {challenge.pilot_duration_days} Days
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={challenge.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {challenge.status === "DRAFT" && (
                            <button
                              onClick={() =>
                                navigate(`/government/challenges/${challenge.id}/edit`)
                              }
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                              title="Edit Draft Challenge"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              navigate(`/government/challenges/${challenge.id}/applications`)
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                            title="View Proposals"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/government/challenges/${challenge.id}/overview`)
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Pipeline
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && filteredChallenges.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredChallenges.length)}
                </strong>{" "}
                of{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {filteredChallenges.length}
                </strong>{" "}
                challenges
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-700">
                <span className="text-slate-600">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={18}>18</option>
                  <option value={27}>27</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Page {safePage} of {totalPages}
              </span>

              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* =====================================================
   CHALLENGE CARD
===================================================== */
function ChallengeCard({
  challenge,
  index,
  onSelect,
  onPublish,
  onClose,
  formatBudget,
}) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onSelect}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900 cursor-pointer"
    >
      <div>
        {/* Card Header: Category, Publish Date & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {challenge.category || "GovTech"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-100 dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-300">
              <Calendar className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
              Published: {challenge.published_date}
            </span>
          </div>
          <StatusBadge status={challenge.status} />
        </div>

        {/* Title */}
        <h3 className="mt-4 text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 line-clamp-2">
          {challenge.title}
        </h3>

        {/* Problem Statement Snippet */}
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
          {challenge.problem_description}
        </p>

        {/* Department */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">{challenge.department?.name}</span>
        </div>

        {/* Tech Stack Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {challenge.required_technologies?.slice(0, 3).map((tech, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50/70 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
            >
              <Cpu className="h-2.5 w-2.5" />
              {tech}
            </span>
          ))}
          {challenge.required_technologies?.length > 3 && (
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              +{challenge.required_technologies.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800/80">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Budget</span>
            <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white truncate">
              {formatBudget(challenge.budget_max)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Proposals</span>
            <p className="mt-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {challenge.applications_count || 0}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Duration</span>
            <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">
              {challenge.pilot_duration_days}d
            </p>
          </div>
        </div>

        {/* Action Button Links */}
        <div className="mt-4 flex items-center justify-between gap-2">
          {challenge.status === "DRAFT" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/government/challenges/${challenge.id}/edit`);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Edit Draft
              </button>
              <button
                onClick={onPublish}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                <Check className="h-3.5 w-3.5" />
                Publish
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/government/challenges/${challenge.id}/applications`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
            >
              <Users className="h-3.5 w-3.5" />
              Proposals ({challenge.applications_count || 0})
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/government/challenges/${challenge.id}/overview`);
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Pipeline
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */
function StatusBadge({ status }) {
  if (!status) return null;

  const config = {
    PUBLISHED: {
      label: "Published",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
    },
    DRAFT: {
      label: "Draft",
      className:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    },
    EVALUATION: {
      label: "In Evaluation",
      className:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-800",
    },
    PILOT: {
      label: "Sandbox Pilot",
      className:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
    },
    COMPLETED: {
      label: "Completed",
      className:
        "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-800",
    },
    CLOSED: {
      label: "Closed",
      className:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
    },
  };

  const current = config[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${current.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {current.label}
    </span>
  );
}
