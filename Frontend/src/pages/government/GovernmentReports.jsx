import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Download,
  Printer,
  FileText,
  DollarSign,
  Rocket,
  ShieldCheck,
  Search,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  TrendingUp,
  Filter,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { getGovernmentAnalytics } from "../../services/challengeService";
import { getPilots } from "../../services/pilotService";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/common/Pagination";
import StatCard from "../../components/common/StatCard";
import { formatPilotStatus } from "../../utils/filterUtils";

function GovernmentReports() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Date Range Filters
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");

  const [pilotPage, setPilotPage] = useState(1);
  const [pilotPageSize, setPilotPageSize] = useState(10);
  const [disbursementPage, setDisbursementPage] = useState(1);
  const [disbursementPageSize, setDisbursementPageSize] = useState(10);

  const [analytics, setAnalytics] = useState(null);
  const [pilots, setPilots] = useState([]);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setDateError("");
    const now = new Date();

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "30D") {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "90D") {
      const d = new Date();
      d.setDate(now.getDate() - 90);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "YEAR") {
      const d = new Date(now.getFullYear(), 0, 1);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const fetchReportData = useCallback(async () => {
    try {
      if (startDate && endDate && startDate > endDate) {
        setDateError("Start date cannot be after end date");
        return;
      }
      setDateError("");

      setLoading(true);
      setError(null);

      const analyticsParams = {};
      if (startDate) analyticsParams.start_date = startDate;
      if (endDate) analyticsParams.end_date = endDate;

      const [analyticsRes, pilotsRes] = await Promise.all([
        getGovernmentAnalytics(analyticsParams).catch((err) => {
          console.warn("Analytics fetch error:", err);
          return null;
        }),
        getPilots().catch((err) => {
          console.warn("Pilots fetch error:", err);
          return null;
        }),
      ]);

      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      } else if (analyticsRes?.metrics) {
        setAnalytics(analyticsRes);
      } else {
        setAnalytics(null);
      }

      const rawPilots =
        pilotsRes?.data?.pilots ||
        pilotsRes?.pilots ||
        (Array.isArray(pilotsRes?.data) ? pilotsRes.data : []) ||
        (Array.isArray(pilotsRes) ? pilotsRes : []);

      setPilots(Array.isArray(rawPilots) ? rawPilots : []);
    } catch (err) {
      console.error("Failed to load government reports:", err);
      setError(err?.message || "Failed to load report data from the server.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Real Database Authoritative Aggregated Metrics
  const metrics = useMemo(() => {
    const totalChallenges = analytics?.metrics?.total_challenges ?? 0;
    const activePilots =
      analytics?.metrics?.active_pilots ??
      (Array.isArray(pilots)
        ? pilots.filter((p) => p && ["RUNNING", "PLANNED", "VALIDATION"].includes(p.status)).length
        : 0);
    const completedPilots =
      analytics?.metrics?.completed_pilots ??
      (Array.isArray(pilots)
        ? pilots.filter((p) => p && ["COMPLETED", "SCALED"].includes(p.status)).length
        : 0);
    const totalPilots =
      analytics?.metrics?.total_pilots ?? (Array.isArray(pilots) ? pilots.length : 0);

    const totalAllocated = Number(analytics?.budget?.allocated_budget) || 0;
    const totalDisbursed = Number(analytics?.budget?.paid_amount) || 0;
    const pendingDisbursement = Number(analytics?.budget?.pending_amount) || 0;
    const remainingBudget =
      Number(analytics?.budget?.remaining_amount) ||
      Math.max(0, totalAllocated - totalDisbursed);

    const rawAvgScore = analytics?.metrics?.avg_validation_score;
    let avgValidationScore = "0.0";
    if (rawAvgScore != null && Number(rawAvgScore) > 0) {
      avgValidationScore = Number(rawAvgScore).toFixed(1);
    } else if (Array.isArray(pilots)) {
      const scores = pilots
        .filter((p) => p && p.overall_score != null)
        .map((p) => Number(p.overall_score))
        .filter((s) => !isNaN(s));
      if (scores.length > 0) {
        avgValidationScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      }
    }

    const successRate = totalPilots > 0 ? Math.round((completedPilots / totalPilots) * 100) : 0;
    const utilizationPercentage =
      analytics?.budget?.utilization_percentage ??
      (totalAllocated > 0 ? Math.round((totalDisbursed / totalAllocated) * 100) : 0);

    return {
      totalChallenges,
      totalPilots,
      activePilots,
      completedPilots,
      totalAllocated,
      totalDisbursed,
      pendingDisbursement,
      remainingBudget,
      avgValidationScore,
      successRate,
      utilizationPercentage,
      pilotsAtRisk: Number(analytics?.metrics?.pilots_at_risk) || 0,
    };
  }, [analytics, pilots]);

  // Real Filtered Pilots List
  const filteredPilots = useMemo(() => {
    if (!Array.isArray(pilots)) return [];
    return pilots.filter((p) => {
      if (!p) return false;
      const status = p.status || "PLANNED";
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (p.title || p.challenge?.title || "").toLowerCase();
      const startup = (p.startup?.company_name || "").toLowerCase();
      const desc = (p.challenge?.problem_description || p.description || "").toLowerCase();
      const loc = (p.location || "").toLowerCase();
      return title.includes(q) || startup.includes(q) || desc.includes(q) || loc.includes(q);
    });
  }, [pilots, statusFilter, searchQuery]);

  useEffect(() => {
    setPilotPage(1);
  }, [statusFilter, searchQuery]);

  const paginatedPilots = useMemo(() => {
    const start = (pilotPage - 1) * pilotPageSize;
    return filteredPilots.slice(start, start + pilotPageSize);
  }, [filteredPilots, pilotPage, pilotPageSize]);

  // Real Database Payments Extract
  const allPayments = useMemo(() => {
    if (!Array.isArray(pilots)) return [];
    const list = [];
    pilots.forEach((p) => {
      if (!p) return;
      (p.payments || []).forEach((pay) => {
        if (!pay) return;
        const remarks =
          pay.remarks || pay.milestone?.name || pay.reference_number || "Tranche Milestone Payment";
        const startupName = p.startup?.company_name || "Not specified";
        const pilotTitle = p.title || p.challenge?.title || "Pilot Project";

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            remarks.toLowerCase().includes(q) ||
            startupName.toLowerCase().includes(q) ||
            pilotTitle.toLowerCase().includes(q);
          if (!matches) return;
        }

        list.push({
          id: pay.id || Math.random().toString(),
          pilotTitle,
          startupName,
          amount: Number(pay.amount) || 0,
          status: pay.status || "PENDING",
          trancheNumber: pay.tranche_number,
          releaseDate: pay.payment_date
            ? new Date(pay.payment_date).toLocaleDateString("en-IN")
            : pay.created_at
            ? new Date(pay.created_at).toLocaleDateString("en-IN")
            : "Scheduled",
          remarks,
        });
      });
    });
    return list;
  }, [pilots, searchQuery]);

  const paginatedDisbursements = useMemo(() => {
    const start = (disbursementPage - 1) * disbursementPageSize;
    return allPayments.slice(start, start + disbursementPageSize);
  }, [allPayments, disbursementPage, disbursementPageSize]);

  const handleExportCSV = () => {
    const headers = [
      "Pilot ID",
      "Challenge",
      "Startup",
      "Budget (INR)",
      "Status",
      "Validation Score",
      "Created Date",
    ];
    const rows = filteredPilots.map((p) => [
      p.id,
      `"${(p.challenge?.title || p.title || "Challenge").replace(/"/g, '""')}"`,
      `"${(p.startup?.company_name || "Startup").replace(/"/g, '""')}"`,
      p.budget || 0,
      p.status || "PLANNED",
      p.overall_score || "N/A",
      p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `SetuGov_Department_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeFiltersCount =
    (statusFilter !== "ALL" ? 1 : 0) +
    (datePreset !== "ALL" || Boolean(startDate) || Boolean(endDate) ? 1 : 0);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
    setDateError("");
  };

  const hasZeroData = !loading && !analytics && pilots.length === 0;

  return (
    <AppLayout role="government">
      <div className="space-y-5 sm:space-y-6 print:space-y-4">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <BarChart3 className="h-3.5 w-3.5" /> Departmental Analytics
            </span>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Reports
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {user?.department?.name
                ? `Department-scoped oversight and procurement performance reports for ${user.department.name}.`
                : "Live database oversight on departmental challenges, stage-gate milestones, and disbursements."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* CONTROLS: SEARCH & FILTER TOOLBAR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search reports, challenges, startups, or pilots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search Reports"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-label="Filter reports"
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                showFilters || activeFiltersCount > 0
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
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

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchReportData}
              disabled={loading}
              title="Refresh reports"
              aria-label="Refresh reports"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Expandable Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-slate-100 pt-4 mt-4 dark:border-slate-800/80"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Status Filter */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Pilot Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="mt-1.5 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="RUNNING">Running</option>
                      <option value="VALIDATION">In Validation</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="SCALED">Scaled</option>
                      <option value="EXTENDED">Extended</option>
                      <option value="STOPPED">Stopped</option>
                      <option value="PLANNED">Planned</option>
                      <option value="AT_RISK">At Risk</option>
                    </select>
                  </div>

                  {/* Date Presets */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Time Range
                    </label>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {[
                        { id: "ALL", label: "All Time" },
                        { id: "30D", label: "30 Days" },
                        { id: "90D", label: "90 Days" },
                        { id: "YEAR", label: "This Year" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleDatePresetChange(p.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                            datePreset === p.id
                              ? "bg-indigo-600 text-white font-semibold"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Inputs */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Custom Dates
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setDatePreset("CUSTOM");
                          setStartDate(e.target.value);
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setDatePreset("CUSTOM");
                          setEndDate(e.target.value);
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {dateError && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{dateError}</p>
                )}

                {activeFiltersCount > 0 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filter Indicators */}
          {(searchQuery.trim() || statusFilter !== "ALL" || datePreset !== "ALL" || startDate) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    aria-label="Remove search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    aria-label="Remove status filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {datePreset !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Period: {datePreset}
                  <button
                    onClick={() => setDatePreset("ALL")}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    aria-label="Remove date preset filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ERROR STATE BANNER */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/30 dark:bg-red-950/30">
            <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
            <h2 className="mt-2 text-sm font-bold text-red-800 dark:text-red-200">
              Unable to load live report data
            </h2>
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchReportData}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && !analytics && pilots.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading departmental reports and analytics...
            </p>
          </div>
        ) : hasZeroData ? (
          /* EMPTY STATE (Zero reports exist in system) */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No reports available yet
            </h2>
            <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Reports will appear here when innovation challenges receive proposals and pilot deployments are approved.
            </p>
            <button
              onClick={() => navigate("/government/challenges/new")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer"
            >
              Create New Challenge
            </button>
          </div>
        ) : (
          /* SUCCESS CONTENT WITH DATA */
          <>
            {/* EXECUTIVE KPI SUMMARY CARDS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                index={0}
                title="Department Challenges"
                value={metrics.totalChallenges}
                description={
                  analytics?.metrics?.published_challenges
                    ? `${analytics.metrics.published_challenges} published`
                    : "Challenges in department"
                }
                icon={FileText}
                color="blue"
              />
              <StatCard
                index={1}
                title="Active Pilots"
                value={metrics.activePilots}
                description={
                  metrics.completedPilots > 0
                    ? `${metrics.completedPilots} completed successfully`
                    : `${metrics.totalPilots} total pilots`
                }
                icon={Rocket}
                color="emerald"
                valueColor="text-emerald-700 dark:text-emerald-400"
              />
              <StatCard
                index={2}
                title="Actual Paid Funds"
                value={`₹${Number(metrics.totalDisbursed).toLocaleString("en-IN")}`}
                description={
                  metrics.totalAllocated > 0
                    ? `${metrics.utilizationPercentage}% of total sanction`
                    : "Disbursed milestone funds"
                }
                icon={DollarSign}
                color="cyan"
              />
              <StatCard
                index={3}
                title="Empirical Success Rate"
                value={`${metrics.successRate}%`}
                description={
                  metrics.avgValidationScore > 0
                    ? `Avg validation score: ${metrics.avgValidationScore}%`
                    : "Based on verified evaluations"
                }
                icon={TrendingUp}
                color="violet"
              />
            </div>

            {/* TABS NAVIGATION */}
            <div className="border-b border-slate-200 dark:border-slate-800 print:hidden">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`border-b-2 py-3 text-xs font-semibold transition cursor-pointer ${
                    activeTab === "overview"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  }`}
                >
                  Overview & Summary
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pilots")}
                  className={`border-b-2 py-3 text-xs font-semibold transition cursor-pointer ${
                    activeTab === "pilots"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  }`}
                >
                  Pilot Matrix ({filteredPilots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("disbursements")}
                  className={`border-b-2 py-3 text-xs font-semibold transition cursor-pointer ${
                    activeTab === "disbursements"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  }`}
                >
                  Milestone Disbursements ({allPayments.length})
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW & ANALYTICS */}
            {activeTab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Stage Gate Milestone Health */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Stage-Gate Validation Summary
                      </h2>
                      <p className="text-xs text-slate-400">Authoritative status counts from database</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      {metrics.totalPilots} Total Pilots
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span>Active & Running Pilots</span>
                        <span>{metrics.activePilots}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${
                              metrics.totalPilots > 0
                                ? (metrics.activePilots / metrics.totalPilots) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span>Completed & Scaled Pilots</span>
                        <span>{metrics.completedPilots}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${
                              metrics.totalPilots > 0
                                ? (metrics.completedPilots / metrics.totalPilots) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span>Pilots At Risk</span>
                        <span>{metrics.pilotsAtRisk}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all duration-500"
                          style={{
                            width: `${
                              metrics.totalPilots > 0
                                ? (metrics.pilotsAtRisk / metrics.totalPilots) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" /> Procurement Audit Guard
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      All milestone payments and stage-gate validations are verified against PostgreSQL records with complete audit trails.
                    </p>
                  </div>
                </div>

                {/* Database Budget Utilization */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Budget Utilization
                      </h2>
                      <p className="text-xs text-slate-400">Verified payment records</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Total ₹{Number(metrics.totalAllocated).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Paid Amount</span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        ₹{Number(metrics.totalDisbursed).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Pending / Upcoming Amount
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        ₹{Number(metrics.pendingDisbursement).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Remaining Budget
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        ₹{Number(metrics.remainingBudget).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => navigate("/government/payments")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Manage Tranche Payments <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PILOT STATUS MATRIX */}
            {activeTab === "pilots" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 p-6 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Active & Completed Pilot Deployments
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Tracking startup deliverables, milestone completions, and empirical evaluation scores from database
                  </p>
                </div>

                {filteredPilots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FolderOpen className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No matching pilot records found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {searchQuery || statusFilter !== "ALL"
                        ? "Try clearing your search or status filter."
                        : "When pilot projects are sanctioned from selected startup proposals, they will appear here."}
                    </p>
                    {(searchQuery || statusFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-200 text-left text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
                        <tr>
                          <th className="py-2.5 pl-6 pr-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Challenge & Deployment</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Startup Entity</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Budget</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Status</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Validation Score</th>
                          <th className="py-2.5 pl-4 pr-6 text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedPilots.map((p, idx) => (
                          <tr
                            key={p.id || idx}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-4 pl-6 pr-4">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {p.title || p.challenge?.title || "Pilot Project"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {p.location || user?.department?.name || "State Nodal Location"}
                              </p>
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-300">
                              {p.startup?.company_name || "Verified Startup"}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                              {p.budget ? `₹${Number(p.budget).toLocaleString("en-IN")}` : "Not specified"}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                  p.status === "COMPLETED" || p.status === "SCALED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : p.status === "VALIDATION" || p.status === "EXTENDED"
                                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                                    : p.status === "AT_RISK" || p.status === "STOPPED"
                                    ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                }`}
                              >
                                {formatPilotStatus(p.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {p.overall_score != null ? `${p.overall_score}%` : "Pending Validation"}
                              </span>
                            </td>
                            <td className="py-4 pl-4 pr-6 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/government/challenges/${p.challenge_id || p.challenge?.id || ""}/pilot`
                                  )
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                              >
                                View <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredPilots.length > 0 && (
                  <Pagination
                    currentPage={pilotPage}
                    totalItems={filteredPilots.length}
                    pageSize={pilotPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                    onPageChange={setPilotPage}
                    onPageSizeChange={setPilotPageSize}
                    itemName="pilots"
                    className="mt-4 p-4 border-t border-slate-100 dark:border-slate-800"
                  />
                )}
              </div>
            )}

            {/* TAB 3: MILESTONE DISBURSEMENTS */}
            {activeTab === "disbursements" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Procurement Tranche & Disbursement History
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Real Payment records recorded for departmental pilots
                </p>

                {allPayments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <DollarSign className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No payment records found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {searchQuery
                        ? "No payment disbursements matched your search term."
                        : "Payment disbursements released against milestone stage-gates will be listed here."}
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {paginatedDisbursements.map((pay, idx) => (
                      <div
                        key={pay.id || idx}
                        className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 text-xs dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{pay.remarks}</p>
                          <p className="text-[11px] text-slate-400">
                            {pay.pilotTitle} · {pay.startupName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-white">
                              ₹{Number(pay.amount).toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-slate-400">{pay.releaseDate}</p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              pay.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : pay.status === "REJECTED"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {pay.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {allPayments.length > 0 && (
                  <Pagination
                    currentPage={disbursementPage}
                    totalItems={allPayments.length}
                    pageSize={disbursementPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                    onPageChange={setDisbursementPage}
                    onPageSizeChange={setDisbursementPageSize}
                    itemName="disbursements"
                    className="mt-6"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default GovernmentReports;
