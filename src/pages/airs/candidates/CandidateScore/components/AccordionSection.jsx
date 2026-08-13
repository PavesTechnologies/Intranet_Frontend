import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// Shared classic flowing section used across the Candidate Scorecard's
// Deterministic/Semantic/AI Evaluation/Final Status tabs — icon + title +
// optional count/action on the left/right of a plain header row, with an
// optional collapse toggle. Several of these stack inside one bordered
// container (divided by border-b) instead of each being its own boxed card.
export default function AccordionSection({
  icon: Icon,
  title,
  count,
  action,
  defaultOpen = true,
  collapsible = true,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-3 py-3 text-left ${collapsible ? "" : "cursor-default"}`}
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
          {title}
          {typeof count === "number" && <span className="text-[11px] font-medium text-slate-400">({count})</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {action}
          {collapsible && (
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          )}
        </span>
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}
