import React from "react";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatCurrency } from "../../utils/formatters";

/**
 * 3-way match comparison: PO vs Goods Receipt vs Invoice.
 * Line items are synthetic/illustrative — derived from the invoice total,
 * not sourced from a real purchasing system.
 */
const InvoiceMatchingPanel = ({ data, isLoading, canMark, onMarkMatched, isMarking }) => {
  if (isLoading) {
    return <LoadingSpinner text="Loading match data..." />;
  }

  if (!data) {
    return <p className={Fonts.paragraphMuted}>No matching data available for this invoice.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={Fonts.subheading}>Three-Way Match</h3>
          <p className={`${Fonts.smallText} mt-0.5`}>
            Illustrative line items — quantities and prices are derived for demonstration purposes only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={Fonts.label}>Overall verdict:</span>
          <StatusBadge label={data.matchStatus} size="md" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[640px] table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <th className="px-3 py-2.5 text-left font-semibold">Line</th>
              <th className="px-3 py-2.5 text-center font-semibold" colSpan={2}>
                Purchase Order
              </th>
              <th className="px-3 py-2.5 text-center font-semibold" colSpan={2}>
                Goods Receipt
              </th>
              <th className="px-3 py-2.5 text-center font-semibold" colSpan={2}>
                Invoice
              </th>
            </tr>
            <tr className="bg-slate-100 text-slate-600 text-xs">
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-center">Unit Price</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-center">Unit Price</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-center">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => {
              const qtyMismatch = line.po.quantity !== line.grn.quantity || line.po.quantity !== line.invoice.quantity;
              const priceMismatch = line.po.unitPrice !== line.invoice.unitPrice;
              return (
                <tr key={line.lineNo} className={qtyMismatch || priceMismatch ? "bg-amber-50" : "bg-white"}>
                  <td className="px-3 py-2 text-left text-slate-700">
                    Line {line.lineNo} — {line.description}
                  </td>
                  <td className="px-3 py-2 text-center">{line.po.quantity}</td>
                  <td className="px-3 py-2 text-center">{formatCurrency(line.po.unitPrice)}</td>
                  <td className={`px-3 py-2 text-center ${qtyMismatch ? "font-semibold text-amber-700" : ""}`}>
                    {line.grn.quantity}
                  </td>
                  <td className="px-3 py-2 text-center">{formatCurrency(line.grn.unitPrice)}</td>
                  <td className={`px-3 py-2 text-center ${qtyMismatch ? "font-semibold text-amber-700" : ""}`}>
                    {line.invoice.quantity}
                  </td>
                  <td className={`px-3 py-2 text-center ${priceMismatch ? "font-semibold text-amber-700" : ""}`}>
                    {formatCurrency(line.invoice.unitPrice)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canMark && (
        <div className="flex justify-end">
          <Button size="medium" variant="success" loading={isMarking} loadingText="Marking..." onClick={onMarkMatched}>
            Mark as Matched
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvoiceMatchingPanel;
