import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ClipboardCheck,
  FlaskConical,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  Inbox,
  Search,
  Filter,
  X,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import PageHeader from "../../components/layout/PageHeader";
import { getChallenges, getGovernmentAnalytics } from "../../services/challengeService";
import { getPilots } from "../../services/pilotService";
import { useAuth } from "../../context/AuthContext";

const kpiIcons = {
  challenges: FileText,
  applications: ClipboardCheck,
  pilots: FlaskConical,
  "at-risk": AlertTriangle,
};

const kpiRoutes = {
  challenges: "/government/challenges",
  applications: "/government/applications",
  pilots: "/government/pilots",
  "at-risk": "/government/pilots?status=AT_RISK",
};

function GovernmentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setState("loading");
      setError("");

      const [challengesRes, pilotsRes, analyticsRes] = await Promise.all([
        getChallenges().catch(() => ({ data: { challenges: [] } })),
        getPilots().catch(() => ({ data: { pilots: [] } })),
        getGovernmentAnalytics().catch(() => null),
      ]);

      const rawChallenges =
        challengesRes?.data?.challenges ||
        challengesRes?.challenges ||
        (Array.isArray(challengesRes?.data) ? challengesRes.data : []) ||
        [];

      const rawPilots =
        pilotsRes?.data?.pilots ||
        pilotsRes?.pilots ||
        (Array.isArray(pilotsRes?.data) ? pilotsRes.data : []) ||
        [];

      const analyticsData = analyticsRes?.data || analyticsRes || null;
      if (analyticsData) {
        setAnalytics(analyticsData);
      }

      // Calculate total applications
      const totalApplications = analyticsData?.overview?.total_applications ?? rawChallenges.reduce((sum, ch) => {
        const count = ch._count?.applications ?? (Array.isArray(ch.applications) ? ch.applications.length : 0);
        return sum + count;
      }, 0);

      // Pilot status counts
      const atRiskPilots = analyticsData?.overview?.at_risk_pilots ?? rawPilots.filter((p) => p.status === "AT_RISK").length;
      const onTrackPilots = rawPilots.filter((p) => ["RUNNING", "VALIDATION", "SCALED", "COMPLETED"].includes(p.status)).length;
      const criticalPilots = rawPilots.filter((p) => p.status === "STOPPED").length;

      const formattedChallenges = rawChallenges.map((ch) => ({
        id: ch.id,
        title: ch.title,
        description: ch.problem_description || "",
        department: ch.department?.name || user?.department?.name || "Government",
        applications: ch._count?.applications ?? (Array.isArray(ch.applications) ? ch.applications.length : 0),
        stage: ch.status,
        status: ch.status,
        budget: ch.budget_max ? `₹${Number(ch.budget_max).toLocaleString("en-IN")}` : "—",
        application_deadline: ch.application_deadline,
      }));

      const dashboardData = {
        user: {
          name: user?.name || "Government Official",
          email: user?.email || "",
          role: "Government Officer",
        },
        kpis: [
          {
            id: "challenges",
            label: "Total Challenges",
            value: analyticsData?.overview?.total_challenges ?? rawChallenges.length,
            trend: "up",
            href: kpiRoutes.challenges,
          },
          {
            id: "applications",
            label: "Proposals Received",
            value: totalApplications,
            trend: "up",
            href: kpiRoutes.applications,
          },
          {
            id: "pilots",
            label: "Active Pilots",
            value: analyticsData?.overview?.total_pilots ?? rawPilots.length,
            trend: "up",
            href: kpiRoutes.pilots,
          },
          {
            id: "at-risk",
            label: "At-Risk Pilots",
            value: atRiskPilots,
            trend: atRiskPilots > 0 ? "down" : "neutral",
            href: kpiRoutes["at-risk"],
          },
        ],
        challenges: formattedChallenges,
        pilotHealth: {
          onTrack: onTrackPilots,
          atRisk: atRiskPilots,
          critical: criticalPilots,
        },
      };

      setData(dashboardData);
      setState("success");
    } catch (err) {
      setError(err?.message || "Unable to load dashboard data.");
      setState("error");
    }
  };

  const handleCreateChallenge = () => {
    navigate("/government/challenges/new");
  };

  const handleSelectChallenge = (id) => {
    navigate(`/government/challenges/${id}`);
  };

  return (
    <AppLayout role="government">
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <PageHeader
          title={`Welcome, ${user?.name || "Officer"}`}
          description="Real-time innovation procurement monitoring, startup matching, and milestone intelligence."
          action="Create Challenge"
          actionIcon={Plus}
          onAction={handleCreateChallenge}
        />

        {/* Loading */}
        {state === "loading" && <DashboardSkeleton />}

        {/* Error */}
        {state === "error" && (
          <ErrorState message={error} onRetry={loadDashboard} />
        )}

        {/* Success */}
        {state === "success" && data && (
          <>
            {/* KPI Cards */}
            <section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {data.kpis?.map((kpi, index) => (
                  <KPICard key={kpi.id} data={kpi} index={index} />
                ))}
              </div>
            </section>

            {/* Financial & Milestone Intelligence */}
            {analytics?.financials && (
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department Budget Utilization</p>
                      <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{Number(analytics.financials.total_paid_budget || 0).toLocaleString("en-IN")}
                        <span className="text-sm font-normal text-slate-400"> / ₹{Number(analytics.financials.total_allocated_budget || 0).toLocaleString("en-IN")}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {analytics.financials.budget_utilization_rate}% Disbursed
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Number(analytics.financials.budget_utilization_rate || 0))}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between text-xs text-slate-400">
                    <span>Disbursed: ₹{Number(analytics.financials.total_paid_budget || 0).toLocaleString("en-IN")}</span>
                    <span>Pending: ₹{Number(analytics.financials.total_pending_budget || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Milestone Execution Rate</p>
                      <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {analytics.milestone_analytics?.completed_milestones || 0}
                        <span className="text-sm font-normal text-slate-400"> / {analytics.milestone_analytics?.total_milestones || 0} Delivered</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {analytics.milestone_analytics?.completion_rate || 0}% Complete
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, Number(analytics.milestone_analytics?.completion_rate || 0))}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between text-xs text-slate-400">
                    <span>In Progress: {analytics.milestone_analytics?.in_progress_milestones || 0}</span>
                    <span>Pending: {analytics.milestone_analytics?.pending_milestones || 0}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Pilot Health */}
            <PilotHealth data={data.pilotHealth} />

            {/* Procurement Challenges */}
            <ChallengeTable
              challenges={data.challenges || []}
              onCreateChallenge={handleCreateChallenge}
              onSelectChallenge={handleSelectChallenge}
            />

            {/* Primary CTA */}
            <CreateChallengeCTA onClick={handleCreateChallenge} />
          </>
        )}
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------ */
/* KPI CARD */
/* ------------------------------------------------ */

function KPICard({ data, index }) {
  const Icon = kpiIcons[data.id] || FileText;
  const href = data.href || kpiRoutes[data.id] || "/government/challenges";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
      }}
    >
      <Link
        to={href}
        aria-label={`${data.label}: ${data.value}`}
        className="group block cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 sm:p-4.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-950"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-indigo-950/40 dark:group-hover:text-indigo-400">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-500" />
        </div>

        <div className="mt-3">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {data.label}
          </p>
          <div className="mt-0.5 flex items-end justify-between gap-3">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {data.value}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------ */
/* CHALLENGE TABLE */
/* ------------------------------------------------ */

function ChallengeTable({ challenges, onCreateChallenge, onSelectChallenge }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("default");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Dynamic unique departments from actual challenge data
  const departments = useMemo(() => {
    const set = new Set();
    challenges.forEach((ch) => {
      if (ch.department && ch.department !== "—") {
        set.add(ch.department);
      }
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [challenges]);

  // Filtered and sorted challenges
  const filteredChallenges = useMemo(() => {
    let result = challenges.filter((ch) => {
      // Search matching (case-insensitive)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesTitle = ch.title?.toLowerCase().includes(q);
        const matchesDesc = ch.description?.toLowerCase().includes(q);
        const matchesDept = ch.department?.toLowerCase().includes(q);
        const matchesStatus = ch.status?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesDept && !matchesStatus) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL" && ch.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== "ALL" && ch.department !== departmentFilter) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === "proposals-desc") {
      result = [...result].sort((a, b) => (b.applications || 0) - (a.applications || 0));
    } else if (sortBy === "title-asc") {
      result = [...result].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return result;
  }, [challenges, searchQuery, statusFilter, departmentFilter, sortBy]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter, sortBy]);

  const totalPages = Math.ceil(filteredChallenges.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedChallenges = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredChallenges.slice(start, start + pageSize);
  }, [filteredChallenges, safePage, pageSize]);

  const activeFiltersCount =
    (statusFilter !== "ALL" ? 1 : 0) +
    (departmentFilter !== "ALL" ? 1 : 0) +
    (sortBy !== "default" ? 1 : 0);

  const isFiltered = activeFiltersCount > 0 || searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setSortBy("default");
    setCurrentPage(1);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Table Header with Search & Filter Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Procurement Challenges
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {filteredChallenges.length}
              {isFiltered && ` of ${challenges.length}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Active department problem statements and capability matching.
          </p>
        </div>

        {/* Toolbar: Searchbar + Filter Button + Quick Clear */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Searchbar */}
          <div className="relative min-w-[200px] flex-1 sm:w-64 md:w-72 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges, departments..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              showFilters || activeFiltersCount > 0
                ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white dark:bg-indigo-500">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                showFilters ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
              }`}
            />
          </button>

          {/* Quick Clear Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              title="Clear all filters"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-slate-200 bg-slate-50/75 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="ALL">All Status</option>
                  <option value="PUBLISHED">Open / Published</option>
                  <option value="EVALUATION">In Evaluation</option>
                  <option value="PILOT">Pilot Stage</option>
                  <option value="DRAFT">Draft</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Department:</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="max-w-[200px] truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === "ALL" ? "All Departments" : dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="default">Default</option>
                  <option value="proposals-desc">Most Proposals</option>
                  <option value="title-asc">Title (A-Z)</option>
                </select>
              </div>

              {/* Reset action */}
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="ml-auto inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Content or Empty States */}
      {challenges.length === 0 ? (
        <EmptyChallenges onCreateChallenge={onCreateChallenge} />
      ) : filteredChallenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
            No matching challenges
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            No challenges match your search query or selected filter criteria.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed">
            <colgroup>
              <col className="w-[44%]" />
              <col className="w-[25%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-200 text-left text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
                <TableHeading className="w-[44%]">Challenge</TableHeading>
                <TableHeading className="w-[25%]">Department</TableHeading>
                <TableHeading className="w-[14%]">Applications</TableHeading>
                <TableHeading className="w-[11%]">Status</TableHeading>
                <TableHeading className="w-[6%] text-center">Action</TableHeading>
              </tr>
            </thead>

            <tbody>
              {paginatedChallenges.map((challenge) => (
                <ChallengeRow
                  key={challenge.id}
                  challenge={challenge}
                  onSelectChallenge={onSelectChallenge}
                />
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {filteredChallenges.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              {/* Count & Page Size */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
                  <span className="text-slate-400">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous Page"
                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      if (
                        totalPages > 7 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages &&
                        Math.abs(pageNum - safePage) > 1
                      ) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span key={pageNum} className="px-1 text-xs text-slate-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      const isActive = pageNum === safePage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`flex h-8 min-w-[32px] items-center justify-center rounded-xl px-2 text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next Page"
                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}

function TableHeading({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 ${className}`}
    >
      {children}
    </th>
  );
}

function ChallengeRow({ challenge, onSelectChallenge }) {
  const count = Number(challenge.applications ?? challenge._count?.applications ?? 0);
  const proposalsLabel = `${count} ${count === 1 ? "proposal" : "proposals"}`;

  return (
    <tr
      onClick={() => onSelectChallenge(challenge.id)}
      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50"
    >
      <td className="px-4 py-2.5">
        <div className="min-w-0 overflow-hidden">
          <p
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug"
            title={challenge.title}
          >
            {challenge.title}
          </p>
          {challenge.description && (
            <p
              className="mt-0.5 truncate text-xs text-slate-400"
              title={challenge.description}
            >
              {challenge.description}
            </p>
          )}
        </div>
      </td>

      <td className="px-4 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        <span className="block leading-snug break-words">
          {challenge.department}
        </span>
      </td>

      <td className="px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap">
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {proposalsLabel}
        </span>
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap">
        <StatusBadge status={challenge.status} />
      </td>

      <td className="px-4 py-2.5 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectChallenge(challenge.id);
          }}
          aria-label={`View details for ${challenge.title}`}
          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;

  const statusMap = {
    PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    EVALUATION: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-800",
    PILOT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
    COMPLETED: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-800",
    CLOSED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
  };

  const badgeClass = statusMap[status] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------ */
/* PILOT HEALTH */
/* ------------------------------------------------ */

function PilotHealth({ data }) {
  const total = (data?.onTrack || 0) + (data?.atRisk || 0) + (data?.critical || 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h2 className="font-semibold text-slate-900 dark:text-white">Pilot Health Summary</h2>
        <p className="mt-1 text-xs text-slate-400">
          Tracking milestone KPI delivery across active sandbox pilots.
        </p>

        <div className="mt-6 space-y-4">
          <HealthItem
            label="On Track / Validated"
            count={data?.onTrack || 0}
            total={total}
            color="bg-emerald-500"
          />

          <HealthItem
            label="At Risk (Needs Attention)"
            count={data?.atRisk || 0}
            total={total}
            color="bg-amber-500"
          />

          <HealthItem
            label="Critical / Stopped"
            count={data?.critical || 0}
            total={total}
            color="bg-red-500"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        Total {total} tracked pilot project{total === 1 ? "" : "s"} across statewide departments.
      </div>
    </motion.section>
  );
}

function HealthItem({ label, count, total, color }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold">{count}</span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------ */
/* CTA & STATES */
/* ------------------------------------------------ */

function CreateChallengeCTA({ onClick }) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 p-6 dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-blue-950/20 sm:flex-row">
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Have an operational problem in your department?
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Use the AI Challenge Copilot to define measurable outcomes and discover verified startups.
        </p>
      </div>

      {/* <button
        type="button"
        onClick={onClick}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4" />
        New Challenge
      </button> */}
    </div>
  );
}

function EmptyChallenges({ onCreateChallenge }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">No Challenges Found</h3>
      <p className="mt-1 text-xs text-slate-400">
        Get started by creating your department's first innovation challenge.
      </p>
      <button
        type="button"
        onClick={onCreateChallenge}
        className="btn-primary mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        Create Challenge
      </button>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-950/30">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
      <h3 className="mt-3 text-sm font-semibold text-red-800 dark:text-red-300">
        Failed to load dashboard data
      </h3>
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default GovernmentDashboard;
