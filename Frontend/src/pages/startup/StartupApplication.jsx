import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const challengeData = {
  1: {
    title: "AI-Based Citizen Grievance Management",
    department: "Department of Public Services",
    category: "Artificial Intelligence",
    deadline: "05 Sep 2026",
    budget: "₹25 Lakhs",
  },
  2: {
    title: "Smart Waste Collection System",
    department: "Urban Development Department",
    category: "Smart City",
    deadline: "12 Sep 2026",
    budget: "₹40 Lakhs",
  },
  3: {
    title: "Digital Healthcare Access Platform",
    department: "Department of Health",
    category: "Healthcare",
    deadline: "15 Sep 2026",
    budget: "₹35 Lakhs",
  },
  4: {
    title: "Agricultural Market Intelligence",
    department: "Department of Agriculture",
    category: "Agriculture",
    deadline: "20 Sep 2026",
    budget: "₹30 Lakhs",
  },
  5: {
    title: "Digital Public Transport Monitoring",
    department: "Transport Department",
    category: "Transportation",
    deadline: "28 Sep 2026",
    budget: "₹50 Lakhs",
  },
  6: {
    title: "Government Document Intelligence",
    department: "Department of Administration",
    category: "Artificial Intelligence",
    deadline: "02 Oct 2026",
    budget: "₹20 Lakhs",
  },
};

const defaultChallenge = {
  title: "AI-Based Citizen Grievance Management",
  department: "Department of Public Services",
  category: "Artificial Intelligence",
  deadline: "05 Sep 2026",
  budget: "₹25 Lakhs",
};

function StartupApplication() {
  const navigate = useNavigate();
  const { id } = useParams();

  const challenge = useMemo(
    () => challengeData[id] || defaultChallenge,
    [id]
  );

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

    /*
     * Temporary local draft.
     * Later this will call startupService.js.
     */
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

    if (!validateForm()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setSubmitState("submitting");

    /*
     * Temporary submission simulation.
     * Later this will call startupService.js.
     */
    await new Promise((resolve) =>
      setTimeout(resolve, 900)
    );

    setSubmitState("submitted");

    setSuccessMessage(
      "Application submitted successfully."
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

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
                  submitState === "submitted"
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

export default StartupApplication;