import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  Clock,
  Building2,
  BarChart3,
  Users,
  ShieldAlert,
  BellRing,
  Briefcase,
  Eye,
  FileText,
  Mail,
  Banknote,
  FileMinus,
  FilePlus,
  BookOpen,
} from "lucide-react";

import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import DetailsDrawer from "../components/common/DetailsDrawer";
import ReceivableStatusBadge from "../components/common/ReceivableStatusBadge";
import {
  ConsoleHeader,
  StatTile,
  StatTileGrid,
  SectionCard,
  RegisterCard,
  Segmented,
  AgingBars,
} from "../components/receivables/ConsoleUI";
import useOutstandingReceivables from "../hooks/useOutstandingReceivables";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import {
  getReceivableDueState,
  getAgingBucket,
  describeDue,
  RECEIVABLE_DUE_STATE,
  AGING_BUCKETS,
  NO_DUE_DATE_BUCKET,
} from "../services/receivableService";
import { getInvoiceDeliveries } from "../services/invoiceService";

const PAGE_SIZE = 10;
const ALL = "ALL";
const { NOT_DUE, DUE_TODAY, OVERDUE, PARTIALLY_PAID, NO_DUE_DATE } = RECEIVABLE_DUE_STATE;

const PATHS = {
  payments: "/account-receivable/payments",
  ledger: "/account-receivable/customer-ledger",
  notes: "/account-receivable/adjustment-notes",
  collections: "/account-receivable/collections",
};

// Calm → urgent, matching the Dashboard's aging palette.
const AGING_COLORS = {
  CURRENT: "#10b981",
  "1_30": "#3b82f6",
  "31_60": "#f59e0b",
  "61_90": "#f97316",
  "90_PLUS": "#ef4444",
  NO_DUE_DATE: "#94a3b8",
};

const TABLE_HEADERS = ["Invoice No.", "Client", "Project", "Invoice Date", "Due Date", "Invoice Amount", "Outstanding", "Status", "Actions"];
const TABLE_COLUMNS = ["invoiceNumber", "client", "project", "invoiceDate", "dueDate", "invoiceAmount", "outstanding", "status", "actions"];

const sum = (rows) => rows.reduce((s, r) => s + r.outstandingBalance, 0);

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

  // Re-aged against today and refetched when the date rolls over, so an
  // invoice whose due date passes turns overdue without a reload.
  const { receivables, loading, error } = useOutstandingReceivables();

  const [currency, setCurrency] = useState(null);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  /* ------------------------------ Currency ------------------------------ */

  // Amounts never mix currencies: the whole console works in one at a time,
  // defaulting to the one with the most money owed.
  const currencies = useMemo(() => {
    const totals = {};
    receivables.forEach((r) => {
      totals[r.currencyCode] = (totals[r.currencyCode] || 0) + r.outstandingBalance;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([code]) => code);
  }, [receivables]);

  const activeCurrency = currencies.includes(currency) ? currency : currencies[0] || null;
  // The just-sent invoice decides the starting currency, so it is visible.
  useEffect(() => {
    if (!sentInvoiceId || currency) return;
    const sent = receivables.find((r) => r.invoiceId === sentInvoiceId);
    if (sent) setCurrency(sent.currencyCode);
  }, [receivables, sentInvoiceId, currency]);

  const book = useMemo(
    () => (activeCurrency ? receivables.filter((r) => r.currencyCode === activeCurrency) : []),
    [receivables, activeCurrency]
  );
  const money = (amount) => formatCurrency(amount, activeCurrency || "USD");

  /* ------------------------------ Metrics ------------------------------ */

  const metrics = useMemo(() => {
    const overdue = book.filter((r) => r.daysOverdue > 0);
    const critical = overdue.filter((r) => r.daysOverdue > 60);
    const dueToday = book.filter((r) => r.daysUntilDue === 0);
    const dueSoon = book.filter((r) => r.daysUntilDue >= 1 && r.daysUntilDue <= 7);
    const ages = book.map((r) => r.daysOutstanding).filter((d) => d !== null && d !== undefined);
    const total = sum(book);

    const byClient = new Map();
    book.forEach((r) => {
      const c = byClient.get(r.clientId) || { clientId: r.clientId, clientName: r.clientName, total: 0, overdue: 0, invoices: 0 };
      c.total += r.outstandingBalance;
      c.invoices += 1;
      if (r.daysOverdue > 0) c.overdue += r.outstandingBalance;
      byClient.set(r.clientId, c);
    });
    const debtors = [...byClient.values()].sort((a, b) => b.total - a.total);

    return {
      total,
      count: book.length,
      overdue,
      overdueAmount: sum(overdue),
      overduePct: total > 0 ? Math.round((sum(overdue) / total) * 100) : 0,
      critical,
      criticalAmount: sum(critical),
      dueToday,
      dueSoon,
      avgDays: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
      oldestDays: ages.length ? Math.max(...ages) : null,
      notDue: book.filter((r) => getReceivableDueState(r).key === NOT_DUE.key).length,
      debtors,
    };
  }, [book]);

  const agingRows = useMemo(() => {
    const buckets = [...AGING_BUCKETS, NO_DUE_DATE_BUCKET].map((b) => ({ key: b.key, label: b.key === "CURRENT" ? "Current (not overdue)" : b.label, count: 0, amount: 0, color: AGING_COLORS[b.key] }));
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    book.forEach((r) => {
      const b = byKey[getAgingBucket(r).key];
      b.count += 1;
      b.amount += r.outstandingBalance;
    });
    return buckets.filter((b) => b.key !== NO_DUE_DATE_BUCKET.key || b.count > 0);
  }, [book]);

  /* ------------------------------- Table ------------------------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, activeCurrency]);

  const searched = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return book;
    return book.filter((r) => [r.invoiceNumber, r.clientName, r.projectName].some((v) => String(v || "").toLowerCase().includes(query)));
  }, [book, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { [ALL]: searched.length };
    searched.forEach((r) => {
      const key = getReceivableDueState(r).key;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [searched]);

  const filtered = useMemo(
    () => (statusFilter === ALL ? searched : searched.filter((r) => getReceivableDueState(r).key === statusFilter)),
    [searched, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Bring the just-sent invoice's receivable into view once the list loads.
  useEffect(() => {
    if (loading || !sentInvoiceId) return;
    const index = filtered.findIndex((r) => r.invoiceId === sentInvoiceId);
    if (index >= 0) setCurrentPage(Math.floor(index / PAGE_SIZE) + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sentInvoiceId, activeCurrency]);

  const toggleStatus = (key) => setStatusFilter((prev) => (key === ALL || prev === key ? ALL : key));
  const hasActiveFilters = Boolean(searchQuery || statusFilter !== ALL);

  const statusOptions = [
    { value: ALL, label: "All", count: statusCounts[ALL] ?? 0 },
    { value: NOT_DUE.key, label: NOT_DUE.label, count: statusCounts[NOT_DUE.key] ?? 0 },
    { value: DUE_TODAY.key, label: DUE_TODAY.label, count: statusCounts[DUE_TODAY.key] ?? 0 },
    { value: OVERDUE.key, label: OVERDUE.label, count: statusCounts[OVERDUE.key] ?? 0 },
    ...[PARTIALLY_PAID, NO_DUE_DATE].filter((s) => statusCounts[s.key] > 0).map((s) => ({ value: s.key, label: s.label, count: statusCounts[s.key] })),
  ];

  /* ----------------------------- Navigation ----------------------------- */

  const openInvoice = (r) => navigate(`/account-receivable/invoices/${r.invoiceId}`);

  // Next steps in the AR flow — each hands the receivable to its screen pre-selected.
  const nextStepItems = (r) => [
    {
      label: "Record Payment",
      icon: <Banknote className="h-4 w-4 text-emerald-600" />,
      onClick: () => navigate(PATHS.payments, { state: { recordPaymentFor: { clientId: r.clientId, receivableId: r.receivableId } } }),
    },
    {
      label: "Raise Credit Note",
      icon: <FileMinus className="h-4 w-4 text-emerald-600" />,
      onClick: () => navigate(PATHS.notes, { state: { raiseNote: { noteType: "CREDIT", receivableId: r.receivableId } } }),
    },
    {
      label: "Raise Debit Note",
      icon: <FilePlus className="h-4 w-4 text-rose-600" />,
      onClick: () => navigate(PATHS.notes, { state: { raiseNote: { noteType: "DEBIT", receivableId: r.receivableId } } }),
    },
    {
      label: "Send Reminder",
      icon: <BellRing className="h-4 w-4 text-amber-600" />,
      onClick: () => navigate(PATHS.collections, { state: { tab: "reminders", sendReminderFor: r.receivableId } }),
    },
    {
      label: "Open Collection Case",
      icon: <Briefcase className="h-4 w-4 text-rose-600" />,
      hidden: !(r.daysOverdue > 0),
      onClick: () => navigate(PATHS.collections, { state: { tab: "cases", openCaseFor: { clientId: r.clientId, receivableIds: [r.receivableId] } } }),
    },
    {
      label: "View Customer Ledger",
      icon: <BookOpen className="h-4 w-4 text-slate-600" />,
      onClick: () => navigate(PATHS.ledger, { state: { tab: "ledger", clientId: r.clientId, currencyCode: r.currencyCode } }),
    },
  ];

  /* ------------------------------ Drawer ------------------------------ */

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

  // Keep the open drawer in step with live aging (e.g. it turns overdue at midnight).
  const selectedLive = selected ? receivables.find((r) => r.receivableId === selected.receivableId) || selected : null;

  const tableRows = pageRows.map((r) => {
    const dueText = describeDue(r);
    return {
      onRowClick: () => setSelected(r),
      rowClass: r.invoiceId === sentInvoiceId ? "bg-teal-50/80" : "",
      invoiceNumber: (
        <div className="text-left">
          <span className="font-mono font-bold text-indigo-700">{r.invoiceNumber}</span>
        </div>
      ),
      client: <div className="text-left font-semibold text-slate-800">{r.clientName}</div>,
      project: (
        <div className="text-left">
          <div className="font-bold text-slate-900">{r.projectName}</div>
        </div>
      ),
      invoiceDate: (
        <div className="flex items-center justify-start font-medium text-slate-700">
          {r.invoiceDate ? formatDisplayDate(r.invoiceDate) : "—"}
        </div>
      ),
      dueDate: (
        <div className="text-left">
          <div className="font-medium text-slate-700">{r.dueDate ? formatDisplayDate(r.dueDate) : "—"}</div>
          {dueText && (
            <div
              className={`text-xs font-semibold ${
                r.daysOverdue > 60 ? "text-rose-600" : r.daysOverdue > 0 ? "text-amber-600" : r.daysUntilDue === 0 ? "text-blue-600" : "text-slate-400"
              }`}
            >
              {dueText}
            </div>
          )}
        </div>
      ),
      invoiceAmount: <div className="text-left tabular-nums font-medium text-slate-700">{formatCurrency(r.invoiceAmount, r.currencyCode)}</div>,
      outstanding: <div className="text-left tabular-nums font-bold text-slate-900">{formatCurrency(r.outstandingBalance, r.currencyCode)}</div>,
      status: (
        <div className="flex flex-col items-center justify-center gap-1">
          <ReceivableStatusBadge receivable={r} />
        </div>
      ),
      actions: (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            items={[
              { label: "View Details", icon: <Eye className="h-4 w-4 text-slate-600" />, onClick: () => setSelected(r) },
              { label: "Open Invoice", icon: <FileText className="h-4 w-4 text-indigo-600" />, onClick: () => openInvoice(r), disabled: !r.invoiceId },
              ...nextStepItems(r),
            ]}
          />
        </div>
      ),
    };
  });

  const show = (value) => (loading ? "…" : value);

  return (
    <div className="space-y-6 pb-12">
      {/* Header with currency control */}
      <ConsoleHeader
        title="Outstanding Receivables"
        subtitle="Track every invoice sent to a client until it is paid — what is owed, when it falls due, and what is overdue."
        actions={
          currencies.length > 0 && (
            <Segmented
              label="Currency"
              dark
              value={activeCurrency}
              onChange={setCurrency}
              options={currencies.map((code) => ({ value: code, label: code }))}
            />
          )
        }
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Row 1: Executive tiles */}
      <StatTileGrid columns={6}>
        <StatTile
          label="Total Outstanding"
          icon={DollarSign}
          iconClass="bg-blue-50 text-blue-700"
          value={show(money(metrics.total))}
          hint={`Across ${metrics.count} open invoice${metrics.count === 1 ? "" : "s"}`}
          footerLabel="Show all"
          footerValue={`${metrics.count} Invoices`}
          onClick={() => toggleStatus(ALL)}
          active={statusFilter === ALL}
        />
        <StatTile
          label="Overdue Exposure"
          variant="danger"
          icon={AlertTriangle}
          iconClass="bg-rose-100 text-rose-700"
          value={show(money(metrics.overdueAmount))}
          hint={`${metrics.overduePct}% of the book`}
          hintClass="text-rose-600"
          footerLabel="Critical (>60 days)"
          footerValue={money(metrics.criticalAmount)}
          footerValueClass="text-rose-700"
          onClick={() => toggleStatus(OVERDUE.key)}
          active={statusFilter === OVERDUE.key}
        />
        <StatTile
          label="Due Today"
          variant={metrics.dueToday.length ? "warning" : "default"}
          icon={CalendarCheck}
          iconClass="bg-amber-50 text-amber-700"
          value={show(money(sum(metrics.dueToday)))}
          hint={`${metrics.dueToday.length} invoice${metrics.dueToday.length === 1 ? "" : "s"} expected today`}
          hintClass="text-amber-700"
          footerLabel="Becomes overdue"
          footerValue="Tomorrow"
          onClick={() => toggleStatus(DUE_TODAY.key)}
          active={statusFilter === DUE_TODAY.key}
        />
        <StatTile
          label="Due Next 7 Days"
          icon={CalendarClock}
          iconClass="bg-indigo-50 text-indigo-700"
          value={show(money(sum(metrics.dueSoon)))}
          hint={`${metrics.dueSoon.length} invoice${metrics.dueSoon.length === 1 ? "" : "s"} falling due`}
          hintClass="text-indigo-600"
          footerLabel="Not yet due"
          footerValue={`${metrics.notDue} Invoices`}
          onClick={() => toggleStatus(NOT_DUE.key)}
          active={statusFilter === NOT_DUE.key}
        />
        <StatTile
          label="Avg Days Outstanding"
          icon={Clock}
          iconClass="bg-emerald-50 text-emerald-700"
          value={show(metrics.avgDays === null ? "—" : `${metrics.avgDays} days`)}
          hint="Since invoice date, open invoices"
          footerLabel="Oldest open invoice"
          footerValue={metrics.oldestDays === null ? "—" : `${metrics.oldestDays} days`}
        />
        <StatTile
          label="Clients Owing"
          icon={Building2}
          iconClass="bg-slate-100 text-slate-700"
          value={show(metrics.debtors.length)}
          hint={`${metrics.debtors.filter((d) => d.overdue > 0).length} with overdue balances`}
          hintClass="text-slate-500"
          footerLabel="Largest debtor"
          footerValue={metrics.debtors[0]?.clientName || "—"}
        />
      </StatTileGrid>

      {/* Row 2: Aging schedule + top debtors */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-7 xl:col-span-8"
          icon={BarChart3}
          title="Aging Schedule"
          subtitle="Outstanding balance by days past the due date. Select a bucket to see its customers in the ledger."
          right={<span className="text-xs text-slate-500">Total <span className="font-semibold tabular-nums text-slate-900">{money(metrics.total)}</span></span>}
        >
          {loading ? (
            <LoadingSpinner text="Loading aging..." />
          ) : metrics.count === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Nothing outstanding to age.</p>
          ) : (
            <>
              <AgingBars rows={agingRows} total={metrics.total} formatAmount={money} onSelect={() => navigate(PATHS.ledger, { state: { tab: "aging" } })} />
              {metrics.critical.length > 0 && (
                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-semibold text-amber-800">Escalation candidates:</span> {metrics.critical.length} invoice
                    {metrics.critical.length === 1 ? " is" : "s are"} more than 60 days overdue ({money(metrics.criticalAmount)}). Consider opening collection cases.
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-5 xl:col-span-4"
          icon={Users}
          iconClass="text-indigo-600"
          title="Top Debtors"
          subtitle="Clients owing the most, with the overdue part of their balance."
        >
          {loading ? (
            <LoadingSpinner text="Loading clients..." />
          ) : metrics.debtors.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No client balances.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {metrics.debtors.slice(0, 5).map((d) => (
                <li key={d.clientId}>
                  <button
                    type="button"
                    onClick={() => navigate(PATHS.ledger, { state: { tab: "ledger", clientId: d.clientId, currencyCode: activeCurrency } })}
                    className="group flex w-full items-center justify-between gap-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-blue-600">{d.clientName}</p>
                      <p className="text-[11px] text-slate-500">
                        {d.invoices} invoice{d.invoices === 1 ? "" : "s"}
                        {d.overdue > 0 && <span className="font-semibold text-rose-600"> · {money(d.overdue)} overdue</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">{money(d.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Row 3: Invoice register — same layout as the Invoice Pipeline table */}
      <RegisterCard
        title="Open Invoices"
        subtitle="Earliest due date first, so overdue invoices lead the list. An invoice drops off once it is paid in full."
        toolbar={
          <>
            <div className="min-w-0 flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={(val) => setSearchQuery(val)}
                placeholder="Search by invoice number, client, or project..."
              />
            </div>
            {hasActiveFilters && (
              <ARClearFiltersButton
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter(ALL);
                }}
                label="Clear filters"
              />
            )}
          </>
        }
        tabs={{
          label: "Receivable status",
          loading,
          items: statusOptions.map((o) => ({
            key: o.value,
            label: o.label,
            value: o.count,
            active: statusFilter === o.value,
            onClick: () => setStatusFilter(o.value === ALL || statusFilter === o.value ? ALL : o.value),
          })),
        }}
        footer={
          !loading &&
          filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            />
          )
        }
      >
        <ARTable
          headers={TABLE_HEADERS}
          columns={TABLE_COLUMNS}
          rows={tableRows}
          loading={loading}
          emptyMessage={
            hasActiveFilters ? "No invoices match the selected filters." : "Nothing outstanding. An invoice appears here once it is sent to the client."
          }
        />
      </RegisterCard>

      {/* Receivable details */}
      <DetailsDrawer
        isOpen={Boolean(selectedLive)}
        onClose={() => setSelected(null)}
        title={selectedLive?.invoiceNumber}
        subtitle={selectedLive ? `${selectedLive.clientName} · ${selectedLive.projectName}` : ""}
        badge={selectedLive && <ReceivableStatusBadge receivable={selectedLive} />}
      >
        {selectedLive && (
          <div className="space-y-4 pb-3">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Invoice amount">
                <span className="tabular-nums">{formatCurrency(selectedLive.invoiceAmount, selectedLive.currencyCode)}</span>
              </DetailRow>
              <DetailRow label="Amount received">
                <span className="tabular-nums">{formatCurrency(selectedLive.amountReceived, selectedLive.currencyCode)}</span>
              </DetailRow>
              <DetailRow label="Outstanding balance">
                <span className="font-bold tabular-nums">{formatCurrency(selectedLive.outstandingBalance, selectedLive.currencyCode)}</span>
              </DetailRow>
              <DetailRow label="Invoice date">{selectedLive.invoiceDate ? formatDisplayDate(selectedLive.invoiceDate) : "—"}</DetailRow>
              <DetailRow label="Due date">
                {selectedLive.dueDate ? formatDisplayDate(selectedLive.dueDate) : "—"}
                {describeDue(selectedLive) && (
                  <span className={`block text-xs ${selectedLive.daysOverdue > 0 ? "text-rose-600" : "text-slate-500"}`}>{describeDue(selectedLive)}</span>
                )}
              </DetailRow>
              <DetailRow label="Days outstanding">
                <span className="tabular-nums">{selectedLive.daysOutstanding ?? "—"}</span>
              </DetailRow>
              <DetailRow label="Sent on">{selectedLive.createdAt ? formatDisplayDateTime(selectedLive.createdAt) : "—"}</DetailRow>
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
                          <p className="mt-0.5 text-slate-500">{formatDisplayDateTime(d.sentAt || d.failedAt || d.createdAt) || "—"}</p>
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
                onClick={() => openInvoice(selectedLive)}
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
