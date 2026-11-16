import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DollarSign,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  FileStack,
} from "lucide-react";

import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import ARTable from "../components/common/ARTable";
import ARFilterListbox from "../components/common/ARFilterListbox";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import ReceivableStatusBadge from "../components/common/ReceivableStatusBadge";
import { ConsoleHeader, StatTile, StatTileGrid, RegisterCard } from "../components/receivables/ConsoleUI";
import {
  ChartPanel,
  AgingChart,
  ClientDonut,
  CollectionTrend,
  FilterSelect,
  ExportMenu,
} from "../components/receivables/ReceivablesWidgets";
import InvoiceDetailPanel from "../components/receivables/InvoiceDetailPanel";
import useOutstandingReceivables from "../hooks/useOutstandingReceivables";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import {
  getReceivableDueState,
  getAgingBucket,
  RECEIVABLE_DUE_STATE,
  AGING_BUCKETS,
  NO_DUE_DATE_BUCKET,
} from "../services/receivableService";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const AR = "/account-receivable";
const PATHS = {
  payments: `${AR}/payments`,
  ledger: `${AR}/customer-ledger`,
  notes: `${AR}/adjustment-notes`,
  collections: `${AR}/collections`,
};

const { NOT_DUE, DUE_TODAY, OVERDUE, PARTIALLY_PAID } = RECEIVABLE_DUE_STATE;

const AGING_COLORS = {
  CURRENT: "#22c55e",
  "1_30": "#3b82f6",
  "31_60": "#facc15",
  "61_90": "#fb923c",
  "90_PLUS": "#ef4444",
  NO_DUE_DATE: "#94a3b8",
};
const AGING_SHORT = { CURRENT: "Not Due", "1_30": "1-30 Days", "31_60": "31-60 Days", "61_90": "61-90 Days", "90_PLUS": "90+ Days", NO_DUE_DATE: "No Due Date" };

const CLIENT_COLORS = ["#2563eb", "#3b82f6", "#facc15", "#22c55e", "#cbd5e1"];

const TABS = [
  { key: "OPEN", label: "Open Invoices", test: () => true },
  { key: "OVERDUE", label: "Overdue", test: (r) => r.daysOverdue > 0 },
  { key: "DUE_SOON", label: "Due Soon", test: (r) => r.daysUntilDue >= 0 && r.daysUntilDue <= 7 },
  { key: "PARTIAL", label: "Partially Paid", test: (r) => r.amountReceived > 0 },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: NOT_DUE.key, label: NOT_DUE.label },
  { value: DUE_TODAY.key, label: DUE_TODAY.label },
  { value: OVERDUE.key, label: OVERDUE.label },
  { value: PARTIALLY_PAID.key, label: PARTIALLY_PAID.label },
];

const AGING_OPTIONS = [{ value: "", label: "All aging" }, ...[...AGING_BUCKETS, NO_DUE_DATE_BUCKET].map((b) => ({ value: b.key, label: b.label }))];

const TABLE_HEADERS_TAIL = ["Invoice No", "Client", "Project", "Invoice Date", "Due Date", "Amount", "Received", "Outstanding", "Status", "Aging"];
const TABLE_COLUMNS = ["select", "invoiceNumber", "client", "project", "invoiceDate", "dueDate", "amount", "received", "outstanding", "status", "aging"];

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const sumOutstanding = (rows) => rows.reduce((s, r) => s + r.outstandingBalance, 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const shiftMonth = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
};

// CSV export of the visible / selected invoices.
const downloadCsv = (rows, filename) => {
  const head = ["Invoice No", "Client", "Project", "Invoice Date", "Due Date", "Currency", "Amount", "Received", "Outstanding", "Status", "Days Overdue"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.invoiceNumber,
      r.clientName,
      r.projectName,
      r.invoiceDate || "",
      r.dueDate || "",
      r.currencyCode,
      r.invoiceAmount.toFixed(2),
      r.amountReceived.toFixed(2),
      r.outstandingBalance.toFixed(2),
      getReceivableDueState(r).label,
      r.daysOverdue ?? "",
    ]
      .map(esc)
      .join(",")
  );
  const blob = new Blob([[head.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Receivables() {
  const navigate = useNavigate();
  const location = useLocation();
  // Set when arriving straight from "Send to Client" — that invoice's new receivable.
  const sentInvoiceId = location.state?.sentInvoiceId || null;

  // Re-aged against today and refetched when the date rolls over, so an
  // invoice whose due date passes turns overdue without a reload.
  const { receivables, loading, error, today } = useOutstandingReceivables();

  const [currency, setCurrency] = useState(null);
  const [trendMonths, setTrendMonths] = useState(6);

  // Table filters
  const [tab, setTab] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agingFilter, setAgingFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [checked, setChecked] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [panelClosed, setPanelClosed] = useState(false);

  /* ---------------------------- Scope & currency ---------------------------- */

  // Amounts never mix currencies: the page works in one at a time.
  const currencies = useMemo(() => {
    const totals = {};
    receivables.forEach((r) => (totals[r.currencyCode] = (totals[r.currencyCode] || 0) + r.outstandingBalance));
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [receivables]);

  useEffect(() => {
    if (!sentInvoiceId || currency) return;
    const sent = receivables.find((r) => r.invoiceId === sentInvoiceId);
    if (sent) setCurrency(sent.currencyCode);
  }, [receivables, sentInvoiceId, currency]);

  const activeCurrency = currencies.includes(currency) ? currency : currencies[0] || "USD";
  const book = useMemo(() => receivables.filter((r) => r.currencyCode === activeCurrency), [receivables, activeCurrency]);
  const money = (v) => formatCurrency(v, activeCurrency);
  const compactMoney = (v) => compactNumber.format(v || 0);

  /* ------------------------------- KPIs ------------------------------- */

  const kpi = useMemo(() => {
    const overdue = book.filter((r) => r.daysOverdue > 0);
    const dueSoon = book.filter((r) => r.daysUntilDue >= 0 && r.daysUntilDue <= 30);
    const billed = book.reduce((s, r) => s + r.invoiceAmount, 0);
    const received = book.reduce((s, r) => s + r.amountReceived, 0);
    const total = sumOutstanding(book);
    const overdueAmount = sumOutstanding(overdue);
    return {
      total,
      overdue: overdueAmount,
      overdueCount: overdue.length,
      overdueShare: total > 0 ? Math.round((overdueAmount / total) * 100) : 0,
      critical: sumOutstanding(overdue.filter((r) => r.daysOverdue > 60)),
      dueSoon: sumOutstanding(dueSoon),
      dueSoonCount: dueSoon.length,
      dueThisWeek: sumOutstanding(dueSoon.filter((r) => r.daysUntilDue <= 7)),
      collectionRate: billed > 0 ? Math.round((received / billed) * 100) : 0,
      received,
      invoices: book.length,
      partial: book.filter((r) => r.amountReceived > 0).length,
      clients: new Set(book.map((r) => r.clientId)).size,
    };
  }, [book]);

  /* ------------------------------ Charts ------------------------------ */

  const agingRows = useMemo(() => {
    const rows = [...AGING_BUCKETS, NO_DUE_DATE_BUCKET].map((b) => ({
      key: b.key,
      label: b.label,
      shortLabel: AGING_SHORT[b.key],
      amount: 0,
      count: 0,
      color: AGING_COLORS[b.key],
    }));
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    book.forEach((r) => {
      const b = byKey[getAgingBucket(r).key];
      b.amount += r.outstandingBalance;
      b.count += 1;
    });
    return rows.filter((r) => r.key !== NO_DUE_DATE_BUCKET.key || r.count > 0);
  }, [book]);

  // Top 4 clients by balance, the rest folded into "Others".
  const clientSlices = useMemo(() => {
    const totals = new Map();
    book.forEach((r) => totals.set(r.clientName, (totals.get(r.clientName) || 0) + r.outstandingBalance));
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, 4).map(([name, value], i) => ({ name, value, color: CLIENT_COLORS[i] }));
    const rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
    return rest > 0 ? [...head, { name: "Others", value: rest, color: CLIENT_COLORS[4] }] : head;
  }, [book]);

  // Billed vs received per invoice month (payment dates arrive with the payments API).
  const trend = useMemo(() => {
    const current = today.slice(0, 7);
    const months = Array.from({ length: trendMonths }, (_, i) => shiftMonth(current, i - (trendMonths - 1)));
    const byMonth = Object.fromEntries(months.map((k) => [k, { key: k, label: monthLabel(k), billed: 0, received: 0 }]));
    book.forEach((r) => {
      const m = byMonth[(r.invoiceDate || "").slice(0, 7)];
      if (!m) return;
      m.billed += r.invoiceAmount;
      m.received += r.amountReceived;
    });
    return months.map((k) => byMonth[k]);
  }, [book, today, trendMonths]);

  /* ------------------------------- Table ------------------------------- */

  const tabCounts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, book.filter(t.test).length])), [book]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tabTest = TABS.find((t) => t.key === tab)?.test || (() => true);
    return book.filter((r) => {
      if (!tabTest(r)) return false;
      if (statusFilter && getReceivableDueState(r).key !== statusFilter) return false;
      if (agingFilter && getAgingBucket(r).key !== agingFilter) return false;
      if (q && ![r.invoiceNumber, r.clientName, r.projectName].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [book, tab, search, statusFilter, agingFilter]);

  useEffect(() => setPage(1), [tab, search, statusFilter, agingFilter, activeCurrency]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Land on the just-sent invoice's page and open it.
  useEffect(() => {
    if (loading || !sentInvoiceId) return;
    const index = filtered.findIndex((r) => r.invoiceId === sentInvoiceId);
    if (index >= 0) {
      setPage(Math.floor(index / pageSize) + 1);
      setSelectedId(filtered[index].receivableId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sentInvoiceId, activeCurrency]);

  // The panel shows the selected invoice, or the first row until the user closes it.
  const selected =
    receivables.find((r) => r.receivableId === selectedId) || (!panelClosed && pageRows.length > 0 ? pageRows[0] : null);

  const hasActiveFilters = Boolean(search.trim() || statusFilter || agingFilter || tab !== "OPEN");
  const resetTableFilters = () => {
    setSearch("");
    setStatusFilter("");
    setAgingFilter("");
    setTab("OPEN");
  };

  const toggleChecked = (id) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allOnPageChecked = pageRows.length > 0 && pageRows.every((r) => checked.has(r.receivableId));
  const togglePage = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => (allOnPageChecked ? next.delete(r.receivableId) : next.add(r.receivableId)));
      return next;
    });
  const checkedRows = receivables.filter((r) => checked.has(r.receivableId));

  // Next steps for the selected invoice — each hands it to its screen pre-selected.
  const panelActions = (r) => ({
    recordPayment: () => navigate(PATHS.payments, { state: { recordPaymentFor: { clientId: r.clientId, receivableId: r.receivableId } } }),
    addFollowUp: () => navigate(PATHS.collections, { state: { tab: "reminders", sendReminderFor: r.receivableId } }),
    creditNote: () => navigate(PATHS.notes, { state: { raiseNote: { noteType: "CREDIT", receivableId: r.receivableId } } }),
    debitNote: () => navigate(PATHS.notes, { state: { raiseNote: { noteType: "DEBIT", receivableId: r.receivableId } } }),
    openCase: () => navigate(PATHS.collections, { state: { tab: "cases", openCaseFor: { clientId: r.clientId, receivableIds: [r.receivableId] } } }),
    viewLedger: () => navigate(PATHS.ledger, { state: { tab: "ledger", clientId: r.clientId, currencyCode: r.currencyCode } }),
    openInvoice: () => navigate(`${AR}/invoices/${r.invoiceId}`),
    viewFollowUps: () => navigate(PATHS.collections, { state: { tab: "reminders" } }),
  });

  const show = (v) => (loading ? "…" : v);
  const checkbox = "h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500";

  // Same cell styling as the Dashboard's debtor ledger (ARTable).
  const tableHeaders = [
    <input key="all" type="checkbox" aria-label="Select all on this page" checked={allOnPageChecked} onChange={togglePage} className={checkbox} />,
    ...TABLE_HEADERS_TAIL,
  ];
  const tableRows = pageRows.map((r) => {
    const isSelected = selected?.receivableId === r.receivableId;
    return {
      onRowClick: () => {
        setSelectedId(r.receivableId);
        setPanelClosed(false);
      },
      rowClass: isSelected ? "bg-blue-50/70" : r.invoiceId === sentInvoiceId ? "bg-teal-50/70" : "",
      select: (
        <div onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" aria-label={`Select ${r.invoiceNumber}`} checked={checked.has(r.receivableId)} onChange={() => toggleChecked(r.receivableId)} className={checkbox} />
        </div>
      ),
      invoiceNumber: <span className="whitespace-nowrap font-mono font-bold text-indigo-700">{r.invoiceNumber}</span>,
      client: <div className="font-semibold text-slate-800">{r.clientName}</div>,
      project: (
        <div className="max-w-[14rem] truncate font-bold text-slate-900" title={r.projectName}>
          {r.projectName}
        </div>
      ),
      invoiceDate: <div className="whitespace-nowrap font-medium text-slate-700">{r.invoiceDate ? formatDisplayDate(r.invoiceDate) : "—"}</div>,
      dueDate: (
        <div className="whitespace-nowrap">
          <div className="font-medium text-slate-700">{r.dueDate ? formatDisplayDate(r.dueDate) : "—"}</div>
          {r.daysOverdue > 0 ? (
            <div className={`text-xs font-semibold ${r.daysOverdue > 60 ? "text-rose-600" : r.daysOverdue > 30 ? "text-amber-600" : "text-rose-500"}`}>
              {plural(r.daysOverdue, "day")} overdue
            </div>
          ) : r.daysUntilDue !== null && r.daysUntilDue !== undefined ? (
            <div className="text-xs font-semibold text-slate-400">{r.daysUntilDue === 0 ? "Due today" : `Due in ${plural(r.daysUntilDue, "day")}`}</div>
          ) : null}
        </div>
      ),
      amount: <div className="whitespace-nowrap tabular-nums font-medium text-slate-700">{formatCurrency(r.invoiceAmount, r.currencyCode)}</div>,
      received: <div className="whitespace-nowrap tabular-nums font-medium text-emerald-700">{formatCurrency(r.amountReceived, r.currencyCode)}</div>,
      outstanding: <div className="whitespace-nowrap tabular-nums font-bold text-slate-900">{formatCurrency(r.outstandingBalance, r.currencyCode)}</div>,
      status: (
        <div className="flex justify-center">
          <ReceivableStatusBadge receivable={r} />
        </div>
      ),
      aging: (
        <div className={`whitespace-nowrap font-medium ${r.daysOverdue > 0 ? "font-semibold text-rose-600" : "text-slate-700"}`}>
          {r.daysOutstanding === null ? "—" : plural(r.daysOutstanding, "day")}
        </div>
      ),
    };
  });

  /* ------------------------------- Render ------------------------------- */

  return (
    <div className="space-y-5 pb-12">
      <ConsoleHeader
        title="Outstanding Receivables"
        subtitle="Track, monitor and manage client receivables, payments and collections."
        actions={
          <>
            {currencies.length > 1 && (
              <FilterSelect value={activeCurrency} onChange={setCurrency} className="w-24" options={currencies.map((c) => ({ value: c, label: c }))} />
            )}
            <ExportMenu
              items={[
                { label: `Export current view (${filtered.length})`, onClick: () => downloadCsv(filtered, `outstanding-receivables-${today}.csv`), disabled: filtered.length === 0 },
                { label: `Export selected (${checkedRows.length})`, onClick: () => downloadCsv(checkedRows, `receivables-selected-${today}.csv`), disabled: checkedRows.length === 0 },
              ]}
            />
          </>
        }
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPIs */}
      <StatTileGrid columns={5}>
        <StatTile
          label="Total Outstanding"
          value={show(money(kpi.total))}
          icon={DollarSign}
          iconClass="bg-blue-50 text-blue-700"
          hint="All open invoices"
          footerLabel="Open invoices"
          footerValue={show(plural(kpi.invoices, "invoice"))}
        />
        <StatTile
          label="Overdue Exposure"
          variant="danger"
          value={show(money(kpi.overdue))}
          icon={AlertTriangle}
          iconClass="bg-rose-100 text-rose-700"
          hint={show(`${kpi.overdueShare}% of total book · ${plural(kpi.overdueCount, "invoice")}`)}
          hintClass="text-rose-600"
          footerLabel="Critical (>60 days)"
          footerValue={show(money(kpi.critical))}
          footerValueClass="font-bold text-rose-700"
        />
        <StatTile
          label="Due in 0-30 Days"
          value={show(money(kpi.dueSoon))}
          icon={CalendarDays}
          iconClass="bg-amber-50 text-amber-700"
          hint={show(plural(kpi.dueSoonCount, "upcoming payment"))}
          hintClass="text-amber-600"
          footerLabel="Due this week"
          footerValue={show(money(kpi.dueThisWeek))}
        />
        <StatTile
          label="Collection Rate"
          value={show(`${kpi.collectionRate}%`)}
          icon={TrendingUp}
          iconClass="bg-emerald-50 text-emerald-700"
          hint="Received vs billed, open invoices"
          hintClass="text-emerald-600"
          footerLabel="Received to date"
          footerValue={show(money(kpi.received))}
        />
        <StatTile
          label="Open Invoices"
          value={show(kpi.invoices)}
          icon={FileStack}
          iconClass="bg-indigo-50 text-indigo-700"
          hint={show(`Across ${plural(kpi.clients, "client")}`)}
          hintClass="text-indigo-600"
          footerLabel="Partially paid"
          footerValue={show(plural(kpi.partial, "invoice"))}
        />
      </StatTileGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartPanel title="Aging Analysis">
          {book.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">{loading ? "Loading…" : "Nothing outstanding to age."}</p>
          ) : (
            <AgingChart rows={agingRows} formatAmount={money} compactAmount={compactMoney} />
          )}
        </ChartPanel>

        <ChartPanel
          title="Receivables by Client"
          action={
            <button type="button" onClick={() => navigate(PATHS.ledger, { state: { tab: "aging", currencyCode: activeCurrency } })} className="text-xs font-semibold text-blue-600 hover:underline">
              View Report
            </button>
          }
        >
          {clientSlices.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">{loading ? "Loading…" : "No client balances."}</p>
          ) : (
            <ClientDonut slices={clientSlices} centerValue={compactMoney(kpi.total)} formatAmount={money} />
          )}
        </ChartPanel>

        <ChartPanel
          title="Collection Trend"
          action={
            <FilterSelect
              value={String(trendMonths)}
              onChange={(v) => setTrendMonths(Number(v))}
              className="w-36"
              options={[
                { value: "6", label: "Last 6 Months" },
                { value: "12", label: "Last 12 Months" },
              ]}
            />
          }
        >
          <CollectionTrend data={trend} formatAmount={money} compactAmount={compactMoney} />
          <p className="mt-1 text-[11px] text-slate-400">By invoice month, open invoices.</p>
        </ChartPanel>
      </div>

      {/* Invoices, with the detail panel below */}
      <div className="space-y-4">
        <RegisterCard
          title="Outstanding Invoices"
          subtitle="Every invoice sent to a client with a balance still due. Select a row to see its details and next steps."
          wideToolbar
          toolbar={
            <>
              <div className="min-w-0 flex-1 lg:w-80 lg:flex-none">
                <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onSearch={setSearch} placeholder="Search by invoice no, client, project..." />
              </div>
              <div className="w-full sm:w-40">
                <ARFilterListbox options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" />
              </div>
              <div className="w-full sm:w-40">
                <ARFilterListbox options={AGING_OPTIONS} value={agingFilter} onChange={setAgingFilter} placeholder="All aging" />
              </div>
              {hasActiveFilters && <ARClearFiltersButton onClick={resetTableFilters} label="Clear filters" />}
            </>
          }
          tabs={{
            label: "Invoice views",
            loading,
            items: TABS.map((t) => ({
              key: t.key,
              label: t.label,
              value: tabCounts[t.key],
              active: tab === t.key,
              onClick: () => setTab(t.key === "OPEN" || tab === t.key ? "OPEN" : t.key),
            })),
          }}
          footer={
            !loading && filtered.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPrevious={() => setPage((p) => Math.max(p - 1, 1))}
                onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
              />
            )
          }
        >
          <ARTable
            headers={tableHeaders}
            columns={TABLE_COLUMNS}
            rows={tableRows}
            loading={loading}
            emptyMessage={receivables.length === 0 ? "Nothing outstanding. An invoice appears here once it is sent to the client." : "No invoices match the selected filters."}
          />
        </RegisterCard>

        {selected && (
          <div>
            <InvoiceDetailPanel
              receivable={selected}
              onClose={() => {
                setSelectedId(null);
                setPanelClosed(true);
              }}
              actions={panelActions(selected)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
