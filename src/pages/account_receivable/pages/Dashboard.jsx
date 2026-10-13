import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FileText,
  Cable,
  PenLine,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  History,
  Settings2,
  ShieldCheck,
  Database,
  Calculator,
  BadgeCheck,
  Wallet,
  Clock,
  BadgeDollarSign,
  Flag,
  Repeat,
  UserCog,
  Users,
  Mail,
  MessageSquare,
  Bell,
  Globe,
  Layers,
  Landmark,
  Building2,
  CalendarClock,
  FilePlus,
  FileMinus,
  Receipt,
  Info,
  Lock,
  Sparkles,
  BarChart3,
  Hourglass,
  Send,
  Smartphone,
  Coins,
  Scale,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import ARKPICard from "../components/common/ARKPICard";
import Button from "../../../components/Button/Button";
import { showStatusToast } from "../../../components/toastfy/toast";
import { useAuth } from "../../../contexts/AuthContext";
import { AR_CHECKER_ROLES } from "../../../config/sidebarConfig";
import {
  getBillingConfigurationStats,
  getBillingConfigurationActivity,
  getBillingConfigurations,
  getApiErrorMessage,
} from "../services/billingConfigService";
import { getInvoiceGenerationWorkspace } from "../services/invoiceService";
import { getActiveTaxRegions } from "../services/taxRegionService";
import { formatCurrency } from "../utils/format";

const AR_BASE = "/account-receivable";
const OVERVIEW_PATH = `${AR_BASE}/project-billing-setup/overview`;
const WORKSPACE_PATH = `${AR_BASE}/project-billing-setup/workspace`;

// Validated categorical pair (blue / orange) for the financial charts.
const SERIES_NET = "#2a78d6";
const YEAR_SERIES_COLORS = ["#eb6834", "#22c55e", "#2a78d6"];
const MONTHS_SHOWN = 12;
const USE_MOCK_DASHBOARD_DATA = true;
const MOCK_TAX_REGIONS = ["United States", "United Kingdom", "India", "Singapore"];

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/* ------------------------------------------------------------------ */
/* Workflow content — mirrors the PAVES AR architecture end to end      */
/* ------------------------------------------------------------------ */

const ROLE_META = {
  MAKER: { label: "Finance Executive", short: "Maker", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  CHECKER: { label: "Finance Manager", short: "Checker", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  SYSTEM: { label: "System", short: "Automated", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const LIFECYCLE_STAGES = [
  {
    key: "setup",
    title: "Project Billing Setup",
    tagline: "Define how a project is billed",
    icon: Settings2,
    role: "MAKER",
    status: "LIVE",
    path: OVERVIEW_PATH,
    cta: "Open Billing Setup",
    description:
      "Every invoice starts from a project billing configuration. It comes either from a CRM contract / SOW (client, customer, proposal and contract approval) or from a direct setup for projects without a CRM contract.",
    steps: [
      "Select the client and the project",
      "Choose the billing type, currency and payment terms",
      "Add rates, milestones or the retainer fee",
      "Assign the tax region, save as draft and submit",
    ],
    inputs: ["CRM contract / SOW", "PMS project attributes"],
    outputs: ["Billing configuration (draft)"],
  },
  {
    key: "billing-approval",
    title: "Billing Approval",
    tagline: "Finance verifies the setup",
    icon: ShieldCheck,
    role: "CHECKER",
    status: "LIVE",
    path: `${AR_BASE}/billing-approvals`,
    checkerOnly: true,
    cta: "Open Billing Approvals",
    description:
      "A Finance Manager reviews the submitted configuration. Once approved, it becomes the Approved Project Billing Configuration: the single source of truth for every downstream billing run.",
    steps: [
      "Review the commercial terms and rates",
      "Compare proposed changes with the last approved version",
      "Approve, or reject with a reason",
    ],
    inputs: ["Submitted billing configuration"],
    outputs: ["Approved Project Billing Configuration"],
  },
  {
    key: "acquisition",
    title: "Billing Data Acquisition",
    tagline: "Collect what can be billed",
    icon: Database,
    role: "MAKER",
    status: "LIVE",
    path: `${AR_BASE}/billing-data-acquisition/workspace`,
    cta: "Open Acquisition Console",
    description:
      "Based on the billing type, the system pulls the period's billable data (approved timesheets, contract value, completed milestones or the retainer fee, plus approved expenses) and freezes it as a billing snapshot.",
    steps: [
      "Pick the project and billing period",
      "Acquire data for the configured billing type",
      "Validate and reconcile; remind PMs about pending timesheets",
    ],
    inputs: ["Approved configuration", "Timesheets / milestones / expenses"],
    outputs: ["Billing snapshot (invoice draft data)"],
  },
  {
    key: "tax",
    title: "Tax Calculation",
    tagline: "Dynamic tax engine",
    icon: Calculator,
    role: "MAKER",
    status: "LIVE",
    path: `${AR_BASE}/tax-calculation`,
    cta: "Open Tax Calculation",
    description:
      "The tax engine resolves the matching tax rule for the billing (GST / CGST / SGST / IGST, VAT or sales tax, country and state rules, exemptions, effective dates) and calculates the tax breakdown and grand total.",
    steps: ["Tax rule resolver", "Find the matching tax rule", "Tax calculator", "Tax result: breakdown and grand total"],
    inputs: ["Billing snapshot", "Tax rule repository"],
    outputs: ["Tax breakdown and invoice total"],
  },
  {
    key: "invoice",
    title: "Invoice Generation",
    tagline: "Draft, preview, submit",
    icon: FileText,
    role: "MAKER",
    status: "LIVE",
    path: `${AR_BASE}/invoice-generation`,
    cta: "Open Invoice Generation",
    description:
      "An invoice draft is built from the billing data and tax results. Finance can save and preview it, then submit it for approval. Approved invoices get an official number and a PDF, and are delivered by email, portal or download.",
    steps: [
      "Create the invoice draft from the billing data and tax",
      "Save, preview and submit for approval",
      "Generate the official invoice number and PDF",
      "Send by email or portal, or download",
    ],
    inputs: ["Tax-calculated billing"],
    outputs: ["Official invoice (PDF)"],
  },
  {
    key: "invoice-approval",
    title: "Invoice Approval",
    tagline: "Second pair of eyes",
    icon: BadgeCheck,
    role: "CHECKER",
    status: "LIVE",
    path: `${AR_BASE}/invoice-approval`,
    checkerOnly: true,
    cta: "Open Invoice Approval",
    description:
      "The Finance Approver approves the invoice or returns it to draft. Rejected invoices can be recalculated from the latest billing and tax data, corrected and resubmitted.",
    steps: ["Review the invoice and its tax breakdown", "Approve, or return to draft with comments", "Finance edits and resubmits"],
    inputs: ["Invoice pending approval"],
    outputs: ["Approved invoice, ready to send"],
  },
  {
    key: "receivables",
    title: "Receivables & Collections",
    tagline: "From invoice to cash",
    icon: Wallet,
    role: "SYSTEM",
    status: "PLANNED",
    description:
      "Each sent invoice automatically creates an outstanding receivable. Payments are recorded, allocated and reconciled, overdue balances are aged and chased through reminders and collections, and credit or debit notes adjust the balance.",
    steps: [
      "Create the receivable and track the outstanding balance",
      "Record, allocate and reconcile payments",
      "Aging analysis, reminders and collections",
      "Credit and debit notes adjust balances",
    ],
    inputs: ["Sent invoices", "Customer payments"],
    outputs: ["Closed and archived receivables"],
  },
];

const BILLING_MODELS = [
  {
    key: "tm",
    title: "Time & Material",
    icon: Clock,
    accent: "bg-indigo-600",
    summary: "Bill the hours actually worked.",
    sources: ["Approved timesheets", "Approved billable hours", "Resource hourly rate", "Approved expenses"],
  },
  {
    key: "milestone",
    title: "Milestone",
    icon: Flag,
    accent: "bg-amber-500",
    summary: "Bill when deliverables are accepted.",
    sources: ["Approved milestone", "Milestone amount", "Approved expenses"],
  },
  {
    key: "retainer",
    title: "Monthly Retainer",
    icon: Repeat,
    accent: "bg-rose-600",
    summary: "Bill a recurring fee every cycle.",
    sources: ["Monthly retainer fee", "Approved expenses"],
  },
];

const RECEIVABLE_FLOW = [
  { key: "receivable", title: "Create Receivable", icon: Receipt, note: "Auto-created when an invoice is sent" },
  { key: "payments", title: "Record Payments", icon: Coins, note: "Bank transfer, UPI, card, cheque, gateway" },
  { key: "allocation", title: "Allocate & Reconcile", icon: Scale, note: "Full, partial or multi-invoice payments" },
  { key: "aging", title: "Aging Analysis", icon: Hourglass, note: "Prioritises overdue invoices" },
  { key: "reminders", title: "Reminders", icon: Bell, note: "Upcoming, due today, overdue, escalation" },
  { key: "collections", title: "Collections", icon: Users, note: "Queue, follow-ups, promise to pay" },
];

const AGING_BUCKETS = [
  { label: "Current", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { label: "1–30 days", className: "bg-lime-50 text-lime-700 ring-lime-200" },
  { label: "31–60 days", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  { label: "61–90 days", className: "bg-orange-50 text-orange-700 ring-orange-200" },
  { label: "90+ days", className: "bg-rose-50 text-rose-700 ring-rose-200" },
];

const REMINDER_CHANNELS = [
  { label: "Email", icon: Mail },
  { label: "SMS", icon: Smartphone },
  { label: "WhatsApp", icon: MessageSquare },
  { label: "Portal", icon: Globe },
];

const PLANNED_REPORTS = [
  "Outstanding Receivables",
  "Aging Analysis",
  "Collection Efficiency",
  "Payment Trend",
  "Customer Statement",
  "Cash Flow Forecast",
];


/* ------------------------------------------------------------------ */
/* Chart helpers                                                        */
/* ------------------------------------------------------------------ */

const monthKeyOf = (row) => String(row.invoiceDate || row.billingPeriodStart || "").slice(0, 7);

const shiftMonth = (key, delta) => {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" });
};

const yearValuesFromMonth = (monthEntry) =>
  [...new Set(
    Object.keys(monthEntry)
      .map((key) => key.match(/^(\d{4})(?:Net|Tax|Total|Count)$/)?.[1])
      .filter(Boolean)
      .map(Number)
  )].sort((a, b) => a - b);

const normKey = (value) => String(value || "").trim().toLowerCase();

const buildDemoInvoiceRows = () => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  const rows = [];

  years.forEach((year, yearIndex) => {
    for (let month = 0; month < 12; month += 1) {
      const base = 22000 + yearIndex * 18000 + month * 1700 + (month % 4) * 900;
      const tax = Number((base * (0.07 + (month % 3) * 0.01) + yearIndex * 700).toFixed(2));
      const total = Number((base + tax).toFixed(2));
      const taxRegionName = MOCK_TAX_REGIONS[(month + yearIndex) % MOCK_TAX_REGIONS.length];
      rows.push({
        currency: "USD",
        invoiceDate: `${year}-${String(month + 1).padStart(2, "0")}-05`,
        projectCode: `PRJ-${yearIndex + 1}${month + 1}`,
        projectName: `${taxRegionName} Project ${month + 1}`,
        taxRegionName,
        grandTotal: total,
        totalTaxAmount: tax,
        amount: base,
      });
    }
  });

  return rows;
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                          */
/* ------------------------------------------------------------------ */

function RoleChip({ role, highlight = false }) {
  const meta = ROLE_META[role];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${meta.className} ${
        highlight ? "ring-2" : ""
      }`}
    >
      {meta.short}
    </span>
  );
}

function StatusDot({ status }) {
  const live = status === "LIVE";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${live ? "text-emerald-700" : "text-slate-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-slate-300"}`} />
      {live ? "Live" : "Planned"}
    </span>
  );
}

function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function PlannedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
      <Sparkles className="h-3 w-3" /> Coming next
    </span>
  );
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            value === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChartEmpty({ loading, error, message }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <BarChart3 className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        {loading ? "Loading chart…" : error ? "Couldn't load invoice data." : message}
      </p>
    </div>
  );
}

function TrendTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;

  const bar = payload[0];
  const point = bar?.payload || {};
  const activeKey = bar?.dataKey;
  const year = Number(String(activeKey || "").match(/^(\d{4})Total$/)?.[1]) || null;
  const net = year ? Number(point[`${year}Net`] ?? point.net ?? 0) : Number(point.net ?? 0);
  const tax = year ? Number(point[`${year}Tax`] ?? point.tax ?? 0) : Number(point.tax ?? 0);
  const total = year ? Number(point[`${year}Total`] ?? point.total ?? 0) : Number(point.total ?? 0);
  const count = year ? Number(point[`${year}Count`] ?? point.count ?? 0) : Number(point.count ?? 0);
  const title = year ? `${label} • ${year}` : label;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{title}</p>
      <p className="flex items-center justify-between gap-4 text-slate-600">
        <span>Net amount</span>
        <span className="font-medium tabular-nums text-slate-900">{formatCurrency(net, currency)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-slate-600">
        <span>Tax</span>
        <span className="font-medium tabular-nums text-slate-900">{formatCurrency(tax, currency)}</span>
      </p>
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
        <span className="font-semibold text-slate-700">Grand total</span>
        <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(total, currency)}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">{count} invoice{count === 1 ? "" : "s"}</p>
    </div>
  );
}

function CountryTooltip({ active, payload, metric, currency }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{point.name}</p>
      <p className="text-slate-600">
        {metric === "amount" ? (
          <>Invoiced <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(point.value, currency)}</span></>
        ) : (
          <><span className="font-semibold tabular-nums text-slate-900">{point.value}</span> invoice{point.value === 1 ? "" : "s"}</>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export default function AccountReceivableDashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isChecker = hasRole(AR_CHECKER_ROLES);

  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // KPI filter
  const [activeKpi, setActiveKpi] = useState("total");

  // Financial chart state (UI only)
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [regionByProject, setRegionByProject] = useState({});
  const [availableTaxRegions, setAvailableTaxRegions] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeError, setFinanceError] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [countryMetric, setCountryMetric] = useState("amount");
  const [useDemoData, setUseDemoData] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [statsResult, activityResult] = await Promise.all([
          getBillingConfigurationStats(),
          getBillingConfigurationActivity(),
        ]);

        if (!isMounted) return;

        setStats(statsResult);
        setActivity(activityResult);
      } catch (error) {
        if (!isMounted) return;

        showStatusToast(
          getApiErrorMessage(
            error,
            "Failed to load Account Receivable overview."
          ),
          "error"
        );

        setStats(null);
        setActivity([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Chart data — read-only; failures only affect the charts, never the page.
  useEffect(() => {
    let isMounted = true;

    if (USE_MOCK_DASHBOARD_DATA) {
      setInvoiceRows(buildDemoInvoiceRows());
      setRegionByProject({});
      setAvailableTaxRegions(MOCK_TAX_REGIONS);
      setUseDemoData(true);
      setFinanceError(false);
      setFinanceLoading(false);

      return () => {
        isMounted = false;
      };
    }

    // Set USE_MOCK_DASHBOARD_DATA to false to resume live invoice,
    // billing-configuration, and tax-region data for these charts.
    Promise.allSettled([getInvoiceGenerationWorkspace(), getBillingConfigurations(), getActiveTaxRegions()]).then(
      ([workspaceResult, configsResult, taxRegionsResult]) => {
        if (!isMounted) return;

        if (workspaceResult.status === "fulfilled") {
          const realRows = (workspaceResult.value?.rows || []).filter(
            (row) => row.invoiceId || row.workspaceStatus !== "READY_FOR_INVOICE"
          );

          if (realRows.length > 0) {
            setInvoiceRows(realRows);
            setUseDemoData(false);
          } else {
            setInvoiceRows(buildDemoInvoiceRows());
            setUseDemoData(true);
          }
        } else {
          setInvoiceRows(buildDemoInvoiceRows());
          setUseDemoData(true);
          setFinanceError(true);
        }

        if (configsResult.status === "fulfilled") {
          const map = {};
          (configsResult.value || []).forEach((config) => {
            const region = config.controls?.taxRegionName || config.taxRegionName;
            if (!region) return;
            if (config.projectCode) map[`code:${normKey(config.projectCode)}`] = region;
            if (config.projectName) map[`name:${normKey(config.projectName)}`] = region;
          });
          setRegionByProject(map);
        }

        if (taxRegionsResult.status === "fulfilled") {
          const taxRegions = (taxRegionsResult.value || []).map((region) => region.taxRegionName || region.name || region.label).filter(Boolean);
          setAvailableTaxRegions(taxRegions.length > 0 ? taxRegions : ["United States", "United Kingdom", "India", "Singapore"]);
        } else {
          setAvailableTaxRegions(["United States", "United Kingdom", "India", "Singapore"]);
        }

        setFinanceLoading(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const kpiCards = [
    {
      key: "total",
      label: "Total Configurations",
      value: stats?.total ?? "—",
      icon: FolderKanban,
      color: "bg-slate-500 text-white",
    },
    {
      key: "active",
      label: "Active Projects",
      value: stats?.active ?? "—",
      icon: CheckCircle2,
      color: "bg-emerald-600 text-white",
    },
    {
      key: "draft",
      label: "Draft Configurations",
      value: stats?.draft ?? "—",
      icon: FileText,
      color: "bg-amber-500 text-white",
    },
    {
      key: "integrated",
      label: "Enterprise Projects",
      value: stats?.integrated ?? "—",
      icon: Cable,
      color: "bg-indigo-600 text-white",
    },
    {
      key: "manual",
      label: "Standalone Projects",
      value: stats?.manual ?? "—",
      icon: PenLine,
      color: "bg-orange-500 text-white",
    },
  ];

  const handleKpiClick = (key) => {
    // Total acts as the default/all filter.
    if (key === "total") {
      setActiveKpi("total");
      return;
    }

    // Clicking the active KPI again clears the filter.
    setActiveKpi((prev) => (prev === key ? "total" : key));
  };

  /*
   * Activity filtering.
   *
   * The activity API may return different action/status field names,
   * so the filter checks the available activity information safely.
   */
  const filteredActivity = useMemo(() => {
    if (activeKpi === "total") {
      return activity;
    }

    return activity.filter((item) => {
      const action = String(item.action || "").toLowerCase();
      const status = String(item.status || "").toLowerCase();
      const type = String(item.type || "").toLowerCase();

      const searchableText = `${action} ${status} ${type}`;

      switch (activeKpi) {
        case "active":
          return searchableText.includes("active") || searchableText.includes("activated");

        case "draft":
          return searchableText.includes("draft");

        case "integrated":
          return searchableText.includes("enterprise") || searchableText.includes("integrated");

        case "manual":
          return searchableText.includes("standalone") || searchableText.includes("manual");

        default:
          return true;
      }
    });
  }, [activity, activeKpi]);

  // Approval pipeline distribution — derived from the same stats payload.
  const approvalSegments = [
    { key: "draft", label: "Draft", value: Number(stats?.draft || 0), className: "bg-slate-400" },
    { key: "pending", label: "Pending approval", value: Number(stats?.pending || 0), className: "bg-amber-500" },
    { key: "approved", label: "Approved", value: Number(stats?.approved || 0), className: "bg-emerald-600" },
    { key: "rejected", label: "Rejected", value: Number(stats?.rejected || 0), className: "bg-rose-500" },
  ];
  const approvalTotal = approvalSegments.reduce((sum, segment) => sum + segment.value, 0);

  /* ---------------------------- Chart models ---------------------------- */

  // Amounts are never summed across currencies — the charts show one currency at a time.
  const currencies = useMemo(() => {
    const counts = {};
    invoiceRows.forEach((row) => {
      const code = row.currency || "USD";
      counts[code] = (counts[code] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [invoiceRows]);

  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0];

  const monthlyTrend = useMemo(() => {
    const rows = invoiceRows.filter((row) => (row.currency || "USD") === currency && monthKeyOf(row));
    if (rows.length === 0) return [];

    const firstDate = rows.map((row) => new Date(row.invoiceDate || row.billingPeriodStart)).filter(Boolean).sort((a, b) => a - b)[0];
    const lastDate = rows.map((row) => new Date(row.invoiceDate || row.billingPeriodStart)).filter(Boolean).sort((a, b) => b - a)[0];
    if (!firstDate || !lastDate) return [];

    const startYear = firstDate.getFullYear();
    const endYear = lastDate.getFullYear();
    const yearValues = Array.from({ length: Math.max(3, endYear - startYear + 1) }, (_, index) => endYear - index)
      .slice(0, 3)
      .sort((a, b) => a - b);

    const monthLabels = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return monthLabels.map((label, index) => {
      const monthNumber = String(index + 1).padStart(2, "0");
      const monthEntry = { month: monthNumber, label };

      yearValues.forEach((year) => {
        monthEntry[`${year}Net`] = 0;
        monthEntry[`${year}Tax`] = 0;
        monthEntry[`${year}Total`] = 0;
        monthEntry[`${year}Count`] = 0;
      });

      rows.forEach((row) => {
        const rowDate = new Date(row.invoiceDate || row.billingPeriodStart);
        if (Number.isNaN(rowDate.getTime())) return;

        const rowYear = rowDate.getFullYear();
        const rowMonth = String(rowDate.getMonth() + 1).padStart(2, "0");
        if (!yearValues.includes(rowYear) || rowMonth !== monthNumber) return;

        const tax = Number(row.totalTaxAmount) || 0;
        const total = Number(row.grandTotal) || 0;
        const net = Number(row.amount) || Math.max(total - tax, 0);

        monthEntry[`${rowYear}Net`] += net;
        monthEntry[`${rowYear}Tax`] += tax;
        monthEntry[`${rowYear}Total`] += total || net + tax;
        monthEntry[`${rowYear}Count`] += 1;
      });

      return monthEntry;
    });
  }, [invoiceRows, currency]);

  const trendTotals = useMemo(() => {
    return monthlyTrend.reduce(
      (acc, month) => {
        const totals = yearValuesFromMonth(month)
          .map((yearKey) => month[`${yearKey}Total`] || 0)
          .reduce((sum, value) => sum + value, 0);
        return {
          total: acc.total + totals,
          count: acc.count + Object.keys(month)
            .filter((key) => key.endsWith("Count"))
            .reduce((sum, key) => sum + (Number(month[key]) || 0), 0),
        };
      },
      { total: 0, count: 0 }
    );
  }, [monthlyTrend]);

  const countryComparison = useMemo(() => {
    const regionOf = (row) =>
      regionByProject[`code:${normKey(row.projectCode)}`] ||
      regionByProject[`name:${normKey(row.projectName)}`] ||
      row.taxRegionName ||
      "Unassigned";

    const dynamicRegions = availableTaxRegions.length > 0 ? availableTaxRegions : [
      "United States",
      "United Kingdom",
      "India",
      "Singapore",
    ];

    const rows = countryMetric === "amount" ? invoiceRows.filter((row) => (row.currency || "USD") === currency) : invoiceRows;
    const totals = {};
    rows.forEach((row) => {
      const name = regionOf(row);
      if (!name || name === "Unassigned") return;
      totals[name] = (totals[name] || 0) + (countryMetric === "amount" ? Number(row.grandTotal) || 0 : 1);
    });

    const combined = new Set([...dynamicRegions, ...Object.keys(totals)]);
    const sorted = [...combined]
      .filter(Boolean)
      .map((name) => ({ name, value: totals[name] || 0 }))
      .sort((a, b) => b.value - a.value);

    return sorted;
  }, [invoiceRows, regionByProject, availableTaxRegions, countryMetric, currency]);

  const stageIsBlocked = (stage) => stage.status !== "LIVE" || (stage.checkerOnly && !isChecker);

  const stageBlockedReason = (stage) => {
    if (stage.status !== "LIVE") return "This part of AR is planned and not available yet.";
    if (stage.checkerOnly && !isChecker) return "Handled by the Finance Manager (Checker); not available for your role.";
    return null;
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <PageHeader
        title="Accounts Receivable Hub"
        subtitle="From an approved project billing setup to cash in the bank: configure, acquire, tax, invoice and collect."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(OVERVIEW_PATH)}>
              View Billing Setups
            </Button>

            <Button variant="primary" onClick={() => navigate(WORKSPACE_PATH)}>
              + Create Billing Setup
            </Button>
          </div>
        }
      />

      {/* 2. Intro banner — what AR is, in one glance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0082] via-indigo-800 to-indigo-600 p-5 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />

        <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200">What is Accounts Receivable?</p>
            <h2 className="mt-1.5 text-xl font-bold leading-snug sm:text-2xl">
              Turning delivered project work into invoiced, tax-compliant and collected revenue.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              AR takes each project's approved billing terms, collects the billable data for the period, applies the
              right taxes, produces approved invoices and tracks every outstanding balance until it is paid. Each
              critical step is checked by a second person (maker–checker).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: Layers, label: "Billing models", value: "4" },
              { icon: ShieldCheck, label: "Approval gates", value: "2" },
              { icon: Calculator, label: "Tax engine", value: "Dynamic" },
              { icon: Send, label: "Delivery", value: "Email · Portal · PDF" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/10 p-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
                <item.icon className="h-4 w-4 text-indigo-200" />
                <p className="mt-1.5 truncate text-sm font-bold" title={item.value}>{item.value}</p>
                <p className="text-[11px] text-indigo-200">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Billing setup at a glance — live numbers */}
      <div>
        <SectionTitle
          title="Billing setup at a glance"
          subtitle="Live counts from project billing configurations. Select a card to filter recent activity."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpiCards.map((kpi) => {
            const isActive = activeKpi === kpi.key;

            return (
              <button
                key={kpi.key}
                type="button"
                onClick={() => handleKpiClick(kpi.key)}
                title={`Filter by ${kpi.label}`}
                aria-pressed={isActive}
                className={`w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  isActive && kpi.key !== "total" ? "ring-2 ring-[#0A0082] ring-offset-1" : ""
                }`}
              >
                <ARKPICard
                  label={kpi.label}
                  value={loading ? "…" : kpi.value}
                  icon={<kpi.icon className="h-5 w-5" />}
                  color={kpi.color}
                  className="h-full w-full"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Financial charts — monthly trend + country comparison */}
      <div className="grid gap-4">
        <PageCard>
          <PageCardContent className="p-4 sm:p-5">
            <SectionTitle
              title="Monthly financial trend"
              subtitle={
                monthlyTrend.length
                  ? `${useDemoData ? "Demo view" : "Live view"} • Grand total across ${MONTHS_SHOWN} months: ${formatCurrency(trendTotals.total, currency)} across ${trendTotals.count} invoice${trendTotals.count === 1 ? "" : "s"} • Hover for net and tax`
                  : "Grand total per month; hover over a bar for net amount and tax."
              }
              right={
                currencies.length > 1 && (
                  <Segmented
                    label="Currency"
                    value={currency}
                    onChange={setSelectedCurrency}
                    options={currencies.map((code) => ({ value: code, label: code }))}
                  />
                )
              }
            />

            {monthlyTrend.length === 0 ? (
              <ChartEmpty loading={financeLoading} error={financeError} message="No invoices issued yet." />
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600" aria-hidden="true">
                  {yearValuesFromMonth(monthlyTrend[0]).map((year, index) => (
                    <span key={year} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: YEAR_SERIES_COLORS[index] }} />
                      {year}
                    </span>
                  ))}
                </div>
                <div className="h-[320px]" role="img" aria-label={`Monthly grand total in ${currency}, with separate bars for each of the last three years`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyTrend}
                      margin={{ top: 22, right: 12, bottom: 4, left: 4 }}
                      barCategoryGap="20%"
                      barGap={4}
                    >
                      <CartesianGrid vertical={false} stroke="#eef0f3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis
                        width={52}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(value) => compactNumber.format(value)}
                      />
                      <Tooltip
                        shared={false}
                        cursor={{ fill: "rgba(148,163,184,0.12)" }}
                        content={<TrendTooltip currency={currency} />}
                      />
                      {yearValuesFromMonth(monthlyTrend[0]).map((year, index) => (
                        <Bar
                          key={year}
                          dataKey={`${year}Total`}
                          fill={YEAR_SERIES_COLORS[index]}
                          stroke="#fff"
                          strokeWidth={1}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                        >
                          <LabelList
                            dataKey={`${year}Total`}
                            position="top"
                            formatter={(value) => (value ? compactNumber.format(value) : "")}
                            style={{ fontSize: 9, fill: "#475569", fontWeight: 600 }}
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>Monthly grand total in {currency}, with separate bars for each year</caption>
                  <thead><tr><th>Month</th>{yearValuesFromMonth(monthlyTrend[0]).map((year) => <th key={year}>{year}</th>)}</tr></thead>
                  <tbody>
                    {monthlyTrend.map((m) => (
                      <tr key={m.label}>
                        <td>{m.label}</td>
                        {yearValuesFromMonth(m).map((year) => (
                          <td key={`${m.label}-${year}`}>{m[`${year}Total`]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent className="p-4 sm:p-5">
            <SectionTitle
              title="Country comparison"
              subtitle={countryMetric === "amount" ? `Invoiced amount by tax region (${currency || "—"})` : "Number of invoices by tax region"}
              right={
                <Segmented
                  label="Country metric"
                  value={countryMetric}
                  onChange={setCountryMetric}
                  options={[
                    { value: "amount", label: "Amount" },
                    { value: "count", label: "Invoices" },
                  ]}
                />
              }
            />

            {countryComparison.length === 0 ? (
              <ChartEmpty loading={financeLoading} error={financeError} message="No invoices issued yet." />
            ) : (
              <>
                <div
                  style={{ height: Math.max(countryComparison.length * 40 + 16, 140) }}
                  role="img"
                  aria-label={`Invoices by tax region, ${countryMetric === "amount" ? `amount in ${currency}` : "invoice count"}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryComparison} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap="30%">
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#334155" }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(148,163,184,0.12)" }}
                        content={<CountryTooltip metric={countryMetric} currency={currency} />}
                      />
                      <Bar dataKey="value" fill={SERIES_NET} radius={[0, 4, 4, 0]} maxBarSize={22}>
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(value) => (countryMetric === "amount" ? compactNumber.format(value) : value)}
                          style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400">
                  <Globe className="mt-px h-3 w-3 shrink-0" />
                  Country is taken from each project's tax region and updates dynamically as new regions are added.
                </p>
              </>
            )}
          </PageCardContent>
        </PageCard>
      </div>

      {/* 8. Recent activity */}
      <div className="grid gap-4 lg:grid-cols-1">
        <PageCard>
          <PageCardContent className="p-4 sm:p-5">
            <SectionTitle
              title="Recent activity"
              subtitle={
                activeKpi === "total"
                  ? "Latest changes to project billing configurations."
                  : `Filtered by ${kpiCards.find((kpi) => kpi.key === activeKpi)?.label}.`
              }
              right={
                <Button
                  variant="link"
                  size="small"
                  onClick={() => navigate(OVERVIEW_PATH)}
                  className="gap-1"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            />

            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading recent activity…
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <History className="h-5 w-5 text-slate-400" />
                </div>

                <p className="text-sm font-medium text-slate-500">
                  No activity found for this filter.
                </p>
              </div>
            ) : (
              <ol className="relative max-h-[340px] space-y-0 overflow-y-auto pr-1">
                {filteredActivity.map((item, index) => (
                  <li
                    key={`${item.configId}-${index}`}
                    className="relative flex gap-3 pb-3 last:pb-0"
                  >
                    {index < filteredActivity.length - 1 && (
                      <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" aria-hidden="true" />
                    )}
                    <span className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 ring-1 ring-indigo-200">
                      <FileText className="h-3 w-3 text-[#0A0082]" />
                    </span>
                    <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <p className="text-sm text-slate-700">{item.action}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.user} · {item.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </PageCardContent>
        </PageCard>
      </div>

      {/* Footer note — explains the AR source-of-truth principle */}
      <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs text-indigo-900">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <p>
          <span className="font-semibold">Single source of truth:</span> every invoice is generated from the Approved
          Project Billing Configuration, whether it came from a CRM contract or a direct setup. Changes always go back
          through approval before they affect billing.
        </p>
      </div>
    </div>
  );
}
