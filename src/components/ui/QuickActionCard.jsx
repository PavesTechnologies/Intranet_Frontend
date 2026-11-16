import React from "react";
import { ArrowUpRight } from "lucide-react";
import { TONES } from "./SectionCard";

// Shared quick-action card: a tinted icon tile, a bold label, a friendly hint, and an arrow that lifts in on hover.
export default function QuickActionCard({ icon: Icon, label, hint, tone = "navy", onClick, ...rest }) {
  const t = TONES[tone] || TONES.navy;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
      {...rest}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.tile} transition-transform duration-200 group-hover:scale-110`}>
        {Icon && <Icon size={20} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1 pr-5">
        <span className="block text-sm font-semibold text-[#0a174e]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{hint}</span>}
      </span>
      <ArrowUpRight
        size={16}
        aria-hidden="true"
        className="absolute right-3 top-3 text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0082]"
      />
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${t.bar}`} />
    </button>
  );
}
