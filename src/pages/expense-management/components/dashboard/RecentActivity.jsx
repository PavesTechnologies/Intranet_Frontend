import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Button from "@/components/Button/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import {
  ACTIVITY_FILTERS,
  ACTIVITY_LIMIT,
  buildActivityRows,
  filterActivityRows,
  formatShortDate,
} from "./employeeActivity";

// The employee's cash advances and expense reports in one table, newest first. Each row is a real record.
// Columns: reference (with the record type), description, date, status, amount. Approver and audit details are not shown.

const TONE_BADGE = {
  gray: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

// One grid for the header and every row, so the columns always line up on desktop.
const GRID = "sm:grid sm:grid-cols-[11rem_minmax(0,1fr)_7.5rem_9rem_8.5rem] sm:items-center sm:gap-x-4";

const VIEW_ALL = {
  advance: { to: "/expense-management/cash-advance/my", label: "View all advances" },
  report: { to: "/expense-management/expenses/my", label: "View all reports" },
  all: { to: "/expense-management/expenses/my", label: "View all reports" },
};

const EMPTY_TEXT = {
  all: "No activity yet. Advances you request and reports you submit will appear here.",
  advance: "No cash advance activity yet.",
  report: "No expense report activity yet.",
};

const KIND_LABEL = { advance: "Cash advance", report: "Expense report" };

function Badge({ label, tone }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_BADGE[tone] || TONE_BADGE.slate}`}>
      {label}
    </span>
  );
}

export default function RecentActivity({
  advances,
  reports,
  advancesLoading = false,
  reportsLoading = false,
  advancesError = false,
  reportsError = false,
  currency = "INR",
  canOpenAdvances = true,
  canOpenReports = true,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => buildActivityRows(advances || [], reports || []), [advances, reports]);
  const visible = filterActivityRows(rows, filter).slice(0, ACTIVITY_LIMIT);
  const loading = (advancesLoading && !advances) || (reportsLoading && !reports);

  // A filter for a list this role cannot open is not offered.
  const filters = ACTIVITY_FILTERS.filter(
    (f) => (f.key !== "advance" || canOpenAdvances) && (f.key !== "report" || canOpenReports),
  );

  // Only offer a View all the employee's role can open. "All" falls back to whichever list is available.
  const viewAll = (() => {
    if (filter === "advance") return canOpenAdvances ? VIEW_ALL.advance : null;
    if (filter === "report") return canOpenReports ? VIEW_ALL.report : null;
    if (canOpenReports) return VIEW_ALL.all;
    return canOpenAdvances ? VIEW_ALL.advance : null;
  })();

  const sourceFailed = (filter !== "report" && advancesError) || (filter !== "advance" && reportsError);
  const everythingFailed = advancesError && reportsError;

  return (
    <div className="space-y-3" data-testid="recent-activity">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Filter activity" options={filters} value={filter} onChange={setFilter} />
        {viewAll && (
          <Button variant="outline" size="small" onClick={() => navigate(viewAll.to)} className="gap-1">
            {viewAll.label} <ArrowRight size={14} aria-hidden="true" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading recent activity">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : everythingFailed ? (
        <p className="rounded-lg bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">Recent activity couldn't be loaded.</p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500" data-testid="activity-empty">
          {EMPTY_TEXT[filter]}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm" data-testid="activity-list">
            <colgroup>
              <col className="w-[15%]" />
              <col />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th scope="col" className="px-4 py-2.5 font-semibold">Reference</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Description</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr
                  key={row.id}
                  data-activity-row={row.id}
                  tabIndex={0}
                  onClick={() => navigate(row.to)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(row.to);
                  }}
                  className="cursor-pointer transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0082]/40"
                >
                  <td className="px-4 py-3 align-middle">
                    <span className="block truncate font-mono text-xs font-semibold text-slate-800">{row.reference}</span>
                    <span className="block text-[11px] text-slate-400">{KIND_LABEL[row.kind]}</span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="block truncate text-slate-800">{row.description}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-slate-500">{formatShortDate(row.date)}</td>
                  <td className="px-4 py-3 align-middle">
                    <Badge label={row.statusLabel} tone={row.statusTone} />
                  </td>
                  <td className="px-4 py-3 text-right align-middle font-semibold tabular-nums text-slate-900">
                    {formatMoney(row.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!everythingFailed && sourceFailed && (
        <p className="text-xs text-slate-400">
          {filter === "all"
            ? `${advancesError ? "Cash advances" : "Expense reports"} couldn't be loaded, so only the other list is shown.`
            : `${filter === "advance" ? "Cash advances" : "Expense reports"} couldn't be loaded.`}
        </p>
      )}
    </div>
  );
}
