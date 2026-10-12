import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Calculator,
  Download,
  FileText,
  HandCoins,
  Hourglass,
  Inbox,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/Cards/StatCard";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import { ChartCard, TrendChart } from "@/pages/expense-management/components/dashboard/DashboardWidgets";
import { formatMoney } from "@/pages/expense-management/components/dashboard/dashboardTheme";
import { useDepartmentNames, useExpenseSummaryReport } from "./useExpenseSummaryReport";
import { RankedList, ReportSkeleton } from "./ReportWidgets";
import {
  DATE_PRESETS,
  SCOPE_LABELS,
  buildSummaryCsv,
  downloadCsv,
  formatDisplayDate,
  humanizeEnum,
  presetRange,
  validateRange,
} from "./reportUtils";

const DEFAULT_PRESET = "last12";
const num = (v) => Number(v) || 0;
const fmtCount = (v) => num(v).toLocaleString("en-IN");
const plural = (n, one, many = `${one}s`) => `${fmtCount(n)} ${num(n) === 1 ? one : many}`;

export default function ReportsPage() {
  const [range, setRange] = useState(() => presetRange(DEFAULT_PRESET));
  const rangeError = validateRange(range.from, range.to);

  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } = useExpenseSummaryReport(range.from, range.to, {
    enabled: !rangeError,
  });
  const { data: departmentNames } = useDepartmentNames();

  const currency = data?.baseCurrencyCode || "INR";
  const activePreset = DATE_PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === range.from && r.to === range.to;
  })?.key;

  const sections = useMemo(() => (data ? buildSections(data, departmentNames) : null), [data, departmentNames]);

  const handleExport = () => {
    if (!data || !sections) return;
    const csv = buildSummaryCsv(data, [
      { name: "Month", rows: sections.byMonth },
      { name: "Category", rows: sections.byCategory },
      { name: "Cost center", rows: sections.byCostCenter },
      { name: "Department", rows: sections.byDepartment },
      { name: "Employee", rows: sections.byEmployee },
      { name: "Report status", rows: sections.byStatus },
      { name: "Cash advance status", rows: sections.advancesByStatus },
    ]);
    downloadCsv(`expense-summary_${data.from}_${data.to}.csv`, csv);
  };

  const subtitle = data
    ? `${SCOPE_LABELS[data.scope] || humanizeEnum(data.scope)} · ${formatDisplayDate(data.from)} – ${formatDisplayDate(data.to)} · Amounts in ${currency}`
    : "Spend, reimbursements and cash advances for a date range.";

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Reports" }]} />

      <PageHeader
        title="Reports"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" size="small" onClick={() => refetch()} disabled={isFetching || !!rangeError}>
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button variant="primary" size="small" onClick={handleExport} disabled={!data || isPlaceholderData || isError}>
              <Download size={14} /> Export CSV
            </Button>
          </>
        }
      />

      <DateRangeBar range={range} onChange={setRange} activePreset={activePreset} error={rangeError} />

      {rangeError ? null : isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Couldn't load this report.</p>
          <p className="max-w-md text-xs text-rose-500">{error?.response?.data?.message || error?.message}</p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data && sections ? (
        <div className={`space-y-4 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
          <ReportBody data={data} sections={sections} currency={currency} />
        </div>
      ) : null}
    </div>
  );
}

function DateRangeBar({ range, onChange, activePreset, error }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:w-[420px]">
          <FormInput
            label="From"
            name="reportFrom"
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => onChange((r) => ({ ...r, from: e.target.value }))}
          />
          <FormInput
            label="To"
            name="reportTo"
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => onChange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(presetRange(p.key))}
              aria-pressed={activePreset === p.key}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activePreset === p.key
                  ? "border-[#0A0082] bg-[#0A0082] text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

function buildSections(data, departmentNames = {}) {
  const months = data.byMonth || [];
  const multiYear = months.length > 12;
  return {
    byMonth: months,
    trend: months.map((m) => {
      const [mon, year] = String(m.label || "").split(" ");
      return {
        period: m.key,
        label: multiYear && year ? `${mon} '${year.slice(2)}` : mon || m.key,
        primary: num(m.amount),
        count: num(m.count),
      };
    }),
    byCategory: data.byCategory || [],
    byCostCenter: (data.byCostCenter || []).map((r) => (r.key === "unassigned" ? { ...r, label: "Unassigned" } : r)),
    byDepartment: (data.byDepartment || []).map((r) => ({
      ...r,
      label:
        r.key === "unassigned"
          ? "Unassigned"
          : departmentNames[String(r.key)] || `Unknown department (${String(r.key).slice(0, 8)}…)`,
    })),
    byEmployee: (data.byEmployee || []).map((r) => ({ ...r, label: r.label || r.key })),
    byStatus: (data.byStatus || []).map((r) => ({ ...r, label: humanizeEnum(r.key) })),
    advancesByStatus: (data.cashAdvances?.byStatus || []).map((r) => ({ ...r, label: humanizeEnum(r.key) })),
  };
}

function ReportBody({ data, sections, currency }) {
  const totals = data.totals || {};
  const reimb = data.reimbursements || {};
  const advances = data.cashAdvances || {};
  const spend = num(totals.spend);

  const moneyKpis = [
    {
      key: "reimbursed",
      title: "Reimbursed",
      value: formatMoney(reimb.paidAmount, currency),
      subtitle: `${plural(reimb.paidCount, "report")} paid in range`,
      icon: BadgeCheck,
      tone: "text-emerald-700",
    },
    {
      key: "awaiting",
      title: "Awaiting payment",
      value: formatMoney(reimb.awaitingPaymentAmount, currency),
      subtitle: `${plural(reimb.awaitingPaymentCount, "report")} approved, as of now`,
      icon: Hourglass,
      tone: "text-amber-700",
    },
    {
      key: "advRequested",
      title: "Cash advances requested",
      value: formatMoney(advances.requestedAmount, currency),
      subtitle: plural(advances.count, "advance"),
      icon: HandCoins,
    },
    {
      key: "advOutstanding",
      title: "Advances outstanding",
      value: formatMoney(advances.outstandingAmount, currency),
      subtitle: "Not yet settled",
      icon: Wallet,
      tone: num(advances.outstandingAmount) > 0 ? "text-rose-700" : undefined,
    },
  ];
  const spendKpis = [
    { key: "spend", title: "Total spend", value: formatMoney(spend, currency), subtitle: plural(totals.lineItemCount, "line item"), icon: TrendingUp, tone: "text-indigo-700" },
    { key: "reports", title: "Reports", value: fmtCount(totals.reportCount), subtitle: "With spend in range", icon: FileText },
    { key: "employees", title: "Employees", value: fmtCount(totals.employeeCount), subtitle: "Who claimed expenses", icon: Users },
    { key: "avg", title: "Avg per report", value: formatMoney(totals.averagePerReport, currency), icon: Calculator },
  ];

  const hasSpend = num(totals.lineItemCount) > 0;
  const hasOtherFigures =
    num(reimb.paidAmount) > 0 || num(reimb.awaitingPaymentAmount) > 0 || num(advances.requestedAmount) > 0 || num(advances.outstandingAmount) > 0 || num(advances.count) > 0;

  const advancesCard = (
    <ChartCard title="Cash advances by status" subtitle="Advances requested in range · share by count">
      <RankedList rows={sections.advancesByStatus} currency={currency} shareBy="count" countNoun="advances" empty="No cash advances requested in this period." />
    </ChartCard>
  );

  if (!hasSpend) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
          <Inbox className="h-7 w-7 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No expenses in this period</p>
          <p className="max-w-md text-xs text-slate-500">
            No submitted expense line items fall between {formatDisplayDate(data.from)} and {formatDisplayDate(data.to)}. Try a wider date range.
          </p>
        </div>
        {hasOtherFigures && (
          <>
            <KpiGrid kpis={moneyKpis} />
            {sections.advancesByStatus.length > 0 && advancesCard}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <KpiGrid kpis={[...spendKpis, ...moneyKpis]} />

      <ChartCard title="Monthly spend" subtitle={`Line items by expense date · amounts in ${currency}`}>
        <TrendChart points={sections.trend} currency={currency} mode="money" primaryLabel="Spend" countLabel="Line items" />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="By category" subtitle="Share of total spend">
          <RankedList rows={sections.byCategory} currency={currency} total={spend} />
        </ChartCard>
        <ChartCard title="By cost center" subtitle="Split allocations counted per cost center">
          <RankedList rows={sections.byCostCenter} currency={currency} total={spend} />
        </ChartCard>
        <ChartCard title="By department" subtitle="Share of total spend">
          <RankedList rows={sections.byDepartment} currency={currency} total={spend} />
        </ChartCard>
        <ChartCard title="By employee" subtitle={`Top ${sections.byEmployee.length} by spend · share of total spend`}>
          <RankedList rows={sections.byEmployee} currency={currency} total={spend} />
        </ChartCard>
        <ChartCard title="Reports by status" subtitle="Share of reports, by count">
          <RankedList rows={sections.byStatus} currency={currency} shareBy="count" countNoun="reports" />
        </ChartCard>
        {advancesCard}
      </div>
    </>
  );
}

function KpiGrid({ kpis }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <StatCard key={k.key} title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} textColor={k.tone || "text-slate-800"} />
      ))}
    </div>
  );
}
