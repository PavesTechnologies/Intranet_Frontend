import { Users, ScrollText, ListChecks, RefreshCcw, Receipt, Wrench, PlayCircle, XCircle } from "lucide-react";

import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import StatusBadge from "../../../../../components/status/statusbadge";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import ChargeStatusCard from "../ChargeStatusCard";
import { formatCurrency, formatDisplayDate } from "../../../utils/format";

const CHARGE_TYPE_META = [
  { key: "labor", label: "Labor Charges", icon: Users },
  { key: "contract", label: "Contract Charges", icon: ScrollText },
  { key: "milestone", label: "Milestone Charges", icon: ListChecks },
  { key: "recurring", label: "Recurring Charges", icon: RefreshCcw },
  { key: "expense", label: "Expense Charges", icon: Receipt },
  { key: "tool", label: "Tool Charges", icon: Wrench },
];

function getPreviewConfig(billingType, billingMode, currency) {
  if (billingType === "TIME_MATERIAL") {
    return {
      chargeType: "labor",
      title: "Labor Charges Preview",
      headers: ["Employee", "Work Date", "Hours", "Rate", "Amount", "Approval Status"],
      columns: ["employee", "workDate", "hours", "rate", "amount", "approvalStatus"],
      mapRow: (record) => ({
        employee: record.employee,
        workDate: formatDisplayDate(record.workDate),
        hours: record.hours,
        rate: formatCurrency(record.rate, currency),
        amount: formatCurrency(record.amount, currency),
        approvalStatus: <StatusBadge label={record.approvalStatus} size="sm" />,
      }),
    };
  }
  if (billingType === "FIXED_PRICE") {
    return {
      chargeType: "contract",
      title: "Contract Charges Preview",
      headers: ["Schedule", "Planned Invoice Date", "Amount", "Status"],
      columns: ["schedule", "plannedInvoiceDate", "amount", "status"],
      mapRow: (record) => ({
        schedule: record.schedule,
        plannedInvoiceDate: formatDisplayDate(record.plannedInvoiceDate),
        amount: formatCurrency(record.amount, currency),
        status: <StatusBadge label={record.status} size="sm" />,
      }),
    };
  }
  if (billingType === "MILESTONE") {
    return {
      chargeType: "milestone",
      title: "Milestone Charges Preview",
      headers: ["Milestone", "Completion Date", "Amount", "Status"],
      columns: ["milestone", "completionDate", "amount", "status"],
      mapRow: (record) => ({
        milestone: record.milestone,
        completionDate: formatDisplayDate(record.completionDate),
        amount: formatCurrency(record.amount, currency),
        status: <StatusBadge label={record.status} size="sm" />,
      }),
    };
  }
  if (billingType === "RECURRING" && billingMode === "SUBSCRIPTION") {
    return {
      chargeType: "recurring",
      title: "Subscription Charges Preview",
      headers: ["Plan", "Billing Cycle", "Next Billing Date", "Amount"],
      columns: ["plan", "billingCycle", "nextBillingDate", "amount"],
      mapRow: (record) => ({
        plan: record.plan,
        billingCycle: record.billingCycle,
        nextBillingDate: formatDisplayDate(record.nextBillingDate),
        amount: formatCurrency(record.amount, currency),
      }),
    };
  }
  if (billingType === "RECURRING") {
    return {
      chargeType: "recurring",
      title: "Monthly Retainer Charges Preview",
      headers: ["Billing Period", "Retainer Amount", "Proration", "Amount"],
      columns: ["billingPeriod", "retainerAmount", "proration", "amount"],
      mapRow: (record) => ({
        billingPeriod: record.billingPeriod,
        retainerAmount: formatCurrency(record.retainerAmount, currency),
        proration: record.proration,
        amount: formatCurrency(record.amount, currency),
      }),
    };
  }
  return null;
}

export default function AcquireDataStep({ billingContext, acquisitionResults, acquiring, onAcquire, onRefresh, onClear }) {
  const previewConfig = getPreviewConfig(billingContext.billingType, billingContext.billingMode, billingContext.currency);
  const previewResult = previewConfig ? acquisitionResults?.[previewConfig.chargeType] : null;
  const hasResults = Boolean(acquisitionResults);

  const previewRows = previewResult?.records?.map((record, index) => ({
    id: index,
    ...previewConfig.mapRow(record),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Acquire Billing Data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Fetch billable transactions for the selected project and billing period from each applicable source.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={onAcquire} loading={acquiring} loadingText="Acquiring...">
          <PlayCircle className="h-4 w-4" /> Acquire Billing Data
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={!hasResults || acquiring}>
          Refresh
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={!hasResults}>
          <XCircle className="h-4 w-4" /> Clear Results
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHARGE_TYPE_META.map((meta) => (
          <ChargeStatusCard
            key={meta.key}
            label={meta.label}
            icon={meta.icon}
            result={acquisitionResults?.[meta.key]}
            currency={billingContext.currency}
          />
        ))}
      </div>

      {hasResults && previewConfig && (
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">{previewConfig.title}</h3>
          {previewRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No billable transactions were found for the selected billing period.</p>
              <p className="mt-1 text-xs text-slate-500">Go back and adjust the billing period, then acquire again.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable headers={previewConfig.headers} columns={previewConfig.columns} rows={previewRows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
