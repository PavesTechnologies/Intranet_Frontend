import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";

const SEVERITY = {
  high: { label: "High priority", Icon: AlertCircle, chip: "bg-red-50 text-red-500", count: "text-red-600" },
  medium: { label: "Medium priority", Icon: Clock, chip: "bg-orange-50 text-orange-500", count: "text-orange-500" },
  low: { label: "Low priority", Icon: CheckCircle2, chip: "bg-blue-50 text-blue-500", count: "text-blue-600" },
};

/**
 * Follow-up alerts. An alert is only clickable when the user can open the
 * module dashboard it belongs to (modules[item.module].visible).
 */
export default function FinancialActionCenter({ items, modules, className = "" }) {
  const navigate = useNavigate();

  return (
    <FinanceSectionCard title="Financial Action Center" accent="bg-red-500" className={className}>
      <ul className="divide-y divide-gray-100">
        {items.map((item) => {
          const sev = SEVERITY[item.severity] || SEVERITY.low;
          const target = modules[item.module]?.visible ? modules[item.module].to : null;
          const content = (
            <>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${sev.chip}`} title={sev.label}>
                <sev.Icon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{sev.label}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-gray-800">{item.label}</span>
                {item.description && <span className="block truncate text-[11px] text-gray-500">{item.description}</span>}
              </span>
              <span className={`text-base font-bold ${sev.count}`}>{item.count}</span>
            </>
          );
          return (
            <li key={item.id}>
              {target ? (
                <button
                  type="button"
                  onClick={() => navigate(target)}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left transition hover:bg-gray-50"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-1 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </FinanceSectionCard>
  );
}
