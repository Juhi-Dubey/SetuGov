
import { Check } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Problem",
    description: "Define the challenge",
  },
  {
    id: 2,
    title: "Outcome",
    description: "Set desired results",
  },
  {
    id: 3,
    title: "Pilot",
    description: "Plan the pilot",
  },
  {
    id: 4,
    title: "Requirements",
    description: "Define requirements",
  },
  {
    id: 5,
    title: "Review",
    description: "Review & publish",
  },
];

function ChallengeStepper({ currentStep }) {
  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex min-w-[700px] items-start">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className="flex flex-1 items-start"
            >
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                    isCompleted
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : isCurrent
                        ? "border-indigo-600 bg-white text-indigo-600 shadow-lg shadow-indigo-500/10 dark:bg-slate-950 dark:text-indigo-400"
                        : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>

                <div className="mt-3 text-center">
                  <p
                    className={`text-xs font-semibold ${
                      isCurrent || isCompleted
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </p>

                  <p className="mt-1 hidden text-[10px] text-slate-400 sm:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mt-5 h-0.5 flex-1 transition-colors ${
                    currentStep > step.id
                      ? "bg-indigo-600"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChallengeStepper;

