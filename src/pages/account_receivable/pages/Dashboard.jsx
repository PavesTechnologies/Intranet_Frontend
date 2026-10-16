import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  Calculator,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  FileCheck2,
  FileClock,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Eye,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import { showStatusToast } from "../../../components/toastfy/toast";
import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import ReceivableStatusBadge from "../components/common/ReceivableStatusBadge";
import { RegisterCard } from "../components/receivables/ConsoleUI";
import useBusinessDate from "../hooks/useBusinessDate";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import { isEndpointUnavailable } from "../utils/apiAvailability";
import { getBillingConfigurations, getApiErrorMessage } from "../services/billingConfigService";
import { fetchActiveBillingConfigurations, getAcquisitionKpis } from "../services/billingDataAcquisitionService";
import { getInvoiceGenerationWorkspace } from "../services/invoiceService";
import { getPayments } from "../services/paymentService";
import {
  getOutstandingReceivables,
  applyLiveAging,
  getAgingBucket,
  toIsoDay,
  AGING_BUCKETS,
} from "../services/receivableService";

// Navigation Routes
const OVERVIEW_PATH = "/account-receivable/project-billing-setup/overview";
const BILLING_APPROVALS_PATH = "/account-receivable/billing-approvals";
const ACQUISITION_PATH = "/account-receivable/billing-data-acquisition/workspace";
const TAX_PATH = "/account-receivable/tax-calculation";
const INVOICE_GEN_PATH = "/account-receivable/invoice-generation";
const INVOICE_APPROVAL_PATH = "/account-receivable/invoice-approval";
const RECEIVABLES_PATH = "/account-receivable/receivables";
const MASTER_DATA_PATH = "/account-receivable/master-data";

const CHART_COLORS = {
  primary: "#1e3a8a",   // Deep Navy / Enterprise blue
  secondary: "#0284c7", // Bright cyan/blue
  emerald: "#059669",   // Success green
  amber: "#d97706",     // Warning amber
  rose: "#e11d48",      // Danger red
  purple: "#7c3aed",    // Violet
  slate: "#64748b",     // Muted slate
};

const AGING_COLORS = {
  CURRENT: "#10b981",
  "1_30": "#3b82f6",
  "31_60": "#f59e0b",
  "61_90": "#f97316",
  "90_PLUS": "#ef4444",
};

// Sample chart data — these two charts stay on mock data until the
// billed-vs-collected and billing-model APIs exist.
const MOCK_TREND = [
  { period: "May", invoiced: 1850000, collected: 1720000, projected: 1900000 },
  { period: "Jun", invoiced: 2100000, collected: 1950000, projected: 2050000 },
  { period: "Jul", invoiced: 2350000, collected: 2180000, projected: 2300000 },
  { period: "Aug", invoiced: 2500000, collected: 2420000, projected: 2550000 },
  { period: "Sep", invoiced: 2720000, collected: 2610000, projected: 2700000 },
  { period: "Oct", invoiced: 2845000, collected: 2780000, projected: 2900000 },
];
const MOCK_BILLING_MODELS = [
  { name: "Time & Material (T&M)", value: 48, amount: 1365600, color: "#1e3a8a" },
  { name: "Fixed Milestone", value: 26, amount: 739700, color: "#0284c7" },
  { name: "Retainer Services", value: 16, amount: 455200, color: "#10b981" },
  { name: "Software & Tool Billing", value: 10, amount: 284500, color: "#f59e0b" },
];

const LEDGER_TABS = [
  { key: "ALL", label: "All", test: () => true },
  { key: "OVERDUE", label: "Overdue", test: (r) => r.daysOverdue > 0 },
  { key: "DUE_SOON", label: "Due in 7 Days", test: (r) => r.daysUntilDue >= 0 && r.daysUntilDue <= 7 },
  { key: "PARTIAL", label: "Partially Paid", test: (r) => r.amountReceived > 0 },
];
const LEDGER_PAGE_SIZE = 6;

const PERIOD_LABELS = { MTD: "month to date", QTD: "quarter to date", YTD: "year to date" };

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

// First day of the selected period, as yyyy-MM-dd.
const periodStart = (today, period) => {
  const [y, m] = today.split("-").map(Number);
  if (period === "YTD") return `${y}-01-01`;
  const month = period === "QTD" ? Math.floor((m - 1) / 3) * 3 + 1 : m;
  return `${y}-${String(month).padStart(2, "0")}-01`;
};

// Settled value of a Promise.allSettled entry, or the fallback.
const settled = (result, fallback) => (result.status === "fulfilled" ? result.value : fallback);

export default function AccountReceivableDashboard() {
  const navigate = useNavigate();
  const today = useBusinessDate();

  // Backend state — each source loads on its own, so one failing API only
  // blanks its own figures.
  const [configs, setConfigs] = useState([]);
  const [acquisition, setAcquisition] = useState([]);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [rawReceivables, setRawReceivables] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentsUnavailable, setPaymentsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter Controls
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("MTD");
  const [customerSearch, setCustomerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ledgerPage, setLedgerPage] = useState(1);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const [configRes, acquisitionRes, invoiceRes, receivableRes, paymentRes] = await Promise.allSettled([
      getBillingConfigurations(),
      fetchActiveBillingConfigurations(),
      getInvoiceGenerationWorkspace(),
      getOutstandingReceivables(),
      getPayments(),
    ]);

    setConfigs(settled(configRes, []));
    setAcquisition(settled(acquisitionRes, []));
    setInvoiceRows(settled(invoiceRes, { rows: [] }).rows || []);
    setRawReceivables(settled(receivableRes, []));
    setPayments(settled(paymentRes, []));
    setPaymentsUnavailable(paymentRes.status === "rejected" && isEndpointUnavailable(paymentRes.reason));

    const failed = [configRes, invoiceRes, receivableRes].find((r) => r.status === "rejected");
    if (failed) {
      showStatusToast(getApiErrorMessage(failed.reason, "Some Account Receivable figures could not be loaded."), "error");
    } else if (isManual) {
      showStatusToast("Account Receivable metrics refreshed successfully.", "success");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, today]);

  const receivables = useMemo(() => rawReceivables.map((r) => applyLiveAging(r, today)), [rawReceivables, today]);

  /* ---------------------------- Currency ---------------------------- */

  // Amounts are never converted or summed across currencies: the dashboard
  // shows one billing currency at a time.
  const currencies = useMemo(() => {
    const totals = {};
    receivables.forEach((r) => (totals[r.currencyCode] = (totals[r.currencyCode] || 0) + r.outstandingBalance));
    invoiceRows.forEach((r) => (totals[r.currencyCode] = totals[r.currencyCode] || 0));
    payments.forEach((p) => (totals[p.currencyCode] = totals[p.currencyCode] || 0));
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [receivables, invoiceRows, payments]);

  const activeCurrency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] || "USD";
  const formatMoney = (amount) => formatCurrency(amount || 0, activeCurrency);
  const inCurrency = (rows) => rows.filter((r) => r.currencyCode === activeCurrency);
  const show = (value) => (loading ? "…" : value);

  /* ----------------------------- Metrics ----------------------------- */

  const setupStats = useMemo(
    () => ({
      total: configs.length,
      active: configs.filter((c) => c.billingStatus === "ACTIVE").length,
      pending: configs.filter((c) => c.approvalStatus === "PENDING_APPROVAL").length,
      draft: configs.filter((c) => c.approvalStatus === "DRAFT").length,
    }),
    [configs]
  );

  const acquisitionKpis = useMemo(() => getAcquisitionKpis(acquisition), [acquisition]);

  const book = useMemo(() => inCurrency(receivables), [receivables, activeCurrency]); // eslint-disable-line react-hooks/exhaustive-deps
  const bookInvoices = useMemo(() => inCurrency(invoiceRows), [invoiceRows, activeCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const financialMetrics = useMemo(() => {
    const totalOutstanding = sum(book, "outstandingBalance");
    const overdue = book.filter((r) => r.daysOverdue > 0);
    const overdueAmount = sum(overdue, "outstandingBalance");
    const aged = book.filter((r) => r.daysOutstanding !== null);
    const weightedDays = aged.reduce((s, r) => s + r.daysOutstanding * r.outstandingBalance, 0);
    const agedBalance = sum(aged, "outstandingBalance");

    const readyRows = bookInvoices.filter((r) => r.workspaceStatus === "READY_FOR_INVOICE");
    const approvalRows = bookInvoices.filter((r) => r.workspaceStatus === "PENDING_APPROVAL");

    const from = periodStart(today, selectedPeriod);
    const periodPayments = inCurrency(payments).filter((p) => {
      const day = toIsoDay(p.paymentDate);
      return day && day >= from && day <= today;
    });

    return {
      totalOutstanding,
      openInvoices: book.length,
      clients: new Set(book.map((r) => r.clientId)).size,
      overdueAmount,
      overdueCount: overdue.length,
      overduePercentage: totalOutstanding > 0 ? Math.round((overdueAmount / totalOutstanding) * 100) : 0,
      criticalAmount: sum(overdue.filter((r) => r.daysOverdue > 60), "outstandingBalance"),
      avgDaysOutstanding: agedBalance > 0 ? Math.round(weightedDays / agedBalance) : null,
      oldestDays: aged.length ? Math.max(...aged.map((r) => r.daysOutstanding)) : null,
      unbilledAmount: sum(readyRows, "grandTotal"),
      unbilledCount: readyRows.length,
      collected: sum(periodPayments, "amount"),
      paymentCount: periodPayments.length,
      unallocated: sum(periodPayments, "unallocatedAmount"),
      inApprovalAmount: sum(approvalRows, "grandTotal"),
      inApprovalCount: approvalRows.length,
    };
  }, [book, bookInvoices, payments, today, selectedPeriod, activeCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every invoice-workspace row (any currency) for stage counts.
  const invoiceCounts = useMemo(() => {
    const count = (status) => invoiceRows.filter((r) => r.workspaceStatus === status).length;
    return { ready: count("READY_FOR_INVOICE"), generated: count("GENERATED"), pending: count("PENDING_APPROVAL") };
  }, [invoiceRows]);

  // AR Pipeline Funnel (Tracing each module stage)
  const pipelineStages = [
    {
      id: "setup",
      name: "1. Billing Setups",
      description: "Project rate models & contracts",
      count: setupStats.total,
      meta: `${setupStats.active} active`,
      path: OVERVIEW_PATH,
      icon: FolderKanban,
    },
    {
      id: "approvals",
      name: "2. Billing Approvals",
      description: "Maker-Checker setup review",
      count: setupStats.pending,
      meta: "pending review",
      path: BILLING_APPROVALS_PATH,
      icon: ShieldCheck,
    },
    {
      id: "acquisition",
      name: "3. Data Acquisition",
      description: "Timesheets, expenses & tool charges",
      count: acquisitionKpis.notAcquired,
      meta: "awaiting acquisition",
      path: ACQUISITION_PATH,
      icon: Layers,
    },
    {
      id: "tax",
      name: "4. Tax Calculation",
      description: "Dynamic GST / VAT / Sales Tax",
      count: acquisitionKpis.readyForTax,
      meta: "awaiting tax",
      path: TAX_PATH,
      icon: Calculator,
    },
    {
      id: "generation",
      name: "5. Invoice Generation",
      description: "Drafting & numbering",
      count: invoiceCounts.ready + invoiceCounts.generated,
      meta: formatMoney(sum(bookInvoices.filter((r) => ["READY_FOR_INVOICE", "GENERATED"].includes(r.workspaceStatus)), "grandTotal")),
      path: INVOICE_GEN_PATH,
      icon: FileClock,
    },
    {
      id: "invoice-approval",
      name: "6. Invoice Approvals",
      description: "Checker sign-off & issuance",
      count: invoiceCounts.pending,
      meta: formatMoney(financialMetrics.inApprovalAmount),
      path: INVOICE_APPROVAL_PATH,
      icon: FileCheck2,
    },
  ];

  // AR Aging Schedule from live receivables
  const agingData = useMemo(
    () =>
      AGING_BUCKETS.map((bucket) => {
        const rows = book.filter((r) => getAgingBucket(r).key === bucket.key);
        return { key: bucket.key, bucket: bucket.label, amount: sum(rows, "outstandingBalance"), count: rows.length, color: AGING_COLORS[bucket.key] };
      }),
    [book]
  );

  // Clients with money more than 60 days past due.
  const criticalClients = useMemo(() => {
    const byClient = new Map();
    book
      .filter((r) => r.daysOverdue > 60)
      .forEach((r) => byClient.set(r.clientName, (byClient.get(r.clientName) || 0) + r.outstandingBalance));
    return [...byClient.entries()].sort((a, b) => b[1] - a[1]);
  }, [book]);

  /* ---------------------------- Debtor ledger ---------------------------- */

  const searchedLedger = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return receivables;
    return receivables.filter((r) => [r.invoiceNumber, r.clientName, r.projectName].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [receivables, customerSearch]);

  const filteredLedger = useMemo(() => {
    const test = LEDGER_TABS.find((t) => t.key === statusFilter)?.test || (() => true);
    return searchedLedger.filter(test);
  }, [searchedLedger, statusFilter]);

  // Tab counts use the search-filtered ledger, like the Invoice Pipeline.
  const ledgerTabs = LEDGER_TABS.map((t) => ({ key: t.key, label: t.label, value: searchedLedger.filter(t.test).length }));

  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedger.length / LEDGER_PAGE_SIZE));
  const pagedLedger = filteredLedger.slice((ledgerPage - 1) * LEDGER_PAGE_SIZE, ledgerPage * LEDGER_PAGE_SIZE);

  useEffect(() => {
    setLedgerPage(1);
  }, [customerSearch, statusFilter]);

  const openInvoice = (row) => navigate(`/account-receivable/invoices/${row.invoiceId}`);

  const ledgerRows = pagedLedger.map((row) => ({
    onRowClick: () => openInvoice(row),
    invoiceNumber: (
      <div className="text-left">
        <span className="font-mono font-bold text-indigo-700">{row.invoiceNumber}</span>
      </div>
    ),
    client: <div className="text-left font-semibold text-slate-800">{row.clientName}</div>,
    project: (
      <div className="text-left">
        <div className="font-bold text-slate-900">{row.projectName}</div>
      </div>
    ),
    invoiceDate: <div className="text-left font-medium text-slate-700">{row.invoiceDate ? formatDisplayDate(row.invoiceDate) : "—"}</div>,
    dueDate: (
      <div className="text-left">
        <div className="font-medium text-slate-700">{row.dueDate ? formatDisplayDate(row.dueDate) : "—"}</div>
        <div
          className={`text-xs font-semibold ${
            row.daysOverdue > 60 ? "text-rose-600" : row.daysOverdue > 30 ? "text-amber-600" : row.daysOverdue > 0 ? "text-rose-500" : "text-slate-400"
          }`}
        >
          {row.daysOverdue > 0 ? `${plural(row.daysOverdue, "day")} overdue` : "Current"}
        </div>
      </div>
    ),
    invoiceAmount: <div className="text-left tabular-nums font-medium text-slate-700">{formatCurrency(row.invoiceAmount, row.currencyCode)}</div>,
    outstanding: <div className="text-left tabular-nums font-bold text-slate-900">{formatCurrency(row.outstandingBalance, row.currencyCode)}</div>,
    status: (
      <div className="flex flex-col items-center justify-center gap-1">
        <ReceivableStatusBadge receivable={row} />
      </div>
    ),
    actions: (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          items={[
            {
              label: "View Invoice",
              icon: <Eye className="h-4 w-4 text-slate-600" />,
              onClick: () => openInvoice(row),
            },
          ]}
        />
      </div>
    ),
  }));

  /* ------------------------------ Worklist ------------------------------ */

  const actionItems = [
    {
      count: criticalClients.length,
      title: `${plural(criticalClients.length, "client")} overdue by >60 days`,
      subtitle: criticalClients
        .slice(0, 2)
        .map(([name, amount]) => `${name} (${formatMoney(amount)})`)
        .join(" & "),
      type: "danger",
      icon: AlertTriangle,
      badge: "Action Required",
      to: RECEIVABLES_PATH,
    },
    {
      count: setupStats.pending,
      title: `${plural(setupStats.pending, "billing setup")} pending Checker approval`,
      subtitle: "Requires Finance Manager verification",
      type: "warning",
      icon: Clock,
      badge: "Pending Review",
      to: BILLING_APPROVALS_PATH,
    },
    {
      count: acquisitionKpis.readyForTax,
      title: `${plural(acquisitionKpis.readyForTax, "billing snapshot")} ready for tax calculation`,
      subtitle: "Acquired and waiting for the tax engine",
      type: "info",
      icon: Calculator,
      badge: "Tax Console",
      to: TAX_PATH,
    },
    {
      count: invoiceCounts.ready + invoiceCounts.generated,
      title: `${plural(invoiceCounts.ready + invoiceCounts.generated, "invoice")} waiting in the draft queue`,
      subtitle: `${invoiceCounts.ready} ready to generate · ${invoiceCounts.generated} generated, not yet submitted`,
      type: "neutral",
      icon: FileClock,
      badge: "Draft Queue",
      to: INVOICE_GEN_PATH,
    },
  ].filter((item) => item.count > 0);

  /* ------------------------------ Activity ------------------------------ */

  const activity = configs
    .filter((config) => config.lastUpdated)
    .slice(0, 5)
    .map((config) => ({
      configId: config.id,
      action: `${config.approvalStatusLabel} Configuration — ${config.projectName || config.client || "Billing setup"}`,
      user: config.updatedBy || "System",
      time: config.lastUpdated,
    }));

  const sampleBadge = (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Sample data
    </span>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Financial Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Accounts Receivable Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time billing configurations, acquisition snapshots, dynamic tax calculations, and cash realization.
          </p>
        </div>

        {/* Global Financial Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Toggle — billing currencies present in the data */}
          {currencies.length > 1 && (
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
              {currencies.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setSelectedCurrency(curr)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeCurrency === curr
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}

          {/* Period Selector — drives Cash Realized */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            {["MTD", "QTD", "YTD"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPeriod(p)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedPeriod === p
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="small"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="gap-1.5 border-slate-300 bg-white shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Row 1: Executive Financial KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Total Outstanding AR */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Outstanding AR
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {show(formatMoney(financialMetrics.totalOutstanding))}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <span>{show(`Across ${plural(financialMetrics.clients, "client")}`)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Open invoices</span>
            <span className="font-semibold text-slate-700">{show(plural(financialMetrics.openInvoices, "Invoice"))}</span>
          </div>
        </div>

        {/* KPI 2: Overdue AR (Risk Exposure) */}
        <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Overdue Exposure
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="truncate text-2xl font-bold tracking-tight text-rose-900 tabular-nums">
              {show(formatMoney(financialMetrics.overdueAmount))}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <span>{show(`${financialMetrics.overduePercentage}% of total book`)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-rose-100 pt-2 text-[11px] text-rose-700/70">
            <span>Critical (&gt;60 days)</span>
            <span className="font-bold text-rose-700">{show(formatMoney(financialMetrics.criticalAmount))}</span>
          </div>
        </div>

        {/* KPI 3: Average days outstanding (balance-weighted) */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Days Outstanding
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {show(financialMetrics.avgDaysOutstanding ?? "—")}
              </span>
              <span className="text-xs font-medium text-slate-500">days</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span>Weighted by open balance</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Oldest open invoice</span>
            <span className="font-semibold text-slate-700">
              {show(financialMetrics.oldestDays === null ? "—" : plural(financialMetrics.oldestDays, "day"))}
            </span>
          </div>
        </div>

        {/* KPI 4: Unbilled — tax completed, invoice not yet generated */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unbilled WIP
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {show(formatMoney(financialMetrics.unbilledAmount))}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <span>{show(`${plural(financialMetrics.unbilledCount, "period")} ready to invoice`)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Awaiting acquisition</span>
            <span className="font-semibold text-slate-700">{show(plural(acquisitionKpis.notAcquired, "Project"))}</span>
          </div>
        </div>

        {/* KPI 5: Cash realized in the selected period */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash Realized ({selectedPeriod})
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {show(paymentsUnavailable ? "—" : formatMoney(financialMetrics.collected))}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span>
                {show(paymentsUnavailable ? "Payments API not available yet" : `${plural(financialMetrics.paymentCount, "payment")} ${PERIOD_LABELS[selectedPeriod]}`)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Unallocated</span>
            <span className="font-semibold text-slate-700">{show(paymentsUnavailable ? "—" : formatMoney(financialMetrics.unallocated))}</span>
          </div>
        </div>

        {/* KPI 6: In Approval Queue (Maker-Checker Gate) */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {show(formatMoney(financialMetrics.inApprovalAmount))}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span>{show(`${plural(financialMetrics.inApprovalCount, "Invoice")} in queue`)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Billing setups pending</span>
            <span className="font-semibold text-amber-700">{show(setupStats.pending)}</span>
          </div>
        </div>
      </div>

      {/* Row 2: End-to-End Enterprise AR Pipeline Navigation Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              End-to-End AR Operational Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Interactive pipeline tracking items across each phase from contract setup to cash collection.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">Click any stage to open workspace</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => navigate(stage.path)}
                className="group relative flex flex-col justify-between rounded-lg border border-slate-200 p-3 text-left transition-all hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 bg-slate-50/50 hover:bg-white"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600">
                      {stage.name}
                    </span>
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                    {stage.description}
                  </p>
                </div>

                <div className="mt-3 border-t border-slate-200/80 pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {show(stage.count)}
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-600 tabular-nums">
                      {show(stage.meta)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    <span>Open stage</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Visual Analytics (Revenue vs Collections Trend & Aging Breakdown) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Trend Area Chart (8 Cols) — sample data */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 xl:col-span-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Invoicing Velocity & Cash Realization Trend
                {sampleBadge}
              </h3>
              <p className="text-xs text-slate-500">
                Monthly billed invoices vs actual collected cash vs projected ARR trajectory.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1e3a8a]"></span>
                <span className="text-slate-600">Invoiced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]"></span>
                <span className="text-slate-600">Cash Realized</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]"></span>
                <span className="text-slate-600">Projected</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_TREND} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="invoicedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => compactNumber.format(val)}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(value),
                    name === "invoiced" ? "Invoiced" : name === "collected" ? "Collected" : "Projected",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invoiced"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#invoicedFill)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke={CHART_COLORS.emerald}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#collectedFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aging Schedule Risk Stack (4 Cols) — live receivables */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 xl:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                AR Aging Schedule & Delinquency
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown of outstanding balance by payment delinquency buckets.
            </p>

            <div className="space-y-3">
              {agingData.map((item) => {
                const percentage = financialMetrics.totalOutstanding > 0 ? Math.round((item.amount / financialMetrics.totalOutstanding) * 100) : 0;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.bucket}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">{show(item.count)} inv</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {show(formatMoney(item.amount))}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!loading &&
            (criticalClients.length > 0 ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-800">Escalation needed:</span>{" "}
                  {plural(criticalClients.length, "client account")} {criticalClients.length === 1 ? "is" : "are"} more than 60 days past due.
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>No client account is more than 60 days past due.</div>
              </div>
            ))}
        </div>
      </div>

      {/* Row 4: Billing Model Distribution & Immediate Action Items */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Billing Model Distribution Donut (4 Cols) — sample data */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 xl:col-span-4">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-600" />
              Revenue by Billing Model
              {sampleBadge}
            </h3>
            <p className="text-xs text-slate-500">
              Contribution by Rate Models configured in Project Wizard.
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_BILLING_MODELS}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {MOCK_BILLING_MODELS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, entry) => [
                    `${val}% (${formatMoney(entry.payload.amount)})`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {MOCK_BILLING_MODELS.map((model) => (
              <div key={model.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: model.color }}
                />
                <span className="truncate text-slate-600" title={model.name}>
                  {model.name}: <strong className="text-slate-800">{model.value}%</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Action Queue (8 Cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-rose-600" />
                  Priority Operational Worklist
                </h3>
                <p className="text-xs text-slate-500">
                  Critical operational bottlenecks requiring Maker attention or Checker approval.
                </p>
              </div>
              {!loading && actionItems.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                  {plural(actionItems.length, "Open Item")}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading worklist…</div>
            ) : actionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-slate-500">Nothing waiting — every stage is clear.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                {actionItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.badge}
                      onClick={() => navigate(item.to)}
                      className="flex cursor-pointer flex-col justify-between rounded-lg border border-slate-200 p-3.5 transition-all hover:border-blue-500 hover:bg-blue-50/20 hover:shadow-xs group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              item.type === "danger"
                                ? "bg-rose-100 text-rose-800"
                                : item.type === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : item.type === "info"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                          <ItemIcon className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-blue-600">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-end text-[11px] font-semibold text-blue-600 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Process now</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Maker-Checker enforcement active</span>
            <Button
              variant="link"
              size="small"
              onClick={() => navigate(MASTER_DATA_PATH)}
              className="gap-1 p-0 text-xs text-blue-600 hover:underline"
            >
              Configure Master Data & Tax Matrices
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Row 5: Corporate Debtor Ledger — live outstanding receivables */}
      <RegisterCard
        title="Corporate Debtor Ledger & Active Invoices"
        subtitle="Live client balances and payment schedules for every invoice sent and still owed."
        toolbar={
          <>
            <div className="min-w-0 flex-1">
              <SearchInput
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onSearch={(val) => setCustomerSearch(val)}
                placeholder="Search by invoice number, client, or project..."
              />
            </div>
            {(customerSearch || statusFilter !== "ALL") && (
              <ARClearFiltersButton
                onClick={() => {
                  setCustomerSearch("");
                  setStatusFilter("ALL");
                }}
                label="Clear filters"
              />
            )}
          </>
        }
        tabs={{
          label: "Debtor ledger status",
          loading,
          items: ledgerTabs.map((t) => ({
            ...t,
            active: statusFilter === t.key,
            onClick: () => setStatusFilter(t.key === "ALL" || statusFilter === t.key ? "ALL" : t.key),
          })),
        }}
        footer={
          <>
            <Pagination
              currentPage={ledgerPage}
              totalPages={ledgerTotalPages}
              onPrevious={() => setLedgerPage((p) => Math.max(p - 1, 1))}
              onNext={() => setLedgerPage((p) => Math.min(p + 1, ledgerTotalPages))}
            />
            <div className="flex justify-end">
              <Button
                variant="link"
                size="small"
                onClick={() => navigate(RECEIVABLES_PATH)}
                className="gap-1 p-0 text-xs font-semibold text-blue-600 hover:underline"
              >
                View All Outstanding Receivables
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        }
      >
        <ARTable
          headers={["Invoice Number", "Client", "Project", "Invoice Date", "Due Date", "Invoice Amount", "Outstanding", "Status", "Actions"]}
          columns={["invoiceNumber", "client", "project", "invoiceDate", "dueDate", "invoiceAmount", "outstanding", "status", "actions"]}
          rows={ledgerRows}
          loading={loading}
          emptyMessage={
            customerSearch.trim()
              ? "No invoices match your search."
              : receivables.length === 0
              ? "Nothing outstanding. Invoices appear here once they are sent to the client."
              : "No invoices for this status."
          }
        />
      </RegisterCard>

      {/* Row 6: Audit & Real Recent Activity Log */}
      <PageCard>
        <PageCardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-600" />
                Live Configuration & Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Direct events captured from Project Billing Configurations and Approval workflows.
              </p>
            </div>

            <Button
              variant="link"
              size="small"
              onClick={() => navigate(OVERVIEW_PATH)}
              className="gap-1 text-xs text-blue-600 hover:underline"
            >
              View all configurations
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading recent activity…
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Activity className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                No recent activity recorded yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item, index) => (
                <li
                  key={`${item.configId || index}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span className="font-medium text-slate-700">{item.action}</span>
                  </div>

                  <div className="text-slate-400">
                    <span className="font-medium text-slate-600">{item.user}</span> · {item.time || "Recently"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
