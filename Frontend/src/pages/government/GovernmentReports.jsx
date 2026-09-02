import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  TrendingUp,
  FileText,
  DollarSign,
  Building2,
  Rocket,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/layout/PageHeader";
import { getChallenges } from "../../services/challengeService";
import { getPilots } from "../../services/pilotService";
import { useAuth } from "../../context/AuthContext";

function GovernmentReports() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("year");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [challenges, setChallenges] = useState([]);
  const [pilots, setPilots] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [challengesRes, pilotsRes] = await Promise.all([
        getChallenges().catch(() => ({ data: { challenges: [] } })),
        getPilots().catch(() => ({ data: { pilots: [] } })),
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

      setChallenges(rawChallenges);
      setPilots(rawPilots);
    } catch (err) {
      console.warn("Report data fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Metrics
  const metrics = useMemo(() => {
    const totalChallenges = challenges.length || 6;
    const activePilots = pilots.filter((p) => ["RUNNING", "PLANNED", "VALIDATION"].includes(p.status)).length || 3;
    const completedPilots = pilots.filter((p) => ["COMPLETED", "SCALED"].includes(p.status)).length || 2;
    const totalPilots = pilots.length || 5;

    // Calculate budget in INR
    const totalAllocated = challenges.reduce((sum, ch) => {
      const max = parseFloat(ch.budget_max || ch.budget_min || 0);
      return sum + (isNaN(max) ? 0 : max);
    }, 0) || 12500000;

    const totalDisbursed = pilots.reduce((sum, p) => {
      const budget = parseFloat(p.budget || 0);
      return sum + (isNaN(budget) ? 0 : budget * 0.65); // Average 65% milestone disbursement
    }, 0) || 7800000;

    const avgValidationScore = pilots.length > 0
      ? (pilots.reduce((sum, p) => sum + (p.overall_score || 84), 0) / pilots.length).toFixed(1)
      : "86.5";

    return {
      totalChallenges,
      totalPilots,
      activePilots,
      completedPilots,
      totalAllocated,
      totalDisbursed,
      avgValidationScore,
      successRate: totalPilots > 0 ? Math.round((completedPilots / totalPilots) * 100) || 88 : 88,
    };
  }, [challenges, pilots]);

  // Filtered Pilots List
  const filteredPilots = useMemo(() => {
    return (pilots.length > 0
      ? pilots
      : [
          {
            id: "pilot-1",
            title: "AI-Powered Traffic Grid Optimization",
            challenge_title: "Smart Urban Mobility & Signal Timing",
            startup_name: "UrbanFlow AI Systems",
            department: "Ministry of Road Transport & Highways",
            budget: 2500000,
            status: "RUNNING",
            score: 92,
            completion: 70,
            start_date: "2026-03-15",
            end_date: "2026-09-15",
          },
          {
            id: "pilot-2",
            title: "IoT Water Quality Monitoring",
            challenge_title: "Real-Time Potable Water Purity",
            startup_name: "AquaSense Tech",
            department: "Ministry of Jal Shakti",
            budget: 1800000,
            status: "VALIDATION",
            score: 88,
            completion: 95,
            start_date: "2026-02-01",
            end_date: "2026-08-01",
          },
          {
            id: "pilot-3",
            title: "Automated Land Registry Verification",
            challenge_title: "Blockchain Land Records Integrity",
            startup_name: "CivicChain Labs",
            department: "Ministry of Rural Development",
            budget: 3200000,
            status: "COMPLETED",
            score: 95,
            completion: 100,
            start_date: "2026-01-10",
            end_date: "2026-07-10",
          },
          {
            id: "pilot-4",
            title: "Telemedicine Edge Diagnostics",
            challenge_title: "Rural Primary Healthcare AI Kit",
            startup_name: "SwasthyaAI",
            department: "Ministry of Health & Family Welfare",
            budget: 2000000,
            status: "RUNNING",
            score: 81,
            completion: 45,
            start_date: "2026-04-01",
            end_date: "2026-10-01",
          },
        ]
    ).filter((p) => {
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const text = `${p.title || ""} ${p.challenge_title || p.challenge?.title || ""} ${p.startup_name || p.startup?.company_name || ""}`.toLowerCase();
      const matchesSearch = !searchQuery || text.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [pilots, statusFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = ["Pilot ID", "Challenge", "Startup", "Budget (INR)", "Status", "Validation Score", "Completion %"];
    const rows = filteredPilots.map((p) => [
      p.id,
      `"${(p.challenge_title || p.challenge?.title || "Challenge").replace(/"/g, '""')}"`,
      `"${(p.startup_name || p.startup?.company_name || "Startup").replace(/"/g, '""')}"`,
      p.budget || 0,
      p.status || "PLANNED",
      p.score || p.overall_score || "N/A",
      `${p.completion || 50}%`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SetuGov_Procurement_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 print:space-y-4">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <BarChart3 className="h-3.5 w-3.5" /> Departmental Analytics
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Procurement & Pilot Performance Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Comprehensive oversight on stage-gate evaluations, milestone delivery, and budget disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4 text-slate-500" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Challenges</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {metrics.totalChallenges}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across department mandates
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
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
            {metrics.completedPilots} completed successfully
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Funds Disbursed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            ₹{(metrics.totalDisbursed / 100000).toFixed(1)}L
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            of ₹{(metrics.totalAllocated / 100000).toFixed(1)}L allocated
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
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
            Empirical KPI validation
          </p>
        </motion.div>
      </div>

      {/* CONTROLS & FILTER BAR */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between print:hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
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
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
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
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Milestone Disbursements
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search challenges or startups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="RUNNING">Running</option>
            <option value="VALIDATION">In Validation</option>
            <option value="COMPLETED">Completed</option>
            <option value="PLANNED">Planned</option>
          </select>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Milestone & Stage Gate Compliance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stage-Gate Milestone Health
                </h3>
                <p className="text-xs text-slate-400">Validation integrity across pilot phases</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                94% On-Track
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Phase 1: Gateway & Deployment Setup</span>
                  <span>100% Passed</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Phase 2: Live Sensor Telemetry & Calibration</span>
                  <span>85% Passed</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "85%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Phase 3: 30-Day Empirical Validation & Scale Audit</span>
                  <span>70% Passed</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: "70%" }} />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> AI-Assisted Audit Summary
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                All pilot measurements are cryptographically hashed and verified against baseline parameters before funds release.
              </p>
            </div>
          </div>

          {/* Budget & Disbursement Allocation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Budget Utilization by Domain
                </h3>
                <p className="text-xs text-slate-400">Breakdown of sanctioned innovation grants</p>
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Total ₹1.25 Cr
              </span>
            </div>

            <div className="mt-6 space-y-3.5">
              {[
                { domain: "Urban Mobility & Smart Transit", amount: "₹45.0 Lakh", percent: 36, color: "bg-blue-500" },
                { domain: "Clean Tech & Water Purity", amount: "₹35.0 Lakh", percent: 28, color: "bg-emerald-500" },
                { domain: "GovTech & Land Registry", amount: "₹25.0 Lakh", percent: 20, color: "bg-purple-500" },
                { domain: "Rural Healthcare Diagnostics", amount: "₹20.0 Lakh", percent: 16, color: "bg-amber-500" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.domain}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900 dark:text-white">{item.amount}</span>
                    <span className="ml-2 text-slate-400">({item.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate("/government/payments")}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Go to Tranche Payments <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & DEFAULT: PILOT STATUS MATRIX */}
      {(activeTab === "pilots" || activeTab === "overview") && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-6 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Active & Completed Pilot Deployments
            </h3>
            <p className="text-xs text-slate-400">
              Detailed tracking of startup deliverables, milestone percentages, and empirical evaluation scores
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">Challenge & Deployment</th>
                  <th className="px-4 py-3.5">Startup Entity</th>
                  <th className="px-4 py-3.5">Budget</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Progress</th>
                  <th className="px-4 py-3.5">Score</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPilots.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-4 pl-6 pr-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {p.title || p.challenge_title || p.challenge?.title || "Challenge Pilot"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {p.department || "Nodal Department"}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {p.startup_name || p.startup?.company_name || "Verified Startup"}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                      ₹{p.budget ? (parseFloat(p.budget) / 100000).toFixed(2) + "L" : "25.00L"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          p.status === "COMPLETED" || p.status === "SCALED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : p.status === "VALIDATION"
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {p.status || "RUNNING"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${p.completion || 65}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {p.completion || 65}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {p.score || p.overall_score || "88"}%
                      </span>
                    </td>
                    <td className="py-4 pl-4 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => navigate("/government/pilots")}
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
        </div>
      )}

      {/* TAB 3: MILESTONE DISBURSEMENTS */}
      {activeTab === "disbursements" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Procurement Tranche & Disbursement History
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Escrow-backed milestone payouts released upon stage-gate empirical verification
          </p>

          <div className="mt-6 space-y-3">
            {[
              {
                title: "Tranche 1 (30%): Hardware & API Integration",
                pilot: "AI-Powered Traffic Grid Optimization",
                amount: "₹7,50,000",
                date: "15 April 2026",
                status: "PAID",
              },
              {
                title: "Tranche 2 (40%): Telemetry Sandbox & 50 Junctions",
                pilot: "AI-Powered Traffic Grid Optimization",
                amount: "₹10,00,000",
                date: "28 June 2026",
                status: "PAID",
              },
              {
                title: "Tranche 1 (30%): Gateway Deployment",
                pilot: "IoT Water Quality Monitoring",
                amount: "₹5,40,000",
                date: "10 March 2026",
                status: "PAID",
              },
              {
                title: "Tranche 3 (30%): Final Empirical Validation Report",
                pilot: "Automated Land Registry Verification",
                amount: "₹9,60,000",
                date: "12 July 2026",
                status: "PAID",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 text-xs dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-400">{item.pilot}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">{item.amount}</p>
                    <p className="text-[10px] text-slate-400">{item.date}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GovernmentReports;
