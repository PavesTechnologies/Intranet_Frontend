import React from "react";

// Shared dashboard card: rounded, softly shadowed, with an optional tinted icon beside the heading.
// Headings use the site's navy; the icon tile takes the card's tone.
export const TONES = {
  navy: { tile: "bg-[#0A0082]/10 text-[#0A0082]", bar: "from-[#0A0082] to-[#263383]" },
  pink: { tile: "bg-[#ff3d72]/10 text-[#ff3d72]", bar: "from-[#ff3d72] to-[#ff7aa0]" },
  teal: { tile: "bg-teal-500/10 text-teal-700", bar: "from-teal-500 to-teal-400" },
  amber: { tile: "bg-amber-400/15 text-amber-700", bar: "from-amber-400 to-amber-300" },
};

export default function SectionCard({ title, subtitle, action, icon: Icon, tone = "navy", children, className = "", ...rest }) {
  const t = TONES[tone] || TONES.navy;
  return (
    <section
      className={`flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)] ${className}`}
      {...rest}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-[#0a174e]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
