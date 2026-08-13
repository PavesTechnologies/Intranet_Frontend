import React from "react";

/**
 * Vertical numbered step with a connecting line — the shared "visual
 * builder" primitive behind the Rule Builder and the Assignment mapping
 * flow, so neither has to re-derive the same stepper chrome.
 */
export function Step({ number, title, description, children, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A0082] text-sm font-bold text-white">
          {number}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
      </div>
      <div className="flex-1 pb-6">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export default function StepFlow({ steps }) {
  return (
    <div>
      {steps.map((step, index) => (
        <Step
          key={step.title}
          number={index + 1}
          title={step.title}
          description={step.description}
          isLast={step.isLast || index === steps.length - 1}
        >
          {step.content}
        </Step>
      ))}
    </div>
  );
}
