import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowLeft,
  Eye,
  Download,
  Calendar,
  Building2,
  X,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialCompletedEvaluations = [
  {
    id: 1,
    startupName: "TechNova Solutions",
    challengeTitle: "AI-Based Citizen Grievance Management",
    domain: "Artificial Intelligence",
    submittedDate: "28 Aug 2026",
    overallScore: 88,
    scores: {
      technicalFeasibility: 90,
      innovation: 85,
      expectedImpact: 90,
      scalability: 85,
      costEffectiveness: 90,
    },
    recommendation: "Recommended for Pilot",
    verdict: "Strong technical architecture with proven multilingual NLP capability for regional governance.",
    status: "Completed",
  },
  {
    id: 2,
    startupName: "GreenGrid Technologies",
    challengeTitle: "Smart Waste Collection System",
    domain: "Smart City",
    submittedDate: "25 Aug 2026",
    overallScore: 92,
    scores: {
      technicalFeasibility: 95,
      innovation: 90,
      expectedImpact: 90,
      scalability: 90,
      costEffectiveness: 95,
    },
    recommendation: "Recommended for Pilot",
    verdict: "Exceptional IoT sensor efficiency with low energy consumption and robust mesh routing.",
    status: "Completed",
  },
  {
    id: 3,
    startupName: "AgriConnect Labs",
    challengeTitle: "Agricultural Market Intelligence",
    domain: "Agriculture",
    submittedDate: "20 Aug 2026",
    overallScore: 78,
    scores: {
      technicalFeasibility: 80,
      innovation: 75,
      expectedImpact: 80,
      scalability: 75,
      costEffectiveness: 80,
    },
    recommendation: "Conditional Approval",
    verdict: "Good data predictive model but requires offline syncing capability for deep rural deployment.",
    status: "Completed",
  },
  {
    id: 4,
    startupName: "AeroScan Dynamics",
    challengeTitle: "Drone-Based Infrastructure Surveillance",
    domain: "Drones & Robotics",
    submittedDate: "15 Aug 2026",
    overallScore: 85,
    scores: {
      technicalFeasibility: 85,
      innovation: 90,
      expectedImpact: 85,
      scalability: 80,
      costEffectiveness: 85,
    },
    recommendation: "Recommended for Pilot",
    verdict: "High-accuracy photogrammetry pipeline ready for pilot trial in municipal flyover inspections.",
    status: "Completed",
  },
  {
    id: 5,
    startupName: "CleanWater IoT",
    challengeTitle: "Automated Water Quality Monitoring",
    domain: "Sustainability",
    submittedDate: "10 Aug 2026",
    overallScore: 68,
    scores: {
      technicalFeasibility: 70,
      innovation: 65,
      expectedImpact: 70,
      scalability: 65,
      costEffectiveness: 70,
    },
    recommendation: "Needs Revision",
    verdict: "Sensor calibration drift issues need resolution before municipal deployment.",
    status: "Completed",
  },
];

function EvaluatorEvaluations() {
  const navigate = useNavigate();

  const [evaluations] = useState(initialCompletedEvaluations);
  const [search, setSearch] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState("All");
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  const filtered = useMemo(() => {
    return evaluations.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.startupName.toLowerCase().includes(q) ||
        item.challengeTitle.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q);

      const matchRec =
        recommendationFilter === "All" ||
        item.recommendation === recommendationFilter;

      return matchSearch && matchRec;
    });
  }, [evaluations, search, recommendationFilter]);

  const avgScore = useMemo(() => {
    if (!evaluations.length) return 0;
    const total = evaluations.reduce((sum, item) => sum + item.overallScore, 0);
    return (total / evaluations.length).toFixed(1);
  }, [evaluations]);

  const recommendedCount = useMemo(() => {
    return evaluations.filter((e) => e.recommendation.includes("Recommended")).length;
  }, [evaluations]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER CARD */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() => navigate("/evaluator/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Evaluator Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Evaluation History
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Submitted Evaluations
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                View submitted scores, audit logs, and recommendations for evaluated startup proposals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI METRICS */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            {evaluations.length}
          </p>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Total Evaluations Submitted
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            {avgScore}/100
          </p>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Average Score Given
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            {recommendedCount} Proposals
          </p>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Recommended for Pilot
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by startup name, challenge or domain..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="All">All Recommendations</option>
            <option value="Recommended for Pilot">Recommended for Pilot</option>
            <option value="Conditional Approval">Conditional Approval</option>
            <option value="Needs Revision">Needs Revision</option>
          </select>
        </div>
      </section>

      {/* EVALUATION CARDS */}
      <section className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {item.domain}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      item.recommendation.includes("Recommended")
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : item.recommendation.includes("Conditional")
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    }`}
                  >
                    {item.recommendation}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Evaluated on {item.submittedDate}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {item.challengeTitle}
                </h3>

                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Startup: <span className="text-indigo-600 dark:text-indigo-400">{item.startupName}</span>
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                  "{item.verdict}"
                </p>
              </div>

              {/* SCORE & ACTIONS */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Overall Score
                  </p>
                  <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {item.overallScore}
                    <span className="text-sm font-normal text-slate-400">/100</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setSelectedEvaluation(item)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-700"
                  >
                    <Eye className="h-4 w-4" />
                    Scorecard
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/evaluator/evaluations/${item.id}`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Full Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
            <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              No matching evaluations found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your search query or filter.
            </p>
          </div>
        )}
      </section>

      {/* SCORECARD MODAL */}
      <AnimatePresence>
        {selectedEvaluation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedEvaluation(null)}
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
                    Official Scorecard
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    {selectedEvaluation.startupName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedEvaluation.challengeTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvaluation(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { label: "Technical Feasibility (25%)", key: "technicalFeasibility" },
                  { label: "Innovation & Originality (20%)", key: "innovation" },
                  { label: "Expected Public Impact (20%)", key: "expectedImpact" },
                  { label: "Scalability & Deployment (20%)", key: "scalability" },
                  { label: "Cost Effectiveness (15%)", key: "costEffectiveness" },
                ].map((crit) => (
                  <div key={crit.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">{crit.label}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedEvaluation.scores[crit.key]}/100
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${selectedEvaluation.scores[crit.key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Evaluator Recommendation
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedEvaluation.recommendation}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  "{selectedEvaluation.verdict}"
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvaluation(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EvaluatorEvaluations;
