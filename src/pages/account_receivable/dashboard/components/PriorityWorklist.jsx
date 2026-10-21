import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, Clock, FileClock, ListChecks, Settings2 } from "lucide-react";

import DashboardCard from "./DashboardCard";
import StatusBadge from "./StatusBadge";
import { AR_ROUTES } from "../utils/dashboardRoutes";

const TONE_ICON = {
  danger: AlertTriangle,
  warning: Clock,
  info: Calculator,
  success: CheckCircle2,
  neutral: FileClock,
};

const TONE_ACCENT = {
  danger: "border-l-rose-500",
  warning: "border-l-amber-500",
  info: "border-l-indigo-500",
  success: "border-l-emerald-500",
  neutral: "border-l-slate-300",
};

/** Operational bottlenecks as links, each with an always-visible call to action. */
export default function PriorityWorklist({ items, className = "" }) {
  const urgent = items.filter((i) => i.tone === "danger" || i.tone === "warning").length;

  return (
    <DashboardCard
      title="Priority Worklist"
      description="Bottlenecks that need maker attention or checker approval."
      icon={ListChecks}
      className={className}
      actions={
        <StatusBadge tone={urgent ? "danger" : "neutral"}>
          {urgent} {urgent === 1 ? "urgent item" : "urgent items"}
        </StatusBadge>
      }
      footer={
        <>
          <span>Maker-checker enforcement active</span>
          <Link
            to={AR_ROUTES.masterData}
            className="inline-flex items-center gap-1 rounded font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Configure Master Data &amp; Tax
          </Link>
        </>
      }
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = TONE_ICON[item.tone] || FileClock;
          return (
            <li key={item.id} className="min-w-0">
              <Link
                to={AR_ROUTES[item.route]}
                className={`group flex h-full flex-col rounded-lg border border-l-4 border-slate-200 p-3.5 transition-[border-color,background-color,box-shadow] duration-150 hover:bg-slate-50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${TONE_ACCENT[item.tone] || TONE_ACCENT.neutral}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" aria-hidden="true" />
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-900 [text-wrap:pretty] group-hover:text-indigo-800">
                  {item.title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.subtitle}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-indigo-700">
                  {item.cta}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
