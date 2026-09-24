import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import StatCard from "../../components/common/StatCard";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  Lightbulb,
  Loader2,
  Save,
  Sparkles,
  Upload,
  Users,
  X,
  AlertTriangle,
  Building2,
  CalendarDays,
  Clock3,
  Rocket,
  Search,
  RefreshCw,
  ExternalLink,
  Trash2,
  Lock,
  Download,
  Check,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  submitApplication,
  updateApplication,
  uploadSolutionDocument,
  getApplicationDocuments,
  deleteSolutionDocument,
  finalizeSolutionSubmission,
} from "../../services/applicationService";
import { getChallengeById, getChallenges } from "../../services/challengeService";
import { getStartupApplications } from "../../services/startupService";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";
import { formatPublishDate } from "../../utils/filterUtils";
import Pagination from "../../components/common/Pagination";
import { openDocumentSecurely } from "../../utils/documentUtils.js";



function StartupApplication() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  if (!id) {
    return <MyApplicationsListView user={user} navigate={navigate} />;
  }

  return <ApplicationForm id={id} user={user} navigate={navigate} />;
}

function ApplicationForm({ id, user, navigate }) {

  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [challengeError, setChallengeError] = useState(null);

  useEffect(() => {
    if (id) {
      setLoadingChallenge(true);
      setChallengeError(null);
      getChallengeById(id)
        .then((res) => {
          const ch = res?.data?.challenge || res?.challenge || res?.data || res;
          if (ch?.id) {
            setChallenge({
              id: ch.id,
              title: ch.title,
              department: ch.department?.name || "Government Department",
              category: ch.sector || ch.category || "GovTech",
              deadline: ch.application_deadline
                ? new Date(ch.application_deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "Open Rolling",
              deadlineRaw: ch.application_deadline,
              publishedDate: formatPublishDate(ch),
              budget: ch.budget_max ? `₹${Number(ch.budget_max).toLocaleString("en-IN")}` : (ch.budget_min ? `₹${Number(ch.budget_min).toLocaleString("en-IN")}` : "Not specified"),
              status: ch.status,
            });
          } else {
            setChallengeError("Specified procurement challenge was not found in the database.");
          }
        })
        .catch((err) => {
          console.error("Error loading challenge:", err);
          setChallengeError(err?.message || "Failed to load challenge from server.");
        })
        .finally(() => {
          setLoadingChallenge(false);
        });
    } else {
      setLoadingChallenge(false);
    }
  }, [id]);

  const isDeadlineExpired = Boolean(
    challenge?.deadlineRaw && new Date(challenge.deadlineRaw) < new Date()
  );

  const isStartupUnverified = user && user.verification_status && user.verification_status !== "VERIFIED";

  const [form, setForm] = useState({
    solutionName: "",
    problemUnderstanding: "",
    proposedSolution: "",
    technology: "",
    innovation: "",
    expectedImpact: "",
    implementationPlan: "",
    proposedBudget: "",
    proposedTimeline: "",
    teamSize: "",
    teamExperience: "",
    additionalInformation: "",
  });

  const [documents, setDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [submitState, setSubmitState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);

    const newDocuments = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || "Document",
    }));

    setDocuments((previous) => [
      ...previous,
      ...newDocuments,
    ]);

    event.target.value = "";
  };

  const removeDocument = (documentId) => {
    setDocuments((previous) =>
      previous.filter(
        (document) => document.id !== documentId
      )
    );
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.solutionName.trim()) {
      nextErrors.solutionName =
        "Solution name is required.";
    }

    if (!form.problemUnderstanding.trim()) {
      nextErrors.problemUnderstanding =
        "Please explain your understanding of the problem.";
    } else if (form.problemUnderstanding.trim().length < 20) {
      nextErrors.problemUnderstanding =
        "Problem understanding must be at least 20 characters.";
    }

    if (!form.proposedSolution.trim()) {
      nextErrors.proposedSolution =
        "Please describe your proposed solution.";
    } else if (form.proposedSolution.trim().length < 20) {
      nextErrors.proposedSolution =
        "Proposed solution must be at least 20 characters.";
    }

    if (!form.technology.trim()) {
      nextErrors.technology =
        "Please mention the technology used.";
    }

    if (!form.expectedImpact.trim()) {
      nextErrors.expectedImpact =
        "Please describe the expected impact.";
    } else if (form.expectedImpact.trim().length < 20) {
      nextErrors.expectedImpact =
        "Expected impact must be at least 20 characters.";
    }

    if (!form.implementationPlan.trim()) {
      nextErrors.implementationPlan =
        "Please provide an implementation plan.";
    }

    if (!String(form.proposedBudget).trim() || isNaN(Number(form.proposedBudget)) || Number(form.proposedBudget) <= 0) {
      nextErrors.proposedBudget =
        "Please enter a valid positive proposed budget (₹).";
    }

    if (!String(form.proposedTimeline).trim()) {
      nextErrors.proposedTimeline =
        "Please specify an estimated timeline (e.g., 60 days).";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const [draftAppId, setDraftAppId] = useState(null);

  const handleSaveDraft = async () => {
    setSaveState("saving");
    try {
      const budgetVal = form.proposedBudget && !isNaN(Number(form.proposedBudget)) && Number(form.proposedBudget) > 0
        ? Number(form.proposedBudget)
        : 100000;
      const timelineVal = String(form.proposedTimeline || "").trim() || "30 days";
      const payload = {
        proposal: form.problemUnderstanding?.trim() || form.solutionName?.trim() || "Draft Proposal Summary (minimum 20 characters)",
        proposal_summary: form.problemUnderstanding?.trim() || form.solutionName?.trim() || "Draft Proposal Summary (minimum 20 characters)",
        technical_approach: form.proposedSolution?.trim() || form.technology?.trim() || "Draft Technical Approach (minimum 20 characters)",
        expected_impact: form.expectedImpact?.trim() || "Draft Expected Impact Description (minimum 20 characters)",
        proposed_budget: budgetVal,
        estimated_cost: budgetVal,
        proposed_timeline_days: !isNaN(Number(timelineVal)) ? Number(timelineVal) : timelineVal,
        timeline: timelineVal,
        status: "DRAFT"
      };

      if (draftAppId) {
        await updateApplication(draftAppId, payload);
      } else if (id) {
        const res = await submitApplication(id, payload);
        const createdId = res?.data?.application?.id || res?.application?.id;
        if (createdId) setDraftAppId(createdId);
      }
      setSaveState("saved");
    } catch (err) {
      console.warn("Could not persist draft to database, saving locally as backup:", err);
      localStorage.setItem(
        `startup_application_draft_${id || "new"}`,
        JSON.stringify({
          challengeId: id,
          form,
          documents,
          savedAt: new Date().toISOString(),
        })
      );
      setSaveState("saved");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (isDeadlineExpired) {
      setErrorMessage("Application deadline for this challenge has passed. Submissions are no longer accepted.");
      return;
    }

    if (!validateForm()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    setSubmitState("submitting");

    try {
      const budgetNumber = Number(form.proposedBudget);
      const timelineStr = String(form.proposedTimeline || "").trim();
      const payload = {
        proposal:
          form.problemUnderstanding?.trim() ||
          form.solutionName?.trim() ||
          "",
        proposal_summary:
          form.problemUnderstanding?.trim() ||
          form.solutionName?.trim() ||
          "",
        technical_approach:
          form.proposedSolution?.trim() ||
          form.technology?.trim() ||
          "",
        expected_impact: form.expectedImpact?.trim(),
        proposed_budget: budgetNumber,
        estimated_cost: budgetNumber,
        proposed_timeline_days: !isNaN(Number(timelineStr)) ? Number(timelineStr) : timelineStr,
        timeline: timelineStr,
        team_experience: form.teamExperience || "",
        evidence_attachments: documents.map((d) => d.name || "document.pdf"),
      };

      if (!id) {
        throw new Error("Invalid challenge identifier. Please select a valid challenge to submit a proposal.");
      }

      await submitApplication(id, payload);

      setSubmitState("submitted");
      setSuccessMessage(
        "Application submitted successfully! Your proposal has entered the formal government evaluation workflow."
      );
    } catch (err) {
      console.warn("Application submit error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to submit proposal.";
      setErrorMessage(msg);
      setSubmitState("idle");
    } finally {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (loadingChallenge) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-400">Loading challenge requirements from database...</p>
      </div>
    );
  }

  if (challengeError || !challenge) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/30 dark:bg-red-950/30">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h2 className="mt-2 text-base font-bold text-red-800 dark:text-red-200">Challenge Not Found</h2>
        <p className="mt-1 text-xs text-red-600 dark:text-red-300">{challengeError || "The requested procurement challenge does not exist."}</p>
        <button
          onClick={() => navigate('/startup/challenges')}
          className="btn-primary mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
        >
          <ArrowLeft className="h-4 w-4" /> Browse Active Challenges
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* ERROR MESSAGE                                    */}
      {/* ================================================= */}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Submission Error</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </motion.div>
      )}

      {/* ================================================= */}
      {/* DEADLINE EXPIRED WARNING                          */}
      {/* ================================================= */}

      {isDeadlineExpired && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50/80 p-4 dark:border-red-900/60 dark:bg-red-950/40"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Application Window Closed</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              The deadline ({challenge.deadline}) for this procurement challenge has expired. New proposals can no longer be submitted.
            </p>
          </div>
        </motion.div>
      )}

      {/* ================================================= */}
      {/* UNVERIFIED STARTUP WARNING                        */}
      {/* ================================================= */}

      {isStartupUnverified && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Account Verification Pending</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Your startup profile is awaiting administrative verification. You can submit proposals, but formal evaluator scoring will commence upon account verification.
            </p>
          </div>
        </motion.div>
      )}

      {/* ================================================= */}
      {/* SUCCESS MESSAGE                                  */}
      {/* ================================================= */}

      {successMessage && (
        <motion.div
          initial={{
            opacity: 0,
            y: -8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Application Submitted
            </p>

            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              {successMessage}
            </p>
          </div>
        </motion.div>
      )}

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() =>
            navigate("/startup/challenges")
          }
          className="back-nav"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Challenges
        </button>

        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-4 w-4" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Challenge Application
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Apply for Challenge
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Submit your startup's solution and
              demonstrate how it can address the
              government's identified problem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="shrink-0 rounded-2xl bg-indigo-50 px-4 py-3 dark:bg-indigo-500/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Published Date
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                {challenge.publishedDate}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Application Deadline
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
                {challenge.deadline}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* CHALLENGE SUMMARY                                 */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
              Applying For
            </p>

            <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              {challenge.title}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <InfoPill
                text={challenge.department}
              />

              <InfoPill
                text={challenge.category}
              />

              <InfoPill
                text={`Published: ${challenge.publishedDate}`}
              />

              <InfoPill
                text={`Budget: ${challenge.budget}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* FORM                                              */}
      {/* ================================================= */}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* ================================================= */}
        {/* SECTION 1 - STARTUP SOLUTION                     */}
        {/* ================================================= */}

        <FormSection
          number="01"
          icon={Lightbulb}
          title="Solution Overview"
          description="Tell the evaluator what you are proposing."
        >
          <div className="grid gap-5">
            <FormField
              label="Solution / Product Name"
              required
              error={errors.solutionName}
            >
              <input
                type="text"
                value={form.solutionName}
                onChange={(event) =>
                  updateField(
                    "solutionName",
                    event.target.value
                  )
                }
                placeholder="Enter your solution or product name"
                className={inputClass(
                  errors.solutionName
                )}
              />
            </FormField>

            <FormField
              label="Understanding of the Problem"
              required
              error={
                errors.problemUnderstanding
              }
              hint="Explain the problem, its users and the current limitations."
            >
              <Textarea
                value={
                  form.problemUnderstanding
                }
                onChange={(value) =>
                  updateField(
                    "problemUnderstanding",
                    value
                  )
                }
                placeholder="Describe your understanding of the government's problem statement..."
                error={
                  errors.problemUnderstanding
                }
              />
            </FormField>

            <FormField
              label="Proposed Solution"
              required
              error={errors.proposedSolution}
              hint="Explain how your solution solves the identified problem."
            >
              <Textarea
                value={
                  form.proposedSolution
                }
                onChange={(value) =>
                  updateField(
                    "proposedSolution",
                    value
                  )
                }
                placeholder="Describe your proposed solution, key features and workflow..."
                error={errors.proposedSolution}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ================================================= */}
        {/* SECTION 2 - TECHNOLOGY                           */}
        {/* ================================================= */}

        <FormSection
          number="02"
          icon={Sparkles}
          title="Technology & Innovation"
          description="Describe the technical approach and what makes your solution innovative."
        >
          <div className="grid gap-5">
            <FormField
              label="Technology / Technical Stack"
              required
              error={errors.technology}
              hint="Mention important technologies, platforms or methodologies."
            >
              <Textarea
                value={form.technology}
                onChange={(value) =>
                  updateField(
                    "technology",
                    value
                  )
                }
                placeholder="Example: React, Node.js, AI/ML, cloud infrastructure..."
                error={errors.technology}
              />
            </FormField>

            <FormField
              label="Innovation / Unique Value Proposition"
              hint="What differentiates your solution from existing approaches?"
            >
              <Textarea
                value={form.innovation}
                onChange={(value) =>
                  updateField(
                    "innovation",
                    value
                  )
                }
                placeholder="Describe your innovation, USP, IP or competitive advantage..."
              />
            </FormField>
          </div>
        </FormSection>

        {/* ================================================= */}
        {/* SECTION 3 - IMPACT                                */}
        {/* ================================================= */}

        <FormSection
          number="03"
          icon={CheckCircle2}
          title="Expected Impact"
          description="Explain the measurable outcomes you expect from your solution."
        >
          <FormField
            label="Expected Impact"
            required
            error={errors.expectedImpact}
            hint="Include measurable outcomes wherever possible."
          >
            <Textarea
              value={form.expectedImpact}
              onChange={(value) =>
                updateField(
                  "expectedImpact",
                  value
                )
              }
              placeholder="Describe expected benefits, measurable outcomes, cost savings, efficiency improvements..."
              error={errors.expectedImpact}
            />
          </FormField>
        </FormSection>

        {/* ================================================= */}
        {/* SECTION 4 - IMPLEMENTATION                        */}
        {/* ================================================= */}

        <FormSection
          number="04"
          icon={ArrowRight}
          title="Implementation Plan"
          description="Show how your startup will execute the solution."
        >
          <div className="grid gap-5">
            <FormField
              label="Implementation Approach"
              required
              error={
                errors.implementationPlan
              }
              hint="Mention phases, milestones, timeline and key deliverables."
            >
              <Textarea
                value={
                  form.implementationPlan
                }
                onChange={(value) =>
                  updateField(
                    "implementationPlan",
                    value
                  )
                }
                placeholder="Phase 1: Discovery... Phase 2: Development... Phase 3: Pilot..."
                error={
                  errors.implementationPlan
                }
              />
            </FormField>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Proposed Budget (₹ INR)"
                required
                error={errors.proposedBudget}
                hint="Total estimated cost required to execute the solution."
              >
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={form.proposedBudget}
                  onChange={(event) =>
                    updateField(
                      "proposedBudget",
                      event.target.value
                    )
                  }
                  placeholder="e.g. 500000"
                  className={inputClass(errors.proposedBudget)}
                />
              </FormField>

              <FormField
                label="Proposed Timeline"
                required
                error={errors.proposedTimeline}
                hint="Estimated execution duration (e.g. 60 days, 3 months)."
              >
                <input
                  type="text"
                  value={form.proposedTimeline}
                  onChange={(event) =>
                    updateField(
                      "proposedTimeline",
                      event.target.value
                    )
                  }
                  placeholder="e.g. 60 days"
                  className={inputClass(errors.proposedTimeline)}
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        {/* ================================================= */}
        {/* SECTION 5 - TEAM                                  */}
        {/* ================================================= */}

        <FormSection
          number="05"
          icon={Users}
          title="Team Information"
          description="Provide information about the team responsible for implementation."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Team Size"
            >
              <input
                type="number"
                min="1"
                value={form.teamSize}
                onChange={(event) =>
                  updateField(
                    "teamSize",
                    event.target.value
                  )
                }
                placeholder="e.g. 8"
                className={inputClass()}
              />
            </FormField>

            <FormField
              label="Team Experience"
              hint="Relevant domain or implementation experience."
            >
              <input
                type="text"
                value={
                  form.teamExperience
                }
                onChange={(event) =>
                  updateField(
                    "teamExperience",
                    event.target.value
                  )
                }
                placeholder="e.g. 5 years in GovTech / AI"
                className={inputClass()}
              />
            </FormField>
          </div>
        </FormSection>

        {/* ================================================= */}
        {/* SECTION 6 - DOCUMENTS                             */}
        {/* ================================================= */}

        <FormSection
          number="06"
          icon={Upload}
          title="Supporting Documents"
          description="Upload documents that support your application."
        >
          <div>
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-400">
                <Upload className="h-5 w-5" />
              </div>

              <p className="mt-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                Upload supporting documents
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                PDF, DOC, DOCX or other supported
                documents
              </p>

              <span className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white">
                Choose Files
              </span>

              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map(
                  (document) => (
                    <div
                      key={document.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <FileText className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                          {document.name}
                        </p>

                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {document.size}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeDocument(
                            document.id
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        aria-label={`Remove ${document.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </FormSection>

        {/* ================================================= */}
        {/* SECTION 7 - ADDITIONAL INFO                       */}
        {/* ================================================= */}

        <FormSection
          number="07"
          icon={Info}
          title="Additional Information"
          description="Add anything else that may help evaluators understand your proposal."
        >
          <FormField label="Additional Information">
            <Textarea
              value={
                form.additionalInformation
              }
              onChange={(value) =>
                updateField(
                  "additionalInformation",
                  value
                )
              }
              placeholder="Add any additional information, assumptions, dependencies or requirements..."
            />
          </FormField>
        </FormSection>

        {/* ================================================= */}
        {/* SUBMISSION NOTICE                                */}
        {/* ================================================= */}

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

          <p className="text-[10px] leading-5 text-amber-700 dark:text-amber-400">
            Please review all information before
            submitting. Once submitted, the
            application will enter the government
            evaluation process.
          </p>
        </div>

        {/* ================================================= */}
        {/* ACTIONS                                          */}
        {/* ================================================= */}

        <section className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-[10px] text-slate-400 sm:block">
              Fields marked with * are required.
            </p>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={
                  saveState === "saving"
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 sm:flex-none"
              >
                {saveState === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saveState === "saved"
                  ? "Draft Saved"
                  : saveState === "saving"
                    ? "Saving..."
                    : "Save Draft"}
              </button>

              <button
                type="submit"
                disabled={
                  submitState === "submitting" ||
                  submitState === "submitted" ||
                  isDeadlineExpired
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none shadow-sm"
              >
                {submitState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : submitState === "submitted" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submitted
                  </>
                ) : isDeadlineExpired ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                    Deadline Closed
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </form>
    </motion.div>
  );
}

/* ===================================================== */
/* FORM SECTION                                          */
/* ===================================================== */

function FormSection({
  number,
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
              {number}
            </span>

            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
          </div>

          <p className="mt-1 text-[10px] leading-5 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

/* ===================================================== */
/* FORM FIELD                                            */
/* ===================================================== */

function FormField({
  label,
  required = false,
  hint,
  error,
  children,
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
          {label}
          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </label>

        {hint && (
          <span className="text-[9px] text-slate-400">
            {hint}
          </span>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-1.5 text-[10px] font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

/* ===================================================== */
/* TEXTAREA                                              */
/* ===================================================== */

function Textarea({
  value,
  onChange,
  placeholder,
  error,
}) {
  return (
    <textarea
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      rows={5}
      placeholder={placeholder}
      className={textareaClass(error)}
    />
  );
}

/* ===================================================== */
/* INFO PILL                                             */
/* ===================================================== */

function InfoPill({ text }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-400">
      {text}
    </span>
  );
}

/* ===================================================== */
/* INPUT CLASS                                           */
/* ===================================================== */

function inputClass(error = false) {
  return `h-11 w-full rounded-xl border bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 ${error
    ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/40"
    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-800"
    }`;
}

/* ===================================================== */
/* TEXTAREA CLASS                                        */
/* ===================================================== */

function textareaClass(error = false) {
  return `w-full resize-y rounded-xl border bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 ${error
    ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/40"
    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-800"
    }`;
}

/* ===================================================== */
/* FILE SIZE                                             */
/* ===================================================== */

function formatFileSize(bytes) {
  if (!bytes) return "0 Bytes";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
    Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(1)} ${units[index]}`;
}

function ShortlistSolutionPackage({ app, onRefresh }) {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState("PROPOSAL_DOC");
  const [docDesc, setDocDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isFinalized = Boolean(app.submitted_at || documents.some((d) => d.is_final));

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      setErrorMsg("");
      const res = await getApplicationDocuments(app.id);
      const list = res?.data?.documents || res?.data || res || [];
      setDocuments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Error loading application documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (app?.id) {
      loadDocuments();
    }
  }, [app?.id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg("");
      setSuccessMsg("");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("document_type", docType);
      if (docDesc) formData.append("description", docDesc);

      await uploadSolutionDocument(app.id, formData);
      setSuccessMsg(`Document "${selectedFile.name}" uploaded successfully.`);
      setSelectedFile(null);
      setDocDesc("");
      const fileInput = document.getElementById(`file-upload-${app.id}`);
      if (fileInput) fileInput.value = "";
      await loadDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      setErrorMsg("");
      setSuccessMsg("");
      await deleteSolutionDocument(app.id, docId);
      setSuccessMsg(`Document "${fileName}" deleted.`);
      await loadDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete document.");
    }
  };

  const handleFinalize = async () => {
    if (documents.length === 0) {
      setErrorMsg("You must upload at least one solution document before finalization.");
      return;
    }

    const confirmMsg =
      "Are you sure you want to finalize your submission? Once finalized, your solution package is locked and cannot be edited or deleted.";
    if (!window.confirm(confirmMsg)) return;

    try {
      setFinalizing(true);
      setErrorMsg("");
      setSuccessMsg("");
      await finalizeSolutionSubmission(app.id);
      setSuccessMsg("Solution package finalized successfully! Your submission is now locked for evaluation.");
      await loadDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to finalize submission.");
    } finally {
      setFinalizing(false);
    }
  };

  const deadline = app.challenge?.finalist_submission_deadline;
  const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Finalist Solution Package
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed architecture, pitch deck, and compliance artifacts for independent evaluator scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFinalized ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Lock className="h-3 w-3" /> Finalized & Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Clock3 className="h-3 w-3" /> Draft Submission
            </span>
          )}
          {deadline && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDeadlinePassed
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
            >
              Deadline:{" "}
              {new Date(deadline).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Document List */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Uploaded Package Files ({documents.length})
        </p>
        {loadingDocs ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
            No documents uploaded yet. Upload your proposal package below.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {doc.original_filename}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {doc.document_type.replace("_", " ")} • {(doc.file_size / 1024).toFixed(1)} KB
                      {doc.description ? ` — ${doc.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={() => openDocumentSecurely(`${API_BASE_URL}/documents/${doc.stored_filename}`, doc.original_filename)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Download className="h-3 w-3" /> View
                  </button>
                  {!isFinalized && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.original_filename)}
                      className="rounded-lg p-1 text-slate-400 hover:text-red-600 transition"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Control (only when not finalized) */}
      {!isFinalized && (
        <form
          onSubmit={handleUpload}
          className="mt-4 border-t border-indigo-100 dark:border-indigo-900/40 pt-4 space-y-3"
        >
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Upload Solution Document
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200"
              >
                <option value="PROPOSAL_DOC">Proposal Document</option>
                <option value="PITCH_DECK">Pitch Deck / Presentation</option>
                <option value="TECH_ARCHITECTURE">Technical Architecture</option>
                <option value="DEMO_VIDEO">Demo Video / Recording</option>
                <option value="BUDGET_BREAKDOWN">Budget Breakdown</option>
                <option value="OTHER">Other Artifact</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Description (optional)</label>
              <input
                type="text"
                value={docDesc}
                onChange={(e) => setDocDesc(e.target.value)}
                placeholder="e.g. System architecture diagrams"
                className="w-full text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Select File (PDF, PPTX, DOCX, ZIP)</label>
              <input
                id={`file-upload-${app.id}`}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={uploading || !selectedFile || isDeadlinePassed}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload File
            </button>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalizing || documents.length === 0 || isDeadlinePassed}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {finalizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Finalize Submission
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ChangeRequestResubmitPanel({ app, onRefresh }) {
  const [isOpen, setIsOpen] = useState(true);
  const [proposal, setProposal] = useState(app.proposal || "");
  const [technicalApproach, setTechnicalApproach] = useState(app.technical_approach || "");
  const [expectedImpact, setExpectedImpact] = useState(app.expected_impact || "");
  const [proposedCost, setProposedCost] = useState(app.raw_cost || "");
  const [timeline, setTimeline] = useState(app.raw_timeline || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!proposal.trim()) {
      setErrorMsg("Proposal summary is required.");
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg("");
      setSuccessMsg("");
      await updateApplication(app.id, {
        proposal: proposal.trim(),
        technical_approach: technicalApproach.trim(),
        expected_impact: expectedImpact.trim(),
        estimated_cost: proposedCost ? Number(proposedCost) : undefined,
        timeline: timeline.trim(),
        resubmit: true,
      });
      setSuccessMsg("Proposal resubmitted successfully! Evaluators will be notified to review the revisions.");
      setTimeout(() => {
        if (onRefresh) onRefresh();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "Failed to resubmit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Department Feedback — Changes Requested
            </h4>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
              {app.change_request_notes || "Please review and revise your proposal per the department's requirements."}
            </p>
            {app.change_requested_at && (
              <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                Requested on {new Date(app.change_requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition shrink-0"
        >
          {isOpen ? "Close Revision Form" : "Revise & Resubmit"}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleResubmit} className="mt-4 pt-4 border-t border-amber-200/80 dark:border-amber-900/40 space-y-3">
          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
            Note: Resubmitting will reset the evaluator review rounds for this application and update the proposal for fresh assessment.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Revised Proposal Summary *
            </label>
            <textarea
              rows={3}
              required
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Revised Technical Approach
            </label>
            <textarea
              rows={3}
              value={technicalApproach}
              onChange={(e) => setTechnicalApproach(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                value={proposedCost}
                onChange={(e) => setProposedCost(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Timeline (e.g. 6 Months)
              </label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expected Impact
              </label>
              <input
                type="text"
                value={expectedImpact}
                onChange={(e) => setExpectedImpact(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{successMsg}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {submitting ? "Resubmitting..." : "Submit Revised Proposal"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MyApplicationsListView({ user, navigate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const load = async () => {
    setLoading(true);
    try {
      const startupId = user?.startups?.[0]?.id || "my";
      const res = await getStartupApplications(startupId);
      const data = res?.data?.applications || res?.data || res || [];
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((app) => ({
          id: app.id,
          challenge_id: app.challenge_id || app.challenge?.id || "ch-1",
          challenge_title: app.challenge?.title || app.challenge_title || "Procurement Challenge",
          challenge: app.challenge,
          department: app.challenge?.department?.name || app.department || "Government Department",
          state: app.challenge?.department?.state || app.state || "National",
          proposal: app.proposal_summary || app.proposal || "Detailed technical proposal submitted.",
          technical_approach: app.technical_approach || "Modern cloud-native architecture.",
          expected_impact: app.expected_impact || "Significant public sector process improvement.",
          estimated_cost: app.proposed_budget
            ? `₹${Number(app.proposed_budget).toLocaleString("en-IN")}`
            : (app.estimated_cost ? `₹${Number(app.estimated_cost).toLocaleString("en-IN")}` : "Not specified"),
          status: app.status || "SUBMITTED",
          change_request_notes: app.change_request_notes || null,
          change_requested_at: app.change_requested_at || null,
          raw_cost: app.proposed_budget || app.estimated_cost || "",
          raw_timeline: app.timeline || "",
          created_at: app.created_at || new Date().toISOString(),
          submitted_at: app.submitted_at || null,
          stage:
            app.stage ||
            (app.status === "SELECTED"
              ? "Pilot Phase Active"
              : app.status === "SHORTLISTED"
                ? "Finalist Solution Package"
                : app.status === "CHANGES_REQUESTED"
                  ? "Action Required: Revisions Requested"
                  : app.status === "DRAFT"
                    ? "Draft In Progress"
                    : "Under Department Review"),
        }));
        setApplications(mapped);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.warn("Could not fetch applications from API:", err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        !search ||
        app.challenge_title?.toLowerCase().includes(search.toLowerCase()) ||
        app.department?.toLowerCase().includes(search.toLowerCase()) ||
        app.proposal?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "ALL" || app.status?.toUpperCase() === statusFilter.toUpperCase();
      return matchSearch && matchStatus;
    });
  }, [applications, search, statusFilter]);

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      selected: applications.filter((a) => a.status === "SELECTED").length,
      shortlisted: applications.filter((a) => a.status === "SHORTLISTED" || a.status === "UNDER_REVIEW").length,
      changes_requested: applications.filter((a) => a.status === "CHANGES_REQUESTED").length,
      submitted: applications.filter((a) => a.status === "SUBMITTED").length,
    };
  }, [applications]);

  const getStatusBadge = (status) => {
    const s = String(status).toUpperCase();
    if (s === "SELECTED" || s === "ACCEPTED" || s === "PILOT_APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" /> Selected for Pilot
        </span>
      );
    }
    if (s === "SHORTLISTED" || s === "IN_REVIEW" || s === "UNDER_REVIEW") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
          <Sparkles className="h-3.5 w-3.5" /> Shortlisted / In Review
        </span>
      );
    }
    if (s === "CHANGES_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5" /> Changes Requested
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
          <X className="h-3.5 w-3.5" /> Not Selected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20">
        <Clock3 className="h-3.5 w-3.5" /> Submitted
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Startup Applications
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              My Challenge Submissions
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-6 text-slate-500 dark:text-slate-400">
              Track your solution proposals submitted for government problem statements, review evaluator scoring status, and monitor pilot selections.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/startup/challenges")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Rocket className="h-4 w-4" /> Browse Active Challenges
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800/80 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Submitted"
            value={stats.total}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Selected for Pilot"
            value={stats.selected}
            icon={CheckCircle2}
            color="emerald"
            valueColor="text-emerald-700 dark:text-emerald-400"
          />
          <StatCard
            title="Shortlisted"
            value={stats.shortlisted}
            icon={Sparkles}
            color="violet"
            valueColor="text-violet-700 dark:text-violet-400"
          />
          <StatCard
            title="Pending Review"
            value={stats.submitted}
            icon={Clock3}
            color="amber"
            valueColor="text-amber-700 dark:text-amber-400"
          />
        </div>
      </section>

      {/* Unified Search & Filters Bar */}
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by challenge or department..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "Selected", "Shortlisted", "Submitted"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`h-9 rounded-xl px-3 text-xs font-semibold transition ${statusFilter === st
                ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-600 dark:text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
            >
              {st === "ALL" ? "All Applications" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>

      {/* Applications List */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-400">Loading your submitted proposals...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
          <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">No applications match your filter</h2>
          <p className="mt-1 text-xs text-slate-400">Explore open public sector challenges and submit your innovative solution.</p>
          <button
            type="button"
            onClick={() => navigate("/startup/challenges")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Rocket className="h-3.5 w-3.5" /> Explore Challenges
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4">
            {paginatedApps.map((app) => (
              <motion.div
                key={app.id}
                layout
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-900/50"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(app.status)}
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <Building2 className="h-3.5 w-3.5" /> {app.department} • {app.state}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-xl bg-indigo-50 text-indigo-600">
                        <CalendarDays className="h-3.5 w-3.5" />{" "}
                        {app.submitted_at
                          ? `Submitted ${new Date(app.submitted_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`
                          : "Draft In Progress"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {app.challenge_title}
                    </h3>

                    <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900/80">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                        Proposed Solution Summary:
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-500 leading-relaxed">
                        {app.proposal}
                      </p>
                      {app.technical_approach && (
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">Tech Approach:</strong> {app.technical_approach}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-600">Budget Proposed: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{app.estimated_cost}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-600">Current Stage: </span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{app.stage}</span>
                      </div>
                    </div>

                    {/* Finalist Solution Package Upload & Finalization UI */}
                    {app.status === "SHORTLISTED" && (
                      <ShortlistSolutionPackage app={app} onRefresh={load} />
                    )}

                    {/* Change Request & Resubmission UI */}
                    {app.status === "CHANGES_REQUESTED" && (
                      <ChangeRequestResubmitPanel app={app} onRefresh={load} />
                    )}
                  </div>

                  <div className="flex shrink-0 flex-row gap-2 lg:flex-col lg:items-end">
                    <button
                      onClick={() => navigate(`/startup/challenges`)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View Challenge
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizeOptions={[4, 6, 12, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemName="applications"
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

export default StartupApplication;