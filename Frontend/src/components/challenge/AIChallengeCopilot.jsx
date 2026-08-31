
import { useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Loader2,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";

function AIChallengeCopilot({
  formData,
  onApplySuggestions,
}) {
  const [selectedSuggestions, setSelectedSuggestions] =
    useState([]);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  /*
   * This is intentionally isolated from the UI.
   *
   * Later, this function can be replaced with:
   *
   * const response = await generateChallengeSuggestions(formData);
   *
   * No UI changes will be required.
   */
  const suggestions = useMemo(() => {
    const outcome =
      formData?.desiredOutcome?.trim();

    const baseline =
      formData?.currentBaseline?.trim();

    const location =
      formData?.location?.trim();

    return {
      objective:
        outcome ||
        "Define a measurable outcome for this challenge.",

      kpis: [
        {
          id: "ai-kpi-1",
          name: "Primary Outcome",
          unit: "",
          baseline: baseline || "",
          target: "",
          weight: "50",
        },
        {
          id: "ai-kpi-2",
          name: "Operational Efficiency",
          unit: "",
          baseline: "",
          target: "",
          weight: "30",
        },
        {
          id: "ai-kpi-3",
          name: "User Satisfaction",
          unit: "%",
          baseline: "",
          target: "",
          weight: "20",
        },
      ],

      pilotDuration: "",

      context: location
        ? `Recommendation generated for ${location}.`
        : "Recommendation generated from the challenge context.",
    };
  }, [
    formData?.desiredOutcome,
    formData?.currentBaseline,
    formData?.location,
  ]);

  /* ============================================ */
  /* GENERATE */
  /* ============================================ */

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      /*
       * Future API integration:
       *
       * const response =
       *   await generateAIChallengeSuggestions(formData);
       *
       * setSuggestions(response);
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );
    } catch (error) {
      console.error(
        "AI suggestion generation failed:",
        error
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /* ============================================ */
  /* SELECT */
  /* ============================================ */

  const toggleSelection = (id) => {
    setSelectedSuggestions((previous) =>
      previous.includes(id)
        ? previous.filter(
            (item) => item !== id
          )
        : [...previous, id]
    );
  };

  const selectAll = () => {
    setSelectedSuggestions([
      "objective",
      ...suggestions.kpis.map(
        (kpi) => kpi.id
      ),
      "pilotDuration",
    ]);
  };

  const clearSelection = () => {
    setSelectedSuggestions([]);
  };

  /* ============================================ */
  /* APPLY */
  /* ============================================ */

  const handleApply = (applyAll = false) => {
    const selected =
      applyAll
        ? [
            "objective",
            ...suggestions.kpis.map(
              (kpi) => kpi.id
            ),
            "pilotDuration",
          ]
        : selectedSuggestions;

    if (selected.length === 0) return;

    const selectedKPIs =
      suggestions.kpis.filter((kpi) =>
        selected.includes(kpi.id)
      );

    onApplySuggestions({
      objective: selected.includes(
        "objective"
      )
        ? suggestions.objective
        : undefined,

      kpis: selectedKPIs,

      pilotDuration: selected.includes(
        "pilotDuration"
      )
        ? suggestions.pilotDuration
        : undefined,
    });

    setSelectedSuggestions([]);
  };

  const hasSelection =
    selectedSuggestions.length > 0;

  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-500/20 dark:bg-slate-900">

      {/* HEADER */}
      <div className="border-b border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-500/10 dark:bg-indigo-500/5">
        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                AI Challenge Copilot
              </h2>

              <span className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-indigo-600 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400">
                AI
              </span>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Get AI-generated recommendations for
              measurable challenge outcomes.
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-5">

        {/* AI UX RULE */}
        <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-500/10 dark:bg-indigo-500/5">
          <div className="flex gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />

            <div>
              <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                AI Suggestion
              </p>

              <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                This is an AI-generated recommendation.
                Review before applying.
              </p>
            </div>
          </div>
        </div>

        {/* GENERATE BUTTON */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Suggestions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Suggestions
            </>
          )}
        </button>

        {/* SUGGESTIONS */}
        <div className="mt-5 space-y-4">

          {/* OBJECTIVE */}
          <SuggestionCard
            id="objective"
            selected={selectedSuggestions.includes(
              "objective"
            )}
            onSelect={() =>
              toggleSelection("objective")
            }
            icon={
              <Target className="h-4 w-4" />
            }
            title="Suggested Objective"
          >
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
              {suggestions.objective}
            </p>
          </SuggestionCard>

          {/* KPI */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />

                <p className="text-xs font-semibold">
                  Suggested KPIs
                </p>
              </div>

              <button
                type="button"
                onClick={
                  isEditing
                    ? () =>
                        setIsEditing(false)
                    : () =>
                        setIsEditing(true)
                }
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <Edit3 className="h-3 w-3" />

                {isEditing
                  ? "Done"
                  : "Edit"}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {suggestions.kpis.map(
                (kpi) => (
                  <div
                    key={kpi.id}
                    className={`rounded-lg border p-3 transition-all ${
                      selectedSuggestions.includes(
                        kpi.id
                      )
                        ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          toggleSelection(
                            kpi.id
                          )
                        }
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                          selectedSuggestions.includes(
                            kpi.id
                          )
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                        aria-label={`Select ${kpi.name}`}
                      >
                        {selectedSuggestions.includes(
                          kpi.id
                        ) && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            defaultValue={kpi.name}
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                          />
                        ) : (
                          <p className="text-xs font-semibold">
                            {kpi.name}
                          </p>
                        )}

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <MiniValue
                            label="Baseline"
                            value={
                              kpi.baseline ||
                              "AI will determine"
                            }
                          />

                          <MiniValue
                            label="Target"
                            value={
                              kpi.target ||
                              "AI will determine"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* PILOT DURATION */}
          <SuggestionCard
            id="pilotDuration"
            selected={selectedSuggestions.includes(
              "pilotDuration"
            )}
            onSelect={() =>
              toggleSelection(
                "pilotDuration"
              )
            }
            icon={
              <Timer className="h-4 w-4" />
            }
            title="Suggested Pilot Duration"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {suggestions.pilotDuration
                ? `${suggestions.pilotDuration} days`
                : "AI will recommend an appropriate duration"}
            </p>
          </SuggestionCard>
        </div>

        {/* ACTIONS */}
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Select All
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                handleApply(false)
              }
              disabled={!hasSelection}
              className="h-10 rounded-xl border border-indigo-200 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              Apply Selected
            </button>

            <button
              type="button"
              onClick={() =>
                handleApply(true)
              }
              className="h-10 rounded-xl bg-indigo-600 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Apply All
            </button>
          </div>
        </div>

        {/* CONTEXT */}
        <p className="mt-4 text-center text-[9px] leading-4 text-slate-400">
          {suggestions.context}
        </p>
      </div>
    </aside>
  );
}

/* ============================================= */
/* SUGGESTION CARD */
/* ============================================= */

function SuggestionCard({
  id,
  selected,
  onSelect,
  icon,
  title,
  children,
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        selected
          ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start gap-3">

        <button
          type="button"
          onClick={onSelect}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
            selected
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-300 dark:border-slate-700"
          }`}
          aria-label={`Select ${title}`}
        >
          {selected && (
            <Check className="h-3 w-3" />
          )}
        </button>

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">
            <span className="text-indigo-500">
              {icon}
            </span>

            <p className="text-xs font-semibold">
              {title}
            </p>
          </div>

          <div className="mt-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================= */
/* MINI VALUE */
/* ============================================= */

function MiniValue({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-medium">
        {value}
      </p>
    </div>
  );
}

export default AIChallengeCopilot;

