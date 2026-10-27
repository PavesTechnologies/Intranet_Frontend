import { TrendingDown, TrendingUp } from "lucide-react";

const ICON_TONE = {
  indigo: "bg-indigo-50 text-indigo-700",
  rose: "bg-rose-50 text-rose-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
};

const SIGNAL_TONE = {
  good: "text-emerald-700",
  bad: "text-rose-700",
  neutral: "text-slate-600",
};

function KpiCard({ kpi }) {
  const Icon = kpi.icon;
  const TrendIcon = kpi.signal?.direction === "down" ? TrendingDown : TrendingUp;
  const alert = kpi.tone === "rose";

  return (
    <div
      className={`flex min-w-0 flex-col rounded-xl border bg-white p-4 shadow-sm ${
        alert ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <dt className="min-w-0 text-xs font-medium leading-snug text-slate-600">{kpi.label}</dt>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[kpi.tone] || ICON_TONE.slate}`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <dd className="mt-2 min-w-0">
        <p
          className={`truncate text-2xl font-bold tracking-tight tabular-nums ${
            kpi.empty ? "text-slate-300" : alert ? "text-rose-800" : "text-slate-900"
          }`}
          title={String(kpi.value)}
        >
          {kpi.value}
          {kpi.unit ? <span className="ml-1 text-sm font-medium text-slate-500">{kpi.unit}</span> : null}
        </p>

        {kpi.secondary?.length ? (
          <p className="mt-0.5 truncate text-xs font-medium tabular-nums text-slate-600" title={kpi.secondary.join(" · ")}>
            + {kpi.secondary.join(" · ")}
          </p>
        ) : null}

        {kpi.signal ? (
          <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${SIGNAL_TONE[kpi.signal.tone] || SIGNAL_TONE.neutral}`}>
            {kpi.signal.direction ? <TrendIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            <span className="min-w-0 truncate">{kpi.signal.text}</span>
          </p>
        ) : null}

        {kpi.footLabel ? (
          <p className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span className="truncate">{kpi.footLabel}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-700">{kpi.footValue}</span>
          </p>
        ) : null}
      </dd>
    </div>
  );
}

/** Headline metrics as a description list: each card is a <dt>/<dd> pair. */
export default function KpiGrid({ kpis, label = "Key receivable metrics" }) {
  return (
    <dl
      aria-label={label}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {kpis.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} />
      ))}
    </dl>
  );
}
