import { useState } from "react";
import { Eye } from "lucide-react";

import { PageCard, PageCardContent } from "../../../../../components/Cards/PageCard";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/ui/Modal";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import { formatCurrency } from "../../../utils/format";
import { CHARGE_TYPE_LABELS, SOURCE_SYSTEM_LABELS, describeRecord, quantityAndUnitPrice } from "../../../utils/chargeTypes";
import { useInvoiceDraftContext } from "../../../context/InvoiceDraftContext";

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function ReviewChargesStep({ billingContext, acquisitionResults }) {
  const [detailsRow, setDetailsRow] = useState(null);
  const { generatedSoftwareChargeLines } = useInvoiceDraftContext();
  const currency = billingContext.currency;

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

  const results = {
    ...acquisitionResults,
    software: {
      records: softwareRecords,
      amount: softwareRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    },
  };

  const chargeTypes = ["labor", "contract", "milestone", "recurring", "expense", "tool", "software"];
  const unified = chargeTypes.flatMap((chargeType) =>
    (results?.[chargeType]?.records || []).map((record) => ({ chargeType, record }))
  );

  const laborTotal = results?.labor?.amount || 0;
  const contractOrMilestoneTotal = (results?.contract?.amount || 0) + (results?.milestone?.amount || 0);
  const recurringTotal = results?.recurring?.amount || 0;
  const expenseTotal = results?.expense?.amount || 0;
  const toolTotal = results?.tool?.amount || 0;
  const softwareTotal = results?.software?.amount || 0;
  const subtotal = laborTotal + contractOrMilestoneTotal + recurringTotal + expenseTotal + toolTotal + softwareTotal;

  const tableRows = unified.map(({ chargeType, record }) => {
    const { quantity, unitPrice } = quantityAndUnitPrice(chargeType, record);
    const lineCurrency = record.currency || currency;
    return {
      chargeType: CHARGE_TYPE_LABELS[chargeType],
      description: <span className="text-left">{describeRecord(chargeType, record)}</span>,
      quantity,
      unitPrice: formatCurrency(unitPrice, lineCurrency),
      amount: formatCurrency(record.amount, lineCurrency),
      sourceSystem: SOURCE_SYSTEM_LABELS[chargeType],
      actions: (
        <Button variant="ghost" size="icon" title="View source details" onClick={() => setDetailsRow({ chargeType, record })}>
          <Eye className="h-4 w-4 text-gray-600" />
        </Button>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Review Acquired Charges</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consolidated, invoice-ready charges acquired for this billing period. Source transaction values cannot be
          edited here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <SummaryCard label="Labor Total" value={formatCurrency(laborTotal, currency)} />
        <SummaryCard label="Contract/Milestone Total" value={formatCurrency(contractOrMilestoneTotal, currency)} />
        <SummaryCard label="Recurring Total" value={formatCurrency(recurringTotal, currency)} />
        <SummaryCard label="Expense Total" value={formatCurrency(expenseTotal, currency)} />
        <SummaryCard label="Tool Total" value={formatCurrency(toolTotal, currency)} />
        <SummaryCard label="Software Total" value={formatCurrency(softwareTotal, currency)} />
        <SummaryCard label="Subtotal" value={formatCurrency(subtotal, currency)} />
      </div>

      <PageCard>
        <PageCardContent className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Unified Charges</h3>
          {tableRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No acquired charges to review yet.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable
                headers={["Charge Type", "Description", "Quantity", "Unit Price", "Amount", "Source System", "Actions"]}
                columns={["chargeType", "description", "quantity", "unitPrice", "amount", "sourceSystem", "actions"]}
                rows={tableRows}
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      <Modal
        isOpen={Boolean(detailsRow)}
        onClose={() => setDetailsRow(null)}
        title={detailsRow ? `${CHARGE_TYPE_LABELS[detailsRow.chargeType]} Source Details` : ""}
        width="420px"
      >
        {detailsRow && (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {Object.entries(detailsRow.record).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                <span className="capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-medium text-slate-900">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
