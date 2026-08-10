import { Check } from "lucide-react";

export default function WizardStepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === steps.length - 1;
        const isClickable = isCompleted && Boolean(onStepClick);

        return (
          <div key={step.id} className={`flex items-center ${isLast ? "" : "flex-1"} min-w-[84px]`}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step.id)}
              className={`flex flex-col items-center focus:outline-none ${
                isClickable ? "cursor-pointer" : "cursor-default"
              }`}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${step.id}: ${step.label}${isCompleted ? " (completed)" : ""}`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isActive
                    ? "border-[#0A0082] bg-[#0A0082] text-white"
                    : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span
                className={`mt-2 w-24 text-center text-xs font-medium ${
                  isActive ? "text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </button>

            {!isLast && (
              <div
                className={`mx-2 mt-5 h-0.5 flex-1 ${
                  isCompleted ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
