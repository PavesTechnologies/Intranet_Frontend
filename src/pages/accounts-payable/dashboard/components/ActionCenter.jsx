import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  FileText,
  Landmark,
  ListChecks,
  ShieldCheck,
  Stamp,
  Wallet,
  Zap,
} from "lucide-react";
import { formatMoney } from "./insights";
import { useActionCenter } from "../hooks/useActionCenter";

const AREA_ICONS = { ap: FileText, approvals: Stamp, payments: Wallet, tds: Landmark, management: ShieldCheck };

const SEVERITY = {
  critical: { label: "Urgent", bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200", icon: "text-rose-500" },
  high: { label: "Due soon", bar: "bg-amber-400", chip: "bg-amber-50 text-amber-700 ring-amber-200", icon: "text-amber-500" },
  normal: { label: "To do", bar: "bg-slate-300", chip: "bg-slate-50 text-slate-600 ring-slate-200", icon: "text-slate-400" },
};

const VISIBLE = 6;

function ActionRow({ action, currency }) {
  const Icon = AREA_ICONS[action.area] || ListChecks;
  const sev = SEVERITY[action.severity] || SEVERITY.normal;
  return (
    <li>
      <Link
        to={action.link}
        className="group relative flex items-start gap-3 rounded-lg border border-slate-200 bg-white py-3 pl-4 pr-3 transition hover:border-indigo-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span className={clsx("absolute inset-y-2 left-0 w-1 rounded-full", sev.bar)} aria-hidden="true" />
        <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", sev.icon)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-slate-800">{action.title}</p>
            <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", sev.chip)}>{sev.label}</span>
            <span className="text-[11px] text-slate-400">{action.area_label}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{action.detail}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {action.amount != null && Number(action.amount) > 0 && (
            <span className="text-sm font-semibold tabular-nums text-slate-800">{formatMoney(action.amount, action.currency_code || currency)}</span>
          )}
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
            {action.cta} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </li>
  );
}

/**
 * Action Center — the top of the AP dashboard: what this user should do now, most urgent first,
 * across every AP area they work in. Each line opens the filtered list where the work is done;
 * areas with nothing pending show as "all clear"; quick actions are this user's shortcuts.
 * Everything comes from GET /dashboard/actions (built from the same role dashboards below it).
 */
export default function ActionCenter() {
  const { data, isLoading, isError } = useActionCenter();
  const [expanded, setExpanded] = useState(false);
  if (isLoading || isError || !data) return null;

  const actions = data.actions || [];
  const quick = data.quick_actions || [];
  const clear = data.all_clear || [];
  if (!actions.length && !quick.length && !clear.length) return null;

  const shown = expanded ? actions : actions.slice(0, VISIBLE);
  const { critical = 0, high = 0, normal = 0 } = data.summary || {};

  return (
    <section aria-labelledby="action-center-title" className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {actions.length ? (
            <AlertOctagon className={clsx("h-5 w-5", critical ? "text-rose-500" : "text-amber-500")} aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          )}
          <h2 id="action-center-title" className="text-base font-semibold text-slate-800">
            {actions.length ? "What needs your attention" : "You're all caught up"}
          </h2>
        </div>
        {actions.length > 0 && (
          <p className="text-xs text-slate-500">
            {[critical && `${critical} urgent`, high && `${high} due soon`, normal && `${normal} to do`].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {shown.map((action) => (
            <ActionRow key={action.key} action={action} currency={data.base_currency} />
          ))}
        </ul>
      )}
      {actions.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {expanded ? "Show fewer" : `Show all ${actions.length}`}
        </button>
      )}

      {(clear.length > 0 || quick.length > 0) && (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 lg:flex-row lg:items-center lg:justify-between">
          {clear.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {clear.map((area) => (
                <span key={area.area} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {area.label}: nothing pending
                </span>
              ))}
            </div>
          )}
          {quick.length > 0 && (
            <nav aria-label="Quick actions" className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Quick actions
              </span>
              {quick.map((q) => (
                <Link
                  key={q.link + q.label}
                  to={q.link}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {q.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
