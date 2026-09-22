import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Clock3,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Info,
  X,
  Copy,
  Check,
  Layers,
  Activity
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import { getAuditLogs } from "../../services/auditService";
import Pagination from "../../components/common/Pagination";
import StatCard from "../../components/common/StatCard";

// Centralized Action Label and Badge Formatter
const ACTION_MAP = {
  CHALLENGE_CREATED: { label: "Challenge Created", color: "blue" },
  CHALLENGE_UPDATED: { label: "Challenge Updated", color: "slate" },
  CHALLENGE_PUBLISHED: { label: "Challenge Published", color: "emerald" },
  CHALLENGE_CLOSED: { label: "Challenge Closed", color: "amber" },
  APPLICATION_SUBMITTED: { label: "Application Submitted", color: "indigo" },
  APPLICATION_SHORTLISTED: { label: "Application Shortlisted", color: "purple" },
  APPLICATION_SELECTED: { label: "Startup Selected", color: "emerald" },
  PILOT_CREATED: { label: "Pilot Sanctioned", color: "blue" },
  PILOT_UPDATED: { label: "Pilot Updated", color: "slate" },
  PILOT_STATUS_UPDATED: { label: "Pilot Stage Transition", color: "indigo" },
  PILOT_EVIDENCE_UPLOADED: { label: "Pilot Evidence Uploaded", color: "emerald" },
  EVIDENCE_UPLOADED: { label: "Evidence Uploaded", color: "emerald" },
  MILESTONE_CREATED: { label: "Milestone Created", color: "blue" },
  MILESTONE_UPDATED: { label: "Milestone Updated", color: "purple" },
  VALIDATION_COMPLETED: { label: "Stage-Gate Validation", color: "emerald" },
  PAYMENT_RELEASED: { label: "Payment Released", color: "emerald" },
  PAYMENT_RECORDED: { label: "Payment Recorded", color: "blue" },
  PAYMENT_DISBURSED: { label: "Payment Disbursed", color: "emerald" },
  SCALE_DECISION_FINALIZED: { label: "Scale Decision Finalized", color: "emerald" },
  PROCUREMENT_CREATED: { label: "Procurement Record Created", color: "indigo" },
  PROCUREMENT_APPROVED: { label: "Procurement Approved", color: "emerald" },
  PROCUREMENT_HANDOFF: { label: "Procurement GeM Handoff", color: "blue" },
  PROCUREMENT_STATUS_UPDATED: { label: "Procurement Stage Updated", color: "slate" },
  PROCUREMENT_DELIVERY_ACCEPTED: { label: "Procurement Delivery Accepted", color: "emerald" },
  ACCESS_REQUEST_SUBMITTED: { label: "Access Request Submitted", color: "blue" },
  ACCESS_REQUEST_APPROVED: { label: "Access Request Approved", color: "emerald" },
  LOGIN_SUCCESS: { label: "User Login", color: "blue" },
  USER_LOGIN: { label: "User Authentication", color: "blue" },
  LOGOUT: { label: "User Logout", color: "slate" },
  EVALUATOR_ASSIGNED: { label: "Evaluator Assigned", color: "purple" },
  EVALUATOR_POOL_UPDATED: { label: "Evaluator Pool Updated", color: "purple" },
  EVALUATION_SUBMITTED: { label: "Evaluation Submitted", color: "emerald" },
  EVALUATION_COMPLETED: { label: "Evaluation Completed", color: "emerald" },
  RISK_FLAGGED: { label: "Risk Flagged", color: "amber" },
  RISK_UPDATED: { label: "Risk Status Updated", color: "amber" },
};

const ACTION_COLORS = {
  blue: {
    icon: "bg-blue-50 text-blue-600 border-blue-200",
    line: "bg-blue-200",
    card: "border-blue-100 hover:border-blue-300",
    badge: "bg-blue-50 text-blue-700",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600 border-slate-200",
    line: "bg-slate-300",
    card: "border-slate-200 hover:border-slate-300",
    badge: "bg-slate-100 text-slate-600",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 border-emerald-200",
    line: "bg-emerald-200",
    card: "border-emerald-100 hover:border-emerald-300",
    badge: "bg-emerald-50 text-emerald-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 border-amber-200",
    line: "bg-amber-200",
    card: "border-amber-100 hover:border-amber-300",
    badge: "bg-amber-50 text-amber-700",
  },
  indigo: {
    icon: "bg-indigo-50 text-indigo-600 border-indigo-200",
    line: "bg-indigo-200",
    card: "border-indigo-100 hover:border-indigo-300",
    badge: "bg-indigo-50 text-indigo-700",
  },
  purple: {
    icon: "bg-purple-50 text-purple-600 border-purple-200",
    line: "bg-purple-200",
    card: "border-purple-100 hover:border-purple-300",
    badge: "bg-purple-50 text-purple-700",
  },
};

const formatActionName = (action) => {
  if (!action) return "System Activity";
  if (ACTION_MAP[action]) return ACTION_MAP[action].label;
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatEntityType = (type) => {
  if (!type) return "System Resource";
  const entityMap = {
    CHALLENGE: "Innovation Challenge",
    PILOT: "Pilot Sandbox",
    APPLICATION: "Startup Proposal",
    EVIDENCE: "Compliance Evidence",
    MILESTONE: "Pilot Milestone",
    PAYMENT: "Disbursement Record",
    PROCUREMENT: "Procurement Record",
    USER: "User Account",
    EVALUATOR: "Evaluator Profile",
    RISK: "Operational Risk",
    ACCESS_REQUEST: "Access Request",
  };
  return entityMap[type.toUpperCase()] || type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val) => typeof val === "string" && UUID_REGEX.test(val.trim());

const isIdKey = (key) => {
  if (!key) return false;
  const lower = key.toLowerCase();
  return (
    lower === "id" ||
    lower === "_id" ||
    lower.endsWith("_id") ||
    lower.endsWith("id") ||
    lower === "user_id" ||
    lower === "pilot_id" ||
    lower === "challenge_id" ||
    lower === "evidence_id" ||
    lower === "application_id" ||
    lower === "procurement_id" ||
    lower === "payment_id" ||
    lower === "startup_id" ||
    lower === "evaluator_id"
  );
};

const extractPrimaryResource = (log) => {
  const details = log.details || {};

  // 1. Evidence
  const evidenceTitle =
    details.evidence_title ||
    details.evidence_name ||
    details.document_title ||
    (details.evidence_type && typeof details.evidence_type === "string" ? details.evidence_type.replace(/_/g, " ") : null) ||
    (log.entity_type === "EVIDENCE" && details.title ? details.title : null);

  if (evidenceTitle && typeof evidenceTitle === "string" && !isUuid(evidenceTitle)) {
    return {
      type: "Evidence",
      name: evidenceTitle.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }

  // 2. Pilot
  const pilotName = details.pilot_title || details.pilot_name || (typeof details.pilot === "string" && !isUuid(details.pilot) ? details.pilot : null);
  if (pilotName && typeof pilotName === "string" && !isUuid(pilotName)) {
    return { type: "Pilot", name: pilotName };
  }

  // 3. Challenge
  const challengeTitle = details.challenge_title || details.challenge_name || (typeof details.challenge === "string" && !isUuid(details.challenge) ? details.challenge : null);
  if (challengeTitle && typeof challengeTitle === "string" && !isUuid(challengeTitle)) {
    return { type: "Challenge", name: challengeTitle };
  }

  // 4. Startup
  const startupName = details.startup_name || details.company_name || (typeof details.startup === "string" && !isUuid(details.startup) ? details.startup : null);
  if (startupName && typeof startupName === "string" && !isUuid(startupName)) {
    return { type: "Startup", name: startupName };
  }

  // 5. Milestone
  const milestoneName = details.milestone_name || details.milestone_title || (typeof details.milestone === "string" && !isUuid(details.milestone) ? details.milestone : null);
  if (milestoneName && typeof milestoneName === "string" && !isUuid(milestoneName)) {
    return { type: "Milestone", name: milestoneName };
  }

  // 6. Contract / Procurement
  const contractRef = details.contract_title || details.gem_contract_number || details.po_number;
  if (contractRef && typeof contractRef === "string" && !isUuid(contractRef)) {
    return { type: "Contract", name: contractRef };
  }

  // 7. User / Account
  if (details.email && typeof details.email === "string" && !isUuid(details.email)) {
    return { type: "Account", name: details.email };
  }

  // 8. General entity type fallback
  if (log.entity_type) {
    return { type: formatEntityType(log.entity_type), name: null };
  }

  return { type: "System Operation", name: null };
};

const extractSanitizedSummaryTags = (log, primaryResource) => {
  const items = [];
  const details = log.details || {};

  // Secondary human-readable associations
  if (
    details.pilot_name &&
    typeof details.pilot_name === "string" &&
    !isUuid(details.pilot_name) &&
    primaryResource?.name !== details.pilot_name
  ) {
    items.push({ label: "Pilot", value: details.pilot_name });
  }

  if (
    details.challenge_title &&
    typeof details.challenge_title === "string" &&
    !isUuid(details.challenge_title) &&
    primaryResource?.name !== details.challenge_title
  ) {
    items.push({ label: "Challenge", value: details.challenge_title });
  }

  if (
    details.startup_name &&
    typeof details.startup_name === "string" &&
    !isUuid(details.startup_name) &&
    primaryResource?.name !== details.startup_name
  ) {
    items.push({ label: "Startup", value: details.startup_name });
  }

  // Meaningful event attributes (skipping raw UUIDs, password/tokens, empty objects)
  Object.entries(details).forEach(([key, val]) => {
    const lowerKey = key.toLowerCase();

    // Skip redundant titles or already handled keys
    if (
      [
        "challenge_title",
        "challenge_name",
        "challenge",
        "pilot_title",
        "pilot_name",
        "pilot",
        "startup_name",
        "company_name",
        "startup",
        "evidence_title",
        "evidence_name",
        "document_title",
        "title",
        "milestone_name",
        "milestone_title",
        "milestone",
        "contract_title",
        "gem_contract_number",
        "po_number",
        "password",
        "token",
        "jwt",
        "secret",
        "api_key",
      ].includes(lowerKey)
    ) {
      return;
    }

    // Skip raw UUIDs and ID keys
    if (isUuid(val) || isIdKey(key)) return;

    // Skip objects or arrays
    if (typeof val === "object" && val !== null) return;

    // Skip strings that match raw UUID pattern
    if (typeof val === "string" && isUuid(val.trim())) return;

    // Format value
    if (val !== undefined && val !== null && val !== "") {
      const cleanKey = key
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

      let cleanVal = String(val);
      if (
        typeof val === "number" &&
        (lowerKey.includes("amount") ||
          lowerKey.includes("budget") ||
          lowerKey.includes("cost") ||
          lowerKey.includes("value") ||
          lowerKey.includes("disbursed"))
      ) {
        cleanVal = `₹${val.toLocaleString("en-IN")}`;
      } else if (typeof val === "boolean") {
        cleanVal = val ? "Yes" : "No";
      } else if (typeof val === "string" && val.length > 45) {
        cleanVal = `${val.slice(0, 42)}...`;
      }

      items.push({ label: cleanKey, value: cleanVal });
    }
  });

  return items;
};

const extractTechnicalIds = (log) => {
  const ids = [];
  const seenValues = new Set();

  const addId = (label, key, val) => {
    if (!val || typeof val !== "string" || seenValues.has(val)) return;
    seenValues.add(val);
    ids.push({ label, key, value: val });
  };

  if (log.id) {
    addId("Audit Event ID", "audit_id", String(log.id));
  }
  if (log.user_id) {
    addId("User ID", "user_id", String(log.user_id));
  }
  if (log.entity_id) {
    const entityLabel = log.entity_type ? `${formatEntityType(log.entity_type)} ID` : "Entity ID";
    addId(entityLabel, "entity_id", String(log.entity_id));
  }

  if (log.details && typeof log.details === "object") {
    Object.entries(log.details).forEach(([key, val]) => {
      if (typeof val === "string" && (isUuid(val) || (isIdKey(key) && val.length > 8))) {
        const humanLabel = key
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/\bId\b/g, "ID");

        addId(humanLabel, key, val);
      }
    });
  }

  return ids;
};

function ChallengeAudit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [auditLogs, setAuditLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (id) {
        params.entity_id = id;
      }
      if (actionFilter && actionFilter !== "ALL") {
        params.action = actionFilter;
      }
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await getAuditLogs(params);
      const rawLogs = res?.data?.logs || res?.logs || (Array.isArray(res?.data) ? res.data : []) || [];
      const total = res?.data?.pagination?.total ?? res?.pagination?.total ?? rawLogs.length;

      setAuditLogs(rawLogs);
      setTotalCount(total);
    } catch (err) {
      console.error("Could not load audit logs:", err);
      setError(err?.message || "Failed to retrieve audit trail from the server.");
      setAuditLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [id, currentPage, pageSize, actionFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCopyJson = (details) => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySingleId = (val, key) => {
    navigator.clipboard.writeText(val);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            {id ? (
              <button
                type="button"
                onClick={() => navigate(`/government/challenges/${id}/overview`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition mb-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Challenge Overview
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/government/dashboard")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition mb-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard
              </button>
            )}

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Government Audit Trail
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tamper-evident activity logs and stage-gate governance history stored securely in PostgreSQL.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Trail
          </button>
        </motion.div>

        {/* Challenge info summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            index={0}
            title="Audit Scoping"
            value="Department Protected"
            description="Immutable PostgreSQL ledger"
            icon={ShieldCheck}
            color="blue"
          />

          <StatCard
            index={1}
            title="Audit Scope"
            value={id ? "Challenge Ledger" : "All Department Operations"}
            description="Scoped administrative trace"
            icon={FileText}
            color="violet"
          />

          <StatCard
            index={2}
            title="Recorded Events"
            value={`${totalCount} Actions`}
            description="Tamper-evident logs"
            icon={Activity}
            color="emerald"
            valueColor="text-emerald-700 dark:text-emerald-400"
          />
        </div>

        {/* Audit trail container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Historical Activity Ledger
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Keyword Search */}
              <div className="relative min-w-[180px] sm:w-56">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search actions, names, or IP..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:[color-scheme:dark]"
                >
                  <option value="ALL">All Actions</option>
                  <option value="CHALLENGE_CREATED">Challenge Created</option>
                  <option value="CHALLENGE_PUBLISHED">Challenge Published</option>
                  <option value="APPLICATION_SUBMITTED">Proposal Submitted</option>
                  <option value="APPLICATION_SELECTED">Startup Selected</option>
                  <option value="PILOT_CREATED">Pilot Sanctioned</option>
                  <option value="PILOT_STATUS_UPDATED">Pilot Stage Updated</option>
                  <option value="PILOT_EVIDENCE_UPLOADED">Pilot Evidence Uploaded</option>
                  <option value="VALIDATION_COMPLETED">Validation Completed</option>
                  <option value="PAYMENT_RELEASED">Payment Released</option>
                  <option value="PAYMENT_DISBURSED">Payment Disbursed</option>
                  <option value="SCALE_DECISION_FINALIZED">Scale Decision Finalized</option>
                  <option value="PROCUREMENT_CREATED">Procurement Created</option>
                  <option value="PROCUREMENT_APPROVED">Procurement Approved</option>
                  <option value="PROCUREMENT_HANDOFF">Procurement GeM Handoff</option>
                  <option value="USER_LOGIN">User Authentication</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-slate-50/70 p-6">
            {loading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 py-12">
                <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
                <p className="text-sm font-medium text-slate-500">Retrieving PostgreSQL audit logs...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-950/30">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <h3 className="mt-2 text-sm font-bold text-red-800 dark:text-red-200">Unable to load audit logs</h3>
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry Request
                </button>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-14 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No audit records found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {actionFilter !== "ALL" || searchTerm
                    ? "No audit records matched the selected filters. Try broadening your criteria."
                    : "Actions performed on this platform, including pilot milestones, evaluations, and disbursements, will be recorded here automatically."}
                </p>
              </div>
            ) : (
              // <div className="space-y-5">
              //   {auditLogs.map((log, index) => {
              //     const actionInfo = ACTION_MAP[log.action] || { label: formatActionName(log.action), color: "slate" };
              //     const actorName = log.user?.name || log.user?.email || "System Service";
              //     const actorRole = log.user?.role || "SYSTEM";
              //     const eventTime = new Date(log.created_at).toLocaleString("en-IN", {
              //       dateStyle: "medium",
              //       timeStyle: "short",
              //     });
              //     const primaryResource = extractPrimaryResource(log);
              //     const summaryTags = extractSanitizedSummaryTags(log, primaryResource);

              //     return (
              //       <div
              //         key={log.id}
              //         className="relative flex gap-4 transition-all"
              //       >
              //         {/* Timeline connecting line */}
              //         {index !== auditLogs.length - 1 && (
              //           <div className="absolute left-5 top-10 h-full w-px bg-slate-200 dark:bg-slate-800" />
              //         )}

              //         {/* Status icon badge */}
              //         <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
              //           <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              //         </div>

              //         {/* Event Card */}
              //         <div className="group min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
              //           <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              //             <div>
              //               <div className="flex items-center gap-2">
              //                 <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              //                   {actionInfo.label}
              //                 </h3>
              //                 <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              //                   {log.action}
              //                 </span>
              //               </div>

              //               {/* Human-readable primary resource */}
              //               <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              //                 <span className="font-semibold text-slate-700 dark:text-slate-200">{primaryResource.type}:</span>
              //                 <span>{primaryResource.name || "General Operation"}</span>
              //               </div>
              //             </div>

              //             <button
              //               type="button"
              //               onClick={() => setSelectedLog(log)}
              //               className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/40 transition shrink-0 self-start"
              //             >
              //               <Info className="h-3.5 w-3.5 text-indigo-500" />
              //               Technical Details
              //               <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              //             </button>
              //           </div>

              //           {/* Sanitized Context Badges (Human-Readable) */}
              //           {summaryTags.length > 0 && (
              //             <div className="mt-3 flex flex-wrap items-center gap-2">
              //               {summaryTags.map((tag, tIdx) => (
              //                 <span
              //                   key={tIdx}
              //                   className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              //                 >
              //                   <span className="font-medium text-slate-500 dark:text-slate-400">{tag.label}:</span>
              //                   <span className="font-semibold text-slate-900 dark:text-slate-100">{tag.value}</span>
              //                 </span>
              //               ))}
              //             </div>
              //           )}

              //           {/* Footer Actor & Timestamp */}
              //           <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              //             <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              //               <User className="h-3.5 w-3.5 text-slate-400" />
              //               {actorName}
              //               <span className="rounded-sm bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              //                 {actorRole}
              //               </span>
              //             </span>

              //             <span className="inline-flex items-center gap-1.5">
              //               <Clock3 className="h-3.5 w-3.5" />
              //               {eventTime}
              //             </span>

              //             {log.ip_address && (
              //               <span className="text-xs text-slate-400 font-mono">
              //                 IP: {log.ip_address}
              //               </span>
              //             )}
              //           </div>
              //         </div>
              //       </div>
              //     );
              //   })}

              //   <Pagination
              //     currentPage={currentPage}
              //     totalItems={totalCount}
              //     pageSize={pageSize}
              //     pageSizeOptions={[5, 10, 20, 50]}
              //     onPageChange={setCurrentPage}
              //     onPageSizeChange={(newSize) => {
              //       setPageSize(newSize);
              //       setCurrentPage(1);
              //     }}
              //     itemName="audit records"
              //     className="mt-6"
              //   />
              // </div>
              <div className="space-y-5">
                {auditLogs.map((log, index) => {
                  const actionInfo =
                    ACTION_MAP[log.action] || {
                      label: formatActionName(log.action),
                      color: "slate",
                    };

                  const colors =
                    ACTION_COLORS[actionInfo.color] || ACTION_COLORS.slate;

                  const actorName =
                    log.user?.name || log.user?.email || "System Service";

                  const actorRole = log.user?.role || "SYSTEM";

                  const eventTime = new Date(log.created_at).toLocaleString(
                    "en-IN",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  );

                  const primaryResource = extractPrimaryResource(log);
                  const summaryTags = extractSanitizedSummaryTags(
                    log,
                    primaryResource
                  );

                  return (
                    <div
                      key={log.id}
                      className="relative flex gap-4"
                    >
                      {/* Timeline connecting line */}
                      {index !== auditLogs.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 h-[calc(100%+1.25rem)] w-px ${colors.line}`}
                        />
                      )}

                      {/* Colored timeline icon */}
                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm ${colors.icon}`}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </div>

                      {/* Event Card */}
                      <div
                        className={`group min-w-0 flex-1 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${colors.card}`}
                      >
                        {/* Header */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">
                                {actionInfo.label}
                              </h3>

                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-medium ${colors.badge}`}
                              >
                                {log.action}
                              </span>
                            </div>

                            {/* Resource */}
                            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">
                                {primaryResource.type}:
                              </span>

                              <span className="truncate">
                                {primaryResource.name || "General Operation"}
                              </span>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Technical Details
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>

                        {/* Context Tags */}
                        {summaryTags.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {summaryTags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs"
                              >
                                <span className="font-medium text-slate-500">
                                  {tag.label}:
                                </span>

                                <span className="font-semibold text-slate-800">
                                  {tag.value}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs">
                          {/* Actor */}
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                            <User className="h-3.5 w-3.5 text-slate-400" />

                            {actorName}

                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${colors.badge}`}
                            >
                              {actorRole}
                            </span>
                          </span>

                          {/* Timestamp */}
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                            {eventTime}
                          </span>

                          {/* IP */}
                          {log.ip_address && (
                            <span className="font-mono text-xs text-slate-400">
                              IP: {log.ip_address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Pagination
                  currentPage={currentPage}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  itemName="audit records"
                  className="mt-6"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Audit Details & Payload Inspector Modal */}
        <AnimatePresence>
          {selectedLog && (() => {
            const technicalIds = extractTechnicalIds(selectedLog);
            const modalActor = selectedLog.user?.name || selectedLog.user?.email || "System";
            const modalRole = selectedLog.user?.role || "SYSTEM";

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatActionName(selectedLog.action)}
                        </h3>
                        <p className="text-xs font-mono text-slate-400">{selectedLog.action}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {/* Actor & Timestamp Header */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-slate-400">Actor</p>
                        <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                          {modalActor} ({modalRole})
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-300 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-slate-400">Timestamp</p>
                        <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                          {new Date(selectedLog.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {/* Technical Identifiers & Audit Traceability Section */}
                    {technicalIds.length > 0 && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> Technical Identifiers (Audit Traceability)
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {technicalIds.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                                <p className="truncate font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200" title={item.value}>
                                  {item.value}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopySingleId(item.value, item.key)}
                                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                title={`Copy ${item.label}`}
                              >
                                {copiedId === item.key ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Raw Details Payload (JSON) */}
                    <div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Raw Audit Payload (JSON)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyJson(selectedLog.details)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied JSON" : "Copy JSON"}
                        </button>
                      </div>
                      <pre className="max-h-56 overflow-y-auto rounded-xl bg-slate-950 p-3.5 text-xs font-mono text-emerald-400 dark:bg-slate-950 border border-slate-800">
                        {JSON.stringify(selectedLog.details || {}, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      Close Details
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}

export default ChallengeAudit;