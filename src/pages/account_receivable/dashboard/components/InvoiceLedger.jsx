import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Receipt,
  Search,
  SearchX,
} from "lucide-react";

import DashboardCard from "./DashboardCard";
import SegmentedControl from "./SegmentedControl";
import StatusBadge from "./StatusBadge";
import { formatDisplayDate } from "../../utils/format";
import { formatMoney, getAgingTone, getInvoiceStatus, pluralize, toIsoDate } from "../utils/dashboardFormatters";
import { AR_ROUTES } from "../utils/dashboardRoutes";

const VIEWS = [
  { value: "ALL", label: "All" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "AWAITING_SEND", label: "Awaiting Send" },
  { value: "SENT", label: "Sent" },
];

const COLUMNS = [
  { key: "invoiceNumber", label: "Invoice", sortable: true },
  { key: "clientName", label: "Client & Project", sortable: true },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "grandTotal", label: "Gross Total", sortable: true, align: "right" },
  { key: "outstandingBalance", label: "Outstanding", sortable: true, align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "Open", srOnly: true, align: "right" },
];

const AGING_TEXT = {
  danger: "text-rose-700",
  warning: "text-amber-700",
  neutral: "text-slate-500",
};

const sortValue = (row, key) => {
  if (key === "dueDate") return toIsoDate(row.dueDate) || "9999-12-31"; // undated last
  if (key === "grandTotal" || key === "outstandingBalance") return Number(row[key]) || 0;
  return String(row[key] ?? "");
};

const compareRows = (key, dir) => (a, b) => {
  const av = sortValue(a, key);
  const bv = sortValue(b, key);
  const result = typeof av === "number" ? av - bv : av.localeCompare(bv);
  return dir === "asc" ? result : -result;
};

function SortHeader({ column, sort, dir, onSort }) {
  const active = sort === column.key;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className={`-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-semibold uppercase tracking-wide hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active ? "text-slate-900" : ""
      } ${column.align === "right" ? "flex-row-reverse" : ""}`}
    >
      {column.label}
      <Icon className={`h-3 w-3 ${active ? "text-indigo-600" : "text-slate-400"}`} aria-hidden="true" />
    </button>
  );
}

function dueNote(row) {
  if (row.daysOverdue > 0) return { text: `${pluralize(row.daysOverdue, "day")} overdue`, tone: getAgingTone(row.daysOverdue) };
  if (row.daysOutstanding != null) return { text: `Open ${pluralize(row.daysOutstanding, "day")}`, tone: "neutral" };
  return null;
}

/**
 * Invoice ledger. The view and search are applied by the API
 * (GET /api/v1/dashboard/invoices); sorting is done here on the returned rows.
 */
export default function InvoiceLedger({ rows, loading, error, onRetry, filters, setFilter, toggleSort, resetLedgerFilters }) {
  const { q, view, sort, dir } = filters;
  const visibleRows = useMemo(() => [...rows].sort(compareRows(sort, dir)), [rows, sort, dir]);
  const hasFilters = Boolean(q) || view !== "ALL";

  let body;
  if (error) {
    body = (
      <tr>
        <td colSpan={COLUMNS.length} className="px-4 py-12 text-left">
          <div role="alert" className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Retry
            </button>
          </div>
        </td>
      </tr>
    );
  } else if (loading && rows.length === 0) {
    body = [0, 1, 2].map((i) => (
      <tr key={i} aria-hidden="true">
        <td colSpan={COLUMNS.length} className="px-4 py-3.5">
          <span className="block h-3 w-full rounded bg-slate-100 motion-safe:animate-pulse" />
        </td>
      </tr>
    ));
  } else if (visibleRows.length === 0) {
    body = (
      <tr>
        <td colSpan={COLUMNS.length} className="px-4 py-12 text-left">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <SearchX className="h-5 w-5 text-slate-500" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-slate-700">
              {hasFilters ? "No invoices match these filters" : "No invoices yet"}
            </p>
            <p className="text-xs text-slate-500">
              {hasFilters ? "Try a different search term or view." : "Generated invoices will be listed here."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetLedgerFilters}
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  } else {
    body = visibleRows.map((row) => {
      const statusInfo = getInvoiceStatus(row.displayStatus);
      const note = dueNote(row);
      return (
        <tr key={row.invoiceId} className="transition-colors hover:bg-slate-50">
          <td className="whitespace-nowrap px-4 py-3 text-left">
            <span translate="no" className="block font-mono font-semibold text-indigo-700">
              {row.invoiceNumber || "—"}
            </span>
            <span className="block text-[11px] text-slate-500">{row.billingType || "—"}</span>
          </td>
          <td className="max-w-[260px] px-4 py-3 text-left">
            <div className="truncate font-semibold text-slate-900" title={row.clientName}>
              {row.clientName || "—"}
            </div>
            <div className="truncate text-[11px] text-slate-500" title={row.projectName}>
              {row.projectName || "—"}
            </div>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-left">
            <div className="font-medium tabular-nums text-slate-800">{formatDisplayDate(row.dueDate)}</div>
            {note ? (
              <div className={`text-[11px] font-medium tabular-nums ${AGING_TEXT[note.tone]}`}>{note.text}</div>
            ) : null}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
            {formatMoney(row.grandTotal, row.currencyCode)}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
            {row.outstandingBalance != null ? (
              formatMoney(row.outstandingBalance, row.currencyCode)
            ) : (
              <span className="text-[11px] text-slate-400">Not sent</span>
            )}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-left">
            <StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-right">
            <Link
              to={AR_ROUTES.invoice(row.invoiceId)}
              aria-label={`View invoice ${row.invoiceNumber || ""}`.trim()}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              View
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </td>
        </tr>
      );
    });
  }

  return (
    <DashboardCard
      title="Invoice Ledger"
      description="Invoices with their balance, aging and status, soonest due first."
      icon={Receipt}
      bodyClassName="p-0"
      actions={
        <>
          <div className="relative w-full sm:w-auto">
            <label htmlFor="ar-ledger-search" className="sr-only">
              Search invoices
            </label>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="ar-ledger-search"
              type="search"
              name="ledgerSearch"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search invoice, client or project…"
              value={q}
              onChange={(e) => setFilter("q", e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-64"
            />
          </div>
          <SegmentedControl
            label="Filter invoices"
            size="sm"
            value={view}
            onChange={(value) => setFilter("view", value)}
            options={VIEWS}
          />
        </>
      }
      footer={
        <>
          <span aria-live="polite" className="tabular-nums">
            {loading ? "Loading invoices…" : `Showing ${pluralize(visibleRows.length, "invoice")}`}
          </span>
          <Link
            to={AR_ROUTES.invoiceGeneration}
            className="inline-flex items-center gap-1 rounded font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Open Invoice Generation
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      }
    >
      {/* relative: keeps sr-only (absolute) header text inside the scroll box */}
      <div className="relative overflow-x-auto" aria-busy={loading}>
        <table className="w-full min-w-[860px] text-left text-xs">
          <caption className="sr-only">
            Invoices sorted by {COLUMNS.find((c) => c.key === sort)?.label} {dir === "asc" ? "ascending" : "descending"}
          </caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    column.sortable && sort === column.key ? (dir === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={`whitespace-nowrap px-4 py-2.5 font-semibold uppercase tracking-wide ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.srOnly ? (
                    <span className="sr-only">{column.label}</span>
                  ) : column.sortable ? (
                    <SortHeader column={column} sort={sort} dir={dir} onSort={toggleSort} />
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{body}</tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
