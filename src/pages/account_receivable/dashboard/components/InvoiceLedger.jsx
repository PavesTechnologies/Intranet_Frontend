import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ArrowUpRight, Receipt, Search, SearchX } from "lucide-react";

import DashboardCard from "./DashboardCard";
import SegmentedControl from "./SegmentedControl";
import StatusBadge from "./StatusBadge";
import { formatDisplayDate } from "../../utils/format";
import { getAgingTone, getInvoiceStatus } from "../utils/dashboardFormatters";
import { AR_ROUTES } from "../utils/dashboardRoutes";

const STATUS_MATCHERS = {
  ALL: () => true,
  OVERDUE: (row) => row.status === "OVERDUE",
  PENDING: (row) => row.status === "PENDING_APPROVAL",
  PAID: (row) => row.status === "PAID" || row.status === "PARTIALLY_PAID",
};

const STATUS_LABELS = { ALL: "All", OVERDUE: "Overdue", PENDING: "Pending", PAID: "Paid" };

const COLUMNS = [
  { key: "invoiceId", label: "Invoice", sortable: true },
  { key: "clientName", label: "Client & Project", sortable: true },
  { key: "billingType", label: "Billing Model" },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "amount", label: "Taxable Subtotal", sortable: true, align: "right" },
  { key: "total", label: "Gross Total", sortable: true, align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", srOnly: true, align: "right" },
];

const AGING_TEXT = {
  danger: "text-rose-700",
  warning: "text-amber-700",
  neutral: "text-slate-500",
};

const compareRows = (key, dir) => (a, b) => {
  const av = a[key];
  const bv = b[key];
  const result = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
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

export default function InvoiceLedger({ rows, filters, setFilter, toggleSort, resetLedgerFilters, formatMoney }) {
  const { q, status, sort, dir } = filters;

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_MATCHERS).map(([key, match]) => [key, rows.filter(match).length])
      ),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter(STATUS_MATCHERS[status])
      .filter(
        (row) =>
          !term ||
          [row.clientName, row.invoiceId, row.project].some((v) => v.toLowerCase().includes(term))
      )
      .sort(compareRows(sort, dir));
  }, [rows, q, status, sort, dir]);

  const hasFilters = Boolean(q) || status !== "ALL";

  return (
    <DashboardCard
      title="Debtor Ledger & Active Invoices"
      description="Client balances, aging and payment status for active invoices."
      icon={Receipt}
      bodyClassName="p-0"
      actions={
        <>
          <div className="relative">
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
            label="Filter invoices by status"
            size="sm"
            value={status}
            onChange={(value) => setFilter("status", value)}
            options={Object.keys(STATUS_MATCHERS).map((key) => ({
              value: key,
              label: `${STATUS_LABELS[key]} (${counts[key]})`,
            }))}
          />
        </>
      }
      footer={
        <>
          <span aria-live="polite" className="tabular-nums">
            Showing {visibleRows.length} of {rows.length} invoices
          </span>
          <Link
            to={AR_ROUTES.invoiceGeneration}
            className="inline-flex items-center gap-1 rounded font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            View Full Invoice Register
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-xs">
          <caption className="sr-only">
            Active invoices, sorted by {COLUMNS.find((c) => c.key === sort)?.label} {dir === "asc" ? "ascending" : "descending"}
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
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <SearchX className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-medium text-slate-700">No invoices match these filters</p>
                    <p className="text-xs text-slate-500">Try a different search term or status.</p>
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
            ) : (
              visibleRows.map((row) => {
                const statusInfo = getInvoiceStatus(row.status);
                const agingTone = getAgingTone(row.agingDays);
                return (
                  <tr key={row.invoiceId} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <span translate="no" className="font-mono font-semibold text-indigo-700">
                        {row.invoiceId}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-left">
                      <div className="truncate font-semibold text-slate-900" title={row.clientName}>
                        {row.clientName}
                      </div>
                      <div className="truncate text-[11px] text-slate-500" title={row.project}>
                        {row.project}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left text-slate-600">{row.billingType}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div className="font-medium tabular-nums text-slate-800">{formatDisplayDate(row.dueDate)}</div>
                      <div className={`text-[11px] font-medium tabular-nums ${AGING_TEXT[agingTone]}`}>
                        {row.agingDays > 0 ? `${row.agingDays} days aging` : "Current"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatMoney(row.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        to={AR_ROUTES.invoice(row.invoiceId)}
                        aria-label={`View invoice ${row.invoiceId}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        View
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
