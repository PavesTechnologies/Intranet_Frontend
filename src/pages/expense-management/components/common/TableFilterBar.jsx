import React from "react";
import { FilterX, Search } from "lucide-react";
import FormSelect from "@/components/forms/FormSelect";

/**
 * One filter per table column, shared by the employee list pages (My Expenses, My Advances, Supplementary claims).
 *
 * `filters` describes each control:
 *   { key, label, type: "search" | "select" | "dateRange" | "amountRange", options?, placeholder?, match(row, value) }
 * `values` holds the current value per key. A dateRange / amountRange value is { from, to } / { min, max }.
 * `applyTableFilters(rows, filters, values)` keeps the rows every active filter matches. Pages filter in the browser,
 * over all of the employee's own records, so the table and the KPI cards always describe the same rows.
 */

export const emptyFilterValues = (filters) =>
  Object.fromEntries(
    filters.map((f) => [f.key, f.type === "dateRange" ? { from: "", to: "" } : f.type === "amountRange" ? { min: "", max: "" } : ""]),
  );

const isActive = (f, v) => {
  if (f.type === "dateRange") return Boolean(v?.from || v?.to);
  if (f.type === "amountRange") return v?.min !== "" && v?.min != null ? true : v?.max !== "" && v?.max != null;
  return v !== "" && v != null;
};

export const activeFilterCount = (filters, values) => filters.filter((f) => isActive(f, values[f.key])).length;

/** Day-level comparison, so a "to" date includes the whole day. */
export const inDateRange = (date, { from, to } = {}) => {
  if (!from && !to) return true;
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (from && day < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && day > new Date(`${to}T00:00:00`).getTime()) return false;
  return true;
};

export const inAmountRange = (amount, { min, max } = {}) => {
  const n = Number(amount) || 0;
  if (min !== "" && min != null && n < Number(min)) return false;
  if (max !== "" && max != null && n > Number(max)) return false;
  return true;
};

export function applyTableFilters(rows, filters, values) {
  const active = filters.filter((f) => isActive(f, values[f.key]));
  return rows.filter((row) => active.every((f) => f.match(row, values[f.key])));
}

/** Options for a select filter, from the distinct values the rows actually have. */
export const distinctOptions = (rows, valueOf, allLabel) => {
  const seen = new Map();
  rows.forEach((r) => {
    const v = valueOf(r);
    if (v != null && v !== "" && !seen.has(v)) seen.set(v, v);
  });
  return [{ label: allLabel, value: "" }, ...[...seen.keys()].sort().map((v) => ({ label: v, value: v }))];
};

// Same height and text size as the FormSelect dropdowns beside them, so every control lines up in the grid.
const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15";

export default function TableFilterBar({ filters, values, onChange, onReset, resultCount, totalCount, noun = "records" }) {
  const active = activeFilterCount(filters, values);
  const set = (key, value) => onChange({ ...values, [key]: value });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm" data-table-filters>
      {/* Four per row; five on wide screens when there are more than eight, so nothing sits alone on a last row. */}
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 ${filters.length > 8 ? "xl:grid-cols-5" : ""}`}>
        {filters.map((f) => {
          const v = values[f.key];
          if (f.type === "search") {
            return (
              <div key={f.key} className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={`filter-${f.key}`}>{f.label}</label>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    id={`filter-${f.key}`}
                    type="search"
                    value={v}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
            );
          }
          if (f.type === "select") {
            return (
              <FormSelect
                key={f.key}
                label={f.label}
                name={f.key}
                value={v}
                onChange={(e) => set(f.key, e.target.value)}
                options={f.options}
                className="[&>label]:mb-1"
              />
            );
          }
          if (f.type === "dateRange" || f.type === "amountRange") {
            const isDate = f.type === "dateRange";
            const [a, b] = isDate ? ["from", "to"] : ["min", "max"];
            return (
              <fieldset key={f.key} className="min-w-0">
                <legend className="mb-1 block text-sm font-medium text-gray-700">{f.label}</legend>
                <div className="flex items-center gap-1.5">
                  <input
                    type={isDate ? "date" : "number"}
                    min={isDate ? undefined : 0}
                    aria-label={`${f.label} ${isDate ? "from" : "minimum"}`}
                    placeholder={isDate ? undefined : "Min"}
                    value={v?.[a] ?? ""}
                    onChange={(e) => set(f.key, { ...v, [a]: e.target.value })}
                    className={`${inputClass} ${isDate ? "!px-2 text-[13px]" : ""}`}
                  />
                  <span className="text-[11px] text-gray-400">to</span>
                  <input
                    type={isDate ? "date" : "number"}
                    min={isDate ? v?.[a] || undefined : 0}
                    aria-label={`${f.label} ${isDate ? "to" : "maximum"}`}
                    placeholder={isDate ? undefined : "Max"}
                    value={v?.[b] ?? ""}
                    onChange={(e) => set(f.key, { ...v, [b]: e.target.value })}
                    className={`${inputClass} ${isDate ? "!px-2 text-[13px]" : ""}`}
                  />
                </div>
              </fieldset>
            );
          }
          return null;
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-[11px] text-gray-500">
        <span data-filter-summary>
          Showing <span className="font-semibold text-gray-800">{resultCount}</span> of {totalCount} {noun}
          {active > 0 && <> · {active} filter{active === 1 ? "" : "s"} applied</>}
        </span>
        {active > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-[#0A0082] hover:bg-[#0A0082]/5"
          >
            <FilterX size={13} aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * KPI cards for a list page. Each card: { key, label, value, hint, icon, tone } where tone is a Tailwind pair
 * for the icon tile. Cards are computed by the page from the same filtered rows the table shows.
 */
export function KpiCards({ cards }) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${cards.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`} data-kpi-cards>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.key} data-kpi-card={c.key} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {Icon && (
              <div className={`shrink-0 rounded-lg p-2.5 ${c.tone || "bg-slate-50 text-slate-600"}`}>
                <Icon size={18} aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400">{c.label}</p>
              <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-gray-900">{c.value}</p>
              {c.hint && <p className="truncate text-[11px] text-gray-500">{c.hint}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
