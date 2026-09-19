import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
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
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getGovernmentAnalytics } from "../../services/challengeService";
import { getPilots } from "../../services/pilotService";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/common/Pagination";
import { formatPilotStatus } from "../../utils/filterUtils";

function GovernmentReports() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        getGovernmentAnalytics(analyticsParams),
        getPilots()
      ]);

      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      } else if (analyticsRes?.metrics) {
        setAnalytics(analyticsRes);
      }

      const rawPilots =
        pilotsRes?.data?.pilots ||
        pilotsRes?.pilots ||
        (Array.isArray(pilotsRes?.data) ? pilotsRes.data : []) ||
        [];

      setPilots(rawPilots);
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
    const activePilots = analytics?.metrics?.active_pilots ?? pilots.filter((p) => ["RUNNING", "PLANNED", "VALIDATION"].includes(p.status)).length;
    const completedPilots = analytics?.metrics?.completed_pilots ?? pilots.filter((p) => ["COMPLETED", "SCALED"].includes(p.status)).length;
    const totalPilots = analytics?.metrics?.total_pilots ?? pilots.length;

    const totalAllocated = analytics?.budget?.allocated_budget ?? 0;
    const totalDisbursed = analytics?.budget?.paid_amount ?? 0;
    const pendingDisbursement = analytics?.budget?.pending_amount ?? 0;
    const remainingBudget = analytics?.budget?.remaining_amount ?? Math.max(0, totalAllocated - totalDisbursed);

    const rawAvgScore = analytics?.metrics?.avg_validation_score;
    let avgValidationScore = "0.0";
    if (rawAvgScore != null && Number(rawAvgScore) > 0) {
      avgValidationScore = Number(rawAvgScore).toFixed(1);
    } else {
      const scores = pilots.filter((p) => p.overall_score != null).map((p) => Number(p.overall_score));
      if (scores.length > 0) {
        avgValidationScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      }
    }

    const successRate = totalPilots > 0 ? Math.round((completedPilots / totalPilots) * 100) : 0;
    const utilizationPercentage = analytics?.budget?.utilization_percentage ?? (totalAllocated > 0 ? Math.round((totalDisbursed / totalAllocated) * 100) : 0);

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
      pilotsAtRisk: analytics?.metrics?.pilots_at_risk || 0
    };
  }, [analytics, pilots]);

  // Real Filtered Pilots List
  const filteredPilots = useMemo(() => {
    return pilots.filter((p) => {
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const text = `${p.title || ""} ${p.challenge?.title || ""} ${p.startup?.company_name || ""}`.toLowerCase();
      const matchesSearch = !searchQuery || text.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
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
    const list = [];
    pilots.forEach((p) => {
      (p.payments || []).forEach((pay) => {
        list.push({
          id: pay.id,
          pilotTitle: p.title || p.challenge?.title || "Pilot Project",
          startupName: p.startup?.company_name || "Not specified",
          amount: pay.amount || 0,
          status: pay.status || "PENDING",
          trancheNumber: pay.tranche_number,
          releaseDate: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString("en-IN") : (pay.created_at ? new Date(pay.created_at).toLocaleDateString("en-IN") : "Scheduled"),
          remarks: pay.milestone?.name || pay.reference_number || `Tranche Milestone Payment`
        });
      });
    });
    return list;
  }, [pilots]);

  const paginatedDisbursements = useMemo(() => {
    const start = (disbursementPage - 1) * disbursementPageSize;
    return allPayments.slice(start, start + disbursementPageSize);
  }, [allPayments, disbursementPage, disbursementPageSize]);

  const handleExportCSV = () => {
    const headers = ["Pilot ID", "Challenge", "Startup", "Budget (INR)", "Status", "Validation Score", "Created Date"];
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
    link.setAttribute("download", `SetuGov_Department_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !analytics && pilots.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
        <p className="text-sm font-medium text-slate-500">Loading government analytics and reports...</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-950/30">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-2 text-sm font-bold text-red-800 dark:text-red-200">Unable to load report data</h3>
        <p className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p>
        <button
          onClick={fetchReportData}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 print:space-y-4">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <BarChart3 className="h-3.5 w-3.5" /> Departmental Analytics
          </span>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Procurement & Pilot Performance Reports
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {user?.department?.name
              ? `Department-scoped oversight for ${user.department.name}.`
              : "Live database oversight on departmental challenges, stage-gate milestones, and disbursements."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4 text-slate-500" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
          >
            <Printer className="h-4 w-4 text-white" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* DATE RANGE FILTER BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Date Filter:</span>
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "ALL", label: "All Time" },
                { id: "30D", label: "Last 30 Days" },
                { id: "90D", label: "Last 90 Days" },
                { id: "YEAR", label: "This Year" }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDatePresetChange(p.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    datePreset === p.id
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset("CUSTOM");
                  setStartDate(e.target.value);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset("CUSTOM");
                  setEndDate(e.target.value);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={fetchReportData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Apply
            </button>
          </div>
        </div>

        {dateError && (
          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{dateError}</p>
        )}
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Department Challenges</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {metrics.totalChallenges}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {analytics?.metrics?.published_challenges ? `${analytics.metrics.published_challenges} published` : "Challenges in department"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Pilots</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Rocket className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {metrics.activePilots}
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            {metrics.completedPilots > 0 ? `${metrics.completedPilots} completed successfully` : `${metrics.totalPilots} total pilots`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Actual Paid Funds</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            ₹{Number(metrics.totalDisbursed).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            of ₹{Number(metrics.totalAllocated).toLocaleString("en-IN")} allocated ({metrics.utilizationPercentage}% utilized)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Validation Score</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {metrics.avgValidationScore}%
          </p>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
            Verified stage-gate validations
          </p>
        </motion.div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Overview & Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pilots")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "pilots"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Pilot Status Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("disbursements")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "disbursements"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Milestone Disbursements
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stage-Gate Validation Summary
                </h3>
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
                    style={{ width: `${metrics.totalPilots > 0 ? (metrics.activePilots / metrics.totalPilots) * 100 : 0}%` }}
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
                    style={{ width: `${metrics.totalPilots > 0 ? (metrics.completedPilots / metrics.totalPilots) * 100 : 0}%` }}
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
                    style={{ width: `${metrics.totalPilots > 0 ? (metrics.pilotsAtRisk / metrics.totalPilots) * 100 : 0}%` }}
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Budget Utilization
                </h3>
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
                  <span className="font-medium text-slate-700 dark:text-slate-300">Pending / Upcoming Amount</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{Number(metrics.pendingDisbursement).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Remaining Budget</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{Number(metrics.remainingBudget).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate("/government/payments")}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Active & Completed Pilot Deployments
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Tracking startup deliverables, milestone completions, and empirical evaluation scores from database
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search challenges or startups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]"
              >
                <option value="ALL">All Status</option>
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
          </div>

          {filteredPilots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No pilot records found</p>
              <p className="mt-1 text-xs text-slate-400">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try clearing your search or status filter."
                  : "When pilot projects are sanctioned from selected startup proposals, they will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">Challenge & Deployment</th>
                    <th className="px-4 py-3.5">Startup Entity</th>
                    <th className="px-4 py-3.5">Budget</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Validation Score</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPilots.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
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
                          onClick={() => navigate(`/government/challenges/${p.challenge_id || p.challenge?.id || ""}/pilot`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
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

          <Pagination
            currentPage={pilotPage}
            totalItems={filteredPilots.length}
            pageSize={pilotPageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={setPilotPage}
            onPageSizeChange={setPilotPageSize}
            itemName="pilots"
            className="mt-4"
          />
        </div>
      )}

      {/* TAB 3: MILESTONE DISBURSEMENTS */}
      {activeTab === "disbursements" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Procurement Tranche & Disbursement History
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Real Payment records recorded for departmental pilots
          </p>

          {allPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">No payment records found</p>
              <p className="mt-1 text-xs text-slate-400">
                Payment disbursements released against milestone stage-gates will be listed here.
              </p>
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
                    <p className="text-[11px] text-slate-400">{pay.pilotTitle} · {pay.startupName}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">₹{Number(pay.amount).toLocaleString("en-IN")}</p>
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
        </div>
      )}
    </div>
  );
}

export default GovernmentReports;
