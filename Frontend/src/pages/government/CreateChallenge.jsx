import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import ChallengeStepper from "../../components/challenge/ChallengeStepper";
import ChallengeForm from "../../components/challenge/ChallengeForm";
import OutcomeForm from "../../components/challenge/OutcomeForm";
import PilotForm from "../../components/challenge/PilotForm";
import RequirementsForm from "../../components/challenge/RequirementsForm";
import ChallengeReview from "../../components/challenge/ChallengeReview";
import AIChallengeCopilot from "../../components/challenge/AIChallengeCopilot";
import {
  createChallenge,
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

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

    return Object.keys(newErrors).length === 0;
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
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
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

    if (!formData.budget) {
      newErrors.budget = "Budget is required.";
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
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
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

    return Object.keys(newErrors).length === 0;
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
      const payload = buildBackendPayload();
      const response = await createChallenge(payload);
      const createdId =
        response?.data?.challenge?.id ||
        response?.data?.id ||
        response?.challenge?.id ||
        response?.id;
      if (createdId) {
        navigate(`/government/challenges/${createdId}/overview`);
      } else {
        navigate("/government/dashboard");
      }
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
      const payload = buildBackendPayload();
      const createRes = await createChallenge(payload);
      const createdId =
        createRes?.data?.challenge?.id ||
        createRes?.data?.id ||
        createRes?.challenge?.id ||
        createRes?.id;

      if (createdId) {
        const pubRes = await publishChallenge(createdId);
        navigate(`/government/challenges/${createdId}/overview`);
      } else {
        navigate("/government/dashboard");
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
    setFormData((previous) => ({
      ...previous,
      kpis: [
        ...previous.kpis,
        {
          id: crypto.randomUUID(),
          name: "",
          unit: "",
          baseline: "",
          target: "",
          weight: "",
        },
      ],
    }));
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
    setFormData((previous) => ({
      ...previous,
      milestones: [
        ...previous.milestones,
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          dueDate: "",
          paymentPercentage: "",
          status: "not_started",
        },
      ],
    }));
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

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
          }}
          className="mb-6"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                "/government/dashboard"
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Create Challenge
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Define an outcome-focused government challenge. Use the AI Challenge Copilot below for instant structured problem framing or complete manually.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />

              {isSaving
                ? "Saving..."
                : "Save Draft"}
            </button>
          </div>
        </motion.div>

        {/* AI CHALLENGE COPILOT (BRAIN 1) */}

        <AIChallengeCopilot
          formData={formData}
          onAutofill={handleAutofill}
        />

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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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