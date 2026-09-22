import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Calendar,
  FileCheck2,
  FileText,
  Sparkles,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Lock,
  Check,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import Pagination from "../../components/common/Pagination";
import {
  getChallenges,
  getChallengeById,
  getChallengeApplications,
  getChallengeMatches,
  runChallengeMatching,
  shortlistStartup,
  closeChallenge,
  getChallengeDecisions,
  startChallengeEvaluation,
} from "../../services/challengeService";
import { updateApplicationStatus } from "../../services/applicationService";
import {
  getEvaluators,
  assignEvaluatorToApplication,
  getChallengeEvaluatorPool,
  addToEvaluatorPool,
  removeFromEvaluatorPool,
  getChallengeEvaluatorMatches,
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
} from "../../services/evaluatorService";

import {
  normalizeDomain,
  VERIFICATION_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  EVALUATION_STATUS_LABELS,
  formatPublishDate,
} from "../../utils/filterUtils.js";

// Re-export canonical domain mapping helper
export const getCanonicalDomain = normalizeDomain;
export { VERIFICATION_STATUS_LABELS };

function ChallengeApplications() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { id: paramId, challengeId } = useParams();

  const tabFromQuery = searchParams.get("tab");
  const isDedicatedApplicationsRoute = location.pathname === "/government/applications";
  const defaultTab = tabFromQuery || (isDedicatedApplicationsRoute ? "applications" : "ai-matches");

  const [activeChallengeId, setActiveChallengeId] = useState(
    (paramId && paramId !== "1") ? paramId : ((challengeId && challengeId !== "1") ? challengeId : null)
  );
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [challengeDetails, setChallengeDetails] = useState(null);
  // Used for the challenge picker on /government/applications (global route)
  const [challengesList, setChallengesList] = useState([]);

  const id = (challengeDetails?.id && challengeDetails.id !== "1")
    ? challengeDetails.id
    : ((activeChallengeId && activeChallengeId !== "1")
        ? activeChallengeId
        : ((paramId && paramId !== "1") ? paramId : (challengeId && challengeId !== "1" ? challengeId : null)));
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
  const [actionMessage, setActionMessage] = useState("");
  const [showIneligible, setShowIneligible] = useState(false);

  // Separate Filter State: Startup Discovery (Tab 1)
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [discoveryDomain, setDiscoveryDomain] = useState("all");
  const [discoveryReadiness, setDiscoveryReadiness] = useState("all");
  const [discoveryMatchScore, setDiscoveryMatchScore] = useState("all");
  const [discoveryVerification, setDiscoveryVerification] = useState("all");

  // Separate Filter State: Submitted Proposals (Tab 2)
  const [proposalsSearch, setProposalsSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState("all");
  const [proposalEvaluationFilter, setProposalEvaluationFilter] = useState("all");
  const [proposalDateFilter, setProposalDateFilter] = useState("all");
  const [proposalDateCutoff, setProposalDateCutoff] = useState(0);

  const handleDateFilterChange = (val) => {
    setProposalDateFilter(val);
    const days = val === "7d" ? 7 : val === "30d" ? 30 : val === "90d" ? 90 : 0;
    setProposalDateCutoff(days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0);
  };

  // Separate Filter State: Shortlisted Startups (Tab 3)
  const [shortlistedSearch, setShortlistedSearch] = useState("");

  // Pagination State
  const [proposalsPage, setProposalsPage] = useState(1);
  const [proposalsPageSize, setProposalsPageSize] = useState(10);
  const [shortlistedPage, setShortlistedPage] = useState(1);
  const [shortlistedPageSize, setShortlistedPageSize] = useState(6);

  // Auto-dismiss shortlist / action success notification after 4.5 seconds
  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => {
      setActionMessage("");
    }, 4500);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab) {
      setActiveTab(currentTab);
    } else if (location.pathname === "/government/applications") {
      setActiveTab("applications");
    }
  }, [location.pathname, searchParams]);

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

  // Governed Selection Decision Modal State (Component 6)
  const [decisions, setDecisions] = useState({});
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectedAppForDecision, setSelectedAppForDecision] = useState(null);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState("");

  useEffect(() => {
    loadData();
  }, [paramId, challengeId]);

  const loadVerifiedEvaluators = async (evalTargetId) => {
    const targetId = evalTargetId || id;
    if (!targetId || targetId === "1") return;
    try {
      const [evalRes, poolRes] = await Promise.all([
        getEvaluators().catch(() => ({ data: { evaluators: [] } })),
        getChallengeEvaluatorPool(targetId).catch(() => ({ data: [] }))
      ]);
      const list = evalRes?.data?.evaluators || evalRes?.evaluators || [];
      const pool = poolRes?.data || poolRes || [];
      setVerifiedEvaluators(list);
      setChallengePool(Array.isArray(pool) ? pool : []);
    } catch (err) {
      console.warn("Failed to load verified evaluators:", err);
    }
  };

  const loadData = async (overrideTargetId = null) => {
    try {
      setLoading(true);
      let targetId = overrideTargetId
        || ((paramId && paramId !== "1") ? paramId : null)
        || ((challengeId && challengeId !== "1") ? challengeId : null)
        || activeChallengeId;

      // On the global /government/applications route with no challenge selected:
      // Fetch all accessible challenges for the picker — do NOT auto-select any.
      if (!targetId && isDedicatedApplicationsRoute) {
        const allChallengesRes = await getChallenges().catch(() => ({ data: { challenges: [] } }));
        const list = allChallengesRes?.data?.challenges || allChallengesRes?.challenges || [];
        setChallengesList(list);
        // Do NOT select list[0] or any default. User must explicitly pick a challenge.
        setLoading(false);
        return;
      }

      // Legacy: if route still uses the old "1" placeholder ID, redirect to global route
      if (targetId === "1") {
        navigate("/government/applications", { replace: true });
        return;
      }

      await loadVerifiedEvaluators(targetId);

      const [chRes, appsRes, matchesRes, decisionsRes] = await Promise.all([
        getChallengeById(targetId).catch(() => null),
        getChallengeApplications(targetId).catch(() => ({ data: [] })),
        getChallengeMatches(targetId).catch(() => ({ data: {} })),
        getChallengeDecisions(targetId).catch(() => ({ data: {} })),
      ]);

      const challenge = chRes?.data?.challenge || chRes?.challenge || null;
      setChallengeDetails(challenge);

      const appsList = appsRes?.data?.applications || appsRes?.data || [];
      setApplications(appsList);

      const recs = decisionsRes?.data?.recommendations || decisionsRes?.recommendations || [];
      const decMap = {};
      if (Array.isArray(recs)) {
        recs.forEach((r) => {
          if (r.application_id) {
            decMap[r.application_id] = r;
          }
        });
      }
      setDecisions(decMap);

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
      await runChallengeMatching(id);
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

    const challengeIdToUse =
      (challengeDetails?.id && challengeDetails.id !== "1")
        ? challengeDetails.id
        : ((activeChallengeId && activeChallengeId !== "1")
            ? activeChallengeId
            : ((id && id !== "1") ? id : selectedCandidateForShortlist?.challenge_id));

    if (!challengeIdToUse || challengeIdToUse === "1") {
      alert("Unable to determine valid challenge ID for shortlisting. Please refresh the page.");
      return;
    }

    try {
      setShortlistLoading(true);
      setActionMessage("");
      await shortlistStartup(
        challengeIdToUse,
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

  const handleOpenSelectionModal = (app) => {
    if (challengeDetails?.status === "CLOSED") {
      alert("Problem Statement is closed. Lifecycle status cannot be modified.");
      return;
    }
    setSelectedAppForDecision(app);
    setOverrideJustification("");
    setSelectionError("");
    setSelectionModalOpen(true);
  };

  const handleConfirmSelection = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedAppForDecision) return;

    const rec = decisions[selectedAppForDecision.id]?.recommendation;

    // Gating: Challenge must be in EVALUATION status to select a startup
    if (challengeDetails?.status !== "EVALUATION") {
      setSelectionError("Selection blocked: Challenge must be transitioned to the EVALUATION phase before selecting a winning startup.");
      return;
    }

    // Gating: EVALUATION_PENDING_QUORUM cannot be selected
    if (rec === "EVALUATION_PENDING_QUORUM") {
      setSelectionError("Selection blocked: Quorum has not been met. Minimum 2 independent evaluations are required.");
      return;
    }

    // Gating: RESERVE_CANDIDATE or NOT_RECOMMENDED requires justification
    if ((rec === "RESERVE_CANDIDATE" || rec === "NOT_RECOMMENDED") && !overrideJustification.trim()) {
      setSelectionError("Written override justification is mandatory when selecting a Reserve or Not Recommended candidate.");
      return;
    }

    try {
      setSelectionLoading(true);
      setSelectionError("");
      await updateApplicationStatus(
        selectedAppForDecision.id,
        "SELECTED",
        "Government review decision",
        overrideJustification.trim()
      );
      setActionMessage("Application successfully selected for Pilot Award.");
      setSelectionModalOpen(false);
      setSelectedAppForDecision(null);
      await loadData();
    } catch (err) {
      setSelectionError(err.message || "Failed to update application status to SELECTED.");
    } finally {
      setSelectionLoading(false);
    }
  };

  const [transitionLoading, setTransitionLoading] = useState(false);

  const handleStartEvaluation = async () => {
    if (!id) return;
    try {
      setTransitionLoading(true);
      await startChallengeEvaluation(id);
      setActionMessage("Challenge transitioned to EVALUATION phase successfully.");
      await loadData();
    } catch (err) {
      console.error("Failed to start evaluation:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to start evaluation.");
    } finally {
      setTransitionLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    if (challengeDetails?.status === "CLOSED") {
      alert("Problem Statement is closed. Lifecycle status cannot be modified.");
      return;
    }
    if (newStatus === "SELECTED") {
      if (challengeDetails?.status !== "EVALUATION") {
        alert("Challenge must be transitioned to the EVALUATION phase before selecting a winning startup.");
        return;
      }
      const targetApp = applications.find((a) => a.id === appId);
      if (targetApp) {
        handleOpenSelectionModal(targetApp);
      }
      return;
    }
    try {
      await updateApplicationStatus(appId, newStatus, "Government review decision", "");
      setActionMessage(`Application status updated to ${newStatus}`);
      await loadData();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  // Dynamic options extracted from actual backend matches data with canonical normalization
  const availableDomains = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => {
      const raw = m.startup?.domain || m.domain;
      if (raw) {
        const canonical = getCanonicalDomain(raw);
        if (canonical) set.add(canonical);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const availableReadiness = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => {
      const r = m.startup?.readiness_level ?? m.readiness_level;
      if (r !== undefined && r !== null) set.add(Number(r));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [matches]);

  const verificationFilterOptions = useMemo(() => [
    { value: "all", label: "All Verifications" },
    { value: "VERIFIED", label: "Verified" },
    { value: "UNVERIFIED", label: "Unverified" },
  ], []);

  // Startup Discovery Match Filter Predicate
  const filterMatch = (match) => {
    if (discoverySearch.trim()) {
      const q = discoverySearch.trim().toLowerCase();
      const name = (
        match.company_name ||
        match.startup_name ||
        match.startup?.company_name ||
        match.startup?.name ||
        ""
      ).toLowerCase();
      if (!name.includes(q)) return false;
    }

    if (discoveryDomain !== "all") {
      const rawDomain = match.startup?.domain || match.domain || "";
      const canonicalMatchDomain = getCanonicalDomain(rawDomain);
      const selectedCanonical = getCanonicalDomain(discoveryDomain);
      if (canonicalMatchDomain !== selectedCanonical) return false;
    }

    if (discoveryReadiness !== "all") {
      const trl = String(match.startup?.readiness_level ?? match.readiness_level ?? "");
      if (trl !== String(discoveryReadiness)) return false;
    }

    if (discoveryMatchScore !== "all") {
      const minScore = Number(discoveryMatchScore);
      const score = Number(match.overall_score ?? match.match_score ?? 0);
      if (score < minScore) return false;
    }

    if (discoveryVerification !== "all") {
      const rawStatus =
        match.verification_status ||
        match.startup?.verification_status ||
        (match.startup?.is_verified ? "VERIFIED" : "PENDING");
      const normalizedStatus = String(rawStatus || "").trim().toUpperCase();
      const isVerified = normalizedStatus === "VERIFIED" || match.startup?.is_verified === true;

      if (discoveryVerification === "VERIFIED") {
        if (!isVerified) return false;
      } else if (discoveryVerification === "UNVERIFIED") {
        if (isVerified) return false;
      }
    }

    return true;
  };

  const filteredEligibleMatches = useMemo(() => {
    return eligibleMatches.filter(filterMatch);
  }, [eligibleMatches, discoverySearch, discoveryDomain, discoveryReadiness, discoveryMatchScore, discoveryVerification]);

  const filteredNeedsReviewMatches = useMemo(() => {
    return needsReviewMatches.filter(filterMatch);
  }, [needsReviewMatches, discoverySearch, discoveryDomain, discoveryReadiness, discoveryMatchScore, discoveryVerification]);

  const filteredIneligibleMatches = useMemo(() => {
    return ineligibleMatches.filter(filterMatch);
  }, [ineligibleMatches, discoverySearch, discoveryDomain, discoveryReadiness, discoveryMatchScore, discoveryVerification]);

  const filteredTotalMatchesCount = useMemo(() => {
    return matches.filter(filterMatch).length;
  }, [matches, discoverySearch, discoveryDomain, discoveryReadiness, discoveryMatchScore, discoveryVerification]);

  const isDiscoveryFiltered = Boolean(
    discoverySearch.trim() ||
    discoveryDomain !== "all" ||
    discoveryReadiness !== "all" ||
    discoveryMatchScore !== "all" ||
    discoveryVerification !== "all"
  );

  const handleClearDiscoveryFilters = () => {
    setDiscoverySearch("");
    setDiscoveryDomain("all");
    setDiscoveryReadiness("all");
    setDiscoveryMatchScore("all");
    setDiscoveryVerification("all");
  };

  // Submitted Proposals Filter Predicate
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (proposalsSearch.trim()) {
        const q = proposalsSearch.trim().toLowerCase();
        const companyName = (
          app.startup?.company_name ||
          app.startup?.name ||
          app.startup_name ||
          ""
        ).toLowerCase();
        const proposalText = (
          app.proposal_title ||
          app.proposal_summary ||
          app.proposal ||
          ""
        ).toLowerCase();
        if (!companyName.includes(q) && !proposalText.includes(q)) return false;
      }

      if (proposalStatusFilter !== "all") {
        if (app.status !== proposalStatusFilter) return false;
      }

      if (proposalEvaluationFilter !== "all") {
        const dec = decisions[app.id];
        const rec = dec?.recommendation;
        const assignments = app.evaluator_assignments || [];
        const hasCompleted = assignments.some((a) => a.status === "COMPLETED");

        if (proposalEvaluationFilter === "RECOMMENDED_FOR_PILOT") {
          if (rec !== "RECOMMENDED_FOR_PILOT") return false;
        } else if (proposalEvaluationFilter === "RESERVE_CANDIDATE") {
          if (rec !== "RESERVE_CANDIDATE") return false;
        } else if (proposalEvaluationFilter === "EVALUATION_PENDING_QUORUM") {
          if (rec !== "EVALUATION_PENDING_QUORUM") return false;
        } else if (proposalEvaluationFilter === "NOT_RECOMMENDED") {
          if (rec !== "NOT_RECOMMENDED") return false;
        } else if (proposalEvaluationFilter === "EVALUATED") {
          if (!hasCompleted && !dec) return false;
        } else if (proposalEvaluationFilter === "PENDING") {
          if (hasCompleted || (dec && rec === "RECOMMENDED_FOR_PILOT")) return false;
        } else if (proposalEvaluationFilter === "UNASSIGNED") {
          if (assignments.length > 0) return false;
        }
      }

      if (proposalDateCutoff > 0) {
        const dateStr = app.submitted_at || app.created_at;
        if (!dateStr) return false;
        const appTime = new Date(dateStr).getTime();
        if (appTime < proposalDateCutoff) return false;
      }

      return true;
    });
  }, [applications, decisions, proposalsSearch, proposalStatusFilter, proposalEvaluationFilter, proposalDateCutoff]);

  useEffect(() => {
    setProposalsPage(1);
  }, [proposalsSearch, proposalStatusFilter, proposalEvaluationFilter, proposalDateFilter]);

  const paginatedApplications = useMemo(() => {
    const start = (proposalsPage - 1) * proposalsPageSize;
    return filteredApplications.slice(start, start + proposalsPageSize);
  }, [filteredApplications, proposalsPage, proposalsPageSize]);

  const isProposalsFiltered = Boolean(
    proposalsSearch.trim() ||
    proposalStatusFilter !== "all" ||
    proposalEvaluationFilter !== "all" ||
    proposalDateFilter !== "all"
  );

  const handleClearProposalsFilters = () => {
    setProposalsSearch("");
    setProposalStatusFilter("all");
    setProposalEvaluationFilter("all");
    setProposalDateFilter("all");
    setProposalDateCutoff(0);
  };

  // Authoritative Shortlisted Startups (Tab 3) derived from real backend data
  const shortlistedList = useMemo(() => {
    const map = new Map();
    // 1. Authoritative MatchScore records marked is_shortlisted
    (matches || []).forEach((m) => {
      if (m.is_shortlisted) {
        map.set(m.startup_id, {
          id: m.startup_id,
          startup_id: m.startup_id,
          company_name: m.company_name || m.startup_name || m.startup?.company_name || "Startup",
          domain: m.startup?.domain || m.domain,
          overall_score: m.overall_score,
          technology_score: m.technology_score,
          domain_score: m.domain_score,
          readiness_score: m.readiness_score,
          experience_score: m.experience_score,
          deployment_score: m.deployment_score,
          has_applied: m.has_applied,
          application_id: m.application_id,
          application_status: m.application_status,
          shortlisted_at: m.shortlisted_at,
          shortlist_notes: m.shortlist_notes,
          readiness_level: m.startup?.readiness_level,
          verification_status: m.startup?.verification_status,
          city: m.startup?.city,
          state: m.startup?.state,
          why_matched: m.why_matched,
          strengths: m.strengths,
          match: m,
        });
      }
    });

    // 2. Also incorporate applications with SHORTLISTED status
    (applications || []).forEach((app) => {
      if (app.status === "SHORTLISTED") {
        const existing = map.get(app.startup_id);
        if (existing) {
          existing.has_applied = true;
          existing.application_id = app.id;
          existing.application_status = app.status;
          existing.proposal_summary = app.proposal_summary || app.proposal;
          existing.submitted_at = app.submitted_at || app.created_at;
          existing.application = app;
        } else {
          map.set(app.startup_id, {
            id: app.startup_id,
            startup_id: app.startup_id,
            company_name: app.startup?.company_name || app.startup?.name || "Startup",
            domain: app.startup?.domain,
            overall_score: null,
            has_applied: true,
            application_id: app.id,
            application_status: app.status,
            shortlisted_at: app.updated_at,
            shortlist_notes: null,
            readiness_level: app.startup?.readiness_level,
            verification_status: app.startup?.verification_status,
            proposal_summary: app.proposal_summary || app.proposal,
            submitted_at: app.submitted_at || app.created_at,
            application: app,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [matches, applications]);

  const filteredShortlisted = useMemo(() => {
    if (!shortlistedSearch.trim()) return shortlistedList;
    const q = shortlistedSearch.trim().toLowerCase();
    return shortlistedList.filter((s) => {
      const name = (s.company_name || "").toLowerCase();
      const domain = (s.domain || "").toLowerCase();
      return name.includes(q) || domain.includes(q);
    });
  }, [shortlistedList, shortlistedSearch]);

  useEffect(() => {
    setShortlistedPage(1);
  }, [shortlistedSearch]);

  const paginatedShortlisted = useMemo(() => {
    const start = (shortlistedPage - 1) * shortlistedPageSize;
    return filteredShortlisted.slice(start, start + shortlistedPageSize);
  }, [filteredShortlisted, shortlistedPage, shortlistedPageSize]);

  const renderShortlistedCard = (item, idx) => {
    const isApplied = item.has_applied || Boolean(item.application_id);
    const dateFormatted = item.shortlisted_at
      ? new Date(item.shortlisted_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Recorded";

    return (
      <div
        key={item.startup_id || item.id || idx}
        className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-sm dark:border-purple-900/40 dark:bg-slate-900 space-y-3.5"
      >
        {/* Top row: Rank, Name, Badges, Match Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                #{idx + 1}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {item.company_name}
              </h3>

              {/* Status Badges */}
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> Shortlisted
              </span>

              {isApplied ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shrink-0">
                  Proposal Submitted ({item.application_status || "SHORTLISTED"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                  Discovery Shortlist
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Domain: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.domain || "GovTech & Innovation"}</span>
              {item.readiness_level && ` · TRL ${item.readiness_level}`}
              {item.city && ` · ${item.city}, ${item.state}`}
            </p>
          </div>

          {item.overall_score != null && (
            <div className="text-right shrink-0">
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                {Math.round(item.overall_score)}% Match
              </span>
            </div>
          )}
        </div>

        {/* 5-Factor Score Breakdown (if scores exist) */}
        {item.technology_score != null && (
          <div className="overflow-x-auto scrollbar-none">
            <div className="grid grid-cols-5 gap-1.5 text-center min-w-[380px] sm:min-w-0">
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  <span>Tech</span>
                  <span> (30%)</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(item.technology_score || 0)}%
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  <span>Domain</span>
                  <span> (25%)</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(item.domain_score || 0)}%
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  <span>Readiness</span>
                  <span> (20%)</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(item.readiness_score || 0)}%
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  <span>Experience</span>
                  <span> (15%)</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(item.experience_score || 0)}%
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  <span>Deploy Fit</span>
                  <span> (10%)</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(item.deployment_score || 0)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shortlist Notes / Audit Callout */}
        {item.shortlist_notes && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 text-xs text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300">
            <span className="font-semibold flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-purple-600" /> Government Shortlist Notes:
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
              "{item.shortlist_notes}"
            </p>
          </div>
        )}

        {/* AI Qualitative Reasoning */}
        {item.why_matched && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
            <p className="line-clamp-2">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Brain 2 Reasoning:
              </span>{" "}
              {item.why_matched}
            </p>
          </div>
        )}

        {/* Footer / Meta Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Shortlisted on {dateFormatted}</span>
          </div>

          <div className="flex items-center gap-2">
            {isApplied && (
              <button
                type="button"
                onClick={() => {
                  setProposalsSearch(item.company_name);
                  setActiveTab("applications");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
              >
                View Proposal
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Qualified
            </span>
          </div>
        </div>
      </div>
    );
  };

  const isClosed = challengeDetails?.status === "CLOSED";

  // Reusable Candidate Card Renderer
  const renderCandidateCard = (match, idx, category = "ELIGIBLE") => {
    const isShortlisted = Boolean(
      match.is_shortlisted ||
      match.application_status === "SHORTLISTED" ||
      (applications || []).some(
        (a) => a.startup_id === (match.startup_id || match.id) && a.status === "SHORTLISTED"
      )
    );
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
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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

              {/* Verification Status Badge */}
              {(() => {
                const rawStatus =
                  match.verification_status ||
                  match.startup?.verification_status ||
                  (match.startup?.is_verified ? "VERIFIED" : "PENDING");
                const isVerified =
                  String(rawStatus).toUpperCase() === "VERIFIED" || match.startup?.is_verified === true;
                return isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                    Unverified
                  </span>
                );
              })()}
            </div>
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

        {/* Metadata row — placed outside the top-row flex so it gets full card width */}
        <p className="mt-1 text-xs text-slate-400">
          {getCanonicalDomain(match.startup?.domain || match.domain) || "Technology Specialist"} •{" "}
          {match.startup?.location || "India"} • TRL {match.startup?.readiness_level || 1} •{" "}
          <span className="whitespace-nowrap">{match.startup?.years_experience || 0} yrs experience</span>
        </p>

        {/* 5-Factor Score Breakdown */}
        <div className="mt-4 overflow-x-auto scrollbar-none">
          <div className="grid grid-cols-5 gap-1.5 text-center min-w-[380px] sm:min-w-0">
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
              <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                <span>Tech</span>
                <span> (30%)</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {Math.round(match.technology_score || 0)}%
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
              <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                <span>Domain</span>
                <span> (25%)</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {Math.round(match.domain_score || 0)}%
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
              <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                <span>Readiness</span>
                <span> (20%)</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {Math.round(match.readiness_score || 0)}%
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
              <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                <span>Experience</span>
                <span> (15%)</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {Math.round(match.experience_score || 0)}%
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/60 min-w-0">
              <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                <span>Deploy Fit</span>
                <span> (10%)</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {Math.round(match.deployment_score || 0)}%
              </p>
            </div>
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

        {/* GLOBAL ROUTE: /government/applications — Challenge picker (no auto-selection) */}
        {isDedicatedApplicationsRoute && !activeChallengeId && !loading && (
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-8"
            >
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <ClipboardCheck className="h-3.5 w-3.5" />
                All Applications
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
                Applications &amp; Proposals
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select a challenge below to view its submitted proposals, AI-matched startups, and shortlisted candidates.
              </p>
            </motion.div>

            {challengesList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Users className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No Challenges Found</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No challenges are accessible for your department. Create a challenge first.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/government/challenges/new")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Create Challenge
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {challengesList.map((ch) => (
                  <motion.button
                    key={ch.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setActiveChallengeId(ch.id);
                      loadData(ch.id);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                          {ch.department?.name || "Government Challenge"}
                        </p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                          {ch.title}
                        </h3>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ch.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : ch.status === "EVALUATION" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        : ch.status === "PILOT" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : ch.status === "DRAFT" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {ch.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{ch._count?.applications ?? 0} proposals</span>
                      {ch.application_deadline && (
                        <span>Deadline: {new Date(ch.application_deadline).toLocaleDateString("en-IN")}</span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NORMAL CHALLENGE-SCOPED VIEW — only when a challenge is selected or this is the challenge-scoped route */}
        {(!isDedicatedApplicationsRoute || activeChallengeId) && (
          <div>
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >

          <button
            type="button"
            onClick={() => {
              if (id) {
                navigate(`/government/challenges/${id}/overview`);
              } else {
                navigate("/government/challenges");
              }
            }}
            className="back-nav"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Challenge Overview
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 pr-0 lg:pr-6">
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

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  Published: {formatPublishDate(challengeDetails)}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
                {challengeDetails?.title || "Problem Statement Discovery & Evaluation"}
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">Startup Discovery:</strong>{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {matchSummary.eligible} eligible matches
                </span>{" "}
                (total verified profiles evaluated: {matchSummary.total}; shortlisted: {matchSummary.shortlisted}; Applied: {matchSummary.applied})
              </p>
            </div>

            {/* Action Buttons: Vertically Stacked & Right Aligned */}
            <div className="flex flex-col items-stretch sm:items-end gap-2.5 shrink-0">
              {challengeDetails?.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={handleStartEvaluation}
                  disabled={transitionLoading || isClosed}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {transitionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  )}
                  Start Evaluation Phase
                </button>
              )}

              {!isClosed && (
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 whitespace-nowrap"
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-semibold text-white shadow-md shadow-blue-800/20 transition hover:bg-blue-900 disabled:opacity-50 whitespace-nowrap"
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

        {/* Action Message Toast / Banner with auto-dismiss and manual dismiss */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{actionMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionMessage("")}
                className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors p-1"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TABS */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("ai-matches")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "ai-matches"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="whitespace-nowrap">
              Startup Discovery ({matchSummary.eligible} Eligible / {matchSummary.total} Evaluated)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "applications"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <span className="whitespace-nowrap">
              Submitted Proposals ({applications.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shortlisted")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "shortlisted"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="whitespace-nowrap">
              Shortlisted Startups ({shortlistedList.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("evaluator-pool");
              loadEvaluatorPoolData();
            }}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "evaluator-pool"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="whitespace-nowrap">
              Final Evaluator Pool & Review ({challengePool.length} Pool Members)
            </span>
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
                {/* STARTUP DISCOVERY FILTER TOOLBAR */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2.5">
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
                    {/* Search Field */}
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={discoverySearch}
                        onChange={(e) => setDiscoverySearch(e.target.value)}
                        placeholder="Search startups by name..."
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    {/* Domain Filter */}
                    <div className="w-full sm:w-[155px] lg:w-[155px] shrink-0">
                      <select
                        value={discoveryDomain}
                        onChange={(e) => setDiscoveryDomain(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="all">All Domains</option>
                        {availableDomains.map((dom) => (
                          <option key={dom} value={dom}>
                            {dom}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Readiness Level Filter */}
                    <div className="w-full sm:w-[175px] lg:w-[175px] shrink-0">
                      <select
                        value={discoveryReadiness}
                        onChange={(e) => setDiscoveryReadiness(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-2.5 pr-5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="all">All Readiness Levels</option>
                        {availableReadiness.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Level {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Match Score Filter */}
                    <div className="w-full sm:w-[160px] lg:w-[160px] shrink-0">
                      <select
                        value={discoveryMatchScore}
                        onChange={(e) => setDiscoveryMatchScore(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="all">All Match Scores</option>
                        <option value="90">90%+</option>
                        <option value="80">80%+</option>
                        <option value="70">70%+</option>
                        <option value="60">60%+</option>
                        <option value="50">50%+</option>
                      </select>
                    </div>

                    {/* Verification Status Filter */}
                    <div className="w-full sm:w-[158px] lg:w-[158px] shrink-0">
                      <select
                        value={discoveryVerification}
                        onChange={(e) => setDiscoveryVerification(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {verificationFilterOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filtered Result Count */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span>
                      <strong className="font-semibold text-slate-900 dark:text-white">
                        {filteredTotalMatchesCount} {filteredTotalMatchesCount === 1 ? "startup" : "startups"} found
                      </strong>
                      {isDiscoveryFiltered && ` (filtered from ${matches.length} total)`}
                    </span>

                    {isDiscoveryFiltered && (
                      <button
                        type="button"
                        onClick={handleClearDiscoveryFilters}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* NO RESULTS EMPTY STATE */}
                {isDiscoveryFiltered && filteredTotalMatchesCount === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                    <Search className="mx-auto h-8 w-8 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      No startups match the selected filters.
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Try adjusting your search query, lowering the match score threshold, or clearing all filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearDiscoveryFilters}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: PRIMARY ELIGIBLE CANDIDATES */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                        <div>
                          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            Primary Eligible Candidates ({filteredEligibleMatches.length})
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Startups satisfying all mandatory eligibility criteria, ranked authoritatively by deterministic 5-factor scoring.
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1 text-xs font-semibold">
                          Recommended for Shortlist
                        </span>
                      </div>

                      {filteredEligibleMatches.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                          {isDiscoveryFiltered
                            ? "No eligible candidates match the current filters."
                            : "No verified startups currently meet all mandatory eligibility criteria for this Problem Statement."}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {filteredEligibleMatches.map((m, idx) => renderCandidateCard(m, idx, "ELIGIBLE"))}
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
                              Candidates Requiring Review ({filteredNeedsReviewMatches.length})
                            </h2>
                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                              Startups with borderline or alternative domain/technology alignment. Review departmental considerations before shortlisting.
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-1 text-xs font-semibold">
                            Needs Official Review
                          </span>
                        </div>

                        {filteredNeedsReviewMatches.length === 0 ? (
                          <div className="rounded-2xl border border-amber-200/50 bg-amber-50/20 p-8 text-center text-xs text-amber-700/70 dark:border-amber-900/30 dark:bg-amber-950/10">
                            No review candidates match the current filters.
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            {filteredNeedsReviewMatches.map((m, idx) =>
                              renderCandidateCard(m, filteredEligibleMatches.length + idx, "NEEDS_REVIEW")
                            )}
                          </div>
                        )}
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
                            Ineligible Profiles — Audit Trail ({filteredIneligibleMatches.length} matching / {ineligibleMatches.length} total)
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
                          filteredIneligibleMatches.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                              No ineligible profiles match the current filters.
                            </div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              {filteredIneligibleMatches.map((m, idx) =>
                                renderCandidateCard(
                                  m,
                                  filteredEligibleMatches.length + filteredNeedsReviewMatches.length + idx,
                                  "INELIGIBLE"
                                )
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: APPLICATIONS (FORMAL PROPOSALS) */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            {/* SUBMITTED PROPOSALS FILTER TOOLBAR */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={proposalsSearch}
                    onChange={(e) => setProposalsSearch(e.target.value)}
                    placeholder="Search proposals by startup name or proposal title..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {/* Application Status Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={proposalStatusFilter}
                    onChange={(e) => setProposalStatusFilter(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="all">All Application Status</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="SELECTED">Selected</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>

                {/* Evaluation Status Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={proposalEvaluationFilter}
                    onChange={(e) => setProposalEvaluationFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="all">All Evaluation Status</option>
                    <option value="RECOMMENDED_FOR_PILOT">Recommended for Pilot</option>
                    <option value="RESERVE_CANDIDATE">Reserve Candidate</option>
                    <option value="EVALUATION_PENDING_QUORUM">Pending Quorum</option>
                    <option value="NOT_RECOMMENDED">Not Recommended</option>
                    <option value="EVALUATED">Evaluated</option>
                    <option value="PENDING">Pending Evaluation</option>
                    <option value="UNASSIGNED">Unassigned</option>
                  </select>
                </div>

                {/* Submission Date Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={proposalDateFilter}
                    onChange={(e) => handleDateFilterChange(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="all">All Submission Dates</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {isProposalsFiltered && (
                  <button
                    type="button"
                    onClick={handleClearProposalsFilters}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Filtered Result Count */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {filteredApplications.length} {filteredApplications.length === 1 ? "proposal" : "proposals"} found
                  </strong>
                  {isProposalsFiltered && ` (filtered from ${applications.length} total)`}
                </span>
              </div>
            </div>

            {/* APPLICATIONS TABLE */}
            {filteredApplications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <FileCheck2 className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {isProposalsFiltered
                    ? "No proposals match the selected filters."
                    : "No Proposals Found"}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {isProposalsFiltered
                    ? "Try adjusting your search query or clearing the status filters."
                    : isClosed
                    ? "This Problem Statement is closed and no proposals were submitted."
                    : "Verified startups will submit proposals through the portal while this challenge is open."}
                </p>
                {isProposalsFiltered && (
                  <button
                    type="button"
                    onClick={handleClearProposalsFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Startup Name</th>
                        <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Proposal Summary</th>
                        <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Assigned Evaluators</th>
                        <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Decision Engine</th>
                        <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Status</th>
                        <th className="px-5 py-3.5 text-right font-semibold whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {paginatedApplications.map((app) => {
                        const assignments = app.evaluator_assignments || [];
                        const hasRecused = assignments.some((a) => a.status === "RECUSED");
                        const dec = decisions[app.id];
                        const rec = dec?.recommendation;
                        const evalAssess = dec?.evaluation_assessment;

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap align-middle">
                              {app.startup?.company_name || app.startup?.name || "Startup Entity"}
                            </td>
                            <td className="px-5 py-4 max-w-xs align-middle">
                              <p className="truncate text-slate-600 dark:text-slate-300" title={app.proposal_summary || app.proposal || ""}>
                                {app.proposal_summary || app.proposal || "—"}
                              </p>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap align-middle">
                              <div className="space-y-1">
                                {assignments.length === 0 ? (
                                  <span className="text-xs text-slate-400">Unassigned</span>
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
                            <td className="px-5 py-4 whitespace-nowrap align-middle">
                              {!dec ? (
                                <span className="text-xs text-slate-400">Pending Evaluation</span>
                              ) : (
                                <div className="space-y-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      rec === "RECOMMENDED_FOR_PILOT"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : rec === "RESERVE_CANDIDATE"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                        : rec === "EVALUATION_PENDING_QUORUM"
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    }`}
                                  >
                                    {rec === "RECOMMENDED_FOR_PILOT" && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                    {rec === "EVALUATION_PENDING_QUORUM" && <Clock3 className="h-3 w-3 text-amber-600" />}
                                    {rec === "NOT_RECOMMENDED" && <XCircle className="h-3 w-3 text-rose-600" />}
                                    {rec === "RESERVE_CANDIDATE" && <ShieldCheck className="h-3 w-3 text-blue-600" />}
                                    {rec ? rec.replace(/_/g, " ") : "EVALUATING"}
                                  </span>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {evalAssess?.evaluation_count ?? 0}/{evalAssess?.required_quorum ?? 2} evals
                                    {evalAssess?.average_total_score ? ` • Avg ${evalAssess.average_total_score}%` : ""}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap align-middle">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
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
                            <td className="px-5 py-4 text-right whitespace-nowrap align-middle">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(app)}
                                  className="inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300 transition-colors"
                                >
                                  {assignments.length > 0 ? "+ Assign Evaluator" : "Assign Evaluator"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isClosed || app.status === "SHORTLISTED"}
                                  onClick={() => handleStatusChange(app.id, "SHORTLISTED")}
                                  className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-indigo-950/50 dark:text-indigo-300 transition-colors"
                                >
                                  Shortlist
                                </button>
                                <button
                                  type="button"
                                  disabled={isClosed || app.status === "SELECTED"}
                                  onClick={() => handleOpenSelectionModal(app)}
                                  className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                                >
                                  Select for Pilot
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={proposalsPage}
                  totalItems={filteredApplications.length}
                  pageSize={proposalsPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={setProposalsPage}
                  onPageSizeChange={setProposalsPageSize}
                  itemName="proposals"
                  className="border-t border-slate-100 dark:border-slate-800 rounded-none border-x-0 border-b-0"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SHORTLISTED STARTUPS */}
        {activeTab === "shortlisted" && (
          <div className="space-y-6">
            {/* Header intro card */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 sm:p-5 dark:border-purple-900/40 dark:bg-purple-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Official Challenge Shortlist ({shortlistedList.length})
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Authoritatively shortlisted startups for this Problem Statement. Shortlisted candidates are qualified for technical evaluation and pilot stage fast-tracking.
                  </p>
                </div>

                {shortlistedList.length > 0 && (
                  <div className="relative min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={shortlistedSearch}
                      onChange={(e) => setShortlistedSearch(e.target.value)}
                      placeholder="Search shortlisted startups..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    {shortlistedSearch && (
                      <button
                        type="button"
                        onClick={() => setShortlistedSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content: Empty State vs Cards Grid */}
            {shortlistedList.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  No startups have been shortlisted for this challenge yet.
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  Evaluate verified candidates in the Startup Discovery tab and click "Shortlist Candidate" to advance them into this official shortlist.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("ai-matches")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Explore Startup Discovery
                </button>
              </div>
            ) : filteredShortlisted.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                No shortlisted startups match "{shortlistedSearch}".
                <button
                  type="button"
                  onClick={() => setShortlistedSearch("")}
                  className="ml-2 font-semibold text-purple-600 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {paginatedShortlisted.map((item, idx) => renderShortlistedCard(item, idx))}
                </div>

                <Pagination
                  currentPage={shortlistedPage}
                  totalItems={filteredShortlisted.length}
                  pageSize={shortlistedPageSize}
                  pageSizeOptions={[6, 12, 24]}
                  onPageChange={setShortlistedPage}
                  onPageSizeChange={setShortlistedPageSize}
                  itemName="shortlisted startups"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINAL EVALUATOR POOL & REVIEW */}
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
                  <table className="w-full min-w-[850px] text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                      <tr>
                        <th className="py-3 px-4 whitespace-nowrap">Evaluator</th>
                        <th className="py-3 px-4 whitespace-nowrap">Organization & Role</th>
                        <th className="py-3 px-4 whitespace-nowrap">Source</th>
                        <th className="py-3 px-4 whitespace-nowrap">Approval Notes</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {challengePool.map((p) => {
                        const ev = p.evaluator;
                        const prof = ev?.evaluator_profile;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white align-middle">
                              {ev?.name || "Evaluator"}
                              <span className="block text-[11px] text-slate-400 font-normal">{ev?.email}</span>
                            </td>
                            <td className="py-3 px-4 align-middle">
                              {prof?.designation || "Specialist"} — {prof?.organization || "Independent"}
                              <span className="block text-[11px] text-slate-400">
                                {Array.isArray(prof?.domain_expertise) ? prof.domain_expertise.join(", ") : "Domain Specialist"}
                              </span>
                            </td>
                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                                {p.source || "MATCHED"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 italic align-middle">
                              {p.notes || "Approved into pool"}
                            </td>
                            <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromPool(p.evaluator_id)}
                                className="text-red-500 hover:text-red-700 font-semibold text-xs transition-colors"
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
                              {m.evaluator?.evaluator_profile?.designation} — {m.evaluator?.evaluator_profile?.organization} ({m.evaluator?.evaluator_profile?.years_experience || 0} yrs experience)
                            </p>

                            {/* Breakdown */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                              <span>Domain: <strong>{Math.round(m.domain_score || 0)}%</strong></span>
                              <span>Exp: <strong>{Math.round(m.experience_score || 0)}%</strong></span>
                              <span>Tech: <strong>{Math.round(m.tech_score || 0)}%</strong></span>
                              <span>Capability: <strong>{Math.round(m.capability_score || 0)}%</strong></span>
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

            {/* Section 3: Evaluator Self-Applicants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
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
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 text-xs shadow-sm"
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
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 text-xs shadow-sm"
                  >
                    {assignLoading ? "Assigning..." : "Assign Evaluator"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* =====================================================
            GOVERNED SELECTION DECISION MODAL (COMPONENT 6)
        ===================================================== */}
        {selectionModalOpen && selectedAppForDecision && (() => {
          const dec = decisions[selectedAppForDecision.id];
          const rec = dec?.recommendation;
          const evalAssess = dec?.evaluation_assessment;
          const factors = dec?.decision_factors || [];
          const isQuorumPending = rec === "EVALUATION_PENDING_QUORUM";
          const isOverrideRequired = rec === "RESERVE_CANDIDATE" || rec === "NOT_RECOMMENDED";
          const canSubmit = !isQuorumPending && (!isOverrideRequired || overrideJustification.trim().length >= 10);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" />
                    Government Pilot Award Selection
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    Select Proposal for Pilot Award
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Proposal from{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      "{selectedAppForDecision.startup?.company_name || selectedAppForDecision.startup?.name || "Candidate"}"
                    </span>
                  </p>
                </div>

                {/* AI / Decision Engine Advisory Notice */}
                <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Advisory Decision Engine Synthesis
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-800/90 dark:text-indigo-300/90">
                    Decision Engine recommendations and AI summaries are advisory. The Government authority makes the final selection decision in compliance with SetuGov procurement rules.
                  </p>
                </div>

                {/* Decision Assessment Card */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recommendation:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        rec === "RECOMMENDED_FOR_PILOT"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                          : rec === "RESERVE_CANDIDATE"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                          : rec === "EVALUATION_PENDING_QUORUM"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                      }`}
                    >
                      {rec === "RECOMMENDED_FOR_PILOT" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      {rec === "EVALUATION_PENDING_QUORUM" && <Clock3 className="h-3.5 w-3.5 text-amber-600" />}
                      {rec === "NOT_RECOMMENDED" && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                      {rec === "RESERVE_CANDIDATE" && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                      {rec ? rec.replace(/_/g, " ") : "NO DATA"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 dark:border-slate-700/60 dark:bg-slate-900">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Independent Evaluations</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {evalAssess?.evaluation_count ?? 0} / {evalAssess?.required_quorum ?? 2}
                        <span className="text-[11px] font-normal text-slate-500 ml-1">
                          ({evalAssess?.quorum_met ? "Quorum Met" : "Quorum Pending"})
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 dark:border-slate-700/60 dark:bg-slate-900">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Consensus Score</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {evalAssess?.average_total_score ? `${evalAssess.average_total_score}%` : "—"}
                      </div>
                    </div>
                  </div>

                  {factors.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Deterministic Decision Factors:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quorum Pending Alert */}
                {isQuorumPending && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Selection Blocked: Quorum Requirement
                    </div>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      This application has received {evalAssess?.evaluation_count ?? 0} evaluation(s). A minimum of {evalAssess?.required_quorum ?? 2} independent, conflict-free evaluator reviews is required by SetuGov governance before final award selection can be made.
                    </p>
                  </div>
                )}

                {/* Override Justification for RESERVE_CANDIDATE or NOT_RECOMMENDED */}
                {isOverrideRequired && (
                  <div className="mb-4 space-y-2">
                    <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        Mandatory Governance Override Justification
                      </div>
                      <p className="text-[11px] leading-relaxed text-purple-800/90 dark:text-purple-300/90">
                        Selecting a <strong>{rec.replace(/_/g, " ")}</strong> candidate requires an official written justification. This statement will be permanently recorded in the audit log.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Override Justification * (min 10 characters)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={overrideJustification}
                        onChange={(e) => setOverrideJustification(e.target.value)}
                        placeholder="State official rationale for selecting this candidate over standard recommendation..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {selectionError && (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{selectionError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionModalOpen(false);
                      setSelectedAppForDecision(null);
                      setSelectionError("");
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectionLoading || !canSubmit}
                    onClick={handleConfirmSelection}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 text-xs"
                  >
                    {selectionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Decision...
                      </>
                    ) : isQuorumPending ? (
                      "Quorum Required"
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Pilot Award Selection
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ChallengeApplications;