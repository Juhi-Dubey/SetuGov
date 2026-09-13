
import { Plus, Trash2, FileCheck2, ShieldCheck } from "lucide-react";

function RequirementsForm({
  formData,
  errors,
  onAddTechnology,
  onRemoveTechnology,
  onTechnologyChange,
  onAddEligibility,
  onRemoveEligibility,
  onEligibilityChange,
  onAddDocument,
  onRemoveDocument,
  onDocumentChange,
  onChange,
}) {
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Define Requirements
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Define the technical, eligibility, documentation,
              security and compliance requirements for this challenge.
            </p>
          </div>
        </div>
      </div>

      {/* REQUIRED TECHNOLOGIES */}
      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <SectionHeader
          title="Required Technologies"
          description="Specify the technologies or technical capabilities required for the solution."
          buttonLabel="Add Technology"
          onClick={onAddTechnology}
        />

        {formData.requiredTechnologies.length === 0 ? (
          <EmptyBox
            title="No technologies added"
            description="Add the technologies or capabilities required for this challenge."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {formData.requiredTechnologies.map(
              (technology, index) => (
                <div
                  key={technology.id}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={technology.name}
                    onChange={(event) =>
                      onTechnologyChange(
                        technology.id,
                        event.target.value
                      )
                    }
                    placeholder={`Technology ${index + 1}`}
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      onRemoveTechnology(
                        technology.id
                      )
                    }
                    className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    aria-label={`Remove technology ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {errors.requiredTechnologies && (
          <p className="mt-3 text-xs text-red-500">
            {errors.requiredTechnologies}
          </p>
        )}
      </section>

      {/* ELIGIBILITY */}
      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <SectionHeader
          title="Eligibility Requirements"
          description="Define conditions that startups must satisfy to participate."
          buttonLabel="Add Requirement"
          onClick={onAddEligibility}
        />

        {formData.eligibilityRequirements.length === 0 ? (
          <EmptyBox
            title="No eligibility requirements"
            description="Add eligibility conditions for participating startups."
          />
        ) : (
          <div className="mt-5 space-y-4">
            {formData.eligibilityRequirements.map(
              (requirement, index) => (
                <div
                  key={requirement.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Requirement {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveEligibility(
                          requirement.id
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Requirement"
                      value={requirement.name}
                      placeholder="Startup recognition"
                      onChange={(event) =>
                        onEligibilityChange(
                          requirement.id,
                          "name",
                          event.target.value
                        )
                      }
                    />

                    <SelectField
                      label="Required"
                      value={
                        requirement.required
                          ? "required"
                          : "optional"
                      }
                      onChange={(event) =>
                        onEligibilityChange(
                          requirement.id,
                          "required",
                          event.target.value ===
                            "required"
                        )
                      }
                    />

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Description"
                        value={
                          requirement.description
                        }
                        placeholder="Describe the eligibility requirement..."
                        onChange={(event) =>
                          onEligibilityChange(
                            requirement.id,
                            "description",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* DOCUMENTS */}
      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <SectionHeader
          title="Required Documents"
          description="Specify the documents startups need to provide."
          buttonLabel="Add Document"
          onClick={onAddDocument}
        />

        {formData.requiredDocuments.length === 0 ? (
          <EmptyBox
            title="No documents added"
            description="Add documents required during the application or verification process."
          />
        ) : (
          <div className="mt-5 space-y-4">
            {formData.requiredDocuments.map(
              (document, index) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Document {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveDocument(
                          document.id
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Document name"
                      value={document.name}
                      placeholder="Company registration certificate"
                      onChange={(event) =>
                        onDocumentChange(
                          document.id,
                          "name",
                          event.target.value
                        )
                      }
                    />

                    <SelectField
                      label="Verification"
                      value={
                        document.verificationStatus ||
                        "pending"
                      }
                      onChange={(event) =>
                        onDocumentChange(
                          document.id,
                          "verificationStatus",
                          event.target.value
                        )
                      }
                      options={[
                        {
                          value: "pending",
                          label: "Pending Verification",
                        },
                        {
                          value: "required",
                          label: "Required",
                        },
                      ]}
                    />

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Description"
                        value={
                          document.description
                        }
                        placeholder="Describe what this document should establish..."
                        onChange={(event) =>
                          onDocumentChange(
                            document.id,
                            "description",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* SECURITY & COMPLIANCE */}
      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold">
              Security & Data Compliance
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Define security and data handling expectations for
              participating startups.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <TextAreaField
            label="Cybersecurity Documentation"
            value={
              formData.cybersecurityDocumentation
            }
            name="cybersecurityDocumentation"
            placeholder="Specify required cybersecurity certifications, controls or documentation..."
            onChange={onChange}
          />

          <TextAreaField
            label="Data Compliance"
            value={formData.dataCompliance}
            name="dataCompliance"
            placeholder="Specify data protection, privacy, retention or compliance requirements..."
            onChange={onChange}
          />
        </div>
      </section>

      {/* INFORMATION NOTE */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          Requirements are used during eligibility review
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Each requirement can later be evaluated with evidence,
          reviewer information and verification status.
        </p>
      </div>
    </div>
  );
}

/* ============================================= */
/* REUSABLE SECTION HEADER */
/* ============================================= */

function SectionHeader({
  title,
  description,
  buttonLabel,
  onClick,
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </button>
    </div>
  );
}

/* ============================================= */
/* EMPTY BOX */
/* ============================================= */

function EmptyBox({
  title,
  description,
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
      <p className="text-sm font-medium">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ============================================= */
/* INPUT */
/* ============================================= */

function InputField({
  label,
  value,
  placeholder,
  onChange,
  name,
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <input
        type="text"
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
}

/* ============================================= */
/* SELECT */
/* ============================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  const defaultOptions = options || [
    {
      value: "required",
      label: "Required",
    },
    {
      value: "optional",
      label: "Optional",
    },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <select
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      >
        {defaultOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================= */
/* TEXTAREA */
/* ============================================= */

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
  name,
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
}

export default RequirementsForm;

