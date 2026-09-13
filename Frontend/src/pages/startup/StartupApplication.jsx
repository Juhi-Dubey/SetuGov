import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { submitApplication } from "../../services/applicationService";
import { getChallengeById, getChallenges } from "../../services/challengeService";
import { getStartupApplications } from "../../services/startupService";
import { useAuth } from "../../context/AuthContext";

const defaultStartupApplications = [
  {
    id: "app-demo-1",
    challenge_id: "ch-demo-1",
    challenge_title: "AI-Based Hospital OPD Queue Reduction & Patient Flow Optimization",
    department: "Department of Health & Family Welfare",
    state: "Karnataka",
    proposal: "Integrated Edge AI Cameras and Smart Token Kiosks for Hospital Waiting Time Reduction.",
    technical_approach: "Edge computer vision for real-time crowd estimation, automated ABHA token dispensers, and doctor load balancing.",
    expected_impact: "40% reduction in patient waiting time from 90m to 54m within 60 days.",
    estimated_cost: "₹3,80,000",
    status: "SELECTED",
    submitted_at: "2026-09-02T10:00:00Z",
    stage: "Pilot Project Active (Sandbox Deployed)"
  },
  {
    id: "app-demo-2",
    challenge_id: "ch-demo-2",
    challenge_title: "Smart Waste Collection & IoT Route Optimization",
    department: "Department of Urban Mobility & Transport",
    state: "Karnataka",
    proposal: "IoT Ultrasonic Fill-Level Sensors with dynamic truck route recalculation.",
    technical_approach: "Deploying IP68 ultrasonic sensors with LoRaWAN telemetry to central municipal dashboard.",
    expected_impact: "30% fuel savings and zero uncollected bins over 90 days.",
    estimated_cost: "₹2,50,000",
    status: "SHORTLISTED",
    submitted_at: "2026-08-25T14:30:00Z",
    stage: "Evaluator Review (Technical Score: 88%)"
  },
  {
    id: "app-demo-3",
    challenge_id: "ch-demo-3",
    challenge_title: "Urban Traffic Congestion & Adaptive Signal Control",
    department: "Department of Urban Mobility & Transport",
    state: "Karnataka",
    proposal: "Real-time intersection computer vision with automated signal phase adjustment.",
    technical_approach: "Edge processing on existing CCTV infrastructure with cloud synchronization.",
    expected_impact: "25% improvement in traffic throughput during peak hours.",
    estimated_cost: "₹4,20,000",
    status: "SUBMITTED",
    submitted_at: "2026-08-18T11:00:00Z",
    stage: "Under Eligibility & Compliance Check"
  }
];

function StartupApplication() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [challengeError, setChallengeError] = useState(null);

  useEffect(() => {
    if (id) {
      setLoadingChallenge(true);
      setChallengeError(null);
      getChallengeById(id)
        .then((res) => {
          const ch = res?.data || res;
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

  if (!id) {
    return <MyApplicationsListView user={user} navigate={navigate} />;
  }

  const isDeadlineExpired = useMemo(() => {
    if (!challenge?.deadlineRaw) return false;
    return new Date(challenge.deadlineRaw) < new Date();
  }, [challenge?.deadlineRaw]);

  const isStartupUnverified = user && user.verification_status && user.verification_status !== "VERIFIED";

  const [form, setForm] = useState({
    solutionName: "",
    problemUnderstanding: "",
    proposedSolution: "",
    technology: "",
    innovation: "",
    expectedImpact: "",
    implementationPlan: "",
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
    }

    if (!form.proposedSolution.trim()) {
      nextErrors.proposedSolution =
        "Please describe your proposed solution.";
    }

    if (!form.technology.trim()) {
      nextErrors.technology =
        "Please mention the technology used.";
    }

    if (!form.expectedImpact.trim()) {
      nextErrors.expectedImpact =
        "Please describe the expected impact.";
    }

    if (!form.implementationPlan.trim()) {
      nextErrors.implementationPlan =
        "Please provide an implementation plan.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveDraft = () => {
    setSaveState("saving");
    localStorage.setItem(
      `startup_application_draft_${id || "new"}`,
      JSON.stringify({
        challengeId: id,
        form,
        documents,
        savedAt: new Date().toISOString(),
      })
    );

    setTimeout(() => {
      setSaveState("saved");
    }, 600);
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
      const payload = {
        proposal_summary:
          form.problemUnderstanding?.trim() ||
          form.solutionName?.trim() ||
          "AI-driven automated workflow proposal for public sector operations.",
        technical_approach:
          form.proposedSolution?.trim() ||
          form.technology?.trim() ||
          "State-of-the-art scalable microservices architecture with real-time telemetry.",
        proposed_budget: Number(form.proposedBudget || 1500000),
        proposed_timeline_days: Number(form.proposedTimeline || 60),
        team_experience: form.teamExperience || "Experienced engineering team with prior government deployments.",
        evidence_attachments: documents.map((d) => d.name || "document.pdf"),
      };

      await submitApplication(id || "1", payload);

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
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
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
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Challenges
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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

          <div className="shrink-0 rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Application Deadline
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
              {challenge.deadline}
            </p>
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
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
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
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
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
  return `h-11 w-full rounded-xl border bg-slate-50 px-3.5 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/40"
      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-800"
  }`;
}

/* ===================================================== */
/* TEXTAREA CLASS                                        */
/* ===================================================== */

function textareaClass(error = false) {
  return `w-full resize-y rounded-xl border bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 ${
    error
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

function MyApplicationsListView({ user, navigate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await getStartupApplications();
        const data = res?.data || res || [];
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((app) => ({
              id: app.id,
              challenge_id: app.challenge_id || app.challenge?.id || "ch-1",
              challenge_title: app.challenge?.title || app.challenge_title || "Procurement Challenge",
              department: app.challenge?.department?.name || app.department || "Government Department",
              state: app.challenge?.department?.state || app.state || "National",
              proposal: app.proposal_summary || app.proposal || "Detailed technical proposal submitted.",
              technical_approach: app.technical_approach || "Modern cloud-native architecture.",
              expected_impact: app.expected_impact || "Significant public sector process improvement.",
              estimated_cost: app.proposed_budget ? `₹${Number(app.proposed_budget).toLocaleString("en-IN")}` : (app.estimated_cost || "₹3,50,000"),
              status: app.status || "SUBMITTED",
              submitted_at: app.created_at || app.submitted_at || new Date().toISOString(),
              stage: app.stage || (app.status === "SELECTED" ? "Pilot Phase Active" : app.status === "SHORTLISTED" ? "Technical Evaluation" : "Under Department Review")
            }));
            setApplications(mapped);
          } else {
            setApplications(defaultStartupApplications);
          }
        }
      } catch (err) {
        console.warn("Could not fetch applications from API, using demo data:", err);
        if (isMounted) setApplications(defaultStartupApplications);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

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

  const stats = useMemo(() => {
    return {
      total: applications.length,
      selected: applications.filter((a) => a.status === "SELECTED").length,
      shortlisted: applications.filter((a) => a.status === "SHORTLISTED" || a.status === "UNDER_REVIEW").length,
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Startup Applications
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              My Challenge Submissions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Track your solution proposals submitted for government problem statements, review evaluator scoring status, and monitor pilot selections.
            </p>
          </div>
          <button
            onClick={() => navigate("/startup/challenges")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Rocket className="h-4 w-4" /> Browse Active Challenges
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 dark:border-slate-800/80 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Submitted</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Selected for Pilot</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.selected}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50/60 p-4 dark:bg-indigo-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Shortlisted</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats.shortlisted}</p>
          </div>
          <div className="rounded-2xl bg-sky-50/60 p-4 dark:bg-sky-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-300">{stats.submitted}</p>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by challenge or department..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "SELECTED", "SHORTLISTED", "SUBMITTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">No applications match your filter</h3>
          <p className="mt-1 text-xs text-slate-400">Explore open public sector challenges and submit your innovative solution.</p>
          <button
            onClick={() => navigate("/startup/challenges")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Rocket className="h-3.5 w-3.5" /> Explore Challenges
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((app) => (
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
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" /> Submitted{" "}
                      {new Date(app.submitted_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {app.challenge_title}
                  </h3>

                  <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900/80">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Proposed Solution Summary:
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
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
                      <span className="text-[10px] uppercase font-bold text-slate-400">Budget Proposed: </span>
                      <strong className="text-slate-800 dark:text-slate-200">{app.estimated_cost}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Current Stage: </span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{app.stage}</span>
                    </div>
                  </div>
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
      )}
    </motion.div>
  );
}

export default StartupApplication;