
import { Plus, Trash2, CalendarDays, Rocket } from "lucide-react";

import FormField from "../ui/FormField";

const milestoneStatuses = [
  {
    value: "not_started",
    label: "Not Started",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

function PilotForm({
  formData,
  errors,
  onChange,
  onMilestoneChange,
  onAddMilestone,
  onRemoveMilestone,
}) {
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Rocket className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Plan the Pilot
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Define the pilot scope, duration, budget and
              milestones.
            </p>
          </div>
        </div>
      </div>

      {/* PILOT DETAILS */}
      <section className="space-y-6">
        <div>
          <h3 className="font-semibold">
            Pilot Details
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Provide the basic information required to run
            the pilot.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            label="Startup"
            name="startup"
            value={formData.startup}
            onChange={onChange}
            placeholder="Startup name"
            required
            error={errors.startup}
          />

          <FormField
            label="Pilot location"
            name="pilotLocation"
            value={formData.pilotLocation}
            onChange={onChange}
            placeholder="City, department, facility..."
            required
            error={errors.pilotLocation}
          />

          <FormField
            label="Start date"
            name="pilotStartDate"
            value={formData.pilotStartDate}
            onChange={onChange}
            type="date"
            required
            error={errors.pilotStartDate}
          />

          <FormField
            label="End date"
            name="pilotEndDate"
            value={formData.pilotEndDate}
            onChange={onChange}
            type="date"
            required
            error={errors.pilotEndDate}
          />

          <FormField
            label="Budget"
            name="budget"
            value={formData.budget}
            onChange={onChange}
            placeholder="Enter pilot budget"
            type="number"
            required
            error={errors.budget}
            helperText="Enter the total pilot budget. Currency can be handled by the backend."
          />
        </div>

        {/* DATE INFORMATION */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            The pilot start and end dates define the planned
            pilot duration. Actual execution dates can be
            updated later from the pilot management workflow.
          </p>
        </div>
      </section>

      {/* MILESTONES */}
      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">
              Milestones
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Break the pilot into measurable delivery
              milestones.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddMilestone}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Milestone
          </button>
        </div>

        {errors.milestones && (
          <p className="mt-4 text-xs text-red-500">
            {errors.milestones}
          </p>
        )}

        {formData.milestones.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <p className="text-sm font-medium">
              No milestones added
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Add milestones to track pilot delivery and
              payments.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {formData.milestones.map(
              (milestone, index) => (
                <div
                  key={milestone.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  {/* MILESTONE HEADER */}
                  <div className="mb-5 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Milestone {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveMilestone(
                          milestone.id
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      aria-label={`Remove milestone ${
                        index + 1
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      label="Milestone name"
                      name="name"
                      value={milestone.name}
                      onChange={(event) =>
                        onMilestoneChange(
                          milestone.id,
                          "name",
                          event.target.value
                        )
                      }
                      placeholder="Initial deployment"
                      required
                    />

                    <FormField
                      label="Due date"
                      name="dueDate"
                      value={milestone.dueDate}
                      onChange={(event) =>
                        onMilestoneChange(
                          milestone.id,
                          "dueDate",
                          event.target.value
                        )
                      }
                      type="date"
                      required
                    />

                    <div className="md:col-span-2">
                      <FormField
                        label="Description"
                        name="description"
                        value={milestone.description}
                        onChange={(event) =>
                          onMilestoneChange(
                            milestone.id,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="Describe what must be delivered or achieved..."
                        type="textarea"
                        rows={4}
                        required
                      />
                    </div>

                    <FormField
                      label="Payment percentage"
                      name="paymentPercentage"
                      value={
                        milestone.paymentPercentage
                      }
                      onChange={(event) =>
                        onMilestoneChange(
                          milestone.id,
                          "paymentPercentage",
                          event.target.value
                        )
                      }
                      placeholder="25"
                      type="number"
                      required
                      helperText="Percentage of the pilot budget."
                    />

                    <div className="space-y-2">
                      <label
                        htmlFor={`milestone-status-${milestone.id}`}
                        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Status
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <select
                        id={`milestone-status-${milestone.id}`}
                        value={
                          milestone.status ||
                          "not_started"
                        }
                        onChange={(event) =>
                          onMilestoneChange(
                            milestone.id,
                            "status",
                            event.target.value
                          )
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        {milestoneStatuses.map(
                          (status) => (
                            <option
                              key={status.value}
                              value={status.value}
                            >
                              {status.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default PilotForm;

