import React from "react";

/**
 * Compact icon button for the actions column of the My Approvals table.
 * One look for every list (expenses, cash advances, supplementary claims) so the
 * column lines up: a 32px rounded square with a soft tint that strengthens on hover.
 */
const TONES = {
  view: "border-slate-200 bg-white text-slate-600 hover:border-[#0A0082]/30 hover:bg-[#0A0082]/5 hover:text-[#0A0082]",
  approve: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
  reject: "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100",
  clarify: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
};

export default function RowActionButton({ tone = "view", icon: Icon, label, title, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/30 disabled:cursor-not-allowed disabled:opacity-35 ${TONES[tone]} ${className}`}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

/** Keeps a row's action buttons on one line, right-aligned. */
export function RowActions({ children }) {
  return <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">{children}</div>;
}
