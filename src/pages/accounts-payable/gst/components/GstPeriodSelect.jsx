import { groupByFinancialYear, periodLabel } from "../utils/gstFormat";

/**
 * Return-period selector, months grouped by financial year - the list comes from
 * GET /gstr2b/periods. The selected period is always offered, even if the list does not have it
 * (e.g. a month typed into the URL before any invoice exists for it).
 */
export default function GstPeriodSelect({ periods = [], value, onChange, disabled }) {
  const list = periods.some((p) => p.period === value) || !value ? periods : [{ period: value }, ...periods];
  const groups = groupByFinancialYear(list);
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      Return period
      <select
        aria-label="Return period"
        className="h-9 min-w-[11rem] rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        {groups.map((g) => (
          <optgroup key={g.financialYear || "other"} label={g.financialYear ? `FY ${g.financialYear}` : "Other"}>
            {g.periods.map((p) => (
              <option key={p.period} value={p.period}>
                {periodLabel(p.period)}{p.gstr2b_imported ? " · GSTR-2B imported" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
