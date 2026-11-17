import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  DollarSign,
  FileCheck2,
  FileClock,
  FileText,
  FolderKanban,
  Info,
  Layers,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import KpiGrid from "../components/KpiGrid";
import PipelineStages from "../components/PipelineStages";
import InvoicingTrendChart from "../components/InvoicingTrendChart";
import AgingSchedule from "../components/AgingSchedule";
import BillingModelChart from "../components/BillingModelChart";
import PriorityWorklist from "../components/PriorityWorklist";
import InvoiceLedger from "../components/InvoiceLedger";
import RecentActivityCard from "../components/RecentActivityCard";
import SegmentedControl from "../components/SegmentedControl";
import { useArDashboard } from "../hooks/useArDashboard";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import { useDashboardInvoices } from "../hooks/useDashboardInvoices";
import { formatDisplayDate } from "../../utils/format";
import {
  PERIOD_LABELS,
  PERIODS,
  PRIOR_PERIOD_NOUN,
  amountIn,
  formatAmounts,
  formatMoney,
  formatMoneyCompact,
  formatPercent,
  formatSignedPercent,
  percentChange,
  pluralize,
  sortAmounts,
} from "../utils/dashboardFormatters";
import { AR_ROUTES } from "../utils/dashboardRoutes";

const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p, label: p, title: PERIOD_LABELS[p] }));

/** Headline value for a per-currency metric: the largest currency, with the rest listed under it. */
function moneyValue(metric) {
  const [first, ...rest] = sortAmounts(metric?.amounts);
  if (!first) return { value: "—", secondary: [], empty: true };
  return {
    value: formatMoney(first.amount, first.currencyCode),
    secondary: rest.map((a) => formatMoney(a.amount, a.currencyCode)),
    empty: false,
  };
}

/** Overdue as a share of the open book — only meaningful when both are in one and the same currency. */
function overdueShare(k) {
  const open = k.outstanding.amounts;
  if (open.length !== 1) return "—";
  const total = Number(open[0].amount) || 0;
  if (!total) return "—";
  return formatPercent((amountIn(k.overdue.amounts, open[0].currencyCode) / total) * 100);
}

function buildKpis(summary, period) {
  const k = summary.kpis;
  const stage = (id) => summary.pipeline.find((s) => s.id === id);
  const oldestApproval = stage("invoiceApproval")?.oldestWaitingDays;

  // Change vs the prior window, measured in the period's main currency.
  const mainCurrency = sortAmounts(k.invoicedInPeriod.amounts)[0]?.currencyCode;
  const change = mainCurrency
    ? percentChange(amountIn(k.invoicedInPeriod.amounts, mainCurrency), amountIn(k.invoicedPriorPeriod.amounts, mainCurrency))
    : null;

  return [
    {
      key: "outstanding",
      label: "Total Outstanding AR",
      ...moneyValue(k.outstanding),
      icon: DollarSign,
      tone: "indigo",
      signal: { tone: "neutral", text: `${pluralize(k.outstanding.count, "open invoice")}` },
      footLabel: "Overdue share",
      footValue: overdueShare(k),
    },
    {
      key: "overdue",
      label: "Overdue Exposure",
      ...moneyValue(k.overdue),
      icon: AlertTriangle,
      tone: "rose",
      signal: k.overdue.count
        ? { tone: "bad", text: `${pluralize(k.overdue.count, "invoice")} past due` }
        : { tone: "good", text: "Nothing past due" },
      footLabel: `Over ${k.criticalOverdueDays} days`,
      footValue: formatAmounts(k.criticalOverdue.amounts, "None"),
    },
    {
      key: "invoiced",
      label: `Invoiced (${period})`,
      ...moneyValue(k.invoicedInPeriod),
      icon: FileText,
      tone: "emerald",
      signal:
        change != null
          ? {
              direction: change < 0 ? "down" : "up",
              tone: "neutral",
              text: `${formatSignedPercent(change)} vs prior ${PRIOR_PERIOD_NOUN[period]}`,
            }
          : { tone: "neutral", text: `${pluralize(k.invoicedInPeriod.count, "invoice")} raised` },
      footLabel: `Prior ${PRIOR_PERIOD_NOUN[period]}`,
      footValue: formatAmounts(k.invoicedPriorPeriod.amounts, "None"),
    },
    {
      key: "wip",
      label: "Unbilled WIP",
      ...moneyValue(k.unbilledWip),
      icon: Layers,
      tone: "indigo",
      signal: { tone: "neutral", text: `${pluralize(k.unbilledWip.count, "item")} not yet invoiced` },
      footLabel: "Projects",
      footValue: k.unbilledProjectCount,
    },
    {
      key: "approvals",
      label: "Pending Approval",
      ...moneyValue(k.pendingApproval),
      icon: ShieldCheck,
      tone: "amber",
      signal: { tone: "neutral", text: `${pluralize(k.pendingApproval.count, "invoice")} in queue` },
      footLabel: "Oldest waiting",
      footValue: oldestApproval != null && k.pendingApproval.count ? pluralize(oldestApproval, "day") : "—",
    },
  ];
}

const STAGE_META = {
  setup: { name: "Billing Setups", description: "Project rate models & contracts", path: AR_ROUTES.overview, icon: FolderKanban },
  setupApproval: { name: "Setup Approvals", description: "Maker-checker setup review", path: AR_ROUTES.billingApprovals, icon: ShieldCheck },
  acquisition: { name: "Data Acquisition", description: "Timesheets, expenses & tool charges", path: AR_ROUTES.acquisition, icon: Layers },
  tax: { name: "Tax Calculation", description: "GST, VAT & sales tax", path: AR_ROUTES.tax, icon: Calculator },
  generation: { name: "Invoice Generation", description: "Drafting & numbering", path: AR_ROUTES.invoiceGeneration, icon: FileClock },
  invoiceApproval: { name: "Invoice Approvals", description: "Checker sign-off & issuance", path: AR_ROUTES.invoiceApproval, icon: FileCheck2 },
};

function stageCountLabel(stage) {
  const b = stage.breakdown || {};
  switch (stage.id) {
    case "setup":
      return `${b.active ?? 0} active · ${b.draft ?? 0} draft`;
    case "setupApproval":
      return "Awaiting checker";
    case "acquisition":
      return "Snapshots in progress";
    case "tax":
      return "Awaiting tax";
    case "generation":
      return `${(b.snapshotsReadyForInvoice ?? 0) + (b.schedulesReadyForInvoice ?? 0)} ready · ${b.generatedInvoices ?? 0} drafts`;
    case "invoiceApproval":
      return "Awaiting sign-off";
    default:
      return "";
  }
}

function buildStages(summary) {
  return summary.pipeline
    .filter((stage) => STAGE_META[stage.id])
    .map((stage) => {
      const [first, ...rest] = sortAmounts(stage.amounts);
      const waiting = stage.count > 0 && stage.oldestWaitingDays != null;
      return {
        ...STAGE_META[stage.id],
        id: stage.id,
        count: stage.count,
        countLabel: stageCountLabel(stage),
        amountText: first ? `${formatMoneyCompact(first.amount, first.currencyCode)}${rest.length ? ` +${rest.length}` : ""}` : null,
        amountTitle: stage.amounts?.length ? formatAmounts(stage.amounts) : undefined,
        waitLabel: waiting ? `Oldest ${pluralize(stage.oldestWaitingDays, "day")}` : null,
        waitTone: waiting && stage.oldestWaitingDays > 3 ? "warning" : "neutral",
      };
    });
}

function buildWorklist(summary) {
  const days = summary.kpis.criticalOverdueDays;
  const items = {
    "overdue-critical": (w) => ({
      tone: "danger",
      badge: "Action Required",
      title: `${pluralize(w.count, "invoice")} over ${days} days past due`,
      subtitle: w.clientNames?.length ? w.clientNames.join(", ") : formatAmounts(w.amounts),
      cta: "Review Overdue",
      to: "?view=OVERDUE",
    }),
    "setup-approvals": (w) => ({
      tone: "warning",
      badge: "Pending Review",
      title: `${pluralize(w.count, "billing setup")} awaiting checker approval`,
      subtitle: w.oldestDays != null ? `Oldest waiting ${pluralize(w.oldestDays, "day")}` : "Needs Finance Manager verification",
      cta: "Open Approvals",
      route: "billingApprovals",
    }),
    "tax-ready": (w) => ({
      tone: "info",
      badge: "Tax Console",
      title: `${pluralize(w.count, "item")} ready for tax calculation`,
      subtitle: formatAmounts(w.amounts),
      cta: "Calculate Tax",
      route: "tax",
    }),
    "draft-queue": (w) => ({
      tone: "neutral",
      badge: "Draft Queue",
      title: `${pluralize(w.count, "draft invoice")} awaiting submission`,
      subtitle: formatAmounts(w.amounts),
      cta: "Open Drafts",
      route: "invoiceGeneration",
    }),
    "awaiting-send": (w) => ({
      tone: "info",
      badge: "Ready to Send",
      title: `${pluralize(w.count, "approved invoice")} not yet sent`,
      subtitle: formatAmounts(w.amounts),
      cta: "Review Invoices",
      route: "invoiceApproval",
    }),
    "delivery-failed": (w) => ({
      tone: "danger",
      badge: "Delivery Failed",
      title: `${pluralize(w.count, "invoice")} failed to send`,
      subtitle: "Check the recipient email, then resend",
      cta: "Review Invoices",
      route: "invoiceApproval",
    }),
  };
  return summary.worklist
    .filter((w) => w.count > 0 && items[w.id])
    .map((w) => ({ id: w.id, ...items[w.id](w) }));
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-xl border border-slate-200 bg-white p-4">
            <span className="block h-3 w-1/2 rounded bg-slate-100 motion-safe:animate-pulse" />
            <span className="mt-4 block h-6 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl border border-slate-200 bg-white motion-safe:animate-pulse" />
    </div>
  );
}

export default function ARDashboardPage() {
  const { filters, setFilter, toggleSort, resetLedgerFilters } = useDashboardFilters();
  const { summary, loading, refreshing, error, refresh } = useArDashboard(filters.period);
  const [ledgerReloadKey, setLedgerReloadKey] = useState(0);
  const ledger = useDashboardInvoices(filters.view, filters.q, ledgerReloadKey);

  const kpis = useMemo(() => (summary ? buildKpis(summary, filters.period) : []), [summary, filters.period]);
  const stages = useMemo(() => (summary ? buildStages(summary) : []), [summary]);
  const worklist = useMemo(() => (summary ? buildWorklist(summary) : []), [summary]);
  const critical = summary
    ? {
        count: summary.kpis.criticalOverdue.count,
        days: summary.kpis.criticalOverdueDays,
        clientNames: summary.worklist.find((w) => w.id === "overdue-critical")?.clientNames,
      }
    : null;

  const handleRefresh = () => {
    refresh();
    setLedgerReloadKey((n) => n + 1);
  };

  let content;
  if (!summary && loading) {
    content = (
      <>
        <span role="status" className="sr-only">Loading dashboard…</span>
        <DashboardSkeleton />
      </>
    );
  } else if (!summary && error) {
    content = (
      <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <AlertCircle className="h-7 w-7 text-rose-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-800">{error}</p>
        <p className="text-xs text-slate-500">Check your connection, then try again.</p>
        <Button variant="outline" size="small" onClick={handleRefresh} className="mt-2">
          Retry
        </Button>
      </div>
    );
  } else if (summary) {
    content = (
      <>
        <KpiGrid kpis={kpis} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <PriorityWorklist items={worklist} className="lg:col-span-7 xl:col-span-8" />
          <AgingSchedule
            buckets={summary.aging}
            unknownDateCount={summary.agingUnknownDateCount}
            critical={critical}
            className="lg:col-span-5 xl:col-span-4"
          />
        </div>

        <PipelineStages stages={stages} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <InvoicingTrendChart points={summary.trend} className="lg:col-span-7 xl:col-span-8" />
          <BillingModelChart
            slices={summary.billingModelMix}
            periodLabel={PERIOD_LABELS[filters.period]}
            className="lg:col-span-5 xl:col-span-4"
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Accounts Receivable"
        subtitle={
          summary
            ? `Billing setups, tax, invoicing and receivables as of ${formatDisplayDate(summary.asOf)}.`
            : "Billing setups, tax, invoicing and receivables in one view."
        }
        className="mb-0"
        actions={
          <>
            <SegmentedControl
              label="Reporting period"
              options={PERIOD_OPTIONS}
              value={filters.period}
              onChange={(v) => setFilter("period", v)}
            />
            <Button
              variant="outline"
              size="small"
              onClick={handleRefresh}
              loading={refreshing}
              loadingText="Refreshing…"
              className="border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Refresh
            </Button>
          </>
        }
      />

      {summary && !summary.kpis.collections?.tracked ? (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
          <p>
            Amounts are shown per currency. Collected cash, DSO and collection rate will appear once payments are
            recorded in AR.
          </p>
        </div>
      ) : null}

      {content}

      <InvoiceLedger
        rows={ledger.rows}
        loading={ledger.loading}
        error={ledger.error}
        onRetry={ledger.retry}
        filters={filters}
        setFilter={setFilter}
        toggleSort={toggleSort}
        resetLedgerFilters={resetLedgerFilters}
      />

      {summary ? (
        <RecentActivityCard activity={summary.recentActivity} loading={false} error={null} onRetry={handleRefresh} />
      ) : null}
    </div>
  );
}
