import { useState } from "react";
import { ChevronDown, CheckCircle2, Sparkles } from "lucide-react";

import { PageCard, PageCardContent } from "../../../../../components/Cards/PageCard";
import Button from "../../../../../components/Button/Button";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../../../utils/format";
import {
  CHARGE_TYPE_LABELS,
  CHARGE_TYPE_ORDER,
  describeRecord,
  computeChargeTotals,
} from "../../../utils/chargeTypes";
import { BILLING_TYPE_LABELS } from "../../../data/wizardOptions";

function SummaryRow({ label, value, emphasize }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={emphasize ? "text-base font-semibold text-slate-900" : "font-medium text-slate-900"}>
        {value}
      </span>
    </div>
  );
}

function ChargeGroup({ chargeType, records, currency }) {
  const [open, setOpen] = useState(false);
  if (!records.length) return null;
  const total = records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">
          {CHARGE_TYPE_LABELS[chargeType]} Charges <span className="text-slate-400">({records.length})</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{formatCurrency(total, currency)}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {records.map((record, index) => (
            <div key={record.id || index} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-slate-600">{describeRecord(chargeType, record)}</span>
              <span className="font-medium text-slate-900">{formatCurrency(record.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoiceDraftStep({
  billingContext,
  selection,
  acquisitionResults,
  draft,
  onOpenDraft,
}) {
  const { subtotal } = computeChargeTotals(acquisitionResults);
  const taxRate = billingContext.taxPreference === "Exempt" ? 0 : 0.18;
  const estimatedTax = draft ? draft.estimatedTax : Math.round(subtotal * taxRate);
  const estimatedGrandTotal = draft ? draft.estimatedGrandTotal : subtotal + estimatedTax;

  if (draft) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </span>
        <h2 className={`${Fonts.heading4} mt-4`}>Invoice Draft Generated</h2>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          The invoice draft has been created from the acquired billing data and is ready for the next stage.
        </p>

        <div className="mt-6 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-left text-sm">
          <SummaryRow label="Draft Number" value={draft.draftNumber} />
          <SummaryRow label="Draft Created Date" value={formatDisplayDateTime(draft.createdDate)} />
          <SummaryRow label="Created By" value={draft.createdBy} />
        </div>

        <Button variant="primary" className="mt-6" onClick={onOpenDraft}>
          <Sparkles className="h-4 w-4" /> Open Invoice Draft
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Invoice Draft Preparation</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the final invoice draft summary before generating it for review and approval.
        </p>
      </div>

      <PageCard>
        <PageCardContent className="p-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Invoice Draft Summary</h3>
          <div className="divide-y divide-slate-100">
            <SummaryRow label="Client" value={billingContext.client} />
            <SummaryRow label="Project" value={`${billingContext.projectName} (${billingContext.projectCode})`} />
            <SummaryRow
              label="Billing Period"
              value={`${formatDisplayDate(selection.periodFrom)} – ${formatDisplayDate(selection.periodTo)}`}
            />
            <SummaryRow label="Billing Type" value={BILLING_TYPE_LABELS[billingContext.billingType] || billingContext.billingType} />
            <SummaryRow label="Currency" value={billingContext.currency} />
            <SummaryRow label="Subtotal" value={formatCurrency(subtotal, billingContext.currency)} />
            <SummaryRow label="Estimated Tax" value={formatCurrency(estimatedTax, billingContext.currency)} />
            <SummaryRow label="Estimated Grand Total" value={formatCurrency(estimatedGrandTotal, billingContext.currency)} emphasize />
          </div>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardContent className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Draft Details</h3>
          <div className="space-y-3">
            {CHARGE_TYPE_ORDER.map((chargeType) => (
              <ChargeGroup
                key={chargeType}
                chargeType={chargeType}
                records={acquisitionResults?.[chargeType]?.records || []}
                currency={billingContext.currency}
              />
            ))}
          </div>
        </PageCardContent>
      </PageCard>
    </div>
  );
}
