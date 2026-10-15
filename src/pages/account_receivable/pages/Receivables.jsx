import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Hourglass,
  Coins,
  Eye,
  FileText,
  Mail,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ARKPICard from "../components/common/ARKPICard";
import ARKPIStatusTabs from "../components/common/ARKPIStatusTabs";
import ARFilterListbox from "../components/common/ARFilterListbox";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import DetailsDrawer from "../components/common/DetailsDrawer";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import {
  getOutstandingReceivables,
  getReceivableErrorMessage,
  getAgingBucket,
  AGING_BUCKETS,
  NO_DUE_DATE_BUCKET,
  RECEIVABLE_STATUS_LABELS,
} from "../services/receivableService";
import { getInvoiceDeliveries } from "../services/invoiceService";

const PAGE_SIZE = 10;
const ALL = "ALL";
const OVERDUE = "OVERDUE";

const TABLE_HEADERS = [
  "Invoice No.",
  "Client",
  "Project",
  "Invoice Date",
  "Due Date",
  "Invoice Amount",
  "Outstanding",
  "Overdue",
  "Status",
  "Actions",
];
const TABLE_COLUMNS = [
  "invoiceNumber",
  "client",
  "project",
  "invoiceDate",
  "dueDate",
  "invoiceAmount",
  "outstanding",
  "overdue",
  "status",
  "actions",
];

// Aging chip tones run from calm to urgent as the bucket gets older.
const AGING_TONE = {
  CURRENT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "1_30": "bg-amber-50 text-amber-700 ring-amber-200",
  "31_60": "bg-orange-50 text-orange-700 ring-orange-200",
  "61_90": "bg-rose-50 text-rose-700 ring-rose-200",
  "90_PLUS": "bg-rose-100 text-rose-800 ring-rose-300",
  NO_DUE_DATE: "bg-slate-100 text-slate-600 ring-slate-200",
};

function AgingChip({ receivable }) {
  const bucket = getAgingBucket(receivable);
  const days = receivable.daysOverdue;
  const text = days === null ? "No due date" : days === 0 ? "Not overdue" : `${days} days`;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset tabular-nums ${AGING_TONE[bucket.key]}`}
      title={bucket.label}
    >
      {text}
    </span>
  );
}

const sumByCurrency = (rows) =>
  rows.reduce((acc, row) => {
    acc[row.currencyCode] = (acc[row.currencyCode] || 0) + row.outstandingBalance;
    return acc;
  }, {});

// Amounts are never added across currencies — each currency is shown separately.
const formatCurrencyTotals = (totals) => {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return formatCurrency(0, "USD");
  return entries.map(([code, amount]) => formatCurrency(amount, code)).join(" · ");
};

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-5 gap-3 py-2 text-sm">
      <dt className="col-span-2 text-slate-500">{label}</dt>
      <dd className="col-span-3 font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default function Receivables() {
  const navigate = useNavigate();
  const location = useLocation();
  // Set when arriving straight from "Send to Client" — that invoice's new receivable.
  const sentInvoiceId = location.state?.sentInvoiceId || null;

  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [agingFilter, setAgingFilter] = useState(ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getOutstandingReceivables();
        if (!cancelled) setReceivables(rows);
      } catch (err) {
        console.error("[Receivables] Error loading receivables:", err);
        if (!cancelled) setError(getReceivableErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Delivery history for the receivable opened in the details drawer.
  useEffect(() => {
    if (!selected?.invoiceId) {
      setDeliveries([]);
      return;
    }
    let cancelled = false;
    setDeliveriesLoading(true);
    getInvoiceDeliveries(selected.invoiceId)
      .then((rows) => !cancelled && setDeliveries(rows))
      .catch((err) => {
        console.error("[Receivables] Error loading delivery history:", err);
        if (!cancelled) setDeliveries([]);
      })
      .finally(() => !cancelled && setDeliveriesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected?.invoiceId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [agingFilter, searchQuery, clientFilter, currencyFilter]);

  /* ---------------------------- Derived data ---------------------------- */

  const clientOptions = useMemo(() => {
    const names = [...new Set(receivables.map((r) => r.clientName).filter((n) => n && n !== "—"))].sort();
    return [{ value: "", label: "All clients" }, ...names.map((name) => ({ value: name, label: name }))];
  }, [receivables]);

  const currencyOptions = useMemo(() => {
    const codes = [...new Set(receivables.map((r) => r.currencyCode))].sort();
    return [{ value: "", label: "All currencies" }, ...codes.map((code) => ({ value: code, label: code }))];
  }, [receivables]);

  // Search + dimension filters, before the aging filter — so the aging tab
  // counts always describe what the other filters leave.
  const baseFiltered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return receivables.filter((r) => {
      if (clientFilter && r.clientName !== clientFilter) return false;
      if (currencyFilter && r.currencyCode !== currencyFilter) return false;
      if (!query) return true;
      return [r.invoiceNumber, r.clientName, r.projectName]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [receivables, searchQuery, clientFilter, currencyFilter]);

  const agingCounts = useMemo(() => {
    const counts = { [ALL]: baseFiltered.length, [OVERDUE]: 0, [NO_DUE_DATE_BUCKET.key]: 0 };
    AGING_BUCKETS.forEach((bucket) => {
      counts[bucket.key] = 0;
    });
    baseFiltered.forEach((r) => {
      counts[getAgingBucket(r).key] += 1;
      if (r.daysOverdue > 0) counts[OVERDUE] += 1;
    });
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    if (agingFilter === ALL) return baseFiltered;
    if (agingFilter === OVERDUE) return baseFiltered.filter((r) => r.daysOverdue > 0);
    return baseFiltered.filter((r) => getAgingBucket(r).key === agingFilter);
  }, [baseFiltered, agingFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Bring the just-sent invoice's receivable into view once the list loads.
  useEffect(() => {
    if (loading || !sentInvoiceId) return;
    const index = filtered.findIndex((r) => r.invoiceId === sentInvoiceId);
    if (index >= 0) setCurrentPage(Math.floor(index / PAGE_SIZE) + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sentInvoiceId]);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const kpiCards = [
    { key: ALL, label: "Open Receivables", value: receivables.length, icon: Wallet, color: "bg-[#0A0082] text-white" },
    {
      key: "CURRENT",
      label: "Current",
      value: receivables.filter((r) => r.daysOverdue === 0).length,
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
    },
    {
      key: OVERDUE,
      label: "Overdue",
      value: receivables.filter((r) => r.daysOverdue > 0).length,
      icon: AlertTriangle,
      color: "bg-rose-600 text-white",
    },
    {
      key: "90_PLUS",
      label: "90+ Days Overdue",
      value: receivables.filter((r) => r.daysOverdue > 90).length,
      icon: Hourglass,
      color: "bg-amber-500 text-white",
    },
  ];

  const handleKpiClick = (key) => {
    setAgingFilter((prev) => (key === ALL || prev === key ? ALL : key));
  };

  const agingTabs = [
    { key: ALL, label: "All" },
    ...AGING_BUCKETS.map((bucket) => ({ key: bucket.key, label: bucket.label })),
    ...(agingCounts[NO_DUE_DATE_BUCKET.key] > 0 ? [{ key: NO_DUE_DATE_BUCKET.key, label: NO_DUE_DATE_BUCKET.label }] : []),
  ];

  const hasActiveFilters = Boolean(searchQuery || clientFilter || currencyFilter || agingFilter !== ALL);

  const resetFilters = () => {
    setSearchQuery("");
    setClientFilter("");
    setCurrencyFilter("");
    setAgingFilter(ALL);
  };

  const openInvoice = (r) => navigate(`/account-receivable/invoices/${r.invoiceId}`);

  const tableRows = pageRows.map((r) => ({
    onRowClick: () => setSelected(r),
    rowClass: r.invoiceId === sentInvoiceId ? "bg-teal-50/80" : "",
    invoiceNumber: <span className="font-mono font-bold text-indigo-700">{r.invoiceNumber}</span>,
    client: <span className="font-semibold text-slate-800">{r.clientName}</span>,
    project: <span className="text-slate-700">{r.projectName}</span>,
    invoiceDate: <span className="whitespace-nowrap">{r.invoiceDate ? formatDisplayDate(r.invoiceDate) : "—"}</span>,
    dueDate: <span className="whitespace-nowrap">{r.dueDate ? formatDisplayDate(r.dueDate) : "—"}</span>,
    invoiceAmount: <span className="whitespace-nowrap tabular-nums">{formatCurrency(r.invoiceAmount, r.currencyCode)}</span>,
    outstanding: (
      <span className="whitespace-nowrap font-bold tabular-nums text-slate-900">
        {formatCurrency(r.outstandingBalance, r.currencyCode)}
      </span>
    ),
    overdue: <AgingChip receivable={r} />,
    status: <StatusBadge label={RECEIVABLE_STATUS_LABELS[r.status] || r.status} size="sm" />,
    actions: (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          items={[
            { label: "View Details", icon: <Eye className="h-4 w-4 text-slate-600" />, onClick: () => setSelected(r) },
            {
              label: "Open Invoice",
              icon: <FileText className="h-4 w-4 text-indigo-600" />,
              onClick: () => openInvoice(r),
              disabled: !r.invoiceId,
            },
          ]}
        />
      </div>
    ),
  }));

  return (
    <div className="w-full space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Outstanding Receivables"
        subtitle="Balances still owed by clients for invoices that have been sent."
      />

      {/* 2. KPI Cards — click to filter, click the active card again to clear */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleKpiClick(kpi.key)}
            title={`Filter by ${kpi.label}`}
            className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ARKPICard
              label={kpi.label}
              value={loading ? "…" : kpi.value}
              icon={<kpi.icon className="h-5 w-5" />}
              color={kpi.color}
              className="h-full w-full"
            />
          </button>
        ))}
        <div className="col-span-2 sm:col-span-1">
          <ARKPICard
            label="Total Outstanding"
            value={loading ? "…" : formatCurrencyTotals(sumByCurrency(receivables))}
            icon={<Coins className="h-5 w-5" />}
            color="bg-indigo-600 text-white"
            className="h-full w-full"
          />
        </div>
      </div>

      {/* 3. Main Data Card */}
      <PageCard>
        <PageCardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Outstanding receivables</h2>
              <p className="mt-0.5 text-xs text-slate-500">Earliest due first. Settled receivables drop off this list.</p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
              <div className="min-w-0 flex-1 lg:w-72 lg:flex-none">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onSearch={(val) => setSearchQuery(val)}
                  placeholder="Search by invoice number, client, or project..."
                />
              </div>
              <div className="w-full sm:w-44">
                <ARFilterListbox
                  options={clientOptions}
                  value={clientFilter}
                  onChange={setClientFilter}
                  placeholder="All clients"
                />
              </div>
              <div className="w-full sm:w-36">
                <ARFilterListbox
                  options={currencyOptions}
                  value={currencyFilter}
                  onChange={setCurrencyFilter}
                  placeholder="All currencies"
                />
              </div>
              {hasActiveFilters && (
                <ARClearFiltersButton onClick={resetFilters} title="Clear all search, client, currency and aging filters" />
              )}
            </div>
          </div>

          <ARKPIStatusTabs
            label="Receivable aging"
            loading={loading}
            items={agingTabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              value: agingCounts[tab.key] ?? 0,
              active: agingFilter === tab.key,
              onClick: () => setAgingFilter(tab.key === ALL || agingFilter === tab.key ? ALL : tab.key),
            }))}
          />

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ARTable
                headers={TABLE_HEADERS}
                columns={TABLE_COLUMNS}
                rows={tableRows}
                loading={loading}
                emptyMessage={
                  hasActiveFilters
                    ? "No receivables match the selected filters."
                    : "No outstanding receivables. A receivable is created when an approved invoice is sent to the client."
                }
              />
              {!loading && filtered.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} receivables
                  </p>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  />
                </div>
              )}
            </div>
          )}
        </PageCardContent>
      </PageCard>

      {/* Receivable details */}
      <DetailsDrawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.invoiceNumber}
        subtitle={selected ? `${selected.clientName} · ${selected.projectName}` : ""}
        badge={selected && <StatusBadge label={RECEIVABLE_STATUS_LABELS[selected.status] || selected.status} size="sm" />}
      >
        {selected && (
          <div className="space-y-4 pb-3">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Invoice amount">
                <span className="tabular-nums">{formatCurrency(selected.invoiceAmount, selected.currencyCode)}</span>
              </DetailRow>
              <DetailRow label="Amount received">
                <span className="tabular-nums">{formatCurrency(selected.amountReceived, selected.currencyCode)}</span>
              </DetailRow>
              <DetailRow label="Outstanding balance">
                <span className="font-bold tabular-nums">{formatCurrency(selected.outstandingBalance, selected.currencyCode)}</span>
              </DetailRow>
              <DetailRow label="Invoice date">{selected.invoiceDate ? formatDisplayDate(selected.invoiceDate) : "—"}</DetailRow>
              <DetailRow label="Due date">{selected.dueDate ? formatDisplayDate(selected.dueDate) : "—"}</DetailRow>
              <DetailRow label="Days outstanding">
                <span className="tabular-nums">{selected.daysOutstanding ?? "—"}</span>
              </DetailRow>
              <DetailRow label="Overdue">
                <AgingChip receivable={selected} />
              </DetailRow>
              <DetailRow label="Receivable created">
                {selected.createdAt ? formatDisplayDateTime(selected.createdAt) : "—"}
              </DetailRow>
            </dl>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Delivery history</p>
              {deliveriesLoading ? (
                <LoadingSpinner size="sm" text="Loading delivery history..." />
              ) : deliveries.length === 0 ? (
                <p className="text-sm text-slate-500">No delivery records found.</p>
              ) : (
                <ul className="space-y-2">
                  {deliveries.map((d) => {
                    const failed = String(d.deliveryStatus).toUpperCase() === "FAILED";
                    return (
                      <li key={d.deliveryId} className="flex items-start gap-2.5 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                        <Mail className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${failed ? "text-rose-500" : "text-teal-600"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">{d.recipientEmail || "—"}</span>
                            <StatusBadge label={d.deliveryStatus} size="sm" />
                          </div>
                          <p className="mt-0.5 text-slate-500">
                            {formatDisplayDateTime(d.sentAt || d.failedAt || d.createdAt) || "—"}
                          </p>
                          {failed && d.failureReason && <p className="mt-0.5 text-rose-700">{d.failureReason}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openInvoice(selected)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A0082] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <FileText className="h-4 w-4" /> Open invoice
              </button>
            </div>
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}
