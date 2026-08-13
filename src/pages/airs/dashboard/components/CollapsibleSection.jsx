import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A section that starts collapsed.
 *
 * Used for the occasional-use tools (cross-campaign search, DSAR). They were
 * previously always expanded, which pushed the daily-use campaign table up the
 * page and made a quarterly compliance task look as prominent as the work
 * someone opens the dashboard to do.
 */
export default function CollapsibleSection({
  title, description, icon: Icon, badge, defaultOpen = false, children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition"
      >
        {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{title}</span>
            {badge}
          </span>
          {description && (
            <span className="block text-[11px] text-slate-500 mt-0.5">{description}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {/* Unmounted rather than hidden: these panels fetch on mount, so keeping
          them mounted would cost a request for a panel nobody opened. */}
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>}
    </div>
  );
}
