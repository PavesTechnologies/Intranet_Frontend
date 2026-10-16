import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  Calculator,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ChevronRight,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  FileCheck2,
  FileClock,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import { showStatusToast } from "../../../components/toastfy/toast";
import {
  getBillingConfigurationStats,
  getBillingConfigurationActivity,
  getApiErrorMessage,
} from "../services/billingConfigService";

// Navigation Routes
const OVERVIEW_PATH = "/account-receivable/project-billing-setup/overview";
const WORKSPACE_PATH = "/account-receivable/project-billing-setup/workspace";
const BILLING_APPROVALS_PATH = "/account-receivable/billing-approvals";
const ACQUISITION_PATH = "/account-receivable/billing-data-acquisition/workspace";
const TAX_PATH = "/account-receivable/tax-calculation";
const INVOICE_GEN_PATH = "/account-receivable/invoice-generation";
const INVOICE_APPROVAL_PATH = "/account-receivable/invoice-approval";
const MASTER_DATA_PATH = "/account-receivable/master-data";

// Currency Configuration
const CURRENCIES = {
  USD: { symbol: "$", code: "USD", rate: 1.0, locale: "en-US" },
  INR: { symbol: "₹", code: "INR", rate: 86.5, locale: "en-IN" },
  EUR: { symbol: "€", code: "EUR", rate: 0.92, locale: "de-DE" },
};

const CHART_COLORS = {
  primary: "#1e3a8a",   // Deep Navy / Enterprise blue
  secondary: "#0284c7", // Bright cyan/blue
  emerald: "#059669",   // Success green
  amber: "#d97706",     // Warning amber
  rose: "#e11d48",      // Danger red
  purple: "#7c3aed",    // Violet
  slate: "#64748b",     // Muted slate
};

export default function AccountReceivableDashboard() {
  const navigate = useNavigate();

  // Backend state
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Enterprise Filter Controls
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedPeriod, setSelectedPeriod] = useState("MTD");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const currencyInfo = CURRENCIES[selectedCurrency] || CURRENCIES.USD;

  // Format currency helper
  const formatMoney = (amountInUsd) => {
    const converted = (amountInUsd || 0) * currencyInfo.rate;
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: "currency",
      currency: currencyInfo.code,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsResult, activityResult] = await Promise.all([
        getBillingConfigurationStats(),
        getBillingConfigurationActivity(),
      ]);
      setStats(statsResult);
      setActivity(activityResult || []);
      if (isManual) {
        showStatusToast("Account Receivable metrics refreshed successfully.", "success");
      }
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, "Failed to load Account Receivable overview."),
        "error"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Enterprise Mock Financial Metrics (Tailored to AR End-to-End lifecycle)
  const financialMetrics = useMemo(() => {
    // Dynamic multiplier based on time period
    const multiplier = selectedPeriod === "MTD" ? 1 : selectedPeriod === "QTD" ? 2.8 : 9.5;

    return {
      totalOutstanding: 2845000 * multiplier,
      totalOutstandingChange: "+8.4%",
      overdueAmount: 432500 * multiplier,
      overduePercentage: "15.2%",
      unbilledWip: 924000 * multiplier,
      unbilledWipChange: "+12.1%",
      dsoDays: 39.2, // Days Sales Outstanding
      dsoTarget: 45.0,
      collectedMtd: 1780000 * multiplier,
      collectionEfficiency: "94.6%",
      inApprovalAmount: 642000 * multiplier,
      inApprovalCount: 14,
    };
  }, [selectedPeriod]);

  // AR Pipeline Funnel (Tracing each module stage)
  const pipelineStages = useMemo(() => [
    {
      id: "setup",
      name: "1. Billing Setups",
      description: "Project rate models & contracts",
      count: stats?.total ?? 18,
      active: stats?.active ?? 14,
      pending: stats?.draft ?? 4,
      amount: 4850000,
      path: OVERVIEW_PATH,
      icon: FolderKanban,
      color: "border-sky-500 bg-sky-50 text-sky-700",
      badgeColor: "bg-sky-100 text-sky-800",
    },
    {
      id: "approvals",
      name: "2. Billing Approvals",
      description: "Maker-Checker setup review",
      count: 3,
      sublabel: "3 Pending Review",
      amount: 820000,
      path: BILLING_APPROVALS_PATH,
      icon: ShieldCheck,
      color: "border-amber-500 bg-amber-50 text-amber-700",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: "acquisition",
      name: "3. Data Acquisition",
      description: "Timesheets, expenses & tool charges",
      count: 24,
      sublabel: "24 Snapshots locked",
      amount: financialMetrics.unbilledWip,
      path: ACQUISITION_PATH,
      icon: Layers,
      color: "border-indigo-500 bg-indigo-50 text-indigo-700",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
    {
      id: "tax",
      name: "4. Tax Calculation",
      description: "Dynamic GST / VAT / Sales Tax",
      count: 18,
      sublabel: "Tax Engine evaluated",
      amount: 320000,
      path: TAX_PATH,
      icon: Calculator,
      color: "border-purple-500 bg-purple-50 text-purple-700",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "generation",
      name: "5. Invoice Generation",
      description: "Drafting & numbering",
      count: 12,
      sublabel: "Draft invoices ready",
      amount: 1140000,
      path: INVOICE_GEN_PATH,
      icon: FileClock,
      color: "border-blue-500 bg-blue-50 text-blue-700",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      id: "invoice-approval",
      name: "6. Invoice Approvals",
      description: "Checker sign-off & issuance",
      count: 7,
      sublabel: "Pending FM approval",
      amount: financialMetrics.inApprovalAmount,
      path: INVOICE_APPROVAL_PATH,
      icon: FileCheck2,
      color: "border-emerald-500 bg-emerald-50 text-emerald-700",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
  ], [stats, financialMetrics]);

  // Chart Data: Invoicing Velocity vs Collections Realization
  const trendData = useMemo(() => [
    { period: "May", invoiced: 1850000, collected: 1720000, projected: 1900000 },
    { period: "Jun", invoiced: 2100000, collected: 1950000, projected: 2050000 },
    { period: "Jul", invoiced: 2350000, collected: 2180000, projected: 2300000 },
    { period: "Aug", invoiced: 2500000, collected: 2420000, projected: 2550000 },
    { period: "Sep", invoiced: 2720000, collected: 2610000, projected: 2700000 },
    { period: "Oct", invoiced: 2845000, collected: 2780000, projected: 2900000 },
  ], []);

  // Chart Data: AR Aging Schedule Breakdown (0-30, 31-60, 61-90, 90+)
  const agingData = useMemo(() => [
    { bucket: "Current (<30d)", amount: 1680000, count: 42, color: "#10b981" },
    { bucket: "31-60 Days", amount: 620000, count: 18, color: "#3b82f6" },
    { bucket: "61-90 Days", amount: 310000, count: 8, color: "#f59e0b" },
    { bucket: "91-120 Days", amount: 145000, count: 4, color: "#f97316" },
    { bucket: ">120 Days", amount: 90000, count: 2, color: "#ef4444" },
  ], []);

  // Chart Data: Revenue Distribution by Billing Model
  const billingModelDistribution = useMemo(() => [
    { name: "Time & Material (T&M)", value: 48, amount: 1365600, color: "#1e3a8a" },
    { name: "Fixed Milestone", value: 26, amount: 739700, color: "#0284c7" },
    { name: "Retainer Services", value: 16, amount: 455200, color: "#10b981" },
    { name: "Software & Tool Billing", value: 10, amount: 284500, color: "#f59e0b" },
  ], []);

  // Top Customer Invoices / Debtor Ledger
  const debtorLedger = useMemo(() => [
    {
      invoiceId: "INV-2025-0891",
      clientName: "Acme Global Solutions",
      project: "Enterprise Core Migration",
      billingType: "T&M (Role-based)",
      dueDate: "2026-10-25",
      agingDays: 14,
      amount: 142500,
      tax: 25650,
      total: 168150,
      status: "ISSUED",
      urgency: "normal",
    },
    {
      invoiceId: "INV-2025-0842",
      clientName: "Nexis Financial Corp",
      project: "Cloud Data Warehouse",
      billingType: "Fixed Milestone",
      dueDate: "2026-09-30",
      agingDays: 42,
      amount: 215000,
      tax: 38700,
      total: 253700,
      status: "OVERDUE",
      urgency: "high",
    },
    {
      invoiceId: "INV-2025-0904",
      clientName: "Vanguard Health Systems",
      project: "HIPAA Security Portal",
      billingType: "T&M (Standard)",
      dueDate: "2026-10-18",
      agingDays: 6,
      amount: 88400,
      tax: 15912,
      total: 104312,
      status: "PARTIALLY_PAID",
      urgency: "normal",
    },
    {
      invoiceId: "INV-2025-0918",
      clientName: "Apex Retail Group",
      project: "Omnichannel POS Integration",
      billingType: "Software & Tools",
      dueDate: "2026-11-05",
      agingDays: 0,
      amount: 64200,
      tax: 11556,
      total: 75756,
      status: "PENDING_APPROVAL",
      urgency: "medium",
    },
    {
      invoiceId: "INV-2025-0789",
      clientName: "Solaria Energy Tech",
      project: "Smart Grid Analytics",
      billingType: "Retainer",
      dueDate: "2026-08-15",
      agingDays: 88,
      amount: 125000,
      tax: 22500,
      total: 147500,
      status: "OVERDUE",
      urgency: "critical",
    },
    {
      invoiceId: "INV-2025-0925",
      clientName: "Kinetix Robotics",
      project: "Automated Inspection AI",
      billingType: "T&M (Role-based)",
      dueDate: "2026-10-10",
      agingDays: 2,
      amount: 198000,
      tax: 35640,
      total: 233640,
      status: "PAID",
      urgency: "normal",
    },
  ], []);

  // Filtered debtor ledger
  const filteredLedger = useMemo(() => {
    return debtorLedger.filter((item) => {
      const matchesSearch =
        item.clientName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        item.invoiceId.toLowerCase().includes(customerSearch.toLowerCase()) ||
        item.project.toLowerCase().includes(customerSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "OVERDUE") return item.status === "OVERDUE";
      if (statusFilter === "PENDING") return item.status === "PENDING_APPROVAL";
      if (statusFilter === "PAID") return item.status === "PAID" || item.status === "PARTIALLY_PAID";
      return true;
    });
  }, [debtorLedger, customerSearch, statusFilter]);

  // Urgent action items
  const actionItems = useMemo(() => [
    {
      title: "2 Invoices overdue by >60 days",
      subtitle: "Solaria Energy ($147.5k) & Nexis Financial ($253.7k)",
      type: "danger",
      icon: AlertTriangle,
      badge: "Action Required",
      to: "/account-receivable/invoice-approval",
    },
    {
      title: "3 Billing setups pending Checker approval",
      subtitle: "Requires Finance Manager verification",
      type: "warning",
      icon: Clock,
      badge: "Pending Review",
      to: BILLING_APPROVALS_PATH,
    },
    {
      title: "6 Billing snapshots ready for tax calculation",
      subtitle: "Acquisition locked for September cycle",
      type: "info",
      icon: Calculator,
      badge: "Tax Console",
      to: TAX_PATH,
    },
    {
      title: "4 Draft invoices pending Maker submission",
      subtitle: "Drafted, waiting for line item check",
      type: "neutral",
      icon: FileClock,
      badge: "Draft Queue",
      to: INVOICE_GEN_PATH,
    },
  ], []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Financial Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Enterprise AR Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Live Maker-Checker Engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Accounts Receivable Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time billing configurations, acquisition snapshots, dynamic tax calculations, and cash realization.
          </p>
        </div>

        {/* Global Financial Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Toggle */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            {Object.keys(CURRENCIES).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedCurrency === curr
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {curr} ({CURRENCIES[curr].symbol})
              </button>
            ))}
          </div>

          {/* Period Selector */}
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
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatMoney(financialMetrics.totalOutstanding)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{financialMetrics.totalOutstandingChange} vs prior period</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Current invoices</span>
            <span className="font-semibold text-slate-700">62 Invoices</span>
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
            <div className="text-2xl font-bold tracking-tight text-rose-900 tabular-nums">
              {formatMoney(financialMetrics.overdueAmount)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <span>{financialMetrics.overduePercentage} of total book</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-rose-100 pt-2 text-[11px] text-rose-700/70">
            <span>Critical (&gt;60 days)</span>
            <span className="font-bold text-rose-700">$235,000</span>
          </div>
        </div>

        {/* KPI 3: Days Sales Outstanding (DSO) */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Days Sales Out (DSO)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {financialMetrics.dsoDays}
              </span>
              <span className="text-xs font-medium text-slate-500">days</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Target &lt; {financialMetrics.dsoTarget} days (Healthy)</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Industry benchmark</span>
            <span className="font-semibold text-slate-700">45.0 days</span>
          </div>
        </div>

        {/* KPI 4: Unbilled WIP (Acquired not yet invoiced) */}
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
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatMoney(financialMetrics.unbilledWip)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <span>{financialMetrics.unbilledWipChange} Timesheets locked</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Ready for tax step</span>
            <span className="font-semibold text-slate-700">18 Projects</span>
          </div>
        </div>

        {/* KPI 5: Collections MTD */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash Realized (MTD)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatMoney(financialMetrics.collectedMtd)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span>{financialMetrics.collectionEfficiency} collection rate</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Realization goal</span>
            <span className="font-semibold text-slate-700">95.0% target</span>
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
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatMoney(financialMetrics.inApprovalAmount)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span>{financialMetrics.inApprovalCount} Invoices in queue</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>Checker sign-off</span>
            <span className="font-semibold text-amber-700">Finance Manager</span>
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
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {stage.count}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 tabular-nums">
                      {formatMoney(stage.amount)}
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
        {/* Trend Area Chart (8 Cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 xl:col-span-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Invoicing Velocity & Cash Realization Trend
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
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  tickFormatter={(val) => `${currencyInfo.symbol}${(val / 1000).toFixed(0)}k`}
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

        {/* Aging Schedule Risk Stack (4 Cols) */}
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
                const percentage = Math.round((item.amount / 2845000) * 100);
                return (
                  <div key={item.bucket} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.bucket}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">{item.count} inv</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatMoney(item.amount)}
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

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-800">Dunning Rule Triggered:</span>{" "}
              2 enterprise accounts past 60 days are marked for automated finance escalation and freeze.
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Billing Model Distribution & Immediate Action Items */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Billing Model Distribution Donut (4 Cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 xl:col-span-4">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-600" />
              Revenue by Billing Model
            </h3>
            <p className="text-xs text-slate-500">
              Contribution by Rate Models configured in Project Wizard.
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={billingModelDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {billingModelDistribution.map((entry, index) => (
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
            {billingModelDistribution.map((model) => (
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
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                4 Critical Items
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
              {actionItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
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

      {/* Row 5: Enterprise Debtor & Invoice Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              Corporate Debtor Ledger & Active Invoices
            </h3>
            <p className="text-xs text-slate-500">
              Live corporate debtor balances, tax compliance status, and payment schedules.
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice or client..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="h-8 w-48 sm:w-60 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
              {["ALL", "OVERDUE", "PENDING", "PAID"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    statusFilter === st
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Client & Project</th>
                <th className="px-4 py-3">Billing Model</th>
                <th className="px-4 py-3">Due Date & Aging</th>
                <th className="px-4 py-3 text-right">Taxable Subtotal</th>
                <th className="px-4 py-3 text-right">Total Gross</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.map((row) => (
                <tr
                  key={row.invoiceId}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {row.invoiceId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.clientName}</div>
                    <div className="text-[11px] text-slate-500">{row.project}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">
                    {row.billingType}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800 font-medium">{row.dueDate}</div>
                    <div
                      className={`text-[10px] font-semibold ${
                        row.agingDays > 60
                          ? "text-rose-600"
                          : row.agingDays > 30
                          ? "text-amber-600"
                          : "text-slate-400"
                      }`}
                    >
                      {row.agingDays > 0 ? `${row.agingDays} days aging` : "Current"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600 tabular-nums">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                    {formatMoney(row.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        row.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.status === "PARTIALLY_PAID"
                          ? "bg-cyan-100 text-cyan-800"
                          : row.status === "OVERDUE"
                          ? "bg-rose-100 text-rose-800"
                          : row.status === "PENDING_APPROVAL"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {row.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => navigate(`/account-receivable/invoices/${row.invoiceId}`)}
                      className="h-7 px-2 text-[11px] gap-1 border-slate-200 hover:border-blue-500 hover:text-blue-600"
                    >
                      View
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredLedger.length} of {debtorLedger.length} corporate invoices</span>
          <Button
            variant="link"
            size="small"
            onClick={() => navigate(INVOICE_GEN_PATH)}
            className="gap-1 p-0 text-xs font-semibold text-blue-600 hover:underline"
          >
            View Full Invoicing Register
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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
              {activity.slice(0, 5).map((item, index) => (
                <li
                  key={`${item.configId || index}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span className="font-medium text-slate-700">
                      {item.action || "Billing setup updated"}
                    </span>
                  </div>

                  <div className="text-slate-400">
                    <span className="font-medium text-slate-600">{item.user || "System"}</span> · {item.time || "Recently"}
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
