import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Inbox,
  ListFilter,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import {
  ACTIVITY_FILTERS,
  ACTIVITY_LIMIT,
  PERIODS,
  STATUS_GROUPS,
  buildActivityRows,
  countByStatusGroup,
  filterActivityRows,
  formatShortDate,
  refineActivityRows,
} from "./employeeActivity";
import { timeAgo } from "./dashboardTheme";

// The employee's cash advances and expense reports in one table, newest first. Each row is a real record.
// Columns: reference (with the record type), description, date, status, amount. Approver and audit details are not shown.

// Status colours follow the site palette: navy for "in the system", pink for "back with you", teal for "done",
// amber for "waiting", slate for "not started". The label always carries the meaning; the colour only supports it.
const TONE_BADGE = {
  gray: {
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  slate: {
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  amber: {
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  rose: {
    pill: "bg-[#ff3d72]/10 text-[#d81b5a] ring-[#ff3d72]/25",
    dot: "bg-[#ff3d72]",
  },
  blue: {
    pill: "bg-[#0A0082]/[0.07] text-[#0A0082] ring-[#0A0082]/15",
    dot: "bg-[#0A0082]",
  },
  indigo: {
    pill: "bg-[#0A0082]/[0.07] text-[#0A0082] ring-[#0A0082]/15",
    dot: "bg-[#0A0082]",
  },
  emerald: {
    pill: "bg-teal-50 text-teal-700 ring-teal-200",
    dot: "bg-teal-500",
  },
};

// Each record type gets its own tile, matching the quick-action tiles for the same pages.
const KIND_STYLE = {
  advance: { icon: Banknote, tile: "bg-[#ff3d72]/10 text-[#ff3d72]" },
  report: { icon: ReceiptText, tile: "bg-[#0A0082]/10 text-[#0A0082]" },
};

const VIEW_ALL = {
  advance: {
    to: "/expense-management/cash-advance/my",
    label: "View all advances",
  },
  report: { to: "/expense-management/expenses/my", label: "View all reports" },
  all: { to: "/expense-management/expenses/my", label: "View all reports" },
};

const EMPTY_TEXT = {
  all: "No activity yet. Advances you request and reports you submit will appear here.",
  advance: "No cash advance activity yet.",
  report: "No expense report activity yet.",
};

const KIND_LABEL = { advance: "Cash advance", report: "Expense report" };

// A native select styled as a pill, so it stays keyboard- and screen-reader-friendly.
function FilterSelect({ label, icon: Icon, value, onChange, options, active }) {
  return (
    <label
      className={`relative inline-flex items-center rounded-full ring-1 ring-inset transition ${active ? "bg-[#0A0082]/[0.06] ring-[#0A0082]/30" : "bg-white ring-slate-200 hover:ring-slate-300"}`}
    >
      <Icon
        size={14}
        aria-hidden="true"
        className={`pointer-events-none absolute left-3 ${active ? "text-[#0A0082]" : "text-slate-400"}`}
      />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pl-8 pr-8 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${active ? "text-[#0A0082]" : "text-slate-600"}`}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-slate-400"
      />
    </label>
  );
}

function Badge({ label, tone }) {
  const t = TONE_BADGE[tone] || TONE_BADGE.slate;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${t.pill}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${t.dot}`}
        aria-hidden="true"
      />
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
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(ACTIVITY_LIMIT);

  const rows = useMemo(
    () => buildActivityRows(advances || [], reports || []),
    [advances, reports],
  );
  const byKind = filterActivityRows(rows, filter);
  const matching = refineActivityRows(byKind, { status, period, search });
  const visible = matching.slice(0, limit);
  const refined = status !== "all" || period !== "all" || search.trim() !== "";
  // Any filter change starts the list again from the first page.
  const change = (setter) => (value) => {
    setter(value);
    setLimit(ACTIVITY_LIMIT);
  };
  const clearFilters = () => {
    setStatus("all");
    setPeriod("all");
    setSearch("");
    setLimit(ACTIVITY_LIMIT);
  };

  // Status counts reflect the type, period and search chosen, so each option says how many rows it would show.
  const counts = countByStatusGroup(
    refineActivityRows(byKind, { period, search }),
  );
  const statusOptions = STATUS_GROUPS.map((g) => ({
    key: g.key,
    label: `${g.label} (${counts[g.key] || 0})`,
    disabled: g.key !== "all" && g.key !== status && !counts[g.key],
  }));
  const total = matching.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const loading =
    (advancesLoading && !advances) || (reportsLoading && !reports);

  // A filter for a list this role cannot open is not offered.
  const filters = ACTIVITY_FILTERS.filter(
    (f) =>
      (f.key !== "advance" || canOpenAdvances) &&
      (f.key !== "report" || canOpenReports),
  );

  // Only offer a View all the employee's role can open. "All" falls back to whichever list is available.
  const viewAll = (() => {
    if (filter === "advance") return canOpenAdvances ? VIEW_ALL.advance : null;
    if (filter === "report") return canOpenReports ? VIEW_ALL.report : null;
    if (canOpenReports) return VIEW_ALL.all;
    return canOpenAdvances ? VIEW_ALL.advance : null;
  })();

  const sourceFailed =
    (filter !== "report" && advancesError) ||
    (filter !== "advance" && reportsError);
  const everythingFailed = advancesError && reportsError;

  return (
    <div className="space-y-3" data-testid="recent-activity">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Filter activity"
          options={filters}
          value={filter}
          onChange={change(setFilter)}
        />
        {viewAll && (
          <button
            type="button"
            onClick={() => navigate(viewAll.to)}
            className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#0A0082] transition hover:bg-[#0A0082]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
          >
            {viewAll.label}
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/80 p-2"
          data-activity-filters
        >
          <label className="relative flex min-w-[200px] flex-1 items-center">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 text-slate-400"
            />
            <input
              type="search"
              aria-label="Search activity"
              value={search}
              onChange={(e) => change(setSearch)(e.target.value)}
              placeholder="Search by reference or description"
              className="w-full rounded-full bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A0082]/40"
            />
          </label>
          <FilterSelect
            label="Filter by status"
            icon={ListFilter}
            value={status}
            active={status !== "all"}
            onChange={change(setStatus)}
            options={statusOptions}
          />
          <FilterSelect
            label="Filter by period"
            icon={CalendarDays}
            value={period}
            active={period !== "all"}
            onChange={change(setPeriod)}
            options={PERIODS}
          />
          {refined && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#d81b5a] transition hover:bg-[#ff3d72]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3d72]/40"
            >
              <X size={13} aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label="Loading recent activity"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : everythingFailed ? (
        <p className="rounded-lg bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">
          Recent activity couldn't be loaded.
        </p>
      ) : visible.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-center"
          data-testid="activity-empty"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A0082]/10 text-[#0A0082]">
            <Inbox size={20} aria-hidden="true" />
          </span>
          <p className="max-w-sm text-sm text-slate-600">
            {refined && byKind.length
              ? "Nothing matches these filters."
              : EMPTY_TEXT[filter]}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          {/* text-left on purpose: a global stylesheet centres table text */}
          <table
            className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm"
            data-testid="activity-list"
          >
            <colgroup>
              <col className="w-[24%]" />
              <col />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-10" />
            </colgroup>
            <thead className="bg-gradient-to-r from-[#0A0082]/[0.04] to-transparent text-[11px] font-semibold uppercase tracking-wider text-[#0a174e]/60">
              <tr className="border-b border-slate-100">
                <th scope="col" className="px-5 py-3 text-left font-semibold">
                  Reference
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Description
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Amount
                </th>
                <th scope="col" className="px-2 py-3">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => {
                const kind = KIND_STYLE[row.kind] || KIND_STYLE.report;
                const KindIcon = kind.icon;
                const zero = !(Number(row.amount) > 0);
                return (
                  <tr
                    key={row.id}
                    data-activity-row={row.id}
                    tabIndex={0}
                    onClick={() => navigate(row.to)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(row.to);
                    }}
                    className="group cursor-pointer transition-colors hover:bg-[#0A0082]/[0.03] focus:outline-none focus-visible:bg-[#0A0082]/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0082]/40"
                  >
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kind.tile} transition-transform duration-200 group-hover:scale-105`}
                        >
                          <KindIcon size={17} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <span
                            className="block truncate font-mono text-xs font-semibold text-[#0a174e]"
                            title={row.reference}
                          >
                            {row.reference}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {KIND_LABEL[row.kind]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span
                        className="block truncate font-medium capitalize text-slate-700"
                        title={row.description}
                      >
                        {row.description}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                      <span className="block text-xs font-medium text-slate-600">
                        {formatShortDate(row.date)}
                      </span>
                      {row.date && (
                        <span className="block text-[11px] text-slate-400">
                          {timeAgo(row.date)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <Badge label={row.statusLabel} tone={row.statusTone} />
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right align-middle tabular-nums ${zero ? "text-slate-400" : "font-bold text-[#0a174e]"}`}
                    >
                      {formatMoney(row.amount, currency)}
                    </td>
                    <td className="px-2 py-3.5 align-middle">
                      <ChevronRight
                        size={16}
                        aria-hidden="true"
                        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A0082]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] text-slate-500">
            <p data-activity-summary>
              Showing {visible.length} of {matching.length}
              {refined && ` matching (of ${byKind.length})`} · Total{" "}
              <span className="font-semibold tabular-nums text-[#0a174e]">
                {formatMoney(total, currency)}
              </span>
            </p>
            {matching.length > visible.length && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + ACTIVITY_LIMIT)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-[#0A0082] transition hover:bg-[#0A0082]/[0.06]"
              >
                Show more <ChevronDown size={13} aria-hidden="true" />
              </button>
            )}
          </div>
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
