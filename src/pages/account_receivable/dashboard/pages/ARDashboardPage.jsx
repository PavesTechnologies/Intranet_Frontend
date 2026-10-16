import { useMemo } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck2,
  FileClock,
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
import CollectionsTrendChart from "../components/CollectionsTrendChart";
import AgingSchedule from "../components/AgingSchedule";
import BillingModelChart from "../components/BillingModelChart";
import PriorityWorklist from "../components/PriorityWorklist";
import InvoiceLedger from "../components/InvoiceLedger";
import RecentActivityCard from "../components/RecentActivityCard";
import SegmentedControl from "../components/SegmentedControl";
import { useBillingSetupSummary } from "../hooks/useBillingSetupSummary";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import {
  DISPLAY_CURRENCIES,
  PERIOD_LABELS,
  PERIODS,
  createMoneyFormatter,
  formatPercent,
  formatSignedPercent,
} from "../utils/dashboardFormatters";
import { AR_ROUTES } from "../utils/dashboardRoutes";
import {
  AGING_BUCKETS,
  BASE_METRICS,
  BILLING_MODEL_MIX,
  LEDGER_ROWS,
  PERIOD_MULTIPLIER,
  PIPELINE_SAMPLE,
  TREND_DATA,
  WORKLIST_ITEMS,
} from "../mocks/arDashboardMockData";

const CURRENCY_OPTIONS = Object.values(DISPLAY_CURRENCIES).map((c) => ({
  value: c.code,
  label: `${c.code} ${c.symbol}`,
  title: `Show amounts in ${c.code}`,
}));

const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p, label: p, title: PERIOD_LABELS[p] }));

function buildKpis(period, money) {
  const m = PERIOD_MULTIPLIER[period];
  const b = BASE_METRICS;
  return [
    {
      key: "outstanding",
      label: "Total Outstanding AR",
      value: money.format(b.totalOutstanding * m),
      icon: DollarSign,
      tone: "indigo",
      signal: { direction: "up", tone: "neutral", text: `${formatSignedPercent(b.totalOutstandingChange)} vs prior period` },
      footLabel: "Open invoices",
      footValue: b.outstandingInvoiceCount,
    },
    {
      key: "overdue",
      label: "Overdue Exposure",
      value: money.format(b.overdueAmount * m),
      icon: AlertTriangle,
      tone: "rose",
      signal: { tone: "bad", text: `${formatPercent(b.overdueShare)} of total book` },
      footLabel: "Critical (over 60 days)",
      footValue: money.format(b.criticalOverdueAmount),
    },
    {
      key: "dso",
      label: "Days Sales Outstanding",
      value: b.dsoDays.toFixed(1),
      unit: "days",
      icon: Clock,
      tone: "emerald",
      signal: {
        direction: "down",
        tone: b.dsoDays <= b.dsoTarget ? "good" : "bad",
        text: b.dsoDays <= b.dsoTarget ? `Healthy, under ${b.dsoTarget}-day target` : `Above ${b.dsoTarget}-day target`,
      },
      footLabel: "Industry benchmark",
      footValue: `${b.dsoTarget.toFixed(1)} days`,
    },
    {
      key: "wip",
      label: "Unbilled WIP",
      value: money.format(b.unbilledWip * m),
      icon: Layers,
      tone: "indigo",
      signal: { direction: "up", tone: "neutral", text: `${formatSignedPercent(b.unbilledWipChange)} timesheets locked` },
      footLabel: "Ready for tax step",
      footValue: `${b.unbilledProjectCount} projects`,
    },
    {
      key: "collected",
      label: `Cash Realized (${period})`,
      value: money.format(b.collected * m),
      icon: CheckCircle2,
      tone: "emerald",
      signal: {
        tone: b.collectionRate >= b.collectionTarget ? "good" : "neutral",
        text: `${formatPercent(b.collectionRate)} collection rate`,
      },
      footLabel: "Realization goal",
      footValue: `${formatPercent(b.collectionTarget)} target`,
    },
    {
      key: "approvals",
      label: "Pending Approvals",
      value: money.format(b.inApprovalAmount * m),
      icon: ShieldCheck,
      tone: "amber",
      signal: { tone: "neutral", text: `${b.inApprovalCount} invoices in queue` },
      footLabel: "Checker sign-off",
      footValue: "Finance Manager",
    },
  ];
}

function buildStages(stats, period) {
  const m = PERIOD_MULTIPLIER[period];
  const s = PIPELINE_SAMPLE;
  const active = stats?.active ?? 14;
  const drafts = stats?.draft ?? 4;
  return [
    {
      id: "setup",
      name: "Billing Setups",
      description: "Project rate models & contracts",
      count: stats?.total ?? s.setup.count,
      countLabel: `${active} active · ${drafts} draft`,
      amount: s.setup.amount,
      path: AR_ROUTES.overview,
      icon: FolderKanban,
    },
    {
      id: "approvals",
      name: "Billing Approvals",
      description: "Maker-checker setup review",
      count: stats?.pending ?? s.approvals.count,
      countLabel: "Pending review",
      amount: s.approvals.amount,
      path: AR_ROUTES.billingApprovals,
      icon: ShieldCheck,
    },
    {
      id: "acquisition",
      name: "Data Acquisition",
      description: "Timesheets, expenses & tool charges",
      count: s.acquisition.count,
      countLabel: "Snapshots locked",
      amount: BASE_METRICS.unbilledWip * m,
      path: AR_ROUTES.acquisition,
      icon: Layers,
    },
    {
      id: "tax",
      name: "Tax Calculation",
      description: "GST, VAT & sales tax",
      count: s.tax.count,
      countLabel: "Evaluated",
      amount: s.tax.amount,
      path: AR_ROUTES.tax,
      icon: Calculator,
    },
    {
      id: "generation",
      name: "Invoice Generation",
      description: "Drafting & numbering",
      count: s.generation.count,
      countLabel: "Drafts ready",
      amount: s.generation.amount,
      path: AR_ROUTES.invoiceGeneration,
      icon: FileClock,
    },
    {
      id: "invoice-approval",
      name: "Invoice Approvals",
      description: "Checker sign-off & issuance",
      count: s.invoiceApproval.count,
      countLabel: "Awaiting FM approval",
      amount: BASE_METRICS.inApprovalAmount * m,
      path: AR_ROUTES.invoiceApproval,
      icon: FileCheck2,
    },
  ];
}

export default function ARDashboardPage() {
  const { filters, setFilter, toggleSort, resetLedgerFilters } = useDashboardFilters();
  const { stats, activity, loading, refreshing, error, refresh } = useBillingSetupSummary();

  const money = useMemo(() => createMoneyFormatter(filters.currency), [filters.currency]);
  const kpis = useMemo(() => buildKpis(filters.period, money), [filters.period, money]);
  const stages = useMemo(() => buildStages(stats, filters.period), [stats, filters.period]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Accounts Receivable"
        subtitle="Billing setups, acquisition, tax, invoicing and cash realization in one view."
        className="mb-0"
        actions={
          <>
            <SegmentedControl
              label="Display currency"
              options={CURRENCY_OPTIONS}
              value={filters.currency}
              onChange={(v) => setFilter("currency", v)}
            />
            <SegmentedControl
              label="Reporting period"
              options={PERIOD_OPTIONS}
              value={filters.period}
              onChange={(v) => setFilter("period", v)}
            />
            <Button
              variant="outline"
              size="small"
              onClick={refresh}
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

      <div
        role="note"
        className="flex items-start gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs leading-relaxed text-indigo-900"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
        <p>
          <span className="font-semibold">Sample data.</span> Financial figures on this page are illustrative and
          converted at fixed demo rates. Billing setup counts and the audit trail are live.
        </p>
      </div>

      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <PriorityWorklist items={WORKLIST_ITEMS} className="lg:col-span-7 xl:col-span-8" />
        <AgingSchedule buckets={AGING_BUCKETS} formatMoney={money.format} className="lg:col-span-5 xl:col-span-4" />
      </div>

      <PipelineStages stages={stages} formatMoney={money.format} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <CollectionsTrendChart data={TREND_DATA} money={money} className="lg:col-span-7 xl:col-span-8" />
        <BillingModelChart
          models={BILLING_MODEL_MIX}
          formatMoney={money.format}
          className="lg:col-span-5 xl:col-span-4"
        />
      </div>

      <InvoiceLedger
        rows={LEDGER_ROWS}
        filters={filters}
        setFilter={setFilter}
        toggleSort={toggleSort}
        resetLedgerFilters={resetLedgerFilters}
        formatMoney={money.format}
      />

      <RecentActivityCard activity={activity} loading={loading} error={error} onRetry={refresh} />
    </div>
  );
}
