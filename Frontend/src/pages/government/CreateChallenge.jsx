import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import PageHeader from "../../components/layout/PageHeader";
import { useAuth } from "../../context/AuthContext";
import ChallengeStepper from "../../components/challenge/ChallengeStepper";
import ChallengeForm from "../../components/challenge/ChallengeForm";
import OutcomeForm from "../../components/challenge/OutcomeForm";
import PilotForm from "../../components/challenge/PilotForm";
import RequirementsForm from "../../components/challenge/RequirementsForm";
import ChallengeReview from "../../components/challenge/ChallengeReview";
import AIChallengeCopilot from "../../components/challenge/AIChallengeCopilot";
import {
  getChallengeById,
  createChallenge,
  updateChallenge,
  publishChallenge,
  normalizeChallengePayload,
} from "../../services/challengeService";

const initialFormData = {
  // Step 1
  title: "",
  department: "",
  problemDescription: "",
  currentProcess: "",
  currentBaseline: "",
  location: "",
  applicationDeadline: "",

  // Step 2
  desiredOutcome: "",
  kpis: [],

  // Step 3
  startup: "",
  pilotLocation: "",
  pilotStartDate: "",
  pilotEndDate: "",
  budget: "",
  milestones: [],

  // Step 4
  requiredTechnologies: [],
  eligibilityRequirements: [],
  requiredDocuments: [],
  cybersecurityDocumentation: "",
  dataCompliance: "",

  // Future
  evidence: [],
};

function CreateChallenge() {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const userDepartment =
    user?.department?.name ||
    user?.department_name ||
    (typeof user?.department === "string" ? user?.department : "");

  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState(paramId || searchParams.get("draftId") || null);
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    department: userDepartment || "",
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  useEffect(() => {
    const idToLoad = paramId || searchParams.get("draftId");
    if (idToLoad) {
      setDraftId(idToLoad);
      loadExistingDraft(idToLoad);
    }
  }, [paramId, searchParams]);

  useEffect(() => {
    if (!draftId && userDepartment && !formData.department) {
      setFormData((prev) => ({
        ...prev,
        department: userDepartment,
      }));
    }
  }, [userDepartment, draftId, formData.department]);

  const loadExistingDraft = async (id) => {
    try {
      setIsLoadingDraft(true);
      setSubmitError("");
      const res = await getChallengeById(id);
      const ch = res?.data?.challenge || res?.challenge || res?.data || res;
      if (ch) {
        setFormData({
          title: ch.title || "",
          department: ch.department?.name || ch.department_id || "",
          problemDescription: ch.problem_description || "",
          currentProcess: ch.current_process || "",
          currentBaseline: ch.current_baseline || "",
          location: ch.location || "",
          applicationDeadline: ch.application_deadline ? ch.application_deadline.split("T")[0] : "",
          desiredOutcome: ch.desired_outcome || "",
          kpis: Array.isArray(ch.kpis)
            ? ch.kpis.map((k) => ({
                id: k.id || crypto.randomUUID(),
                name: k.name || "",
                unit: k.unit || "",
                baseline: k.baseline !== undefined && k.baseline !== null ? String(k.baseline) : "",
                target: k.target !== undefined && k.target !== null ? String(k.target) : "",
                weight: k.weight !== undefined && k.weight !== null ? String(k.weight) : "",
              }))
            : [],
          startup: ch.startup_requirements || "",
          pilotLocation: ch.pilot_location || ch.location || "",
          pilotStartDate: ch.pilot_start_date ? ch.pilot_start_date.split("T")[0] : "",
          pilotEndDate: ch.pilot_end_date ? ch.pilot_end_date.split("T")[0] : "",
          budget: ch.budget_max ? String(ch.budget_max) : (ch.budget_min ? String(ch.budget_min) : ""),
          milestones: Array.isArray(ch.milestones)
            ? ch.milestones.map((m) => ({
                id: m.id || crypto.randomUUID(),
                name: m.name || "",
                description: m.description || "",
                dueDate: m.dueDate || (m.due_date ? m.due_date.split("T")[0] : ""),
                paymentPercentage:
                  m.paymentPercentage !== undefined
                    ? String(m.paymentPercentage)
                    : m.payment_percentage !== undefined
                    ? String(m.payment_percentage)
                    : "",
                status: m.status || "not_started",
              }))
            : [],
          requiredTechnologies: Array.isArray(ch.required_technologies)
            ? ch.required_technologies.map((t) =>
                typeof t === "string" ? { id: crypto.randomUUID(), name: t } : t
              )
            : [],
          eligibilityRequirements: Array.isArray(ch.eligibility_requirements)
            ? ch.eligibility_requirements.map((e) => ({
                id: e.id || crypto.randomUUID(),
                name: e.name || "",
                description: e.description || "",
                required: e.required !== false,
              }))
            : [],
          requiredDocuments: Array.isArray(ch.required_documents)
            ? ch.required_documents.map((d) => ({
                id: d.id || crypto.randomUUID(),
                name: d.name || "",
                description: d.description || "",
                verificationStatus: d.verificationStatus || d.verification_status || "pending",
              }))
            : [],
          cybersecurityDocumentation: ch.cybersecurity_requirements || "",
          dataCompliance: ch.data_compliance || "",
          evidence: [],
        });
      }
    } catch (err) {
      console.error("Failed to load draft challenge:", err);
      setSubmitError(err.message || "Failed to load existing challenge draft.");
    } finally {
      setIsLoadingDraft(false);
    }
  };

  // =========================================================
  // GENERAL CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  // =========================================================
  // AUTO-SCROLL & FOCUS TO FIRST INVALID FIELD
  // =========================================================

  const scrollToFirstInvalidField = (errorMap = {}) => {
    const errorKeys = Object.keys(errorMap).filter((key) => Boolean(errorMap[key]));
    if (errorKeys.length === 0) return;

    setTimeout(() => {
      const candidates = [];

      errorKeys.forEach((key) => {
        // 1. Direct match by id, name, or data-field
        const element = document.querySelector(
          `[id="${key}"], [name="${key}"], [data-field="${key}"], #${key}-section, #${key}`
        );
        if (element) {
          candidates.push(element);
          return;
        }

        // 2. Dynamic milestone keys
        if (key.startsWith("milestone_")) {
          const mElement = document.querySelector(`[id="${key}"], [name="${key}"]`);
          if (mElement) {
            candidates.push(mElement);
          } else {
            const mSec = document.querySelector('[data-field="milestones"], #milestones-section');
            if (mSec) candidates.push(mSec);
          }
          return;
        }

        // 3. Dynamic KPI keys
        if (key.startsWith("kpi_")) {
          const kElement = document.querySelector(`[id="${key}"], [name="${key}"]`);
          if (kElement) {
            candidates.push(kElement);
          } else {
            const kSec = document.querySelector('[data-field="kpis"], #kpis-section');
            if (kSec) candidates.push(kSec);
          }
          return;
        }
      });

      // 4. Also collect any rendered error indicators inside the form
      const errorIndicators = document.querySelectorAll(
        '.border-red-400, .border-red-500, .text-red-500, [aria-invalid="true"]'
      );
      errorIndicators.forEach((el) => {
        const wrapper = el.closest('.space-y-1.5, section, .rounded-xl, .rounded-2xl') || el;
        candidates.push(wrapper);
      });

      if (candidates.length === 0) return;

      // Deduplicate candidates
      const uniqueCandidates = Array.from(new Set(candidates));

      // Sort candidates in top-to-bottom visual order
      uniqueCandidates.sort((a, b) => {
        if (a === b) return 0;
        const position = a.compareDocumentPosition(b);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });

      const firstInvalidElement = uniqueCandidates[0];
      if (!firstInvalidElement) return;

      // 1. Scroll smoothly to center in viewport
      firstInvalidElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // 2. Focus first invalid input/control
      const focusTarget =
        typeof firstInvalidElement.focus === "function" &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(firstInvalidElement.tagName)
          ? firstInvalidElement
          : firstInvalidElement.querySelector(
              "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])"
            );

      if (focusTarget && typeof focusTarget.focus === "function") {
        setTimeout(() => {
          try {
            focusTarget.focus({ preventScroll: true });
          } catch {
            focusTarget.focus();
          }
        }, 150);
      }
    }, 40);
  };

  // =========================================================
  // STEP 1 VALIDATION
  // =========================================================

  const validateProblemStep = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Challenge title is required.";
    }

    if (!formData.department.trim()) {
      newErrors.department = "Department is required.";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required.";
    }

    if (!formData.applicationDeadline || !formData.applicationDeadline.trim()) {
      newErrors.applicationDeadline = "Application Deadline is required";
    }

    if (!formData.problemDescription.trim()) {
      newErrors.problemDescription =
        "Problem description is required.";
    }

    if (!formData.currentProcess.trim()) {
      newErrors.currentProcess =
        "Current process is required.";
    }

    if (!formData.currentBaseline.trim()) {
      newErrors.currentBaseline =
        "Current baseline is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      scrollToFirstInvalidField(newErrors);
      return false;
    }

    return true;
  };

  // =========================================================
  // STEP 2 VALIDATION
  // =========================================================

  const validateOutcomeStep = () => {
    const newErrors = {};

    if (!formData.desiredOutcome.trim()) {
      newErrors.desiredOutcome =
        "Desired outcome is required.";
    }

    if (formData.kpis.length === 0) {
      newErrors.kpis = "Add at least one KPI.";
    } else {
      formData.kpis.forEach((kpi, idx) => {
        if (!kpi.name || !kpi.name.trim()) {
          newErrors[`kpi_${kpi.id}_name`] = `KPI ${idx + 1} name is required.`;
        }
      });
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      scrollToFirstInvalidField(newErrors);
      return false;
    }

    return true;
  };

  // =========================================================
  // STEP 3 VALIDATION
  // =========================================================

  const validatePilotStep = () => {
    const newErrors = {};

    if (!formData.startup.trim()) {
      newErrors.startup = "Startup is required.";
    }

    if (!formData.pilotLocation.trim()) {
      newErrors.pilotLocation =
        "Pilot location is required.";
    }

    if (!formData.pilotStartDate) {
      newErrors.pilotStartDate =
        "Start date is required.";
    }

    if (!formData.pilotEndDate) {
      newErrors.pilotEndDate =
        "End date is required.";
    }

    const parsedBudget = Number(String(formData.budget || "").replace(/[^0-9.]/g, ""));
    if (!formData.budget || isNaN(parsedBudget) || parsedBudget <= 0) {
      newErrors.budget = "Budget is required and must be a positive number.";
    }

    if (
      formData.pilotStartDate &&
      formData.pilotEndDate &&
      formData.pilotEndDate < formData.pilotStartDate
    ) {
      newErrors.pilotEndDate =
        "End date must be after start date.";
    }

    if (formData.milestones.length === 0) {
      newErrors.milestones =
        "Add at least one milestone.";
    } else {
      formData.milestones.forEach((m, idx) => {
        if (!m.name || !m.name.trim()) {
          newErrors[`milestone_${m.id}_name`] = `Milestone ${idx + 1} name is required.`;
        }
        if (!m.dueDate) {
          newErrors[`milestone_${m.id}_dueDate`] = `Milestone ${idx + 1} due date is required.`;
        }
        if (!m.paymentPercentage) {
          newErrors[`milestone_${m.id}_paymentPercentage`] = `Milestone ${idx + 1} payment percentage is required.`;
        }
      });
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      scrollToFirstInvalidField(newErrors);
      return false;
    }

    return true;
  };

  // =========================================================
  // STEP 4 VALIDATION
  // =========================================================

  const validateRequirementsStep = () => {
    const newErrors = {};

    if (formData.requiredTechnologies.length === 0) {
      newErrors.requiredTechnologies =
        "Add at least one required technology.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      scrollToFirstInvalidField(newErrors);
      return false;
    }

    return true;
  };

  // =========================================================
  // NEXT
  // =========================================================

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateProblemStep()) return;
    }

    if (currentStep === 2) {
      if (!validateOutcomeStep()) return;
    }

    if (currentStep === 3) {
      if (!validatePilotStep()) return;
    }

    if (currentStep === 4) {
      if (!validateRequirementsStep()) return;
    }

    setErrors({});

    setCurrentStep((previous) =>
      Math.min(previous + 1, 5)
    );
  };

  // =========================================================
  // BACK
  // =========================================================

  const handleBack = () => {
    setErrors({});

    if (currentStep === 1) {
      navigate("/government/dashboard");
      return;
    }

    setCurrentStep((previous) =>
      Math.max(previous - 1, 1)
    );
  };

  // =========================================================
  // SAVE DRAFT & PUBLISH
  // =========================================================

  const buildBackendPayload = () => {
    return normalizeChallengePayload(formData);
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      setSubmitError("");
      setSaveSuccessMsg("");
      const payload = buildBackendPayload();

      let savedId = draftId;
      if (draftId) {
        // Update existing draft without creating duplicate
        const response = await updateChallenge(draftId, payload);
        savedId =
          response?.data?.challenge?.id ||
          response?.data?.id ||
          response?.challenge?.id ||
          draftId;
      } else {
        // Create new draft
        const response = await createChallenge(payload);
        savedId =
          response?.data?.challenge?.id ||
          response?.data?.id ||
          response?.challenge?.id ||
          response?.id;
        if (savedId) {
          setDraftId(savedId);
          window.history.replaceState(
            null,
            "",
            `/government/challenges/${savedId}/edit`
          );
        }
      }

      setSaveSuccessMsg(
        "Draft saved successfully to PostgreSQL! You can continue editing, refresh safely, or return anytime."
      );
      setTimeout(() => setSaveSuccessMsg(""), 6000);
    } catch (error) {
      console.error("Unable to save draft challenge:", error);
      setSubmitError(
        error.message ||
          "Some challenge fields have an invalid format. Please review the highlighted fields."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsSaving(true);
      setSubmitError("");
      setSaveSuccessMsg("");
      const payload = buildBackendPayload();
      let targetId = draftId;

      if (draftId) {
        // Persist all current form values before publishing
        await updateChallenge(draftId, payload);
      } else {
        const createRes = await createChallenge(payload);
        targetId =
          createRes?.data?.challenge?.id ||
          createRes?.data?.id ||
          createRes?.challenge?.id ||
          createRes?.id;
        if (targetId) {
          setDraftId(targetId);
        }
      }

      if (targetId) {
        await publishChallenge(targetId);
        navigate(`/government/challenges/${targetId}/overview`);
      } else {
        throw new Error("Unable to determine challenge ID for publication.");
      }
    } catch (error) {
      console.error("Unable to publish challenge:", error);
      setSubmitError(
        error.message ||
          "Some challenge fields have an invalid format. Please review the highlighted fields."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================
  // KPI
  // =========================================================

  const handleAddKPI = () => {
    const newKpiId = crypto.randomUUID();
    setFormData((previous) => ({
      ...previous,
      kpis: [
        ...previous.kpis,
        {
          id: newKpiId,
          name: "",
          unit: "",
          baseline: "",
          target: "",
          weight: "",
        },
      ],
    }));

    setTimeout(() => {
      const kpiRow = document.querySelector(`[data-kpi-id="${newKpiId}"]`);
      const firstInput =
        document.getElementById(`kpi_${newKpiId}_name`) ||
        (kpiRow && kpiRow.querySelector("input, textarea, select"));

      if (kpiRow) {
        kpiRow.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstInput) {
        firstInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (firstInput) {
        setTimeout(() => {
          try {
            firstInput.focus({ preventScroll: true });
          } catch {
            firstInput.focus();
          }
        }, 120);
      }
    }, 50);
  };

  const handleKPIChange = (
    id,
    field,
    value
  ) => {
    setFormData((previous) => ({
      ...previous,
      kpis: previous.kpis.map((kpi) =>
        kpi.id === id
          ? {
              ...kpi,
              [field]: value,
            }
          : kpi
      ),
    }));

    setErrors((previous) => ({
      ...previous,
      [`kpi_${id}_${field}`]: "",
      kpis: "",
    }));
  };

  const handleRemoveKPI = (id) => {
    setFormData((previous) => ({
      ...previous,
      kpis: previous.kpis.filter(
        (kpi) => kpi.id !== id
      ),
    }));
  };

  // =========================================================
  // MILESTONE
  // =========================================================

  const handleAddMilestone = () => {
    const newMilestoneId = crypto.randomUUID();
    setFormData((previous) => ({
      ...previous,
      milestones: [
        ...previous.milestones,
        {
          id: newMilestoneId,
          name: "",
          description: "",
          dueDate: "",
          paymentPercentage: "",
          status: "not_started",
        },
      ],
    }));

    setErrors((previous) => ({
      ...previous,
      milestones: "",
    }));

    setTimeout(() => {
      const mRow = document.querySelector(`[data-milestone-id="${newMilestoneId}"]`);
      const firstInput =
        document.getElementById(`milestone_${newMilestoneId}_name`) ||
        (mRow && mRow.querySelector("input, textarea, select"));

      if (mRow) {
        mRow.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstInput) {
        firstInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (firstInput) {
        setTimeout(() => {
          try {
            firstInput.focus({ preventScroll: true });
          } catch {
            firstInput.focus();
          }
        }, 120);
      }
    }, 50);
  };

  const handleMilestoneChange = (
    id,
    field,
    value
  ) => {
    setFormData((previous) => ({
      ...previous,
      milestones: previous.milestones.map(
        (milestone) =>
          milestone.id === id
            ? {
                ...milestone,
                [field]: value,
              }
            : milestone
      ),
    }));

    setErrors((previous) => ({
      ...previous,
      [`milestone_${id}_${field}`]: "",
      milestones: "",
    }));
  };

  const handleRemoveMilestone = (id) => {
    setFormData((previous) => ({
      ...previous,
      milestones:
        previous.milestones.filter(
          (milestone) =>
            milestone.id !== id
        ),
    }));
  };

  // =========================================================
  // TECHNOLOGY
  // =========================================================

  const handleAddTechnology = () => {
    setFormData((previous) => ({
      ...previous,
      requiredTechnologies: [
        ...previous.requiredTechnologies,
        {
          id: crypto.randomUUID(),
          name: "",
        },
      ],
    }));

    setErrors((previous) => ({
      ...previous,
      requiredTechnologies: "",
    }));
  };

  const handleTechnologyChange = (
    id,
    value
  ) => {
    setFormData((previous) => ({
      ...previous,
      requiredTechnologies:
        previous.requiredTechnologies.map(
          (technology) =>
            technology.id === id
              ? {
                  ...technology,
                  name: value,
                }
              : technology
        ),
    }));

    setErrors((previous) => ({
      ...previous,
      requiredTechnologies: "",
    }));
  };

  const handleRemoveTechnology = (id) => {
    setFormData((previous) => ({
      ...previous,
      requiredTechnologies:
        previous.requiredTechnologies.filter(
          (technology) =>
            technology.id !== id
        ),
    }));
  };

  // =========================================================
  // ELIGIBILITY
  // =========================================================

  const handleAddEligibility = () => {
    setFormData((previous) => ({
      ...previous,
      eligibilityRequirements: [
        ...previous.eligibilityRequirements,
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          required: true,
        },
      ],
    }));
  };

  const handleEligibilityChange = (
    id,
    field,
    value
  ) => {
    setFormData((previous) => ({
      ...previous,
      eligibilityRequirements:
        previous.eligibilityRequirements.map(
          (requirement) =>
            requirement.id === id
              ? {
                  ...requirement,
                  [field]: value,
                }
              : requirement
        ),
    }));

    setErrors((previous) => ({
      ...previous,
      eligibilityRequirements: "",
    }));
  };

  const handleRemoveEligibility = (id) => {
    setFormData((previous) => ({
      ...previous,
      eligibilityRequirements:
        previous.eligibilityRequirements.filter(
          (requirement) =>
            requirement.id !== id
        ),
    }));
  };

  // =========================================================
  // DOCUMENTS
  // =========================================================

  const handleAddDocument = () => {
    setFormData((previous) => ({
      ...previous,
      requiredDocuments: [
        ...previous.requiredDocuments,
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          verificationStatus: "pending",
        },
      ],
    }));
  };

  const handleDocumentChange = (
    id,
    field,
    value
  ) => {
    setFormData((previous) => ({
      ...previous,
      requiredDocuments:
        previous.requiredDocuments.map(
          (document) =>
            document.id === id
              ? {
                  ...document,
                  [field]: value,
                }
              : document
        ),
    }));
  };

  const handleRemoveDocument = (id) => {
    setFormData((previous) => ({
      ...previous,
      requiredDocuments:
        previous.requiredDocuments.filter(
          (document) =>
            document.id !== id
        ),
    }));
  };

  // =========================================================
  // AI COPILOT AUTOFILL
  // =========================================================

  const handleAutofill = (mappedData) => {
    setFormData((previous) => ({
      ...previous,
      ...mappedData,
      department: userDepartment || previous.department || mappedData.department || "",
    }));
    setErrors({});
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <PageHeader
          showBack
          backTo="/government/dashboard"
          backLabel="Back to Dashboard"
          title="Create Challenge"
          description="Define an outcome-focused government challenge. Use the AI Challenge Copilot below for instant structured problem framing or complete manually."
          actions={
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
          }
        />

        {/* AI CHALLENGE COPILOT (BRAIN 1) */}

        <AIChallengeCopilot
          formData={formData}
          onAutofill={handleAutofill}
        />

        {/* DRAFT LOADING STATE */}
        {isLoadingDraft && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="font-semibold">Loading challenge draft from PostgreSQL database...</p>
          </div>
        )}

        {/* SAVE SUCCESS BANNER */}
        {saveSuccessMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Draft Saved</p>
              <p className="mt-0.5">{saveSuccessMsg}</p>
            </div>
          </div>
        )}

        {/* SUBMISSION ERROR ALERT */}
        {submitError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Challenge Submission Notice</p>
              <p className="mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* STEPPER */}

        <ChallengeStepper
          currentStep={currentStep}
        />

        {/* CONTENT */}

        <div className="mt-6">

          {/* FORM */}

          <motion.div
            key={currentStep}
            initial={{
              opacity: 0,
              x: 15,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.3,
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
          >

            {/* STEP 1 */}

            {currentStep === 1 && (
              <ChallengeForm
                formData={formData}
                errors={errors}
                onChange={handleChange}
              />
            )}

            {/* STEP 2 */}

            {currentStep === 2 && (
              <OutcomeForm
                formData={formData}
                errors={errors}
                onChange={handleChange}
                onKPIChange={
                  handleKPIChange
                }
                onAddKPI={
                  handleAddKPI
                }
                onRemoveKPI={
                  handleRemoveKPI
                }
              />
            )}

            {/* STEP 3 */}

            {currentStep === 3 && (
              <PilotForm
                formData={formData}
                errors={errors}
                onChange={handleChange}
                onMilestoneChange={
                  handleMilestoneChange
                }
                onAddMilestone={
                  handleAddMilestone
                }
                onRemoveMilestone={
                  handleRemoveMilestone
                }
              />
            )}

            {/* STEP 4 */}

            {currentStep === 4 && (
              <RequirementsForm
                formData={formData}
                errors={errors}
                onChange={handleChange}
                onAddTechnology={
                  handleAddTechnology
                }
                onRemoveTechnology={
                  handleRemoveTechnology
                }
                onTechnologyChange={
                  handleTechnologyChange
                }
                onAddEligibility={
                  handleAddEligibility
                }
                onRemoveEligibility={
                  handleRemoveEligibility
                }
                onEligibilityChange={
                  handleEligibilityChange
                }
                onAddDocument={
                  handleAddDocument
                }
                onRemoveDocument={
                  handleRemoveDocument
                }
                onDocumentChange={
                  handleDocumentChange
                }
              />
            )}

            {/* STEP 5 */}

            {currentStep === 5 && (
              <ChallengeReview
                formData={formData}
                onEditStep={(step) =>
                  setCurrentStep(step)
                }
              />
            )}

            {/* NAVIGATION */}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />

                {currentStep === 1
                  ? "Cancel"
                  : "Back"}
              </button>

              {/* CONTINUE */}

              {currentStep < 5 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                >
                  Continue

                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {/* REVIEW ACTIONS */}

              {currentStep === 5 && (
                <div className="flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <Save className="h-4 w-4" />

                    {isSaving
                      ? "Saving..."
                      : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    onClick={handlePublish}
                    className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                  >
                    Publish Challenge

                    <CheckCircle2 className="h-4 w-4" />
                  </button>

                </div>
              )}

            </div>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}

export default CreateChallenge;