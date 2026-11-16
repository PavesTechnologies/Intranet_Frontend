import { Check } from "lucide-react";

export const INTAKE_STEPS = [
  { key: "intake", label: "Vendor Intake" },
  { key: "pre-screen", label: "Pre-Screen" },
];

/**
 * Two-step progress indicator for the Vendor Intake -> Pre-Screen flow. Styled after
 * ProcurementWorkflowStepper so both AP flows read the same; kept separate because that one
 * derives its position from a PR status code and this one is told its step directly.
 * @param {{ currentStep: number }} props 0 = Vendor Intake, 1 = Pre-Screen
 */
export default function VendorIntakeStepper({ currentStep = 0 }) {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-6">
      <ol className="flex items-center">
        {INTAKE_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === INTAKE_STEPS.length - 1;

          const circleClasses = isCompleted
            ? "border-[#0A0082] bg-[#0A0082] text-white"
            : isCurrent
              ? "border-[#0A0082] bg-white text-[#0A0082]"
              : "border-gray-300 bg-white text-gray-400";

          return (
            <li key={step.key} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${circleClasses}`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={`text-xs sm:text-sm ${
                    isCompleted || isCurrent ? "font-semibold text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mx-3 h-0.5 flex-1 sm:mx-4 ${isCompleted ? "bg-[#0A0082]" : "bg-gray-200"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
