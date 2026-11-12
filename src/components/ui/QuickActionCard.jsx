import React from "react";

// Shared quick-action card: icon tile, label and hint. Navy icon and focus ring from the site theme.
export default function QuickActionCard({ icon: Icon, label, hint, onClick, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#0A0082]/30 hover:bg-[#0A0082]/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
      {...rest}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/[0.07] text-[#0A0082] transition-colors group-hover:bg-[#0A0082] group-hover:text-white">
        {Icon && <Icon size={17} aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#0a174e]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}
