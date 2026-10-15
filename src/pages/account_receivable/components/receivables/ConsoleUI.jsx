/**
 * Visual building blocks for the Receivables workspace, matching the AR
 * Dashboard's "console" look: console header, executive stat tiles, icon-titled
 * section cards, a register (table) card, segmented filters and aging bars.
 * Presentation only — every value shown is passed in by the page.
 */

import { PageCard } from "../../../../components/Cards/PageCard";
import ARKPIStatusTabs from "../common/ARKPIStatusTabs";

/* ------------------------------ Header ------------------------------ */

export function ConsoleHeader({ eyebrow, tagline, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        {(eyebrow || tagline) && (
          <div className="mb-1 flex items-center gap-2">
            {eyebrow && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {eyebrow}
              </span>
            )}
            {eyebrow && tagline && <span className="text-xs text-slate-400">•</span>}
            {tagline && <span className="text-xs text-slate-500">{tagline}</span>}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/* ---------------------------- Stat tiles ---------------------------- */

const TILE_VARIANT = {
  default: { box: "border-slate-200 bg-white", label: "text-slate-500", value: "text-slate-900", footer: "border-slate-100 text-slate-400" },
  danger: { box: "border-rose-200 bg-rose-50/30", label: "text-rose-700", value: "text-rose-900", footer: "border-rose-100 text-rose-700/70" },
  warning: { box: "border-amber-200 bg-amber-50/30", label: "text-amber-700", value: "text-amber-900", footer: "border-amber-100 text-amber-700/70" },
};

/**
 * Executive KPI tile (Dashboard style). Display only — tiles are not
 * click filters for now, so there is no active/focus ring.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  iconClass = "bg-blue-50 text-blue-700",
  variant = "default",
  hint,
  hintClass = "text-slate-500",
  footerLabel,
  footerValue,
  footerValueClass = "text-slate-700",
}) {
  const v = TILE_VARIANT[variant] || TILE_VARIANT.default;
  return (
    <div className={`relative block w-full overflow-hidden rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md ${v.box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${v.label}`}>{label}</span>
        {Icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <div
          className={`truncate text-xl font-bold tracking-tight tabular-nums xl:text-2xl ${v.value}`}
          title={typeof value === "string" || typeof value === "number" ? String(value) : undefined}
        >
          {value}
        </div>
        {hint && <div className={`mt-1 truncate text-xs font-medium ${hintClass}`}>{hint}</div>}
      </div>
      {(footerLabel || footerValue) && (
        <div className={`mt-3 flex items-center justify-between gap-2 border-t pt-2 text-[11px] ${v.footer}`}>
          <span className="truncate">{footerLabel}</span>
          <span className={`shrink-0 truncate font-semibold ${footerValueClass}`}>{footerValue}</span>
        </div>
      )}
    </div>
  );
}

export function StatTileGrid({ children, columns = 6 }) {
  const cols = {
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  }[columns];
  return <div className={`grid gap-4 ${cols}`}>{children}</div>;
}

/* --------------------------- Section cards --------------------------- */

export function SectionCard({ icon: Icon, iconClass = "text-blue-600", title, subtitle, right, className = "", children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {Icon && <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />}
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/**
 * Register card — the AR table layout, identical to Invoice Generation's
 * "Invoice Pipeline": title + caption on the left, search/clear on the right,
 * count tabs (ARKPIStatusTabs) underneath, then the bordered ARTable with
 * pagination below it.
 *  - toolbar: search input (+ clear button); `wideToolbar` lets extra filters fit.
 *  - tabs: { label, loading, items } passed straight to ARKPIStatusTabs.
 *  - footer: rendered under the table (pagination).
 */
export function RegisterCard({ title, subtitle, toolbar, wideToolbar = false, tabs, footer, children }) {
  return (
    <PageCard>
      <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {toolbar && (
          <div className={`flex w-full flex-wrap items-center justify-end gap-2 lg:flex-nowrap ${wideToolbar ? "lg:w-auto" : "lg:w-[420px]"}`}>
            {toolbar}
          </div>
        )}
      </div>

      {tabs ? <ARKPIStatusTabs className="mt-3" {...tabs} /> : <div className="mt-4" />}

      <div className="space-y-3 border-t border-slate-100 p-4 sm:p-5">
        {children}
        {footer}
      </div>
    </PageCard>
  );
}

/* ------------------------- Segmented filter ------------------------- */

/** Dashboard-style segmented control. Options: { value, label, count? }. */
export function Segmented({ options, value, onChange, label, dark = true }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border border-slate-300 bg-white p-0.5 text-xs">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`whitespace-nowrap rounded px-2.5 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              active ? (dark ? "bg-slate-900 text-white" : "bg-blue-600 text-white") : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className={`ml-1 tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------- Aging bars ---------------------------- */

/**
 * Horizontal aging breakdown. rows: { key, label, count, amount, color }.
 * Bar width is the row's share of `total`.
 */
export function AgingBars({ rows, total, formatAmount, onSelect, activeKey }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.amount / total) * 100) : 0;
        const clickable = Boolean(onSelect);
        const Wrapper = clickable ? "button" : "div";
        return (
          <Wrapper
            key={row.key}
            {...(clickable ? { type: "button", onClick: () => onSelect(row.key) } : {})}
            className={`block w-full space-y-1 rounded-md text-left ${clickable ? "-mx-1.5 px-1.5 py-1 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" : ""} ${
              activeKey === row.key ? "bg-slate-50 ring-1 ring-slate-200" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">{row.count} inv</span>
                <span className="font-semibold tabular-nums text-slate-900">{formatAmount(row.amount)}</span>
                <span className="w-9 text-right text-[11px] tabular-nums text-slate-400">{pct}%</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: row.color }} />
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

/* ---------------------------- Worklist card ---------------------------- */

const WORK_TONE = {
  danger: "bg-rose-100 text-rose-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-slate-100 text-slate-700",
};

export function WorkItem({ badge, tone = "neutral", icon: Icon, title, subtitle, actionLabel = "Process now", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col justify-between rounded-lg border border-slate-200 p-3.5 text-left transition-all hover:border-blue-500 hover:bg-blue-50/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="w-full">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${WORK_TONE[tone]}`}>{badge}</span>
          {Icon && <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />}
        </div>
        <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-blue-600">{title}</h4>
        {subtitle && <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      <div className="mt-3 flex w-full items-center justify-end gap-1 text-[11px] font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span>{actionLabel} →</span>
      </div>
    </button>
  );
}
