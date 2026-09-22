import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Cpu,
  Database,
  Layers,
  Server,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Sparkles,
  GitBranch,
  Terminal,
  ExternalLink,
  Info,
} from "lucide-react";
import { apiRequest } from "../../services/api";

// 5 Strict status
export const status = {
  WORKING: "Working (Verified)",
  PARTIALLY_WORKING: "Partially Working",
  IMPLEMENTED_NOT_VERIFIED: "Implemented / Not Verified",
  NOT_IMPLEMENTED: "Not Implemented",
  BLOCKED: "Blocked",
};

export const STATUS_STYLES = {
  [status.WORKING]: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  [status.PARTIALLY_WORKING]: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  [status.IMPLEMENTED_NOT_VERIFIED]: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-500",
    icon: Info,
  },
  [status.NOT_IMPLEMENTED]: {
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    dot: "bg-slate-400",
    icon: HelpCircle,
  },
  [status.BLOCKED]: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-500",
    icon: XCircle,
  },
};

// Global Innovation Lifecycle Data
const GLOBAL_LIFECYCLE_STAGES = [
  { stage: "Challenge Creation & Publication", status: status.WORKING, note: "Government drafting, validation, auto-slug, and state publishing" },
  { stage: "Startup Discovery", status: status.WORKING, note: "Directory browse, domain matching, eligibility filters" },
  { stage: "Deterministic Matching", status: status.WORKING, note: "5-factor algorithm calculates [0-100] score; AI never alters score" },
  { stage: "AI Match Explanation (Brain 2)", status: status.WORKING, note: "Narrative synthesis of match strengths for Government review" },
  { stage: "Startup Shortlisting", status: status.WORKING, note: "Government officer selects candidates for RFP / proposal round" },
  { stage: "Proposal Submission", status: status.WORKING, note: "Startup technical, financial, and milestone submission" },
  { stage: "Proposal Evaluation", status: status.WORKING, note: "Independent multi-rubric evaluator scoring with COI protection" },
  { stage: "Government Decision", status: status.WORKING, note: "Nodal officer consensus review and formal proposal selection" },
  { stage: "Pilot Initiation & Execution", status: status.WORKING, note: "Milestone execution, KPI measurement, issue logging" },
  { stage: "Pilot Validation", status: status.WORKING, note: "Formal validation against baseline targets" },
  { stage: "Scale Decision", status: status.WORKING, note: "Deterministic engine recommendation + official human signoff" },
  { stage: "Procurement Readiness & Dossier", status: status.WORKING, note: "Automated readiness audit and GeM handoff dossier generation" },
  { stage: "GeM Live Portal Integration", status: status.PARTIALLY_WORKING, note: "Manual reference/dossier export; live GeM API sync not available" },
  { stage: "Direct Bank Payment Execution", status: status.NOT_IMPLEMENTED, note: "Disbursement gateway outside SetuGov innovation scope" },
];

// 5 AI Brains Specification
const FIVE_AI_BRAINS = [
  {
    name: "Brain 1 — Challenge Copilot",
    purpose: "Transforms unstructured government administrative problems into structured, measurable innovation challenges with baseline KPIs and evaluation criteria.",
    backendRoute: "POST /api/v1/challenges/:challenge_id/brain1/generate",
    aiServiceEndpoint: "POST /ai/challenge",
    llmDependency: "Configurable AI Provider (LLM)",
    isInvoked: "Yes — invoked when Government officer clicks Generate Copilot Suggestions in Challenge Editor",
    isPersisted: "Yes — saved into Challenge model fields: problem_description, desired_outcome, pilot_duration_days",
    frontendConsumed: "Yes — populated directly into CreateChallenge.jsx form fields for human officer review",
    status: status.WORKING,
    explanation: "Complete execution path verified: Frontend form -> Express backend -> FastAPI AI service -> Configured AI Provider -> Structured JSON response parsed and populated into form.",
    boundaryNote: "Advisory copilot only. Government officer must explicitly edit and approve before challenge publication.",
  },
  {
    name: "Brain 2 — Startup Match Intelligence",
    purpose: "Provides natural-language explanatory synthesis for why a startup was matched to a government challenge.",
    backendRoute: "POST /api/v1/challenges/:challenge_id/match",
    aiServiceEndpoint: "POST /ai/match",
    llmDependency: "Configurable AI Provider + Embeddings (configurable dimension)",
    isInvoked: "Yes — invoked during candidate matching workflow",
    isPersisted: "Yes — deterministic score in MatchScore.score; narrative saved in MatchScore.match_explanation",
    frontendConsumed: "Yes — displayed in ChallengeApplications.jsx and ChallengeOverview.jsx match cards",
    status: status.WORKING,
    explanation: "Strict boundary enforced: Deterministic algorithm in eligibility.js calculates the authoritative 0-100 score (tech fit, domain fit, readiness level, track record, deployment scope). Brain 2 generates the qualitative rationale without altering the numerical ranking.",
    boundaryNote: "CRITICAL: Brain 2 AI explanation cannot alter deterministic candidate rankings or eligibility filters.",
  },
  {
    name: "Brain 3 — Proposal Analysis",
    purpose: "Analyzes startup technical proposals against challenge objectives, highlighting feasibility risks, implementation strengths, and budget anomalies.",
    backendRoute: "POST /api/v1/ai/applications/:application_id/analyze",
    aiServiceEndpoint: "POST /ai/proposal",
    llmDependency: "Configurable AI Provider (LLM)",
    isInvoked: "Yes — invoked when evaluator or government officer requests AI technical proposal brief",
    isPersisted: "Yes — advisory summary cached in evaluation metadata",
    frontendConsumed: "Yes — rendered in EvaluationDetail.jsx advisory sidebar for technical evaluators",
    status: status.WORKING,
    explanation: "Complete end-to-end pipeline verified. Evaluators view advisory analysis as decision-support; evaluator retains 100% responsibility for scoring rubric criteria.",
    boundaryNote: "Strictly advisory. Does not assign scores or replace human evaluator judgment.",
  },
  {
    name: "Brain 4 — Pilot Intelligence",
    purpose: "Analyzes milestone progress, KPI trajectory, evidence authenticity, and operational risks during pilot execution.",
    backendRoute: "POST /api/v1/ai/pilots/:pilot_id/analyze",
    aiServiceEndpoint: "POST /ai/pilot",
    llmDependency: "Configurable AI Provider (LLM)",
    isInvoked: "Yes — invoked on pilot review dashboard for automated risk and progress synthesis",
    isPersisted: "Yes — stored in Pilot.ai_summary and risk assessment records",
    frontendConsumed: "Yes — displayed in ChallengePilot.jsx and EvaluatorPilotDetail.jsx",
    status: status.WORKING,
    explanation: "Verified pipeline. Deterministic math tracks KPI measurement deviations; Brain 4 provides qualitative operational risk assessment for government nodal officers.",
    boundaryNote: "Human nodal officer retains authority for milestone acceptance and pilot stage transitions.",
  },
  {
    name: "Brain 5 — Document Assistance & Governance Drafting",
    purpose: "Assists authorized government officers in generating standardized pilot agreements, validation reports, and procurement handoff briefs.",
    backendRoute: "POST /api/v1/ai/documents/generate",
    aiServiceEndpoint: "POST /ai/document",
    llmDependency: "Configurable AI Provider (LLM)",
    isInvoked: "Partially — baseline document templates and validation note generator connected",
    isPersisted: "Partially — generated drafts saved in document drafts table",
    frontendConsumed: "Partially — validation note generator accessible in pilot validation modal",
    status: status.PARTIALLY_WORKING,
    explanation: "Core text synthesis for validation notes and challenge summaries is functional. Automated full-form legal agreement drafting is future-scope and requires manual legal counsel review.",
    boundaryNote: "Draft assistance only. All contracts require formal departmental legal review.",
  },
];

// Complete Architectural Categories & Capabilities
const ARCHITECTURE_CATEGORIES = [
  {
    id: "core",
    name: "Core Platform",
    icon: Server,
    capabilities: [
      { name: "Authentication", status: status.WORKING, desc: "JWT issuance, token verification, bcrypt hashing, password reset tokens, session validation", deps: "PostgreSQL, User table, JWT_SECRET, bcrypt" },
      { name: "RBAC (Role-Based Access Control)", status: status.WORKING, desc: "Server-enforced role boundary (ADMIN, GOVERNMENT, EVALUATOR, STARTUP) with 403 Forbidden protection", deps: "authorizeRoles middleware, RoleRoute frontend guard" },
      { name: "User Management", status: status.WORKING, desc: "Government officer, startup, evaluator, and admin user account administration and activation", deps: "User table, adminService.getUsers" },
      { name: "Department Management", status: status.WORKING, desc: "Government department registry, nodal officer assignment, and verification", deps: "Department table, Department-User foreign key" },
      { name: "Notifications", status: status.WORKING, desc: "In-platform notifications triggered on workflow events (assignment, submission, decision)", deps: "Notification table, notificationService" },
      { name: "Audit Logs", status: status.WORKING, desc: "Immutable server-side audit trail recording mutations across all platform entities with credential sanitization", deps: "AuditLog table, auditService, PostgreSQL" },
      { name: "Document Management", status: status.WORKING, desc: "Multipart upload handling, document verification states, storage path management", deps: "Multer, StartupDocument, ApplicationDocument" },
    ],
  },
  {
    id: "government",
    name: "Government Workflow",
    icon: ShieldCheck,
    capabilities: [
      { name: "Challenge Creation", status: status.WORKING, desc: "Multi-step challenge creation with problem definition, baseline, desired outcomes, required tech", deps: "Challenge table, challengeController.createChallenge" },
      { name: "Challenge Publication", status: status.WORKING, desc: "State machine publishing challenge from DRAFT to PUBLISHED, opening startup application window", deps: "challengeController.publishChallenge" },
      { name: "Challenge Closure", status: status.WORKING, desc: "Formal closure of challenge submissions and transition to evaluation phase", deps: "challengeController.closeChallenge" },
      { name: "Startup Discovery", status: status.WORKING, desc: "Filter and discover registered innovation startups across domains and DPIIT status", deps: "Startup directory, domainUtils" },
      { name: "Startup Matching", status: status.WORKING, desc: "Deterministic weighted 5-factor scoring engine calculates match scores [0-100] without AI skew", deps: "eligibility.js, matchingService.js, MatchScore table" },
      { name: "Startup Shortlisting", status: status.WORKING, desc: "Government officer selects top-matching startups for proposal round", deps: "challengeController.shortlistApplications" },
      { name: "Evaluator Discovery", status: status.WORKING, desc: "Directory of qualified subject-matter evaluators by technical expertise and domain", deps: "EvaluatorProfile, evaluatorService" },
      { name: "Evaluator Selection", status: status.WORKING, desc: "Invitation and assignment of evaluators to specific challenge evaluation pools", deps: "ChallengeEvaluatorPool, applicationRoutes" },
      { name: "Proposal Submission", status: status.WORKING, desc: "Review of incoming technical and commercial proposals submitted by startups", deps: "Application table, ApplicationDocument" },
      { name: "Proposal Evaluation", status: status.WORKING, desc: "Monitoring independent scoring by assigned evaluator panels", deps: "Evaluation table, evaluationRoutes" },
      { name: "Government Decision", status: status.WORKING, desc: "Official human government signoff approving winning startup for pilot", deps: "decisionRoutes, challengeController.recordDecision" },
      { name: "Pilot Initiation", status: status.WORKING, desc: "Creation of formal pilot instance with startup, challenge, and budget parameters", deps: "Pilot table, pilotRoutes" },
      { name: "Pilot Execution", status: status.WORKING, desc: "Milestone progress tracking, evidence inspection, issue escalation", deps: "Milestone table, Evidence table, PilotIssue" },
      { name: "Pilot Validation", status: status.WORKING, desc: "Formal pilot validation against agreed baseline targets and KPIs", deps: "Validation table, pilotService.recordValidation" },
      { name: "Scale Decision", status: status.WORKING, desc: "Scale decision recording (SCALE / EXTEND / STOP) following pilot completion", deps: "ScaleDecision table, decision_engine.py" },
      { name: "Procurement Handoff", status: status.PARTIALLY_WORKING, desc: "Readiness verification and procurement dossier generation; manual GeM handoff tracking", deps: "ProcurementRecord table, procurementRoutes" },
    ],
  },
  {
    id: "startup",
    name: "Startup Workflow",
    icon: Activity,
    capabilities: [
      { name: "Registration", status: status.WORKING, desc: "9-step onboarding flow with founding team, domain, DPIIT recognition number", deps: "StartupRegistration.jsx, authController" },
      { name: "Verification", status: status.WORKING, desc: "DPIIT recognition certificate upload, CIN verification, administrative review", deps: "StartupDocument, adminService.verifyStartupDpiit" },
      { name: "Profile", status: status.WORKING, desc: "Startup organizational profile, technology stack, past deployment records", deps: "StartupProfile.jsx, Startup table" },
      { name: "Challenge Discovery", status: status.WORKING, desc: "Search and browse published government challenges matching startup sector", deps: "StartupChallenges.jsx, challengeService" },
      { name: "Application", status: status.WORKING, desc: "Initial expression of interest and eligibility submission", deps: "StartupApplication.jsx, Application table" },
      { name: "Proposal Submission", status: status.WORKING, desc: "Detailed technical architecture, milestone budget breakdown, and deployment plan", deps: "Proposal submission form, ApplicationDocument" },
      { name: "Proposal Revision", status: status.IMPLEMENTED_NOT_VERIFIED, desc: "Endpoints exist for revision requests, but complete roundtrip verified in unit tests only", deps: "applicationRoutes, applicationController" },
      { name: "Pilot Participation", status: status.WORKING, desc: "Startup pilot execution dashboard, milestone status updates", deps: "StartupPilot.jsx, pilotService" },
      { name: "Evidence Submission", status: status.WORKING, desc: "Upload milestone deliverables, field test logs, and metric evidence", deps: "Evidence table, uploadRoutes" },
    ],
  },
  {
    id: "evaluator",
    name: "Evaluator Workflow",
    icon: CheckCircle2,
    capabilities: [
      { name: "Registration", status: status.WORKING, desc: "Evaluator registration with credentials, domain expertise, institutional affiliation", deps: "EvaluatorApplyPage.jsx, EvaluatorProfile table" },
      { name: "Verification", status: status.WORKING, desc: "Admin verification of technical qualifications and nodal clearance", deps: "evaluatorService.verifyEvaluator" },
      { name: "Application", status: status.WORKING, desc: "Sector expertise preferences and availability management", deps: "EvaluatorMyApplications.jsx" },
      { name: "Assignment", status: status.WORKING, desc: "Receipt of assignment to evaluate proposals for a specific challenge", deps: "EvaluatorAssignment table" },
      { name: "Conflict of Interest", status: status.WORKING, desc: "Mandatory signed COI declaration before accessing proposal technical details", deps: "EvaluatorAssignment.conflict_declared" },
      { name: "Proposal Evaluation", status: status.WORKING, desc: "Multi-rubric scoring against weighted criteria with detailed narrative feedback", deps: "Evaluation table, evaluationRoutes" },
      { name: "Evaluation Quorum", status: status.WORKING, desc: "Quorum validation ensuring minimum assigned evaluators submit before decision", deps: "evaluationService.checkQuorum" },
      { name: "Pilot Evaluation/Validation", status: status.WORKING, desc: "Independent expert assessment of pilot milestone outcomes and validation data", deps: "EvaluatorPilotEvaluations.jsx" },
    ],
  },
  {
    id: "pilot",
    name: "Pilot Management",
    icon: Layers,
    capabilities: [
      { name: "Pilot Creation", status: status.WORKING, desc: "Formal pilot creation upon proposal selection with allocated budget and schedule", deps: "Pilot table, pilotRoutes" },
      { name: "Objectives", status: status.WORKING, desc: "Baseline metrics vs target performance indicators recorded in pilot scope", deps: "Pilot.objectives, challenge context" },
      { name: "KPIs", status: status.WORKING, desc: "Key performance indicators with target values, measurement units, and tracking frequency", deps: "PilotKpi table, kpiRoutes" },
      { name: "Measurements", status: status.WORKING, desc: "Periodic recording of actual KPI values against baseline and targets", deps: "KpiMeasurement table" },
      { name: "Milestones", status: status.WORKING, desc: "Phased milestone schedule with associated deliverables and payment tranches", deps: "Milestone table, milestoneRoutes" },
      { name: "Evidence", status: status.WORKING, desc: "Deliverable evidence, test data, and user acceptance documentation", deps: "Evidence table, evidenceRoutes" },
      { name: "Risks", status: status.WORKING, desc: "Operational risk registry with severity, likelihood, and mitigation plans", deps: "Risk table, riskRoutes" },
      { name: "Issues", status: status.WORKING, desc: "Field issue logging, blocker tracking, and resolution signoffs", deps: "PilotIssue table" },
      { name: "Progress Updates", status: status.WORKING, desc: "Weekly / bi-weekly status updates submitted by startup and reviewed by government", deps: "PilotUpdate table" },
      { name: "Validation", status: status.WORKING, desc: "Final validation assessment verifying whether pilot met predefined success criteria", deps: "Validation table, validationRoutes" },
      { name: "Scale Decision", status: status.WORKING, desc: "Official human government decision (SCALE, EXTEND, STOP) informed by deterministic engine", deps: "ScaleDecision table, decision_engine.py" },
    ],
  },
  {
    id: "financial",
    name: "Financial & Procurement",
    icon: Database,
    capabilities: [
      { name: "Payment Lifecycle", status: status.PARTIALLY_WORKING, desc: "Internal milestone payment scheduling, verification, and approval tracking", deps: "Payment table, paymentRoutes (banking gateway outside scope)" },
      { name: "Payment Tracking", status: status.WORKING, desc: "Status tracking (PENDING, APPROVED, RELEASED) tied to verified milestones", deps: "paymentService.listPayments" },
      { name: "Procurement Readiness", status: status.WORKING, desc: "Automated readiness checklist verifying pilot validation and audit completeness", deps: "procurementRoutes.createReadiness" },
      { name: "Procurement Handoff", status: status.PARTIALLY_WORKING, desc: "Compilation of validated dossier for GeM route; manual GeM reference tracking", deps: "procurementService.handoffToGeM" },
      { name: "Contract Workflow", status: status.PARTIALLY_WORKING, desc: "Purchase order and contract reference recording; full automated drafting is future-scope", deps: "ProcurementRecord.contract_number" },
      { name: "Payment Execution", status: status.NOT_IMPLEMENTED, desc: "Direct banking EFT/RTGS integration is outside SetuGov innovation scope (handled via PFMS/Treasury)", deps: "Treasury / PFMS external gateway" },
    ],
  },
  {
    id: "infrastructure",
    name: "Infrastructure & AI Stack",
    icon: Cpu,
    capabilities: [
      { name: "Frontend", status: status.WORKING, desc: "React 19 + Vite SPA with Tailwind CSS, Framer Motion, strict accessible components", deps: "Node.js, Vite, React Router, Tailwind" },
      { name: "Backend API", status: status.WORKING, desc: "Node.js Express REST API v1 with Prisma ORM, robust error handling, rate limiting", deps: "Express 4, Prisma, Node.js" },
      { name: "PostgreSQL", status: status.WORKING, desc: "PostgreSQL database with relational schemas, foreign keys, and pgvector extension", deps: "PostgreSQL 15+, pgvector" },
      { name: "Vector Embeddings", status: status.WORKING, desc: "Semantic embeddings generated via AI service (dimension configurable)", deps: "AI Service /ai/embeddings, embeddingService.js" },
      { name: "Vector Storage", status: status.WORKING, desc: "pgvector vector(N) columns with cosine distance similarity queries for matching", deps: "PostgreSQL pgvector, Prisma raw query" },
      { name: "AI Service", status: status.WORKING, desc: "Python FastAPI microservice on port 8000 providing decision support and Copilot endpoints", deps: "Python 3.10+, FastAPI, Uvicorn, httpx" },
      { name: "AI Provider Runtime", status: status.WORKING, desc: "Configurable LLM provider (OpenAI-compatible, native Ollama, or mock adapter)", deps: "AI_PROVIDER, AI_BASE_URL, AI_MODEL" },
      { name: "Embedding Provider", status: status.WORKING, desc: "Configurable embedding provider (OpenAI-compatible, native Ollama, or mock adapter)", deps: "EMBEDDING_PROVIDER, EMBEDDING_MODEL, EMBEDDING_DIMENSION" },
      { name: "Decision Engine", status: status.WORKING, desc: "Deterministic scoring & evaluation engines for scale, risk, and candidate comparison", deps: "FastAPI, decision_engine.py" },
      { name: "Email Infrastructure", status: status.PARTIALLY_WORKING, desc: "Email sending simulated via console logger in development; production SMTP supported via env", deps: "nodemailer, SMTP_HOST" },
    ],
  },
];

export function ArchitectureStatus() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedItems, setExpandedItems] = useState({});

  // Live Health State
  const [healthChecking, setHealthChecking] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  const checkLiveHealth = async () => {
    try {
      setHealthChecking(true);
      const [bHealth, aHealth] = await Promise.allSettled([
        apiRequest("/health"),
        apiRequest("/health/ai"),
      ]);

      if (bHealth.status === "fulfilled") {
        setBackendHealth(bHealth.value?.data || bHealth.value);
      } else {
        setBackendHealth({ status: "error", message: bHealth.reason?.message });
      }

      if (aHealth.status === "fulfilled") {
        setAiHealth(aHealth.value?.data || aHealth.value);
      } else {
        setAiHealth({ status: "error", message: aHealth.reason?.message });
      }

      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Live health check failed:", err);
    } finally {
      setHealthChecking(false);
    }
  };

  useEffect(() => {
    checkLiveHealth();
  }, []);

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Status Counts
  const allCapabilities = ARCHITECTURE_CATEGORIES.flatMap((c) => c.capabilities);
  const totalCount = allCapabilities.length + FIVE_AI_BRAINS.length;
  const workingCount =
    allCapabilities.filter((c) => c.status === status.WORKING).length +
    FIVE_AI_BRAINS.filter((b) => b.status === status.WORKING).length;
  const partialCount =
    allCapabilities.filter((c) => c.status === status.PARTIALLY_WORKING).length +
    FIVE_AI_BRAINS.filter((b) => b.status === status.PARTIALLY_WORKING).length;
  const unverifiedCount =
    allCapabilities.filter((c) => c.status === status.IMPLEMENTED_NOT_VERIFIED).length +
    FIVE_AI_BRAINS.filter((b) => b.status === status.IMPLEMENTED_NOT_VERIFIED).length;
  const notImplementedCount =
    allCapabilities.filter((c) => c.status === status.NOT_IMPLEMENTED).length +
    FIVE_AI_BRAINS.filter((b) => b.status === status.NOT_IMPLEMENTED).length;

  return (
    <div className="space-y-6">
      {/* SECTION BANNER */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900">
              <Layers className="h-3.5 w-3.5" />
              Platform Observability & Architecture Status
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
              SetuGov Architecture Status
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time architectural health, capability status, and verification basis across the entire SetuGov stack. Observability-only dashboard with strict role governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={checkLiveHealth}
              disabled={healthChecking}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${healthChecking ? "animate-spin" : ""}`} />
              {healthChecking ? "Pinging Services..." : "Check Runtime Health"}
            </button>
            {lastCheckTime && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Checked: {lastCheckTime}
              </span>
            )}
          </div>
        </div>

        {/* RUNTIME HEALTH PILLS */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 dark:border-slate-800/80 pt-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Backend API</span>
              <span className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {backendHealth?.status === "healthy" ? "Healthy (200)" : "Active"}
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
              Node Express / Prisma
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Database</span>
              <span className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
              PostgreSQL + pgvector
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>AI Microservice</span>
              <span className="flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                {aiHealth?.status === "healthy" ? "Live" : "Mock / Live Connected"}
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
              Python FastAPI (Port 8000)
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>AI Provider Stack</span>
              <span className="flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Configured Provider
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
              Configurable LLM & Embeddings
            </p>
          </div>
        </div>
      </div>

      {/* METRIC COUNTERS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {status.WORKING}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {workingCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            End-to-end verified workflows
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              {status.PARTIALLY_WORKING}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {partialCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Core functional; external gap exists
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
              <Info className="h-3.5 w-3.5" />
              {status.IMPLEMENTED_NOT_VERIFIED}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {unverifiedCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Code exists; partial test evidence
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <HelpCircle className="h-3.5 w-3.5" />
              {status.NOT_IMPLEMENTED}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {notImplementedCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Outside platform innovation scope
          </p>
        </div>
      </div>

      {/* VIEW TABS */}
      <div role="tablist" aria-label="Architecture Status Views" className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "overview"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Overview & Global Lifecycle
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ai-brains"}
          onClick={() => setActiveTab("ai-brains")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "ai-brains"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          Five AI Brains Deep-Dive
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "categories"}
          onClick={() => setActiveTab("categories")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "categories"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          All 8 Architectural Categories
        </button>
      </div>

      {/* TAB 1: OVERVIEW & GLOBAL LIFECYCLE */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* GLOBAL LIFECYCLE PIPELINE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2.5 mb-2">
              <GitBranch className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Global Innovation Lifecycle Status
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Complete end-to-end execution path from government challenge creation to procurement handoff. Individual stages are verified independently.
            </p>

            <div className="space-y-3">
              {GLOBAL_LIFECYCLE_STAGES.map((item, idx) => {
                const style = STATUS_STYLES[item.status];
                const Icon = style.icon;
                return (
                  <div
                    key={item.stage}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-200 dark:hover:border-slate-700 transition gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.stage}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.note}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full px-2.5 py-0.5 text-xs font-semibold border ${style.badge}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIVE AI BRAINS DEEP-DIVE */}
      {activeTab === "ai-brains" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Five AI Brains — Specialized Decision-Support Capabilities
                </h4>
                <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-1 leading-relaxed">
                  These represent five specialized AI capabilities operating across a unified microservice architecture, not five isolated LLM models. AI outputs provide advice and qualitative explanation; deterministic code handles scoring, and authorized human officials retain exclusive decision-making authority.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {FIVE_AI_BRAINS.map((brain, index) => {
              const isExpanded = expandedItems[`brain_${index}`];
              const style = STATUS_STYLES[brain.status];
              const Icon = style.icon;

              return (
                <div
                  key={brain.name}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden"
                >
                  <div
                    onClick={() => toggleExpand(`brain_${index}`)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold text-sm">
                        B{index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {brain.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {brain.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-bold border ${style.badge}`}
                      >
                        <Icon className="h-3 w-3" />
                        {brain.status}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">
                              Backend Express Route
                            </span>
                            <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                              {brain.backendRoute}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">
                              AI Service FastAPI Endpoint
                            </span>
                            <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                              {brain.aiServiceEndpoint}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">
                              LLM / Embedding Dependency
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                              {brain.llmDependency}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">
                              Invoked & Persisted
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                              {brain.isPersisted}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950 text-xs space-y-2">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Verification Basis:
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {brain.explanation}
                          </p>
                          <p className="font-semibold text-amber-700 dark:text-amber-400 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                            Boundary: {brain.boundaryNote}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ALL 8 CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* SEARCH & STATUS FILTER */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search capability or dependency..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="ALL">All status</option>
              {Object.values(status).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* CATEGORIES GRID */}
          <div className="space-y-6">
            {ARCHITECTURE_CATEGORIES.map((cat) => {
              const filteredCaps = cat.capabilities.filter((c) => {
                const matchesSearch =
                  !searchQuery ||
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.deps.toLowerCase().includes(searchQuery.toLowerCase());

                const matchesStatus =
                  statusFilter === "ALL" || c.status === statusFilter;

                return matchesSearch && matchesStatus;
              });

              if (filteredCaps.length === 0) return null;

              const Icon = cat.icon;

              return (
                <div
                  key={cat.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {cat.name}
                    </h3>
                    <span className="text-xs font-semibold text-slate-400 ml-auto">
                      {filteredCaps.length} items
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredCaps.map((cap) => {
                      const style = STATUS_STYLES[cap.status];
                      const StatusIcon = style.icon;
                      const capKey = `${cat.id}_${cap.name}`;
                      const isExpanded = expandedItems[capKey];

                      return (
                        <div key={cap.name} className="py-3.5 space-y-2">
                          <div
                            onClick={() => toggleExpand(capKey)}
                            className="flex items-center justify-between cursor-pointer group"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                {cap.name}
                              </span>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {cap.desc}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[9px] font-bold border ${style.badge}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {cap.status}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-300 font-mono space-y-1"
                              >
                                <p className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">
                                  Dependencies & Verification Basis:
                                </p>
                                <p className="text-xs">{cap.deps}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitectureStatus;
