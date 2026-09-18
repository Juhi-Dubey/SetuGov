import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  TrendingUp,
  Send,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Truck,
  Award,
  CreditCard,
  Layers,
  FileSignature,
  Check,
  XCircle,
  RefreshCw
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengeById, getChallengePilot } from "../../services/challengeService";
import { getScaleDecision, getPilotValidations } from "../../services/pilotService";
import {
  getProcurements,
  createProcurementReadiness,
  approveProcurement,
  handoffToGeM,
  issueProcurementContract,
  submitProcurementDelivery,
  acceptProcurementDelivery,
  scheduleProcurementPayment,
  completeProcurement,
} from "../../services/procurementService";
import { openDocumentSecurely } from "../../utils/documentUtils.js";
import { generateDocumentDraftWithAI } from "../../services/aiService";

// Canonical Enums & Display Labels
const PROCUREMENT_ROUTES = [
  { value: "GEM", label: "GeM (Government e-Marketplace)", desc: "Direct handoff and order placement via National GeM Portal (Rule 149 of GFR 2017)" },
  { value: "OTHER_APPROVED_ROUTE", label: "Other Approved Route", desc: "State-specific innovation procurement portal or institutional schedule" },
  { value: "DIRECT_APPROVED_ROUTE", label: "Direct Approved Route", desc: "Proprietary single-source innovation exemption under sandbox provisions" },
  { value: "OFFLINE_HANDOFF", label: "Offline Handoff", desc: "Manual statutory department file processing and physical sanction order" },
];

const GEM_HANDOFF_STATUSES = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "READY", label: "Ready for Handoff" },
  { value: "HANDED_OFF", label: "Handed Off to GeM" },
  { value: "EXTERNAL_PROCESSING", label: "External GeM Processing" },
  { value: "COMPLETED", label: "Completed on GeM" },
  { value: "FAILED_RETURNED", label: "Failed / Returned" },
];

const ACCEPTANCE_STATUSES = [
  { value: "ACCEPTED", label: "Accept Full Delivery", desc: "Statutory inspection verified. Deliverables satisfy all RFP specifications." },
  { value: "CONDITIONAL_ACCEPTANCE", label: "Conditional Acceptance", desc: "Minor rectification or telemetry telemetry tuning required within 15 days." },
  { value: "REJECTED", label: "Reject Delivery", desc: "Delivered solution fails to meet essential pilot performance standards." },
];

const STATUS_STEPS = [
  { key: "READINESS_CHECK", label: "Readiness Check", desc: "Statutory Validation" },
  { key: "APPROVED", label: "Govt Approval", desc: "Department Sanction" },
  { key: "HANDED_OFF", label: "Route Handoff", desc: "GeM / Route Notice" },
  { key: "CONTRACT_ISSUED", label: "Contract & PO", desc: "Legal Binding" },
  { key: "DELIVERY_SUBMITTED", label: "Delivery", desc: "Evidence Submitted" },
  { key: "ACCEPTED", label: "Acceptance", desc: "Formal Inspection" },
  { key: "COMPLETED", label: "Completed", desc: "Procurement Concluded" },
];

function getStatusStepIndex(status) {
  switch (status) {
    case "DRAFT":
    case "READINESS_CHECK":
      return 0;
    case "APPROVED":
      return 1;
    case "HANDED_OFF":
      return 2;
    case "CONTRACT_ISSUED":
      return 3;
    case "DELIVERY_SUBMITTED":
      return 4;
    case "ACCEPTED":
      return 5;
    case "COMPLETED":
      return 6;
    default:
      return 0;
  }
}

function ChallengeContract() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId;

  // Primary Data State
  const [challenge, setChallenge] = useState(null);
  const [pilot, setPilot] = useState(null);
  const [scaleDecision, setScaleDecision] = useState(null);
  const [validation, setValidation] = useState(null);
  const [procurement, setProcurement] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form States for Different Stages
  // Stage 1: Readiness
  const [readinessForm, setReadinessForm] = useState({
    route: "GEM",
    estimated_value: "",
    justification: "",
    technical_readiness: true,
    compliance_readiness: true,
    cybersecurity_clearance: true,
    data_protection_clearance: true,
  });

  // Stage 2: Approval
  const [approvalNotes, setApprovalNotes] = useState("");

  // Stage 3: GeM Handoff
  const [gemForm, setGemForm] = useState({
    gem_reference_number: "",
    gem_officer_name: "",
    gem_notes: "",
    gem_supporting_doc: "",
    gem_handoff_status: "HANDED_OFF",
  });

  // Stage 4: Contract / PO Issuance
  const [contractForm, setContractForm] = useState({
    po_reference_number: "",
    contract_reference: "",
    contract_document_url: "",
    final_contract_value: "",
    contract_effective_date: new Date().toISOString().split("T")[0],
    contract_duration_days: 90,
    scopeOfWork: "",
    deliverables: "",
  });

  // Stage 5: Acceptance Review
  const [acceptanceForm, setAcceptanceForm] = useState({
    acceptance_status: "ACCEPTED",
    acceptance_remarks: "",
  });

  // Stage 6: Payment Scheduling
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_percentage: 100,
    reference_number: "",
  });

  // Fetch complete procurement lifecycle
  const loadProcurementData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMessage("");

      // 1. Fetch Challenge
      const chRes = await getChallengeById(id);
      const chData = chRes?.data?.challenge || chRes?.data || chRes;
      setChallenge(chData);

      // Set default budget in readiness & contract forms
      if (chData?.budget_max || chData?.budget) {
        const val = String(chData.budget_max || chData.budget);
        setReadinessForm((prev) => ({ ...prev, estimated_value: prev.estimated_value || val }));
        setContractForm((prev) => ({ ...prev, final_contract_value: prev.final_contract_value || val }));
      }

      // 2. Fetch Pilot
      const pRes = await getChallengePilot(id).catch((err) => {
        console.warn("Pilot fetch warning:", err);
        return null;
      });
      const pData = pRes?.data?.pilot !== undefined ? pRes.data.pilot : (pRes?.data || pRes);

      if (pData && pData.id) {
        setPilot(pData);

        // 3. Fetch Scale Decision
        const sdRes = await getScaleDecision(pData.id).catch(() => null);
        const sdData = sdRes?.data || sdRes;
        setScaleDecision(sdData);

        // 4. Fetch Validation
        const vRes = await getPilotValidations(pData.id).catch(() => null);
        const vList = vRes?.data?.validations || vRes?.data || [];
        const latestVal = Array.isArray(vList) ? vList[0] : vList;
        setValidation(latestVal);

        // 5. Fetch Active Procurement Record
        const procRes = await getProcurements({ pilot_id: pData.id }).catch(() => null);
        const procList = procRes?.data?.procurements || procRes?.data || [];
        const currentProc = Array.isArray(procList) && procList.length > 0 ? procList[0] : null;

        if (currentProc) {
          setProcurement(currentProc);
          // Pre-populate forms from existing record
          setGemForm({
            gem_reference_number: currentProc.gem_reference_number || "",
            gem_officer_name: currentProc.gem_officer_name || "",
            gem_notes: currentProc.gem_notes || "",
            gem_supporting_doc: currentProc.gem_supporting_doc || "",
            gem_handoff_status: currentProc.gem_handoff_status || "HANDED_OFF",
          });
          setContractForm((prev) => ({
            ...prev,
            po_reference_number: currentProc.po_reference_number || "",
            contract_reference: currentProc.contract_reference || "",
            contract_document_url: currentProc.contract_document_url || "",
            final_contract_value: currentProc.final_contract_value ? String(currentProc.final_contract_value) : (currentProc.estimated_value ? String(currentProc.estimated_value) : ""),
            contract_effective_date: currentProc.contract_effective_date ? new Date(currentProc.contract_effective_date).toISOString().split("T")[0] : prev.contract_effective_date,
            contract_duration_days: currentProc.contract_duration_days || 90,
          }));
          if (currentProc.final_contract_value || currentProc.estimated_value) {
            setPaymentForm((prev) => ({
              ...prev,
              amount: String(currentProc.final_contract_value || currentProc.estimated_value),
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error loading procurement data:", err);
      setErrorMessage(err.message || "Failed to load procurement details from the database.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProcurementData();
  }, [loadProcurementData]);

  // Stage 1 Action: Initialize Procurement Readiness Package
  const handleInitiateReadiness = async (e) => {
    e.preventDefault();
    if (!pilot?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        route: readinessForm.route,
        estimated_value: parseFloat(readinessForm.estimated_value) || 0,
        justification: readinessForm.justification.trim(),
        technical_readiness: Boolean(readinessForm.technical_readiness),
        compliance_readiness: Boolean(readinessForm.compliance_readiness),
        cybersecurity_clearance: Boolean(readinessForm.cybersecurity_clearance),
        data_protection_clearance: Boolean(readinessForm.data_protection_clearance),
        challenge_id: challenge?.id,
      };

      const res = await createProcurementReadiness(pilot.id, payload);
      const newProc = res?.data?.procurement || res?.data || res;
      setProcurement(newProc);
      setSuccessMessage("Procurement readiness package initialized and recorded in PostgreSQL.");
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to initialize procurement readiness.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 2 Action: Government Approval
  const handleApprove = async () => {
    if (!procurement?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await approveProcurement(procurement.id, { approval_notes: approvalNotes });
      const updated = res?.data?.procurement || res?.data || res;
      setProcurement(updated);
      setSuccessMessage("Procurement package officially sanctioned and approved.");
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to approve procurement package.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 3 Action: GeM Handoff
  const handleGeMHandoff = async (e) => {
    e.preventDefault();
    if (!procurement?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        gem_reference_number: gemForm.gem_reference_number.trim(),
        gem_officer_name: gemForm.gem_officer_name.trim(),
        gem_notes: gemForm.gem_notes.trim(),
        gem_supporting_doc: gemForm.gem_supporting_doc.trim() || null,
        gem_handoff_status: gemForm.gem_handoff_status,
      };

      const res = await handoffToGeM(procurement.id, payload);
      const updated = res?.data?.procurement || res?.data || res;
      setProcurement(updated);
      setSuccessMessage("Procurement route handoff recorded successfully in PostgreSQL.");
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to record GeM handoff.");
    } finally {
      setActionLoading(false);
    }
  };

  // AI Legal Drafting with Brain 5
  const handleDraftWithBrain5 = async () => {
    try {
      setIsGeneratingAI(true);
      setErrorMessage("");
      const res = await generateDocumentDraftWithAI({
        document_type: "PROCUREMENT_CONTRACT_AGREEMENT",
        challenge_title: challenge?.title || "Innovation Procurement Pilot",
        startup_name: pilot?.startup?.company_name || "Deep-Tech Startup",
        pilot_duration: `${contractForm.contract_duration_days || 90} days`,
        pilot_budget: `₹${Number(contractForm.final_contract_value || 0).toLocaleString("en-IN")}`,
        objectives: [challenge?.desired_outcome || challenge?.problem_description || "State innovation deployment"],
      });

      const draft = res?.data || res;
      if (draft?.generated_document || draft?.content) {
        const text = draft.generated_document || draft.content;
        setContractForm((prev) => ({
          ...prev,
          scopeOfWork: text.slice(0, 1200),
          deliverables: "1. Phase 1 Core Solution Deployment & Telemetry Integration\n2. Phase 2 SLA Performance Monitoring & Acceptance\n3. Phase 3 Knowledge Transfer & Warranty Maintenance",
        }));
        setSuccessMessage("AI Legal Copilot (Brain 5) generated statutory contract clauses.");
      }
    } catch (err) {
      console.warn("AI draft fallback:", err);
      setErrorMessage("Could not generate AI draft. Please enter terms manually.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Stage 4 Action: Issue Contract / PO
  const handleIssueContract = async (e) => {
    e.preventDefault();
    if (!procurement?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        po_reference_number: contractForm.po_reference_number.trim() || null,
        contract_reference: contractForm.contract_reference.trim() || null,
        contract_document_url: contractForm.contract_document_url.trim() || null,
        final_contract_value: parseFloat(contractForm.final_contract_value) || 0,
        contract_effective_date: contractForm.contract_effective_date,
        contract_duration_days: parseInt(contractForm.contract_duration_days, 10) || 90,
      };

      const res = await issueProcurementContract(procurement.id, payload);
      const updated = res?.data?.procurement || res?.data || res;
      setProcurement(updated);
      setSuccessMessage("Contract & Purchase Order recorded and officially issued.");
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to record contract / PO issuance.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 5 Action: Record Formal Acceptance
  const handleAcceptDelivery = async (e) => {
    e.preventDefault();
    if (!procurement?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        acceptance_status: acceptanceForm.acceptance_status,
        acceptance_remarks: acceptanceForm.acceptance_remarks.trim(),
      };

      const res = await acceptProcurementDelivery(procurement.id, payload);
      const updated = res?.data?.procurement || res?.data || res;
      setProcurement(updated);
      setSuccessMessage(`Delivery formal acceptance recorded as "${acceptanceForm.acceptance_status}".`);
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to record delivery acceptance.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 6 Action: Schedule Payment Release
  const handleSchedulePayment = async (e) => {
    e.preventDefault();
    if (!procurement?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        amount: parseFloat(paymentForm.amount) || 0,
        payment_percentage: parseFloat(paymentForm.payment_percentage) || 100,
        reference_number: paymentForm.reference_number.trim() || null,
      };

      await scheduleProcurementPayment(procurement.id, payload);
      setSuccessMessage("Statutory payment milestone recorded and scheduled in PostgreSQL.");
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to schedule procurement payment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Lifecycle Action
  const handleCompleteProcurement = async () => {
    if (!procurement?.id) return;
    try {
      setActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await completeProcurement(procurement.id, { completion_notes: "Procurement and delivery fulfillment successfully verified and closed." });
      const updated = res?.data?.procurement || res?.data || res;
      setProcurement(updated);
      setSuccessMessage("Procurement lifecycle concluded and archived in PostgreSQL.");
      await loadProcurementData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to complete procurement.");
    } finally {
      setActionLoading(false);
    }
  };

  const currentStepIdx = procurement ? getStatusStepIndex(procurement.status) : 0;
  const hasScaleDecision = scaleDecision && scaleDecision.decision === "SCALE";
  const isPilotValidated = validation && validation.status !== "NOT_VALIDATED";

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">
        {/* TOP NAVIGATION & HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/government/challenges/${id}/overview`)}
              className="back-nav"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Challenge Overview
            </button>

            <button
              type="button"
              onClick={loadProcurementData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <FileSignature className="h-3.5 w-3.5" />
                Statutory Procurement & Governance Center
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
                Innovation Procurement & Contract Agreement
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Execute GFR 2017 compliant sandbox procurement, GeM route handoff, purchase order issuance, and formal delivery acceptance.
              </p>
            </div>

            {procurement && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span>Procurement ID:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  #{procurement.id.slice(0, 8)}
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {procurement.status}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* FEEDBACK BANNERS */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-semibold">Procurement Notice</p>
                <p className="mt-0.5 text-xs">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold">Transaction Confirmed</p>
                <p className="mt-0.5 text-xs">{successMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              Retrieving procurement records and statutory pilot data from PostgreSQL...
            </p>
          </div>
        ) : !pilot ? (
          /* NO PILOT GUARDRAIL */
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              No Pilot Sandbox Created
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
              Under SetuGov innovation procurement rules, a challenge must have a live pilot sandbox with verified field telemetry and an approved SCALE decision before initiating statutory procurement.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to={`/government/challenges/${id}/pilot`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Go to Pilot Management
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : !hasScaleDecision ? (
          /* NO SCALE DECISION GUARDRAIL */
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center dark:border-amber-900/30 dark:bg-amber-950/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Scale Decision Required
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
              Procurement readiness requires a finalized <strong>SCALE</strong> decision based on pilot milestone validation.
              Current Decision: <span className="font-semibold text-amber-700 dark:text-amber-400">{scaleDecision?.decision || "Pending Decision"}</span>.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to={`/government/challenges/${id}/decision`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-amber-500"
              >
                Record Scale Decision
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* FULL PROCUREMENT WORKFLOW */
          <div className="space-y-8">
            {/* CONTEXT SUMMARY CARDS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-xs text-slate-500">Selected Startup</span>
                <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                  {pilot.startup?.company_name || "Deep-Tech Startup"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {pilot.startup?.domain || "Innovation Vendor"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-xs text-slate-500">Pilot Decision</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    SCALE APPROVED
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Score: {scaleDecision?.score ? `${scaleDecision.score}/100` : "Empirical Pass"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-xs text-slate-500">Procurement Route</span>
                <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                  {procurement?.route ? procurement.route.replace(/_/g, " ") : readinessForm.route}
                </p>
                <p className="text-[11px] text-slate-400">
                  {procurement ? "Persisted in PostgreSQL" : "Ready for Selection"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-xs text-slate-500">Estimated Value</span>
                <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                  ₹{Number(procurement?.final_contract_value || procurement?.estimated_value || readinessForm.estimated_value || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-slate-400">
                  Status: {procurement?.status || "DRAFT"}
                </p>
              </div>
            </div>

            {/* LIFECYCLE STEPPER */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                Statutory Procurement Progression
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {STATUS_STEPS.map((step, idx) => {
                  const isPast = procurement && idx < currentStepIdx;
                  const isCurrent = procurement && idx === currentStepIdx;
                  const isFuture = !procurement || idx > currentStepIdx;

                  return (
                    <div
                      key={step.key}
                      className={`relative flex flex-col rounded-xl border p-3 transition-all ${
                        isCurrent
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30"
                          : isPast
                          ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                          : "border-slate-100 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-950"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">Step {idx + 1}</span>
                        {isPast ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isCurrent ? (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        )}
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{step.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STAGE 1: INITIATE READINESS (IF NO RECORD EXISTS) */}
            {!procurement && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Stage 1: Procurement Readiness Package
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Initialize Statutory Procurement Readiness
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Verify statutory clearances, select the authorized procurement route, and define the estimated sanction value.
                  </p>
                </div>

                <form onSubmit={handleInitiateReadiness} className="mt-6 space-y-6">
                  {/* Route Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Authorized Procurement Route
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {PROCUREMENT_ROUTES.map((r) => (
                        <div
                          key={r.value}
                          onClick={() => setReadinessForm((prev) => ({ ...prev, route: r.value }))}
                          className={`cursor-pointer rounded-xl border p-4 transition ${
                            readinessForm.route === r.value
                              ? "border-indigo-600 bg-indigo-50/40 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40"
                              : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{r.label}</span>
                            <input
                              type="radio"
                              name="route"
                              checked={readinessForm.route === r.value}
                              onChange={() => {}}
                              className="text-indigo-600"
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{r.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Estimated Value & Justification */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Estimated Procurement Value (₹) *
                      </label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          required
                          value={readinessForm.estimated_value}
                          onChange={(e) => setReadinessForm((prev) => ({ ...prev, estimated_value: e.target.value }))}
                          placeholder="e.g. 5000000"
                          className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Statutory Justification / Statement of Case *
                      </label>
                      <input
                        type="text"
                        required
                        value={readinessForm.justification}
                        onChange={(e) => setReadinessForm((prev) => ({ ...prev, justification: e.target.value }))}
                        placeholder="e.g. Pilot successfully demonstrated 40% efficiency gains; compliant with GFR 2017 Rule 149."
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  {/* Statutory Clearances */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                      Statutory & Governance Clearances
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={readinessForm.technical_readiness}
                          onChange={(e) => setReadinessForm((prev) => ({ ...prev, technical_readiness: e.target.checked }))}
                          className="rounded text-indigo-600"
                        />
                        Technical Readiness Verified
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={readinessForm.compliance_readiness}
                          onChange={(e) => setReadinessForm((prev) => ({ ...prev, compliance_readiness: e.target.checked }))}
                          className="rounded text-indigo-600"
                        />
                        Statutory & GFR Compliance Verified
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={readinessForm.cybersecurity_clearance}
                          onChange={(e) => setReadinessForm((prev) => ({ ...prev, cybersecurity_clearance: e.target.checked }))}
                          className="rounded text-indigo-600"
                        />
                        CERT-In / Cybersecurity Clearance Received
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={readinessForm.data_protection_clearance}
                          onChange={(e) => setReadinessForm((prev) => ({ ...prev, data_protection_clearance: e.target.checked }))}
                          className="rounded text-indigo-600"
                        />
                        DPDP Act Data Protection Clearance Certified
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 text-xs font-semibold text-white shadow-md hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-800 dark:hover:bg-blue-700"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Initialize Procurement Readiness Package
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STAGE 2: READINESS DETAILS & GOVERNMENT APPROVAL */}
            {procurement && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stage 1 & 2</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Procurement Package & Sanction Authority
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Status:</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {procurement.status}
                    </span>
                  </div>
                </div>

                {/* Persisted Readiness Details */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50 text-xs">
                  <div>
                    <span className="text-slate-400">Selected Route:</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{procurement.route}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Estimated Sanction Value:</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">
                      ₹{Number(procurement.estimated_value || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Initiated By:</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">
                      {procurement.initiator?.name || "Department Officer"}
                    </p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="text-slate-400">Justification:</span>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 italic">
                      "{procurement.justification}"
                    </p>
                  </div>
                </div>

                {/* Approval Action Form if In READINESS_CHECK or DRAFT */}
                {(procurement.status === "READINESS_CHECK" || procurement.status === "DRAFT") && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2">
                      Formal Government Department Sanction
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-3">
                      Authorize this procurement package for route execution and order placement.
                    </p>
                    <div className="space-y-3">
                      <textarea
                        rows={2}
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="Add statutory sanction remarks / approval notes..."
                        className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs outline-none focus:border-indigo-500 dark:border-indigo-900 dark:bg-slate-950"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={actionLoading}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Sanction & Approve Procurement Package
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {procurement.approved_at && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Officially sanctioned by <strong>{procurement.approver?.name || "Nodal Authority"}</strong> on{" "}
                      {new Date(procurement.approved_at).toLocaleDateString("en-IN", { dateStyle: "long" })}.
                      {procurement.approval_notes && ` Note: "${procurement.approval_notes}"`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STAGE 3: GEM / APPROVED ROUTE HANDOFF */}
            {procurement && ["APPROVED", "HANDED_OFF", "CONTRACT_ISSUED", "DELIVERY_SUBMITTED", "ACCEPTED", "COMPLETED"].includes(procurement.status) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stage 3</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      GeM / External Route Handoff Status
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Handoff: {procurement.gem_handoff_status || "NOT_STARTED"}
                  </span>
                </div>

                {procurement.status === "APPROVED" ? (
                  <form onSubmit={handleGeMHandoff} className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Record the external GeM requisition or physical tender sanction order details. SetuGov transparently preserves the statutory reference number without simulating external GeM transaction state.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          GeM / Route Sanction Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={gemForm.gem_reference_number}
                          onChange={(e) => setGemForm((prev) => ({ ...prev, gem_reference_number: e.target.value }))}
                          placeholder="e.g. GEM/2026/B/894721 or STATE-DIR-094"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Designated Handoff Officer Name
                        </label>
                        <input
                          type="text"
                          value={gemForm.gem_officer_name}
                          onChange={(e) => setGemForm((prev) => ({ ...prev, gem_officer_name: e.target.value }))}
                          placeholder="e.g. Shri Rajesh Sharma, Under Secretary"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Handoff Status State
                        </label>
                        <select
                          value={gemForm.gem_handoff_status}
                          onChange={(e) => setGemForm((prev) => ({ ...prev, gem_handoff_status: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        >
                          {GEM_HANDOFF_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Supporting Sanction Document URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={gemForm.gem_supporting_doc}
                          onChange={(e) => setGemForm((prev) => ({ ...prev, gem_supporting_doc: e.target.value }))}
                          placeholder="https://storage.gov.in/sanctions/gem_order_894721.pdf"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Handoff Notes & Requisition Context
                      </label>
                      <textarea
                        rows={2}
                        value={gemForm.gem_notes}
                        onChange={(e) => setGemForm((prev) => ({ ...prev, gem_notes: e.target.value }))}
                        placeholder="Requisition transmitted to GeM Buyer account for direct PO creation."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Record Route Handoff
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50 text-xs">
                    <div>
                      <span className="text-slate-400">Sanction / Reference:</span>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">
                        {procurement.gem_reference_number || "Direct Sanction"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Handoff Officer:</span>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">
                        {procurement.gem_officer_name || "Nodal Authority"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Handoff Date:</span>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">
                        {procurement.gem_handoff_date ? new Date(procurement.gem_handoff_date).toLocaleDateString("en-IN") : "Recorded"}
                      </p>
                    </div>
                    {procurement.gem_notes && (
                      <div className="sm:col-span-3">
                        <span className="text-slate-400">Handoff Notes:</span>
                        <p className="mt-1 text-slate-700 dark:text-slate-300">{procurement.gem_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STAGE 4: CONTRACT & PURCHASE ORDER ISSUANCE */}
            {procurement && ["APPROVED", "HANDED_OFF", "CONTRACT_ISSUED", "DELIVERY_SUBMITTED", "ACCEPTED", "COMPLETED"].includes(procurement.status) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stage 4</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Contract & Purchase Order Lifecycle
                    </h3>
                  </div>

                  {["APPROVED", "HANDED_OFF"].includes(procurement.status) && (
                    <button
                      type="button"
                      onClick={handleDraftWithBrain5}
                      disabled={isGeneratingAI}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-50 px-4 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                    >
                      {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Draft Terms with Brain 5
                    </button>
                  )}
                </div>

                {["APPROVED", "HANDED_OFF"].includes(procurement.status) ? (
                  <form onSubmit={handleIssueContract} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Purchase Order (PO) Reference Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={contractForm.po_reference_number}
                          onChange={(e) => setContractForm((prev) => ({ ...prev, po_reference_number: e.target.value }))}
                          placeholder="e.g. PO/DELHI/2026/089"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Contract Agreement Reference *
                        </label>
                        <input
                          type="text"
                          required
                          value={contractForm.contract_reference}
                          onChange={(e) => setContractForm((prev) => ({ ...prev, contract_reference: e.target.value }))}
                          placeholder="e.g. AGR-INNOV-2026-042"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Final Contract Value (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={contractForm.final_contract_value}
                          onChange={(e) => setContractForm((prev) => ({ ...prev, final_contract_value: e.target.value }))}
                          placeholder="5000000"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Effective Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={contractForm.contract_effective_date}
                          onChange={(e) => setContractForm((prev) => ({ ...prev, contract_effective_date: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Duration (Days) *
                        </label>
                        <input
                          type="number"
                          required
                          value={contractForm.contract_duration_days}
                          onChange={(e) => setContractForm((prev) => ({ ...prev, contract_duration_days: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Signed Contract Document URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={contractForm.contract_document_url}
                        onChange={(e) => setContractForm((prev) => ({ ...prev, contract_document_url: e.target.value }))}
                        placeholder="https://storage.gov.in/contracts/signed_agr_42.pdf"
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    {contractForm.scopeOfWork && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          AI Drafted Scope of Work & Terms
                        </label>
                        <textarea
                          rows={3}
                          value={contractForm.scopeOfWork}
                          onChange={(e) => setContractForm((prev) => ({ ...prev, scopeOfWork: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-800"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                        Record & Issue Contract / PO
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50 text-xs">
                      <div>
                        <span className="text-slate-400">PO Number:</span>
                        <p className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                          {procurement.po_reference_number || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Contract Reference:</span>
                        <p className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                          {procurement.contract_reference || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Final Contract Value:</span>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          ₹{Number(procurement.final_contract_value || procurement.estimated_value || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Duration:</span>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {procurement.contract_duration_days || 90} Days
                        </p>
                      </div>
                    </div>

                    {procurement.contract_document_url && (
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Executed Statutory Contract Document
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocumentSecurely(procurement.contract_document_url, "statutory_contract.pdf")}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                        >
                          View Document <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STAGE 5: DELIVERY EVIDENCE & FORMAL GOVERNMENT ACCEPTANCE */}
            {procurement && ["CONTRACT_ISSUED", "DELIVERY_SUBMITTED", "ACCEPTED", "COMPLETED"].includes(procurement.status) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stage 5</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Delivery Verification & Formal Acceptance
                    </h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    procurement.acceptance_status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}>
                    Acceptance: {procurement.acceptance_status || "PENDING"}
                  </span>
                </div>

                {procurement.status === "CONTRACT_ISSUED" ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-950/30">
                    <Truck className="mx-auto h-8 w-8 text-slate-400" />
                    <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                      Awaiting Startup Delivery Submission
                    </h4>
                    <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                      Contract executed. Once the startup delivers the commissioned solution and uploads deployment logs, the inspection team can record formal acceptance here.
                    </p>
                  </div>
                ) : procurement.status === "DELIVERY_SUBMITTED" ? (
                  <div className="space-y-6">
                    {/* Submitted Evidence Details */}
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Solution Delivery Submitted</span>
                        <span className="text-slate-400">
                          {procurement.delivery_date ? new Date(procurement.delivery_date).toLocaleDateString("en-IN") : "Recent"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Scope Delivered:</span>
                        <p className="mt-1 font-semibold text-slate-900 dark:text-white">{procurement.delivery_scope}</p>
                      </div>
                      {procurement.delivery_notes && (
                        <div>
                          <span className="text-slate-400">Startup Notes:</span>
                          <p className="mt-1 text-slate-700 dark:text-slate-300">{procurement.delivery_notes}</p>
                        </div>
                      )}
                      {procurement.delivery_evidence_url && (
                        <button
                          type="button"
                          onClick={() => openDocumentSecurely(procurement.delivery_evidence_url, "delivery_evidence_proof.pdf")}
                          className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Inspect Delivery Proof / Audit Telemetry
                        </button>
                      )}
                    </div>

                    {/* Government Acceptance Decision Form */}
                    <form onSubmit={handleAcceptDelivery} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Statutory Acceptance Inspection Decision *
                        </label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {ACCEPTANCE_STATUSES.map((a) => (
                            <div
                              key={a.value}
                              onClick={() => setAcceptanceForm((prev) => ({ ...prev, acceptance_status: a.value }))}
                              className={`cursor-pointer rounded-xl border p-3 transition ${
                                acceptanceForm.acceptance_status === a.value
                                  ? a.value === "ACCEPTED"
                                    ? "border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/40"
                                    : a.value === "REJECTED"
                                    ? "border-rose-600 bg-rose-50/50 dark:border-rose-500 dark:bg-rose-950/40"
                                    : "border-amber-600 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-950/40"
                                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{a.label}</span>
                                <input
                                  type="radio"
                                  name="acceptance_status"
                                  checked={acceptanceForm.acceptance_status === a.value}
                                  onChange={() => {}}
                                  className="text-indigo-600"
                                />
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{a.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Inspection Remarks & Acceptance Certification *
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={acceptanceForm.acceptance_remarks}
                          onChange={(e) => setAcceptanceForm((prev) => ({ ...prev, acceptance_remarks: e.target.value }))}
                          placeholder="e.g. Solution inspected at state data center. Passes all throughput, security, and integration criteria."
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                          Record Formal Acceptance Decision
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Statutory Delivery Acceptance Recorded
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-300">
                      Accepted by <strong>{procurement.acceptor?.name || "State Authority"}</strong> on{" "}
                      {procurement.accepted_at ? new Date(procurement.accepted_at).toLocaleDateString("en-IN", { dateStyle: "long" }) : "Recently"}.
                    </p>
                    {procurement.acceptance_remarks && (
                      <p className="text-slate-600 dark:text-slate-300 italic">
                        "{procurement.acceptance_remarks}"
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STAGE 6: PAYMENT SCHEDULING & CONCLUSION */}
            {procurement && ["ACCEPTED", "COMPLETED"].includes(procurement.status) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stage 6</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Payment Scheduling & Lifecycle Conclusion
                    </h3>
                  </div>
                  {procurement.status === "COMPLETED" ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Procurement Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteProcurement}
                      disabled={actionLoading}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-800"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Conclude Procurement Process
                    </button>
                  )}
                </div>

                {/* Scheduled Payments List */}
                {procurement.payments && procurement.payments.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Scheduled Milestone Payments in PostgreSQL
                    </h4>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {procurement.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              ₹{Number(p.amount).toLocaleString("en-IN")}
                            </span>
                            <span className="ml-2 text-slate-400">({p.payment_percentage}%)</span>
                            {p.reference_number && (
                              <p className="text-[11px] font-mono text-slate-500">Ref: {p.reference_number}</p>
                            )}
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSchedulePayment} className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Schedule Statutory Payment Release
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Payment Amount (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="5000000"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Payment Percentage (%)
                        </label>
                        <input
                          type="number"
                          value={paymentForm.payment_percentage}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_percentage: e.target.value }))}
                          placeholder="100"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Treasury / Voucher Reference
                        </label>
                        <input
                          type="text"
                          value={paymentForm.reference_number}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                          placeholder="VOUCH-2026-904"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                        Schedule Payment
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ChallengeContract;