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
  quantityAndUnitPrice,
  computeChargeTotals,
} from "../../../utils/chargeTypes";
import { BILLING_TYPE_LABELS } from "../../../data/wizardOptions";
import InvoiceSoftwareSelection from "../InvoiceSoftwareSelection";
import GeneratedSoftwareCharges from "../GeneratedSoftwareCharges";
import { InvoiceDraftProvider, useInvoiceDraftContext } from "../../../context/InvoiceDraftContext";

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

// Every row — Labor, Contract, Milestone, Recurring, Expense, Tool, and (Epic 4 Phase 6)
// Software — renders through this same component using the same quantityAndUnitPrice/
// describeRecord helpers, so a software line looks and behaves exactly like every other
// invoice line rather than a special case. The group header (CHARGE_TYPE_LABELS) is the
// row set's "Type"; Currency is embedded in formatCurrency's symbol per record.
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
          {records.map((record, index) => {
            // Falls back to the project's billing currency when a record has none of its own —
            // same convention as ReviewChargesStep.jsx's unified table.
            const lineCurrency = record.currency || currency;
            const { quantity, unitPrice } = quantityAndUnitPrice(chargeType, record);
            return (
              <div key={record.id || index} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-slate-600">{describeRecord(chargeType, record)}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">
                    {quantity} × {formatCurrency(unitPrice, lineCurrency)}
                  </span>
                  <span className="font-medium text-slate-900">{formatCurrency(record.amount, lineCurrency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Renders inside InvoiceDraftProvider. Reads/writes InvoiceDraftContext directly so
// selectedSoftwareItems / generatedSoftwareChargeLines never need prop drilling — Invoice
// Software Selection (Phase 4) and Software Charge Generation (Phase 5) are untouched; only
// this integration layer changed.
function InvoiceDraftStepBody({ billingContext, selection, acquisitionResults, draft, onOpenDraft }) {
  const { setSelectedSoftwareItems, generatedSoftwareChargeLines } = useInvoiceDraftContext();

  // Normalizes SoftwareChargeLine (assetCode/assetName/calculatedAmount/currencyCode) into the
  // same {records, amount} shape every other charge type already uses, so it flows through
  // ChargeGroup and computeChargeTotals unchanged rather than needing parallel logic. amount
  // and calculatedAmount are always backend values — summing them here is the same plain
  // aggregation computeChargeTotals already does for every other charge type, not a
  // recalculation of any line's amount.
  const softwareRecords = generatedSoftwareChargeLines.map((line) => ({
    id: line.assetId,
    assetCode: line.assetCode,
    assetName: line.assetName,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    billingBasis: line.billingBasis,
    amount: line.calculatedAmount,
    currency: line.currencyCode,
  }));
  const draftResults = {
    ...acquisitionResults,
    software: {
      applicable: softwareRecords.length > 0,
      records: softwareRecords,
      amount: softwareRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0),
    },
  };

  const { subtotal } = computeChargeTotals(draftResults);
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
          <p className="mb-4 text-xs text-slate-500">
            Includes acquired billing data alongside any software, tools, or licenses selected below — every line
            here contributes to the Subtotal, Estimated Tax, and Estimated Grand Total above.
          </p>
          <div className="space-y-3">
            {CHARGE_TYPE_ORDER.map((chargeType) => (
              <ChargeGroup
                key={chargeType}
                chargeType={chargeType}
                records={draftResults?.[chargeType]?.records || []}
                currency={billingContext.currency}
              />
            ))}
          </div>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardContent className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Add Software / Tools / Licenses</h3>
          <p className="mb-4 text-xs text-slate-500">
            Select RMS-sourced software, tools, or licenses to bill on this invoice. Selected items appear as
            Software line items in Draft Details above once generated.
          </p>
          <InvoiceSoftwareSelection
            projectId={billingContext.configId}
            periodFrom={selection.periodFrom}
            periodTo={selection.periodTo}
            onSelectionChange={setSelectedSoftwareItems}
          />
          <GeneratedSoftwareCharges />
        </PageCardContent>
      </PageCard>
    </div>
  );
}

export default function InvoiceDraftStep(props) {
  return (
    <InvoiceDraftProvider>
      <InvoiceDraftStepBody {...props} />
    </InvoiceDraftProvider>
  );
}
