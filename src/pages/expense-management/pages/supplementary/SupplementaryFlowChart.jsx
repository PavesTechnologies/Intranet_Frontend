import React from "react";
import { ArrowRight, Ban, CheckCircle2, CircleDashed, FileEdit, Landmark, MessageSquareWarning, ShieldCheck, Undo2, XCircle } from "lucide-react";

/** The steps a supplementary claim goes through, in order. Each step says who acts on it. */
export const FLOW_STEPS = [
  { key: "draft", label: "Draft", who: "You add the expenses and receipts", icon: FileEdit },
  { key: "manager", label: "Manager approval", who: "Your reporting manager", icon: ShieldCheck },
  { key: "finance", label: "Finance approval", who: "Finance", icon: CheckCircle2 },
  { key: "payment", label: "AP payment", who: "Accounts Payable pays you", icon: Landmark },
  { key: "settled", label: "Settled", who: "Paid", icon: CheckCircle2 },
];

const STATUS_POSITION = {
  DRAFT: { current: 0 },
  CLARIFICATION_REQUIRED: { current: 0, clarification: true },
  PENDING_MANAGER: { current: 1 },
  PENDING_FINANCE: { current: 2 },
  APPROVED: { current: 3 },
  PAYMENT_PENDING: { current: 3 },
  SETTLED: { current: 4 },
  MANAGER_REJECTED: { current: 1, rejected: true },
  FINANCE_REJECTED: { current: 2, rejected: true },
  CANCELLED: { current: -1, cancelled: true },
};

/**
 * Where a claim stands in the flow. Pure, so the mapping can be tested. A clarification shows on the first step
 * because the claim status alone does not say which stage asked for it.
 */
export function flowStateFor(status) {
  const position = STATUS_POSITION[status] || { current: 0 };
  return {
    current: position.current,
    rejected: Boolean(position.rejected),
    clarification: Boolean(position.clarification),
    cancelled: Boolean(position.cancelled),
  };
}

/** Each step's visual state: done, current, rejected, upcoming, or cancelled. */
export function stepStates(status) {
  const { current, rejected, cancelled } = flowStateFor(status);
  return FLOW_STEPS.map((step, index) => {
    if (cancelled) return { ...step, state: "cancelled" };
    if (index < current) return { ...step, state: "done" };
    if (index === current) return { ...step, state: rejected ? "rejected" : "current" };
    return { ...step, state: "upcoming" };
  });
}

const STATE_STYLE = {
  done: { card: "border-emerald-300 bg-emerald-50", icon: "text-emerald-700", label: "text-emerald-900", tag: "Done" },
  current: { card: "border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-200", icon: "text-indigo-700", label: "text-indigo-900", tag: "Now" },
  rejected: { card: "border-rose-400 bg-rose-50 ring-2 ring-rose-200", icon: "text-rose-700", label: "text-rose-900", tag: "Rejected" },
  upcoming: { card: "border-gray-200 bg-white", icon: "text-gray-400", label: "text-gray-500", tag: "Next" },
  cancelled: { card: "border-gray-200 bg-gray-50", icon: "text-gray-400", label: "text-gray-400", tag: "Cancelled" },
};

const STATE_ICON = {
  done: CheckCircle2,
  current: CircleDashed,
  rejected: XCircle,
  upcoming: CircleDashed,
  cancelled: Ban,
};

/**
 * Flow chart of the claim: each step is a card with who acts on it, joined by arrows. The current step is highlighted,
 * steps already passed are green, a rejection is red, and a cancelled claim is greyed out.
 */
export default function SupplementaryFlowChart({ status }) {
  const steps = stepStates(status);
  const { clarification, cancelled, rejected } = flowStateFor(status);

  return (
    <section aria-label="Claim progress" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Where this claim is</h2>
        {clarification && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <MessageSquareWarning size={12} aria-hidden="true" /> Clarification needed
          </span>
        )}
        {rejected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
            <Undo2 size={12} aria-hidden="true" /> Rejected
          </span>
        )}
        {cancelled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
            <Ban size={12} aria-hidden="true" /> Cancelled
          </span>
        )}
      </div>

      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        {steps.map((step, index) => {
          const style = STATE_STYLE[step.state];
          const Icon = STATE_ICON[step.state];
          const StepIcon = step.icon;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center" aria-current={step.state === "current" ? "step" : undefined}>
              <div className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border p-3 transition ${style.card}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1.5 ${style.icon}`}>
                    <StepIcon size={16} aria-hidden="true" />
                    <Icon size={12} aria-hidden="true" />
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${style.icon}`}>{style.tag}</span>
                </div>
                <p className={`text-sm font-semibold ${style.label}`}>{step.label}</p>
                <p className="text-[11px] leading-snug text-gray-500">{step.who}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="flex shrink-0 items-center justify-center py-1 text-gray-300 md:px-1.5 md:py-0" aria-hidden="true">
                  <ArrowRight size={16} className="rotate-90 md:rotate-0" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
