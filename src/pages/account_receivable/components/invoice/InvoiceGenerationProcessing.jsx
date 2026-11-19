import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

/**
 * InvoiceGenerationProcessing
 *
 * Full-page processing state displayed exclusively while the backend invoice
 * generation API call (POST /api/v1/billing-snapshots/{snapshotId}/invoice) is
 * in progress. The four visual steps are frontend presentation only — they do
 * NOT map to individual backend endpoints or individual network requests.
 * The actual backend operation is a single POST. The step animation is purely
 * presentational to communicate progress to the user.
 */
export default function InvoiceGenerationProcessing({
  projectName,
  clientName,
  stepIntervalMs = 350,
  isCompleted = false,
}) {
  // Drives the visual progression of the processing steps:
  // Step 0: "Validating tax details" — already verified on draft preview load (marked done)
  // Step 1: "Creating invoice" — active immediately
  // Step 2: "Assigning invoice number" — active after stepIntervalMs
  // Step 3: "Finalizing document" — active after 2 * stepIntervalMs, stays active until API completes
  // Step 4: All steps completed (when isCompleted is true)
  const [activeStepIndex, setActiveStepIndex] = useState(1);

  useEffect(() => {
    if (isCompleted) {
      setActiveStepIndex(4);
      return;
    }
    if (activeStepIndex < 3) {
      const timer = setTimeout(() => {
        setActiveStepIndex((s) => s + 1);
      }, stepIntervalMs);
      return () => clearTimeout(timer);
    }
  }, [activeStepIndex, stepIntervalMs, isCompleted]);

  const steps = [
    { id: "tax", label: "Validating tax details" },
    { id: "create", label: "Creating invoice" },
    { id: "number", label: "Assigning invoice number" },
    { id: "finalize", label: "Finalizing document" },
  ];

  return (
    <div
      className="mx-auto w-full max-w-5xl"
      role="status"
      aria-label="Invoice generation in progress"
      aria-live="polite"
    >
      {/* Processing Card */}
      <div className="flex flex-col items-center justify-center gap-7 rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/70 via-white to-white px-8 py-14 shadow-md text-center">
        {/* Pulsing Spinner Icon */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-indigo-100/70 animate-ping"
            style={{ animationDuration: "2s" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 shadow-inner">
            <Loader2 className="h-8 w-8 animate-spin text-[#0A0082]" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Generating Your Invoice
          </h2>
          {(projectName || clientName) && (
            <p className="text-sm font-medium text-slate-500">
              {projectName && <span className="font-semibold text-slate-700">{projectName}</span>}
              {projectName && clientName && (
                <span className="mx-1.5 text-slate-300">·</span>
              )}
              {clientName && <span>{clientName}</span>}
            </p>
          )}
          <p className="text-sm text-slate-600 font-medium">
            Creating your official invoice
          </p>
        </div>

        {/* Processing Steps Container */}
        <div className="w-full max-w-xs space-y-2.5 text-left">
          {steps.map((step, idx) => {
            const isDone = activeStepIndex > idx;
            const isActive = activeStepIndex === idx;
            const isPending = activeStepIndex < idx;

            return (
              <div
                key={step.id || step.label}
                aria-label={`${step.label}: ${isDone ? "completed" : isActive ? "in progress" : "pending"}`}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-50/90 border border-emerald-100"
                    : isActive
                    ? "bg-indigo-50/90 border border-indigo-200/70 shadow-xs"
                    : "opacity-45"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0A0082]" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                )}
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-emerald-900 font-medium"
                      : isActive
                      ? "text-indigo-950 font-semibold"
                      : "text-slate-500 font-normal"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer Notice */}
        <p className="max-w-xs text-xs text-slate-500 leading-relaxed">
          Please wait while we create your official invoice.
        </p>

        {/* Horizontal progress bar */}
        <div className="w-full max-w-xs overflow-hidden rounded-full bg-indigo-100/70 h-1.5">
          <div
            className="h-1.5 rounded-full bg-[#0A0082] transition-all duration-500"
            style={{ width: `${Math.round(((activeStepIndex + 1) / 4) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
