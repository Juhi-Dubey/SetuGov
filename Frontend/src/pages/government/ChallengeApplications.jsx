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
  Lock,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Info,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import {
  getChallengeById,
  getChallengeApplications,
  getChallengeMatches,
  runChallengeMatching,
  shortlistStartup,
  closeChallenge,
} from "../../services/challengeService";
import { updateApplicationStatus } from "../../services/applicationService";
import {
  getEvaluators,
  assignEvaluatorToApplication,
  getApplicationAssignments,
  getChallengeEvaluatorPool,
  addToEvaluatorPool,
  removeFromEvaluatorPool,
  getChallengeEvaluatorMatches,
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
} from "../../services/evaluatorService";

function ChallengeApplications() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId || "1";

  const [activeTab, setActiveTab] = useState("ai-matches"); // 'ai-matches' | 'applications'
  const [challengeDetails, setChallengeDetails] = useState(null);
  const [applications, setApplications] = useState([]);
  const [matches, setMatches] = useState([]);
  const [eligibleMatches, setEligibleMatches] = useState([]);
  const [needsReviewMatches, setNeedsReviewMatches] = useState([]);
  const [ineligibleMatches, setIneligibleMatches] = useState([]);
  const [matchSummary, setMatchSummary] = useState({
    total: 0,
    eligible: 0,
    needsReview: 0,
    ineligible: 0,
    shortlisted: 0,
    applied: 0,
  });

  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState("");
  const [showIneligible, setShowIneligible] = useState(false);

  // Shortlist Modal State
  const [shortlistModalOpen, setShortlistModalOpen] = useState(false);
  const [selectedCandidateForShortlist, setSelectedCandidateForShortlist] = useState(null);
  const [shortlistNotes, setShortlistNotes] = useState("");
  const [shortlistLoading, setShortlistLoading] = useState(false);

  // Close PS Modal State
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);

  // Evaluator Assignment State
  const [verifiedEvaluators, setVerifiedEvaluators] = useState([]);
  const [challengePool, setChallengePool] = useState([]);
  const [evaluatorMatches, setEvaluatorMatches] = useState([]);
  const [evaluatorApplicants, setEvaluatorApplicants] = useState([]);
  const [evaluatorPoolLoading, setEvaluatorPoolLoading] = useState(false);
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
      const [evalRes, poolRes] = await Promise.all([
        getEvaluators().catch(() => ({ data: { evaluators: [] } })),
        getChallengeEvaluatorPool(id).catch(() => ({ data: [] }))
      ]);
      const list = evalRes?.data?.evaluators || evalRes?.evaluators || [];
      const pool = poolRes?.data || poolRes || [];
      setVerifiedEvaluators(list);
      setChallengePool(Array.isArray(pool) ? pool : []);
    } catch (err) {
      console.warn("Failed to load verified evaluators:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [chRes, appsRes, matchesRes] = await Promise.all([
        getChallengeById(id).catch(() => null),
        getChallengeApplications(id).catch(() => ({ data: [] })),
        getChallengeMatches(id).catch(() => ({ data: {} })),
      ]);

      const challenge = chRes?.data?.challenge || chRes?.challenge || null;
      setChallengeDetails(challenge);

      const appsList = appsRes?.data?.applications || appsRes?.data || [];
      setApplications(appsList);

      const matchesData = matchesRes?.data || {};
      const allMatches = Array.isArray(matchesData.matches)
        ? matchesData.matches
        : Array.isArray(matchesRes?.data)
        ? matchesRes.data
        : [];
      setMatches(allMatches);

      const eligible =
        matchesData.eligible_matches ||
        allMatches.filter((m) => m.eligibility_status === "ELIGIBLE");
      const needsReview =
        matchesData.needs_review_matches ||
        allMatches.filter((m) => m.eligibility_status === "NEEDS_REVIEW");
      const ineligible =
        matchesData.ineligible_matches ||
        allMatches.filter((m) => m.eligibility_status === "INELIGIBLE");

      setEligibleMatches(eligible);
      setNeedsReviewMatches(needsReview);
      setIneligibleMatches(ineligible);

      setMatchSummary({
        total: matchesData.total_matches ?? allMatches.length,
        eligible: matchesData.eligible_count ?? eligible.length,
        needsReview: matchesData.needs_review_count ?? needsReview.length,
        ineligible: matchesData.ineligible_count ?? ineligible.length,
        shortlisted:
          matchesData.shortlisted_count ??
          allMatches.filter((m) => m.is_shortlisted).length,
        applied:
          matchesData.applied_count ??
          allMatches.filter((m) => m.has_applied).length,
      });
    } catch (err) {
      console.warn("Load applications fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluatorPoolData = async () => {
    try {
      setEvaluatorPoolLoading(true);
      const [poolRes, matchesRes, appsRes] = await Promise.all([
        getChallengeEvaluatorPool(id).catch(() => ({ data: [] })),
        getChallengeEvaluatorMatches(id).catch(() => ({ data: [] })),
        getChallengeEvaluatorApplications(id).catch(() => ({ data: [] })),
      ]);

      const pool = poolRes?.data || poolRes || [];
      const matches = matchesRes?.data || matchesRes || [];
      const apps = appsRes?.data || appsRes || [];

      setChallengePool(Array.isArray(pool) ? pool : []);
      setEvaluatorMatches(Array.isArray(matches) ? matches : []);
      setEvaluatorApplicants(Array.isArray(apps) ? apps : []);
    } catch (err) {
      console.warn("Failed to load evaluator pool data:", err);
    } finally {
      setEvaluatorPoolLoading(false);
    }
  };

  const handleAddToPool = async (evaluatorId, source = "MATCHED", isNeedsReview = false) => {
    try {
      let notes = "";
      if (isNeedsReview) {
        const just = window.prompt(
          "Evaluator has status 'NEEDS_REVIEW'. Please enter official justification (minimum 10 characters) to approve them into the pool:",
          "Domain specialist with verified background relevant to this challenge."
        );
        if (just === null) return;
        if (just.trim().length < 10) {
          alert("Justification must be at least 10 characters.");
          return;
        }
        notes = just.trim();
      } else {
        const inputNotes = window.prompt("Optional notes for adding to Final Evaluator Pool:", "Approved by nodal officer.");
        if (inputNotes === null) return;
        notes = inputNotes.trim();
      }

      await addToEvaluatorPool(id, evaluatorId, notes, source);
      setActionMessage("Evaluator successfully added to the Final Evaluator Pool.");
      await loadEvaluatorPoolData();
      await loadVerifiedEvaluators();
    } catch (err) {
      alert(`Failed to add evaluator to pool: ${err?.response?.data?.message || err?.message}`);
    }
  };

  const handleRemoveFromPool = async (evaluatorId) => {
    if (!window.confirm("Are you sure you want to remove this evaluator from the Final Evaluator Pool?")) return;
    try {
      await removeFromEvaluatorPool(id, evaluatorId);
      setActionMessage("Evaluator removed from the Final Evaluator Pool.");
      await loadEvaluatorPoolData();
      await loadVerifiedEvaluators();
    } catch (err) {
      alert(`Failed to remove evaluator: ${err?.response?.data?.message || err?.message}`);
    }
  };

  const handleReviewApplicant = async (appId, status, isNeedsReview = false) => {
    try {
      let reason = "";
      if (status === "SHORTLISTED") {
        const promptText = isNeedsReview
          ? "Applicant has status 'NEEDS_REVIEW'. Enter mandatory justification (min 10 characters) to approve into Final Pool:"
          : "Enter approval notes (optional):";
        const inputReason = window.prompt(
          promptText,
          isNeedsReview
            ? "Approved based on relevant past public sector deployment experience."
            : "Approved from self-application."
        );
        if (inputReason === null) return;
        if (isNeedsReview && inputReason.trim().length < 10) {
          alert("Justification must be at least 10 characters.");
          return;
        }
        reason = inputReason.trim();
      } else {
        const inputReason = window.prompt("Enter rejection reason:", "Qualifications do not match challenge requirements.");
        if (inputReason === null) return;
        reason = inputReason.trim();
      }

      await reviewEvaluatorApplication(id, appId, status, reason);
      setActionMessage(`Evaluator application ${status === "SHORTLISTED" ? "approved into Final Pool" : "declined"}.`);
      await loadEvaluatorPoolData();
      await loadVerifiedEvaluators();
    } catch (err) {
      alert(`Failed to review application: ${err?.response?.data?.message || err?.message}`);
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

      // Ensure evaluator belongs to Final Evaluator Pool before assignment
      const inPool = challengePool.some((p) => p.evaluator_id === selectedEvaluatorId);
      if (!inPool) {
        throw new Error(
          "Selected evaluator is not a member of the approved Final Evaluator Pool. Please approve them into the pool in the 'Evaluator Pool & Review' tab before assigning."
        );
      }

      await assignEvaluatorToApplication(
        selectedAppForAssign.id,
        selectedEvaluatorId,
        assignmentNotes
      );
      setActionMessage("Evaluator assigned successfully from Final Evaluator Pool.");
      setShowAssignModal(false);
      loadData();
      loadVerifiedEvaluators();
    } catch (err) {
      alert(`Failed to assign evaluator: ${err.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRunBrain2Matching = async () => {
    if (challengeDetails?.status === "CLOSED") return;
    try {
      setMatchingLoading(true);
      setActionMessage("");
      const res = await runChallengeMatching(id);
      setActionMessage("Brain 2 candidate pool updated with 5-factor scoring & pgvector semantic matching!");
      await loadData();
      setActiveTab("ai-matches");
    } catch (err) {
      setActionMessage(err?.message || "Matching completed with default rankings.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleOpenShortlistModal = (match) => {
    setSelectedCandidateForShortlist(match);
    setShortlistNotes("");
    setShortlistModalOpen(true);
  };

  const handleShortlistSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidateForShortlist) return;

    try {
      setShortlistLoading(true);
      setActionMessage("");
      await shortlistStartup(
        id,
        selectedCandidateForShortlist.startup_id,
        shortlistNotes
      );
      const name =
        selectedCandidateForShortlist.company_name ||
        selectedCandidateForShortlist.startup_name ||
        selectedCandidateForShortlist.startup?.company_name ||
        "Startup";
      setActionMessage(
        `Startup "${name}" successfully shortlisted! In-app and email notifications have been dispatched.`
      );
      setShortlistModalOpen(false);
      setSelectedCandidateForShortlist(null);
      await loadData();
    } catch (err) {
      alert(`Shortlist failed: ${err.message}`);
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleCloseChallenge = async () => {
    try {
      setCloseLoading(true);
      setActionMessage("");
      await closeChallenge(id);
      setActionMessage(
        `Problem Statement "${challengeDetails?.title}" has been CLOSED. Candidate pool is frozen and new submissions are stopped.`
      );
      setCloseModalOpen(false);
      await loadData();
    } catch (err) {
      alert(`Failed to close Problem Statement: ${err.message}`);
    } finally {
      setCloseLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    if (challengeDetails?.status === "CLOSED") {
      alert("Problem Statement is closed. Lifecycle status cannot be modified.");
      return;
    }
    try {
      let override_justification = "";
      if (newStatus === "SELECTED") {
        const just = window.prompt(
          "Enter Selection Reason / Written Override Justification (mandatory if Decision Engine recommendation is Reserve or Not Recommended):",
          "Candidate demonstrates sound technical architecture and satisfies government pilot evaluation criteria."
        );
        if (just === null) return; // Government officer cancelled
        override_justification = just;
      }
      await updateApplicationStatus(appId, newStatus, "Government review decision", override_justification);
      setActionMessage(`Application status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const name =
        app.startup?.company_name ||
        app.startup?.name ||
        app.startup_name ||
        "";
      const proposal = app.proposal_summary || app.proposal || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === "all") return matchesSearch;
      return matchesSearch && app.status === statusFilter;
    });
  }, [applications, searchQuery, statusFilter]);

  const isClosed = challengeDetails?.status === "CLOSED";

  // Reusable Candidate Card Renderer
  const renderCandidateCard = (match, idx, category = "ELIGIBLE") => {
    const isShortlisted = match.is_shortlisted;
    const isIneligible =
      category === "INELIGIBLE" || match.eligibility_status === "INELIGIBLE";
    const isNeedsReview =
      category === "NEEDS_REVIEW" || match.eligibility_status === "NEEDS_REVIEW";
    const companyName =
      match.company_name ||
      match.startup_name ||
      match.startup?.company_name ||
      match.startup?.name ||
      "Verified Startup";

    return (
      <div
        key={match.startup_id || match.id || idx}
        className={`rounded-2xl border p-5 shadow-sm transition-all ${
          isShortlisted
            ? "border-purple-300 bg-purple-50/20 dark:border-purple-800/40 dark:bg-purple-950/10"
            : isIneligible
            ? "border-slate-200 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-900/40 opacity-80"
            : isNeedsReview
            ? "border-amber-200/90 bg-amber-50/10 dark:border-amber-800/30 dark:bg-amber-950/10"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        {/* Top row: Rank, Company Name, Badges, Overall Score */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isShortlisted
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                    : isIneligible
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : isNeedsReview
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                }`}
              >
                #{idx + 1}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {companyName}
              </h3>

              {/* Participation Status Badge */}
              {isShortlisted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  <CheckCircle2 className="h-3 w-3" /> Shortlisted
                </span>
              ) : match.has_applied ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Applied (Proposal Submitted)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  AI Discovered (Not Applied)
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {match.startup?.domain || "Technology Specialist"} •{" "}
              {match.startup?.location || "India"} • TRL{" "}
              {match.startup?.readiness_level || 1} •{" "}
              {match.startup?.years_experience || 0} yrs exp
            </p>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                match.overall_score >= 70
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : match.overall_score >= 50
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {Math.round(match.overall_score || 0)}% Authoritative Match
            </span>
          </div>
        </div>

        {/* 5-Factor Score Breakdown */}
        <div className="mt-4 grid grid-cols-5 gap-1.5 text-center">
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[10px] text-slate-400 font-medium">Tech (30%)</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {Math.round(match.technology_score || 0)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[10px] text-slate-400 font-medium">Domain (25%)</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {Math.round(match.domain_score || 0)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[10px] text-slate-400 font-medium">Readiness (20%)</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {Math.round(match.readiness_score || 0)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[10px] text-slate-400 font-medium">Experience (15%)</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {Math.round(match.experience_score || 0)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[10px] text-slate-400 font-medium">Deploy Fit (10%)</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {Math.round(match.deployment_score || 0)}%
            </p>
          </div>
        </div>

        {/* Review or Ineligibility callout */}
        {isNeedsReview && match.review_reasons && match.review_reasons.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <span className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Review Considerations:
            </span>
            <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px]">
              {match.review_reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {isIneligible && match.ineligibility_reasons && match.ineligibility_reasons.length > 0 && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <span className="font-semibold flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" /> Ineligibility Reasons (Audit Trail):
            </span>
            <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px]">
              {match.ineligibility_reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Brain 2 Qualitative Reasoning */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          <p>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Brain 2 Reasoning:
            </span>{" "}
            {match.why_matched ||
              match.ai_explanation ||
              match.match_rationale ||
              "Verified startup capability evaluation demonstrates relevant alignment with problem requirements."}
          </p>

          {match.strengths && match.strengths.length > 0 && (
            <div className="mt-2">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">
                Key Strengths:
              </span>
              <ul className="mt-0.5 list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                {match.strengths.slice(0, 2).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {match.concerns && match.concerns.length > 0 && (
            <div className="mt-1.5">
              <span className="font-semibold text-amber-700 dark:text-amber-400 text-[11px]">
                Evaluation Considerations:
              </span>
              <ul className="mt-0.5 list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                {match.concerns.slice(0, 2).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Row */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-400">
            {match.shortlisted_at ? (
              <span>Shortlisted on {new Date(match.shortlisted_at).toLocaleDateString("en-IN")}</span>
            ) : (
              <span>Deterministic multi-attribute ranking</span>
            )}
          </div>

          <div>
            {isShortlisted ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                <CheckCircle2 className="h-4 w-4" /> Shortlisted by Government
              </span>
            ) : isIneligible ? (
              <button
                type="button"
                disabled
                title="Ineligible startups cannot be shortlisted."
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed dark:border-slate-800"
              >
                Cannot Shortlist (Ineligible)
              </button>
            ) : isClosed ? (
              <button
                type="button"
                disabled
                title="Problem statement is closed. Candidate pool is frozen."
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed dark:border-slate-800"
              >
                Shortlist (PS Closed)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenShortlistModal(match)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
              >
                <Check className="h-3.5 w-3.5" /> Shortlist Candidate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Users className="h-3.5 w-3.5" />
                  Problem Statement Discovery
                </span>

                {isClosed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    <Lock className="h-3.5 w-3.5" />
                    Status: CLOSED (Candidate Pool Frozen)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Status: OPEN ({challengeDetails?.status || "PUBLISHED"})
                  </span>
                )}

                {challengeDetails?.department?.name && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <Building2 className="h-3 w-3" />
                    {challengeDetails.department.name}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
                {challengeDetails?.title || "Problem Statement Discovery & Evaluation"}
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">Startup Discovery:</strong>{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {matchSummary.eligible} eligible matches
                </span>{" "}
                ({matchSummary.total} total verified profiles evaluated; {matchSummary.shortlisted} shortlisted; {matchSummary.applied} applied)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!isClosed && (
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Close Problem Statement
                </button>
              )}

              <button
                type="button"
                onClick={handleRunBrain2Matching}
                disabled={matchingLoading || isClosed}
                title={isClosed ? "Problem statement is closed. Candidate pool is frozen." : ""}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {matchingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isClosed ? "Pool Frozen (Closed)" : "Refresh Discovery Pool"}
              </button>
            </div>
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
            onClick={() => setActiveTab("ai-matches")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "ai-matches"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Startup Discovery ({matchSummary.eligible} Eligible / {matchSummary.total} Evaluated)
          </button>

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
            onClick={() => {
              setActiveTab("evaluator-pool");
              loadEvaluatorPoolData();
            }}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "evaluator-pool"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4 text-purple-500" />
            Final Evaluator Pool & Review ({challengePool.length} Pool Members)
          </button>
        </div>

        {/* TAB 1: BRAIN 2 MATCHES / DISCOVERY */}
        {activeTab === "ai-matches" && (
          <div className="space-y-8">
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Sparkles className="mx-auto h-8 w-8 text-indigo-500" />
                <h3 className="mt-3 text-sm font-semibold">No AI Matches Computed Yet</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Click "Refresh Discovery Pool" above to execute semantic pgvector matching across verified startups.
                </p>
                {!isClosed && (
                  <button
                    type="button"
                    onClick={handleRunBrain2Matching}
                    disabled={matchingLoading}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Sparkles className="h-4 w-4" /> Run Matching Engine
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* SECTION 1: PRIMARY ELIGIBLE CANDIDATES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        Primary Eligible Candidates ({eligibleMatches.length})
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Startups satisfying all mandatory eligibility criteria, ranked authoritatively by deterministic 5-factor scoring.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1 text-xs font-semibold">
                      Recommended for Shortlist
                    </span>
                  </div>

                  {eligibleMatches.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                      No verified startups currently meet all mandatory eligibility criteria for this Problem Statement.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {eligibleMatches.map((m, idx) => renderCandidateCard(m, idx, "ELIGIBLE"))}
                    </div>
                  )}
                </div>

                {/* SECTION 2: NEEDS REVIEW CANDIDATES */}
                {needsReviewMatches.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-3 dark:border-amber-900/40">
                      <div>
                        <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                          Candidates Requiring Review ({needsReviewMatches.length})
                        </h2>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                          Startups with borderline or alternative domain/technology alignment. Review departmental considerations before shortlisting.
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-1 text-xs font-semibold">
                        Needs Official Review
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {needsReviewMatches.map((m, idx) =>
                        renderCandidateCard(m, eligibleMatches.length + idx, "NEEDS_REVIEW")
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION 3: INELIGIBLE PROFILES (AUDIT TRAIL) */}
                {ineligibleMatches.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowIneligible(!showIneligible)}
                      className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <XCircle className="h-4 w-4 text-slate-400" />
                        Ineligible Profiles — Audit Trail ({ineligibleMatches.length} startups)
                        <span className="text-[11px] font-normal text-slate-400">
                          (Retained for regulatory history; cannot be shortlisted)
                        </span>
                      </div>
                      {showIneligible ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {showIneligible && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {ineligibleMatches.map((m, idx) =>
                          renderCandidateCard(
                            m,
                            eligibleMatches.length + needsReviewMatches.length + idx,
                            "INELIGIBLE"
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: APPLICATIONS (FORMAL PROPOSALS) */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search startups, proposal text..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="all">All Statuses</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="SHORTLISTED">SHORTLISTED</option>
                  <option value="SELECTED">SELECTED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            {/* APPLICATIONS TABLE */}
            {filteredApplications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <FileCheck2 className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 text-sm font-semibold">No Proposals Found</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {isClosed
                    ? "This Problem Statement is closed and no proposals were submitted."
                    : "Verified startups will submit proposals through the portal while this challenge is open."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Startup Name</th>
                        <th className="px-5 py-3.5 font-semibold">Proposal Summary</th>
                        <th className="px-5 py-3.5 font-semibold">Assigned Evaluators</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredApplications.map((app) => {
                        const assignments = app.evaluator_assignments || [];
                        const hasRecused = assignments.some((a) => a.status === "RECUSED");

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                              {app.startup?.company_name || app.startup?.name || "Startup Entity"}
                            </td>
                            <td className="px-5 py-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                              {app.proposal_summary || app.proposal || "—"}
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                {assignments.length === 0 ? (
                                  <span className="text-[11px] text-slate-400">Unassigned</span>
                                ) : (
                                  assignments.map((a) => (
                                    <div key={a.id} className="flex items-center gap-1.5 text-[11px]">
                                      <span>{a.evaluator?.name || "Evaluator"}</span>
                                      {a.status === "COMPLETED" ? (
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                          Evaluated
                                        </span>
                                      ) : a.status === "RECUSED" ? (
                                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                          Recused
                                        </span>
                                      ) : a.status === "ACCEPTED" ? (
                                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                          Accepted
                                        </span>
                                      ) : (
                                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  ))
                                )}
                                {hasRecused && (
                                  <p className="text-[10px] text-red-500 font-semibold">
                                    Evaluator recused due to conflict. Please assign another evaluator.
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  app.status === "SHORTLISTED"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                    : app.status === "SELECTED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
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
                                disabled={isClosed || app.status === "SHORTLISTED"}
                                onClick={() => handleStatusChange(app.id, "SHORTLISTED")}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-indigo-950/50 dark:text-indigo-300"
                              >
                                Shortlist
                              </button>
                              <button
                                type="button"
                                disabled={isClosed || app.status === "SELECTED"}
                                onClick={() => handleStatusChange(app.id, "SELECTED")}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-emerald-950/50 dark:text-emerald-300"
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

        {/* TAB 3: FINAL EVALUATOR POOL & REVIEW */}
        {activeTab === "evaluator-pool" && (
          <div className="space-y-8">
            {/* Header / Intro */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5 dark:border-purple-900/40 dark:bg-purple-950/20">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Final Evaluator Pool Curation & Governance
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Review system-matched domain evaluators and self-applicants to construct the official <strong>Final Evaluator Pool</strong>.
                In accordance with SetuGov governance rules, proposal evaluator assignments can <em>only</em> be made from this approved pool.
              </p>
            </div>

            {/* Section 1: Active Final Evaluator Pool Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Approved Final Evaluator Pool Members ({challengePool.length})
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                  Authorized for Assignment
                </span>
              </div>

              {challengePool.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                  No evaluators have been added to the Final Evaluator Pool yet. Review matched candidates or applicants below to approve pool members.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                      <tr>
                        <th className="py-3 px-4">Evaluator</th>
                        <th className="py-3 px-4">Organization & Role</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Approval Notes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {challengePool.map((p) => {
                        const ev = p.evaluator;
                        const prof = ev?.evaluator_profile;
                        return (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {ev?.name || "Evaluator"}
                              <span className="block text-[11px] text-slate-400 font-normal">{ev?.email}</span>
                            </td>
                            <td className="py-3 px-4">
                              {prof?.designation || "Specialist"} — {prof?.organization || "Independent"}
                              <span className="block text-[11px] text-slate-400">
                                {Array.isArray(prof?.domain_expertise) ? prof.domain_expertise.join(", ") : "Domain Specialist"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                                {p.source || "MATCHED"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 italic">
                              {p.notes || "Approved into pool"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromPool(p.evaluator_id)}
                                className="text-red-500 hover:text-red-700 font-semibold text-xs"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: System-Matched Evaluator Candidates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    System-Matched Evaluators ({evaluatorMatches.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ranked by 4-factor scoring (Domain 35%, Experience 25%, Technology 25%, Capability 15%).
                  </p>
                </div>
              </div>

              {evaluatorPoolLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-purple-600 mb-1" />
                  Loading matched evaluator rankings...
                </div>
              ) : evaluatorMatches.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                  No evaluator match scores computed yet for this challenge.
                </div>
              ) : (
                <div className="grid gap-3">
                  {evaluatorMatches.map((m) => {
                    const inPool = challengePool.some((p) => p.evaluator_id === m.evaluator_id);
                    const isEligible = m.eligibility_state === "ELIGIBLE";
                    const isNeedsReview = m.eligibility_state === "NEEDS_REVIEW";
                    const isIneligible = m.eligibility_state === "INELIGIBLE";

                    return (
                      <div
                        key={m.id || m.evaluator_id}
                        className={`rounded-xl border p-4 transition ${
                          inPool
                            ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                            : isNeedsReview
                            ? "border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
                            : isIneligible
                            ? "border-slate-200 bg-slate-50/60 opacity-75 dark:border-slate-800"
                            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {m.evaluator?.name || m.name || "Evaluator"}
                              </span>
                              {isEligible && (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                                  ELIGIBLE
                                </span>
                              )}
                              {isNeedsReview && (
                                <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                  NEEDS REVIEW
                                </span>
                              )}
                              {isIneligible && (
                                <span className="rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold">
                                  INELIGIBLE
                                </span>
                              )}
                              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-md">
                                Score: {Math.round(m.overall_score || 0)}%
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {m.evaluator?.evaluator_profile?.designation} — {m.evaluator?.evaluator_profile?.organization} ({m.evaluator?.evaluator_profile?.years_experience || 0} yrs exp)
                            </p>

                            {/* Breakdown */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                              <span>Domain: <strong>{Math.round(m.domain_score || 0)}%</strong></span>
                              <span>Exp: <strong>{Math.round(m.experience_score || 0)}%</strong></span>
                              <span>Tech: <strong>{Math.round(m.tech_score || 0)}%</strong></span>
                              <span>Capability: <strong>{Math.round(m.capability_score || 0)}%</strong></span>
                            </div>

                      <div className="text-right">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {match.overall_score != null ? `${Math.round(match.overall_score)}% Match` : match.score != null ? `${Math.round(match.score)}% Match` : "Score Pending"}
                        </span>
                      </div>
                    </div>
                            {m.eligibility_reasons?.length > 0 && (
                              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400 italic">
                                Note: {m.eligibility_reasons.join("; ")}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center">
                            {inPool ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
                                <Check className="h-3.5 w-3.5" /> In Final Pool
                              </span>
                            ) : isIneligible ? (
                              <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl cursor-not-allowed">
                                Ineligible for Challenge
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToPool(m.evaluator_id, "MATCHED", isNeedsReview)}
                                className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                                  isNeedsReview ? "bg-amber-600 hover:bg-amber-700" : "bg-purple-600 hover:bg-purple-700"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {isNeedsReview ? "Approve with Justification" : "Approve to Pool"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-[10px] text-slate-400">Capability</p>
                        <p className="text-xs font-bold">
                          {match.capability_score != null ? `${Math.round(match.capability_score)}%` : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-[10px] text-slate-400">Semantic Fit</p>
                        <p className="text-xs font-bold">
                          {match.semantic_similarity != null ? `${Math.round(match.semantic_similarity * (match.semantic_similarity <= 1 ? 100 : 1))}%` : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="text-[10px] text-slate-400">Feasibility</p>
                        <p className="text-xs font-bold">
                          {match.feasibility_score != null ? `${Math.round(match.feasibility_score)}%` : "—"}
                        </p>
                      </div>
                    </div>
            {/* Section 3: Evaluator Self-Applicants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Evaluator Self-Applicants ({evaluatorApplicants.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Independent evaluators who discovered this open problem statement and submitted self-applications.
                  </p>
                </div>
              </div>

              {evaluatorApplicants.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                  No evaluator self-applications submitted for this problem statement yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {evaluatorApplicants.map((app) => {
                    const inPool = challengePool.some((p) => p.evaluator_id === app.evaluator_id);

                    return (
                      <div
                        key={app.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {app.evaluator?.name || "Evaluator Applicant"}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              {app.evaluator?.evaluator_profile?.designation} — {app.evaluator?.evaluator_profile?.organization}
                            </span>
                          </div>

                          <div>
                            {app.status === "SHORTLISTED" || inPool ? (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold">
                                Approved in Pool
                              </span>
                            ) : app.status === "REJECTED" ? (
                              <span className="rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2.5 py-0.5 text-xs font-bold">
                                Declined
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReviewApplicant(app.id, "SHORTLISTED", false)}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  Approve to Pool
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewApplicant(app.id, "REJECTED", false)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {app.statement && (
                          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                            <strong>Applicant Statement:</strong> {app.statement}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            SHORTLIST MODAL
        ===================================================== */}
        {shortlistModalOpen && selectedCandidateForShortlist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  Government Shortlist Decision
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Shortlist "{selectedCandidateForShortlist.company_name || selectedCandidateForShortlist.startup_name || selectedCandidateForShortlist.startup?.company_name}"
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-5">
                  You are about to shortlist this candidate for Problem Statement{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{challengeDetails?.title}"
                  </span>.
                </p>
              </div>

              <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-800 dark:border-indigo-900/30 dark:bg-indigo-950/30 dark:text-indigo-300">
                <p className="font-semibold">Notice regarding shortlisting:</p>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-700/90 dark:text-indigo-300/80">
                  Shortlisting designates this startup as an approved candidate for advancement. It sends an in-app notification and email to the startup. This action does not constitute a final pilot or procurement award.
                </p>
              </div>

              <form onSubmit={handleShortlistSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Departmental Shortlist Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={shortlistNotes}
                    onChange={(e) => setShortlistNotes(e.target.value)}
                    placeholder="Document rationale or specific capabilities of interest for the review committee..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent p-3 outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShortlistModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shortlistLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5 text-xs"
                  >
                    {shortlistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Confirm Shortlist
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* =====================================================
            CLOSE PROBLEM STATEMENT MODAL
        ===================================================== */}
        {closeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/40 dark:bg-slate-900 my-8"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs uppercase tracking-wider">
                  <Lock className="h-4 w-4" />
                  Close Problem Statement Action
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Close Problem Statement?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-5">
                  Are you sure you want to close{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{challengeDetails?.title}"
                  </span>?
                </p>
              </div>

              <div className="mb-5 space-y-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-300">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  Please verify before closing:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800/90 dark:text-rose-300/90">
                  <li>
                    <strong>New startup participation will stop</strong> — any subsequent application submissions will be rejected.
                  </li>
                  <li>
                    <strong>Candidate pool will be frozen</strong> — Brain 2 will stop adding new candidate matches.
                  </li>
                  <li>
                    <strong>Shortlist state will freeze</strong> — subsequent shortlisting actions will be locked.
                  </li>
                  <li>
                    <strong>Audit & history preserved</strong> — existing match scores, AI explanations, and shortlisted startups remain viewable.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCloseChallenge}
                  disabled={closeLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-1.5 text-xs"
                >
                  {closeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Confirm & Close Problem Statement
                </button>
              </div>
            </motion.div>
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
                    Select Evaluator from Final Pool *
                  </label>
                  {challengePool.length === 0 ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/30 dark:text-amber-300">
                      No evaluators in the Final Evaluator Pool yet. Please review and approve evaluators in the "Final Evaluator Pool & Review" tab before making assignments.
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedEvaluatorId}
                      onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-xs outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose Approved Pool Evaluator --</option>
                      {challengePool.map((p) => {
                        const ev = p.evaluator;
                        const prof = ev?.evaluator_profile;
                        return (
                          <option key={p.id || p.evaluator_id} value={p.evaluator_id}>
                            {ev?.name || "Evaluator"} — {prof?.designation || "Domain Specialist"} ({prof?.organization || "Independent"}) [Source: {p.source}]
                          </option>
                        );
                      })}
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent p-3 outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignLoading || !selectedEvaluatorId}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 text-xs"
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