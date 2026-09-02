
import { Plus, Trash2 } from "lucide-react";

import FormField from "../ui/FormField";

function OutcomeForm({
  formData,
  errors,
  onChange,
  onKPIChange,
  onAddKPI,
  onRemoveKPI,
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">
          Define the Outcome
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          Define what successful completion of this challenge
          should achieve and how success will be measured.
        </p>
      </div>

      <FormField
        label="Desired outcome"
        name="desiredOutcome"
        value={formData.desiredOutcome}
        onChange={onChange}
        placeholder="Example: Reduce average patient waiting time by 30%"
        type="textarea"
        rows={5}
        required
        error={errors.desiredOutcome}
        helperText="Describe the measurable result you want to achieve."
      />

      {/* KPI Section */}
      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">
              Key Performance Indicators
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Add measurable indicators to evaluate pilot success.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddKPI}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add KPI
          </button>
        </div>

        {formData.kpis.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <p className="text-sm font-medium">
              No KPIs added
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Add at least one KPI to measure the expected outcome.
            </p>

            {errors.kpis && (
              <p className="mt-2 text-xs text-red-500">
                {errors.kpis}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {formData.kpis.map((kpi, index) => (
              <div
                key={kpi.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    KPI {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => onRemoveKPI(kpi.id)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    aria-label={`Remove KPI ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="KPI name"
                    name="name"
                    value={kpi.name}
                    onChange={(event) =>
                      onKPIChange(
                        kpi.id,
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Waiting Time"
                    required
                  />

                  <FormField
                    label="Unit"
                    name="unit"
                    value={kpi.unit}
                    onChange={(event) =>
                      onKPIChange(
                        kpi.id,
                        "unit",
                        event.target.value
                      )
                    }
                    placeholder="minutes, %, users/day..."
                    required
                  />

                  <FormField
                    label="Baseline"
                    name="baseline"
                    value={kpi.baseline}
                    onChange={(event) =>
                      onKPIChange(
                        kpi.id,
                        "baseline",
                        event.target.value
                      )
                    }
                    placeholder="90"
                    required
                  />

                  <FormField
                    label="Target"
                    name="target"
                    value={kpi.target}
                    onChange={(event) =>
                      onKPIChange(
                        kpi.id,
                        "target",
                        event.target.value
                      )
                    }
                    placeholder="60"
                    required
                  />

                  <FormField
                    label="Weight"
                    name="weight"
                    value={kpi.weight}
                    onChange={(event) =>
                      onKPIChange(
                        kpi.id,
                        "weight",
                        event.target.value
                      )
                    }
                    placeholder="25"
                    type="number"
                    required
                    helperText="Weight as a percentage."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default OutcomeForm;

