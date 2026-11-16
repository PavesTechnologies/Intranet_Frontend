import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  DollarSign,
  AlertTriangle,
  Hourglass,
  BookOpen,
  CalendarRange,
  Eye,
  BarChart3,
  Receipt,
  FileText,
  Banknote,
  FileMinus,
  FilePlus,
  Scale,
} from "lucide-react";

import FormSelect from "../../../components/forms/FormSelect";
import FormDatePicker from "../../../components/forms/FormDatePicker";
import SearchInput from "../../../components/filter/Searchbar";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ARTabs from "../components/common/ARTabs";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import ARFeaturePending from "../components/common/ARFeaturePending";
import SearchableSelect from "../components/common/SearchableSelect";
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
import { formatCurrency, formatDisplayDate } from "../utils/format";
import { getArApiErrorMessage, isEndpointUnavailable } from "../utils/apiAvailability";
import { AGING_BUCKETS, NO_DUE_DATE_BUCKET, getAgingBucket } from "../services/receivableService";
import { getCustomerLedger, CUSTOMER_LEDGER_ENDPOINT, LEDGER_ENTRY_TYPE_LABELS } from "../services/customerLedgerService";

const TABS = [
  { key: "aging", label: "Aging Analysis", icon: CalendarRange },
  { key: "ledger", label: "Customer Ledger", icon: BookOpen },
];

const AGING_COLORS = {
  CURRENT: "#10b981",
  "1_30": "#3b82f6",
  "31_60": "#f59e0b",
  "61_90": "#f97316",
  "90_PLUS": "#ef4444",
  NO_DUE_DATE: "#94a3b8",
};

const AGING_HEADERS = ["Client", "Invoices", ...AGING_BUCKETS.map((b) => b.label), "Total Outstanding", "Actions"];
const AGING_COLUMNS = ["client", "invoices", ...AGING_BUCKETS.map((b) => b.key), "total", "actions"];

const LEDGER_HEADERS = ["Date", "Type", "Reference", "Description", "Debit", "Credit", "Balance"];
const LEDGER_COLUMNS = ["date", "type", "reference", "description", "debit", "credit", "balance"];

const sum = (rows) => rows.reduce((s, r) => s + r.outstandingBalance, 0);

export default function CustomerLedger() {
  const navigate = useNavigate();
  const location = useLocation();
  const { receivables, clients, loading: receivablesLoading, error: receivablesError } = useOutstandingReceivables();

  const [tab, setTab] = useState(location.state?.tab === "ledger" ? "ledger" : "aging");
  const [agingCurrency, setAgingCurrency] = useState(location.state?.currencyCode || null);
  const [agingSearch, setAgingSearch] = useState("");

  const [ledgerClientId, setLedgerClientId] = useState(location.state?.clientId || "");
  const [ledgerCurrency, setLedgerCurrency] = useState(location.state?.currencyCode || "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);
  const [ledgerUnavailable, setLedgerUnavailable] = useState(false);

  /* ------------------------------ Aging ------------------------------ */

  // Aging never adds across currencies — the tab works in one currency at a time.
  const currencies = useMemo(() => {
    const totals = {};
    receivables.forEach((r) => {
      totals[r.currencyCode] = (totals[r.currencyCode] || 0) + r.outstandingBalance;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([code]) => code);
  }, [receivables]);
  const currency = currencies.includes(agingCurrency) ? agingCurrency : currencies[0] || null;
  const book = useMemo(() => receivables.filter((r) => r.currencyCode === currency), [receivables, currency]);
  const money = (amount) => formatCurrency(amount, currency || "USD");

  const portfolioAging = useMemo(() => {
    const rows = [...AGING_BUCKETS, NO_DUE_DATE_BUCKET].map((b) => ({
      key: b.key,
      label: b.key === "CURRENT" ? "Current (not overdue)" : b.label,
      count: 0,
      amount: 0,
      color: AGING_COLORS[b.key],
    }));
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    book.forEach((r) => {
      const bucket = byKey[getAgingBucket(r).key];
      bucket.count += 1;
      bucket.amount += r.outstandingBalance;
    });
    return rows.filter((r) => r.key !== NO_DUE_DATE_BUCKET.key || r.count > 0);
  }, [book]);

  // One row per client in the selected currency; most overdue exposure first.
  const agingRows = useMemo(() => {
    const map = new Map();
    book.forEach((r) => {
      const row =
        map.get(r.clientId) ||
        {
          clientId: r.clientId,
          clientName: r.clientName,
          invoices: 0,
          total: 0,
          buckets: Object.fromEntries([...AGING_BUCKETS, NO_DUE_DATE_BUCKET].map((b) => [b.key, 0])),
        };
      row.invoices += 1;
      row.total += r.outstandingBalance;
      row.buckets[getAgingBucket(r).key] += r.outstandingBalance;
      map.set(r.clientId, row);
    });
    const overdue = (row) => row.total - row.buckets.CURRENT - row.buckets.NO_DUE_DATE;
    return [...map.values()].sort((a, b) => overdue(b) - overdue(a) || b.total - a.total);
  }, [book]);

  const visibleAgingRows = agingRows.filter((row) => row.clientName.toLowerCase().includes(agingSearch.trim().toLowerCase()));

  const overdueRows = book.filter((r) => r.daysOverdue > 0);
  const severe = book.filter((r) => r.daysOverdue > 90);
  const total = sum(book);
  const overduePct = total > 0 ? Math.round((sum(overdueRows) / total) * 100) : 0;

  const openLedger = (clientId) => {
    setLedgerClientId(clientId);
    setLedgerCurrency(currency || "");
    setTab("ledger");
  };

  const agingTableRows = visibleAgingRows.map((row) => ({
    onRowClick: () => openLedger(row.clientId),
    client: <span className="font-semibold text-slate-900">{row.clientName}</span>,
    invoices: <span className="tabular-nums">{row.invoices}</span>,
    ...Object.fromEntries(
      AGING_BUCKETS.map((b) => [
        b.key,
        <span
          key={b.key}
          className={`whitespace-nowrap tabular-nums ${
            row.buckets[b.key] > 0 ? (b.key === "CURRENT" ? "text-slate-800" : "font-semibold text-rose-700") : "text-slate-300"
          }`}
        >
          {row.buckets[b.key] > 0 ? money(row.buckets[b.key]) : "—"}
        </span>,
      ])
    ),
    total: <span className="whitespace-nowrap font-bold tabular-nums text-slate-900">{money(row.total)}</span>,
    actions: (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <ActionMenu items={[{ label: "View Ledger", icon: <Eye className="h-4 w-4 text-slate-600" />, onClick: () => openLedger(row.clientId) }]} />
      </div>
    ),
  }));

  /* ------------------------------ Ledger ------------------------------ */

  const ledgerClient = clients.find((c) => c.clientId === ledgerClientId) || null;
  const currencyOptions = (ledgerClient?.currencies || []).map((code) => ({ value: code, label: code }));
  const effectiveCurrency = ledgerCurrency || ledgerClient?.currencies?.[0] || "";

  useEffect(() => {
    if (tab !== "ledger" || !ledgerClientId) return;
    let cancelled = false;
    setLedgerLoading(true);
    setLedgerError(null);
    getCustomerLedger(ledgerClientId, { currencyCode: effectiveCurrency || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then((data) => {
        if (cancelled) return;
        setLedger(data);
        setLedgerUnavailable(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLedger(null);
        if (isEndpointUnavailable(err)) setLedgerUnavailable(true);
        else setLedgerError(getArApiErrorMessage(err, "The ledger could not be loaded."));
      })
      .finally(() => !cancelled && setLedgerLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, ledgerClientId, effectiveCurrency, fromDate, toDate]);

  const ledgerRows = (ledger?.entries || []).map((e) => ({
    date: <span className="whitespace-nowrap">{e.entryDate ? formatDisplayDate(e.entryDate) : "—"}</span>,
    type: LEDGER_ENTRY_TYPE_LABELS[e.entryType] || e.entryType,
    reference: e.invoiceId ? (
      <button type="button" onClick={() => navigate(`/account-receivable/invoices/${e.invoiceId}`)} className="font-mono font-semibold text-indigo-700 hover:underline">
        {e.reference}
      </button>
    ) : (
      <span className="font-mono text-slate-700">{e.reference}</span>
    ),
    description: <span className="text-slate-600">{e.description || "—"}</span>,
    debit: <span className="whitespace-nowrap tabular-nums">{e.debit ? formatCurrency(e.debit, ledger.currencyCode) : "—"}</span>,
    credit: <span className="whitespace-nowrap tabular-nums text-emerald-700">{e.credit ? formatCurrency(e.credit, ledger.currencyCode) : "—"}</span>,
    balance: <span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(e.runningBalance, ledger.currencyCode)}</span>,
  }));

  const show = (value) => (receivablesLoading ? "…" : value);

  return (
    <div className="space-y-6 pb-12">
      <ConsoleHeader
        title="Customer Ledger & Aging"
        subtitle="Understand each client's balance — how much they owe, how long it has been owed, and every transaction behind it."
        actions={
          tab === "aging" &&
          currencies.length > 0 && (
            <Segmented label="Currency" value={currency} onChange={setAgingCurrency} options={currencies.map((code) => ({ value: code, label: code }))} />
          )
        }
      />

      <ARTabs tabs={TABS} activeKey={tab} onChange={setTab} label="Customer ledger sections" />

      {tab === "aging" && (
        <>
          {receivablesError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{receivablesError}</p>
          )}

          <StatTileGrid columns={4}>
            <StatTile
              label="Total Outstanding"
              icon={DollarSign}
              iconClass="bg-blue-50 text-blue-700"
              value={show(money(total))}
              hint={`${book.length} open invoice${book.length === 1 ? "" : "s"}`}
              footerLabel="Clients owing"
              footerValue={agingRows.length}
            />
            <StatTile
              label="Overdue"
              variant="danger"
              icon={AlertTriangle}
              iconClass="bg-rose-100 text-rose-700"
              value={show(money(sum(overdueRows)))}
              hint={`${overduePct}% of the book`}
              hintClass="text-rose-600"
              footerLabel="Overdue invoices"
              footerValue={overdueRows.length}
              footerValueClass="text-rose-700"
            />
            <StatTile
              label="Severely Overdue"
              icon={Hourglass}
              iconClass="bg-amber-50 text-amber-700"
              value={show(money(sum(severe)))}
              hint="More than 90 days past due"
              hintClass="text-amber-700"
              footerLabel="Invoices"
              footerValue={severe.length}
            />
            <StatTile
              label="Clients Overdue"
              icon={Users}
              iconClass="bg-slate-100 text-slate-700"
              value={show(new Set(overdueRows.map((r) => r.clientId)).size)}
              hint={`of ${agingRows.length} client${agingRows.length === 1 ? "" : "s"} with a balance`}
              footerLabel="Most overdue"
              footerValue={agingRows[0] && agingRows[0].total - agingRows[0].buckets.CURRENT > 0 ? agingRows[0].clientName : "—"}
            />
          </StatTileGrid>

          <SectionCard
            icon={BarChart3}
            title="Portfolio Aging"
            subtitle="How the whole book is spread across days past due."
            right={<span className="text-xs text-slate-500">Total <span className="font-semibold tabular-nums text-slate-900">{money(total)}</span></span>}
          >
            {receivablesLoading ? (
              <LoadingSpinner text="Loading aging..." />
            ) : book.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nothing outstanding to age.</p>
            ) : (
              <AgingBars rows={portfolioAging} total={total} formatAmount={money} />
            )}
          </SectionCard>

          <RegisterCard
            title="Aging by Client"
            subtitle="Outstanding balance per client, grouped by days past the due date. Clients with the most overdue money come first — select one to open their ledger."
            toolbar={
              <div className="min-w-0 flex-1">
                <SearchInput value={agingSearch} onChange={(e) => setAgingSearch(e.target.value)} onSearch={setAgingSearch} placeholder="Search client..." />
              </div>
            }
          >
            <div className="overflow-x-auto">
              <ARTable
                headers={AGING_HEADERS}
                columns={AGING_COLUMNS}
                rows={agingTableRows}
                loading={receivablesLoading}
                emptyMessage={agingSearch ? "No clients match your search." : "No outstanding balances — nothing to age."}
              />
            </div>
          </RegisterCard>
        </>
      )}

      {tab === "ledger" && (
        <>
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <SearchableSelect
              label="Client"
              name="clientId"
              value={ledgerClientId}
              onChange={(e) => {
                setLedgerClientId(e.target.value);
                setLedgerCurrency("");
              }}
              placeholder="Search client..."
              options={clients.map((c) => ({ value: c.clientId, label: c.clientName }))}
              emptyState="No clients with outstanding receivables."
            />
            <FormSelect
              label="Currency"
              name="currency"
              value={effectiveCurrency}
              onChange={(e) => setLedgerCurrency(e.target.value)}
              options={currencyOptions.length ? currencyOptions : [{ value: "", label: "—" }]}
            />
            <FormDatePicker label="From" name="fromDate" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toDate || undefined} />
            <FormDatePicker label="To" name="toDate" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate || undefined} />
          </div>

          {ledger && !ledgerLoading && !ledgerUnavailable && (
            <StatTileGrid columns={5}>
              <StatTile label="Invoiced" icon={FileText} iconClass="bg-blue-50 text-blue-700" value={formatCurrency(ledger.totals.invoiced, ledger.currencyCode)} />
              <StatTile label="Received" icon={Banknote} iconClass="bg-emerald-50 text-emerald-700" value={formatCurrency(ledger.totals.received, ledger.currencyCode)} />
              <StatTile label="Credited" icon={FileMinus} iconClass="bg-teal-50 text-teal-700" value={formatCurrency(ledger.totals.credited, ledger.currencyCode)} />
              <StatTile label="Debited" icon={FilePlus} iconClass="bg-rose-50 text-rose-700" value={formatCurrency(ledger.totals.debited, ledger.currencyCode)} />
              <StatTile
                label="Closing Balance"
                variant={ledger.closingBalance > 0 ? "warning" : "default"}
                icon={Scale}
                iconClass="bg-amber-50 text-amber-700"
                value={formatCurrency(ledger.closingBalance, ledger.currencyCode)}
                footerLabel="Opening balance"
                footerValue={formatCurrency(ledger.openingBalance, ledger.currencyCode)}
              />
            </StatTileGrid>
          )}

          <RegisterCard
            title="Statement of Account"
            subtitle="Invoices, payments and credit/debit notes for the selected client in date order, with the running balance after each entry."
          >
            {!ledgerClientId ? (
              <p className="py-10 text-center text-sm text-slate-500">Select a client to view their statement.</p>
            ) : ledgerUnavailable ? (
              <ARFeaturePending endpoint={CUSTOMER_LEDGER_ENDPOINT} />
            ) : ledgerLoading ? (
              <LoadingSpinner text="Loading ledger..." />
            ) : ledgerError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{ledgerError}</p>
            ) : ledger ? (
              <div className="overflow-x-auto">
                <ARTable headers={LEDGER_HEADERS} columns={LEDGER_COLUMNS} rows={ledgerRows} emptyMessage="No transactions in this period." />
              </div>
            ) : null}
          </RegisterCard>
        </>
      )}
    </div>
  );
}
