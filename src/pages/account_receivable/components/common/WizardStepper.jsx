import { cloneElement } from "react";
import { Check } from "lucide-react";

export default function WizardStepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center overflow-x-auto rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 sm:px-4">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isClickable = isCompleted && Boolean(onStepClick);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className={`flex items-center ${isLast ? "shrink-0" : "flex-1"}`}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step.id)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${step.id}: ${step.label}${isCompleted ? " (completed)" : ""}`}
              className={`group flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors ${
                isClickable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
              }`}
            >
              <span
                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-[#0A0082] text-white ring-4 ring-[#0A0082]/[0.12]"
                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/80"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  cloneElement(step.icon, { className: "h-3.5 w-3.5" })
                )}
              </span>

              <span className="hidden flex-col items-start text-left leading-tight sm:flex">
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    isActive ? "text-[#0A0082]" : isCompleted ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  Step {String(step.id).padStart(2, "0")}
                </span>
                <span
                  className={`text-[13px] font-semibold ${
                    isActive ? "text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {step.shortLabel || step.label}
                </span>
              </span>
            </button>

            {!isLast && (
              <div
                className={`mx-2 h-px flex-1 rounded-full transition-colors duration-300 sm:mx-3 ${
                  isCompleted ? "bg-emerald-300" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
