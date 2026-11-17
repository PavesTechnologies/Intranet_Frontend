import { Link } from "react-router-dom";
import { Activity, ChevronRight } from "lucide-react";

import DashboardCard from "./DashboardCard";

/**
 * The six AR lifecycle stages as an ordered list of links — one per
 * workspace — so order is announced and each stage opens with Cmd/Ctrl+click.
 */
export default function PipelineStages({ stages }) {
  return (
    <DashboardCard
      title="AR Operational Pipeline"
      description="Items waiting at each stage, from contract setup to invoice sign-off. Select a stage to open its workspace."
      icon={Activity}
    >
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <li key={stage.id} className="min-w-0">
              <Link
                to={stage.path}
                className="group flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-[border-color,background-color,box-shadow] duration-150 hover:border-indigo-300 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold tabular-nums text-slate-600 ring-1 ring-slate-200 group-hover:text-indigo-700 group-hover:ring-indigo-300"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                    <span className="sr-only">Stage {index + 1}: </span>
                    {stage.name}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" aria-hidden="true" />
                </div>
                <p className="mb-3 mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{stage.description}</p>

                <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200/80 pt-2.5">
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none tabular-nums text-slate-900">{stage.count}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-500" title={stage.countLabel}>
                      {stage.countLabel}
                    </p>
                    {/* Always reserve the wait line so counts line up across a row. */}
                    <p
                      aria-hidden={stage.waitLabel ? undefined : "true"}
                      className={`mt-0.5 truncate text-[11px] font-medium ${
                        stage.waitLabel ? (stage.waitTone === "warning" ? "text-amber-700" : "text-slate-500") : "invisible"
                      }`}
                    >
                      {stage.waitLabel || " "}
                    </p>
                  </div>
                  <div
                    className="flex min-w-0 shrink items-center gap-0.5 text-xs font-semibold tabular-nums text-slate-700"
                    title={stage.amountTitle}
                  >
                    {stage.amountText ? <span className="truncate">{stage.amountText}</span> : null}
                    <ChevronRight
                      className="h-3.5 w-3.5 text-slate-400 transition-transform duration-150 group-hover:text-indigo-600 motion-safe:group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </DashboardCard>
  );
}
