
import {
  CheckCircle2,
  Edit3,
  FileText,
  IndianRupee,
  MapPin,
  ShieldCheck,
  Target,
  Timer,
  Users,
} from "lucide-react";

function ChallengeReview({
  formData,
  onEditStep,
}) {
  const {
    title,
    department,
    problemDescription,
    currentProcess,
    currentBaseline,
    location,
    desiredOutcome,
    kpis = [],
    startup,
    pilotLocation,
    pilotStartDate,
    pilotEndDate,
    budget,
    milestones = [],
    requiredTechnologies = [],
    eligibilityRequirements = [],
    requiredDocuments = [],
    cybersecurityDocumentation,
    dataCompliance,
  } = formData;

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              Review Challenge
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Review all challenge information before
              saving or publishing it.
            </p>
          </div>
        </div>
      </div>

      {/* BASIC INFORMATION */}
      <ReviewSection
        title="Challenge Information"
        icon={<FileText className="h-4 w-4" />}
        step={1}
        onEdit={onEditStep}
      >
        <div className="space-y-5">

          <ReviewItem
            label="Challenge Title"
            value={title}
            large
          />

          <div className="grid gap-5 md:grid-cols-2">
            <ReviewItem
              label="Department"
              value={department}
            />

            <ReviewItem
              label="Location"
              value={location}
              icon={
                <MapPin className="h-3.5 w-3.5" />
              }
            />
          </div>

          <ReviewItem
            label="Problem Description"
            value={problemDescription}
            multiline
          />

          <ReviewItem
            label="Current Process"
            value={currentProcess}
            multiline
          />

          <ReviewItem
            label="Current Baseline"
            value={currentBaseline}
            multiline
          />
        </div>
      </ReviewSection>

      {/* OUTCOME */}
      <ReviewSection
        title="Objective & KPIs"
        icon={<Target className="h-4 w-4" />}
        step={2}
        onEdit={onEditStep}
      >
        <ReviewItem
          label="Desired Outcome"
          value={desiredOutcome}
          multiline
        />

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              KPIs
            </p>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {kpis.length} KPI
              {kpis.length !== 1 ? "s" : ""}
            </span>
          </div>

          {kpis.length === 0 ? (
            <EmptyReview text="No KPIs added." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <p className="font-semibold text-sm">
                    {kpi.name || "Unnamed KPI"}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Metric
                      label="Baseline"
                      value={
                        kpi.baseline || "—"
                      }
                    />

                    <Metric
                      label="Target"
                      value={
                        kpi.target || "—"
                      }
                    />

                    <Metric
                      label="Weight"
                      value={
                        kpi.weight
                          ? `${kpi.weight}%`
                          : "—"
                      }
                    />
                  </div>

                  {kpi.unit && (
                    <p className="mt-3 text-[11px] text-slate-400">
                      Unit: {kpi.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ReviewSection>

      {/* PILOT */}
      <ReviewSection
        title="Pilot Plan"
        icon={<Timer className="h-4 w-4" />}
        step={3}
        onEdit={onEditStep}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <ReviewItem
            label="Startup"
            value={startup}
            icon={
              <Users className="h-3.5 w-3.5" />
            }
          />

          <ReviewItem
            label="Pilot Location"
            value={pilotLocation}
            icon={
              <MapPin className="h-3.5 w-3.5" />
            }
          />

          <ReviewItem
            label="Start Date"
            value={formatDate(pilotStartDate)}
          />

          <ReviewItem
            label="End Date"
            value={formatDate(pilotEndDate)}
          />

          <ReviewItem
            label="Budget"
            value={
              budget
                ? `₹${formatNumber(budget)}`
                : "—"
            }
            icon={
              <IndianRupee className="h-3.5 w-3.5" />
            }
          />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Milestones
          </p>

          {milestones.length === 0 ? (
            <EmptyReview text="No milestones added." />
          ) : (
            <div className="space-y-3">
              {milestones.map(
                (milestone, index) => (
                  <div
                    key={milestone.id}
                    className="flex gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">
                          {milestone.name ||
                            "Unnamed milestone"}
                        </p>

                        {milestone.dueDate && (
                          <span className="text-xs text-slate-400">
                            Due{" "}
                            {formatDate(
                              milestone.dueDate
                            )}
                          </span>
                        )}
                      </div>

                      {milestone.description && (
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.paymentPercentage && (
                        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                          Payment:{" "}
                          {
                            milestone.paymentPercentage
                          }
                          %
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </ReviewSection>

      {/* REQUIREMENTS */}
      <ReviewSection
        title="Requirements & Eligibility"
        icon={
          <ShieldCheck className="h-4 w-4" />
        }
        step={4}
        onEdit={onEditStep}
      >
        {/* TECHNOLOGIES */}
        <ReviewList
          title="Required Technologies"
          items={requiredTechnologies
            .map((item) => item.name)
            .filter(Boolean)}
        />

        {/* ELIGIBILITY */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Eligibility Requirements
          </p>

          {eligibilityRequirements.length ===
          0 ? (
            <EmptyReview text="No eligibility requirements added." />
          ) : (
            <div className="space-y-3">
              {eligibilityRequirements.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {item.name ||
                            "Unnamed requirement"}
                        </p>

                        {item.description && (
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <StatusBadge
                        status={
                          item.required
                            ? "Required"
                            : "Optional"
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* DOCUMENTS */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Required Documents
          </p>

          {requiredDocuments.length === 0 ? (
            <EmptyReview text="No documents added." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {requiredDocuments.map(
                (document) => (
                  <div
                    key={document.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <p className="text-sm font-semibold">
                      {document.name ||
                        "Unnamed document"}
                    </p>

                    {document.description && (
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {document.description}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* SECURITY */}
        {(cybersecurityDocumentation ||
          dataCompliance) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {cybersecurityDocumentation && (
              <ReviewItem
                label="Cybersecurity Documentation"
                value={
                  cybersecurityDocumentation
                }
                multiline
              />
            )}

            {dataCompliance && (
              <ReviewItem
                label="Data Compliance"
                value={dataCompliance}
                multiline
              />
            )}
          </div>
        )}
      </ReviewSection>

      {/* FINAL CHECK */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Ready for final submission
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700/70 dark:text-emerald-400/70">
              Review the information carefully before
              publishing this challenge. Once connected
              to the backend, publishing will create the
              official challenge record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================= */
/* REVIEW SECTION */
/* ============================================= */

function ReviewSection({
  title,
  icon,
  step,
  onEdit,
  children,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800">

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {icon}
          </div>

          <h3 className="text-sm font-semibold">
            {title}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

/* ============================================= */
/* REVIEW ITEM */
/* ============================================= */

function ReviewItem({
  label,
  value,
  multiline = false,
  large = false,
  icon,
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </p>

      <p
        className={`whitespace-pre-wrap break-words ${
          large
            ? "text-base font-bold"
            : "text-sm font-medium"
        } ${
          multiline
            ? "leading-6 text-slate-600 dark:text-slate-300"
            : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

/* ============================================= */
/* METRIC */
/* ============================================= */

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-semibold">
        {value}
      </p>
    </div>
  );
}

/* ============================================= */
/* REVIEW LIST */
/* ============================================= */

function ReviewList({
  title,
  items,
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      {items.length === 0 ? (
        <EmptyReview
          text={`No ${title.toLowerCase()} added.`}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-800"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================= */
/* STATUS */
/* ============================================= */

function StatusBadge({ status }) {
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {status}
    </span>
  );
}

/* ============================================= */
/* EMPTY */
/* ============================================= */

function EmptyReview({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
      <p className="text-xs text-slate-400">
        {text}
      </p>
    </div>
  );
}

/* ============================================= */
/* HELPERS */
/* ============================================= */

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return new Intl.NumberFormat("en-IN").format(
    number
  );
}

export default ChallengeReview;

