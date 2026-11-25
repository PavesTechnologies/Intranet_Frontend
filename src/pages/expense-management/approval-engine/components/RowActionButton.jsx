import React from "react";

/**
 * Icon action for the actions column of the My Approvals table. Plain icons, as on the employee tables: no box, a soft
 * tint on hover. Every row shows the same actions in the same order (View, Approve, Send back, Reject); one that does
 * not apply stays in place, disabled, and its tooltip says why. The tooltip sits on a wrapper because a disabled
 * button does not receive hover events.
 */
const TONES = {
  view: "text-slate-500 hover:bg-slate-100 hover:text-[#0A0082]",
  approve: "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700",
  reject: "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
  clarify: "text-amber-600 hover:bg-amber-50 hover:text-amber-700",
};

export default function RowActionButton({ tone = "view", icon: Icon, label, title, onClick, disabled, className = "" }) {
  return (
    <span title={title || label} className="inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/30 disabled:pointer-events-none disabled:text-slate-300 ${TONES[tone]} ${className}`}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </span>
  );
}

/** Keeps a row's action icons on one line, right-aligned. */
export function RowActions({ children }) {
  return <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">{children}</div>;
}
