import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, CheckCircle2, BellRing, ChevronRight } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";

const SEVERITY = {
  high: { label: "High priority", Icon: AlertCircle, chip: "bg-red-50 text-red-600 ring-red-100", count: "bg-red-50 text-red-700 ring-red-100" },
  medium: { label: "Medium priority", Icon: Clock, chip: "bg-amber-50 text-amber-600 ring-amber-100", count: "bg-amber-50 text-amber-700 ring-amber-100" },
  low: {
    label: "Low priority",
    Icon: CheckCircle2,
    chip: "bg-[#0A0082]/[0.06] text-[#0A0082] ring-[#0A0082]/10",
    count: "bg-[#0A0082]/[0.06] text-[#0A0082] ring-[#0A0082]/10",
  },
};

/**
 * Follow-up alerts. An alert is only clickable when the user can open the
 * module dashboard it belongs to (modules[item.module].visible).
 */
export default function FinancialActionCenter({ items, modules, className = "" }) {
  const navigate = useNavigate();
  const openCount = items.reduce((s, i) => s + (Number(i.count) || 0), 0);

  return (
    <FinanceSectionCard
      title="Financial Action Center"
      subtitle="Items that need your attention"
      icon={BellRing}
      className={className}
      action={
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{openCount} open</span>
      }
    >
      <ul className="-mx-2 space-y-1">
        {items.map((item) => {
          const sev = SEVERITY[item.severity] || SEVERITY.low;
          const target = modules[item.module]?.visible ? modules[item.module].to : null;
          const content = (
            <>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${sev.chip}`} title={sev.label}>
                <sev.Icon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{sev.label}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-slate-800">{item.label}</span>
                {item.description && <span className="block truncate text-xs text-slate-500">{item.description}</span>}
              </span>
              <span className={`min-w-[2.25rem] rounded-full px-2.5 py-0.5 text-center text-sm font-bold tabular-nums ring-1 ${sev.count}`}>
                {item.count}
              </span>
              {target && (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A0082]" aria-hidden="true" />
              )}
            </>
          );
          return (
            <li key={item.id}>
              {target ? (
                <button
                  type="button"
                  onClick={() => navigate(target)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-2 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </FinanceSectionCard>
  );
}
