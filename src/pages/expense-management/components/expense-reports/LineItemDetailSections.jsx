import React from "react";
import { Layers, Receipt } from "lucide-react";
import TaxStatusBadge from "./TaxStatusBadge";

/**
 * Read-only sections of the employee's View Line Item panel beyond the headline fields: the full tax
 * snapshot (code, components, ITC) and how the line is charged across cost centers. Values come straight
 * from ExpenseLineItemResponse.tax and the line's ExpenseSplitResponse list.
 */

const TAX_SOURCE_LABEL = {
  CALCULATED: "Calculated from the tax code",
  EMPLOYEE_OVERRIDE: "Entered by you",
  OCR: "Read from the receipt",
  FINANCE_ADJUSTED: "Adjusted by Finance",
  LEGACY: "Entered before tax codes",
};

const ITC_STATUS = {
  NOT_RECOVERABLE: { label: "Not recoverable", className: "bg-gray-100 text-gray-600 border-gray-200" },
  UNVERIFIED: { label: "Awaiting Finance", className: "bg-amber-50 text-amber-700 border-amber-200" },
  VERIFIED: { label: "Verified by Finance", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const pct = (value) => (value == null ? null : `${Number(value)}%`);
const hasValue = (value) => value != null && value !== "";

function Section({ icon, title, badge, children }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
          <span className="text-blue-700">{icon}</span>
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800 break-words">{children}</span>
    </div>
  );
}

/** Tax code, rate and treatment, the CGST/SGST/IGST/cess split, where the tax came from, and input tax credit. */
export function LineItemTaxDetails({ lineItem, formatAmount }) {
  const tax = lineItem?.tax;
  if (!tax || (!tax.taxCode && !(Number(lineItem.taxAmount) > 0))) return null;

  const currency = lineItem.currencyCode || "";
  const money = (value) => (hasValue(value) ? `${formatAmount(value)} ${currency}`.trim() : "—");
  const itc = ITC_STATUS[tax.itcStatus];
  const calculatedDiffers =
    hasValue(tax.calculatedTaxAmount) && Math.abs(Number(tax.calculatedTaxAmount) - Number(tax.taxAmount ?? 0)) > 0.005;
  const ocrDiffers = hasValue(tax.ocrTaxAmount) && Math.abs(Number(tax.ocrTaxAmount) - Number(tax.taxAmount ?? 0)) > 0.005;
  const recoverable = Number(tax.recoverableTaxAmount) > 0;

  return (
    <Section icon={<Receipt size={14} />} title="Tax details" badge={<TaxStatusBadge tax={tax} />}>
      <div className="space-y-1.5">
        <Row label="Tax code">
          {tax.taxCode || "None"}
          {tax.taxType ? ` · ${tax.taxType}` : ""}
          {hasValue(tax.taxRatePercent) ? ` · ${pct(tax.taxRatePercent)}` : ""}
        </Row>
        {tax.taxTreatment && (
          <Row label="Amount entered">{tax.taxTreatment === "INCLUSIVE" ? "Including tax" : "Excluding tax"}</Row>
        )}
        {hasValue(tax.taxableAmount) && <Row label="Taxable amount">{money(tax.taxableAmount)}</Row>}
        <Row label="Tax amount">{money(tax.taxAmount ?? lineItem.taxAmount)}</Row>
        {calculatedDiffers && <Row label="Tax code would give">{money(tax.calculatedTaxAmount)}</Row>}
        {ocrDiffers && <Row label="Read from the receipt">{money(tax.ocrTaxAmount)}</Row>}
        {TAX_SOURCE_LABEL[tax.taxSource] && <Row label="Source">{TAX_SOURCE_LABEL[tax.taxSource]}</Row>}
        {tax.taxOverrideReason && <Row label="Reason for the difference">{tax.taxOverrideReason}</Row>}
        {tax.supplierGstin && <Row label="Supplier GSTIN"><span className="font-mono">{tax.supplierGstin}</span></Row>}
      </div>

      {tax.components?.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left font-semibold">Component</th>
                <th className="px-3 py-1.5 text-right font-semibold">Rate</th>
                <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tax.components.map((c, i) => (
                <tr key={`${c.componentCode}-${i}`}>
                  <td className="px-3 py-1.5 text-gray-700">{c.label || c.componentCode}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-600">{pct(c.ratePercent) ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-800">{money(c.taxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(recoverable || itc) && (
        <div className="space-y-1.5 border-t border-gray-200 pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Input tax credit (ITC)</span>
            {itc && (
              <span className={`rounded-full border px-1.5 py-px text-[10px] font-semibold ${itc.className}`}>{itc.label}</span>
            )}
          </div>
          {hasValue(tax.itcRecoverablePercent) && <Row label="Recoverable share">{pct(tax.itcRecoverablePercent)}</Row>}
          <Row label="Recoverable tax">{money(tax.recoverableTaxAmount ?? 0)}</Row>
          <Row label="Non-recoverable tax">{money(tax.nonRecoverableTaxAmount ?? tax.taxAmount)}</Row>
        </div>
      )}
    </Section>
  );
}

/** The line's cost center, or each split share, plus the reason when it's charged outside the employee's department. */
export function LineItemAllocationDetails({ lineItem, splits = [], formatAmount }) {
  const baseCurrency = lineItem?.baseCurrencyCode || "";
  if (splits.length === 0 && !lineItem?.allocationReason) return null;

  return (
    <Section icon={<Layers size={14} />} title={splits.length > 0 ? `Split across ${splits.length} cost centers` : "Cost allocation"}>
      {splits.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left font-semibold">Cost center</th>
                <th className="px-3 py-1.5 text-right font-semibold">Share</th>
                <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...splits]
                .sort((a, b) => (a.splitOrder ?? 0) - (b.splitOrder ?? 0))
                .map((s) => (
                  <tr key={s.splitId}>
                    <td className="px-3 py-1.5 text-gray-700">{s.costCenterName || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                      {s.splitType === "PERCENTAGE" && s.percentage != null ? pct(s.percentage) : "Fixed"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-800">
                      {`${formatAmount(s.allocatedAmount)} ${baseCurrency}`.trim()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-400">Amounts in {baseCurrency || "the base currency"}.</p>
        </div>
      )}
      {lineItem.allocationReason && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">Reason for charging another department:</span> {lineItem.allocationReason}
        </p>
      )}
    </Section>
  );
}
