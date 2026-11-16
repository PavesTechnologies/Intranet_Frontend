import React from "react";

// Shared dashboard card: rounded, softly shadowed, with an optional tinted icon beside the heading.
// Headings use the site's navy; the icon tile takes the card's tone. Kept compact: fewer wrappers, tighter spacing.
export const TONES = {
  navy: { tile: "bg-[#0A0082]/10 text-[#0A0082]" },
  pink: { tile: "bg-[#ff3d72]/10 text-[#ff3d72]" },
  teal: { tile: "bg-teal-500/10 text-teal-700" },
  amber: { tile: "bg-amber-400/15 text-amber-700" },
};

export default function SectionCard({ title, subtitle, action, icon: Icon, tone = "navy", children, className = "", ...rest }) {
  const t = TONES[tone] || TONES.navy;
  return (
    <section
      className={`flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)] ${className}`}
      {...rest}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.tile}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
          )}
          <h2 className="truncate text-sm font-semibold text-[#0a174e]">
            {title}
            {subtitle && <span className="ml-2 text-xs font-normal text-slate-500">{subtitle}</span>}
          </h2>
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
