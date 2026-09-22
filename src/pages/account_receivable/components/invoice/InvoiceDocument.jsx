import React from "react";
import { Mail, MailCheck } from "lucide-react";

import { formatCurrency, formatDisplayDate } from "../../utils/format";
import { formatBillingPeriod } from "../../services/billingDataAcquisitionService";
import pavesLogo from "../../assets/paves-logo.png";
import {
  DEMO_SELLER,
  DEMO_CLIENT,
  DEMO_PROJECT,
  DEMO_TAX_CONTEXT,
  DEMO_TERMS,
  DEMO_DELIVERY_STATUS,
} from "../../utils/invoiceDemoData";

const formatRatePercentage = (rate) => {
  if (rate === null || rate === undefined || rate === "") return null;
  const num = Number(rate);
  if (Number.isNaN(num)) return null;
  return `${num.toFixed(2)}%`;
};

const APPLICABILITY_LABELS = {
  SAME_JURISDICTION: "Same Jurisdiction",
  DIFFERENT_JURISDICTION: "Different Jurisdiction",
  ALL: "All Jurisdictions",
};

const humanizeApplicability = (value) => {
  if (!value) return "Not specified";
  if (APPLICABILITY_LABELS[value]) return APPLICABILITY_LABELS[value];
  return String(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function InvoiceDocument({
  invoice,
  snapshotId,
  deliveryState = { deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT },
  taxCalc,
  snapshotData,
}) {
  const currency =
    invoice?.currency ||
    taxCalc?.currencyCode ||
    snapshotData?.currency ||
    "USD";

  const rawStart =
    invoice?.billingPeriodStart ||
    taxCalc?.billingPeriodStart ||
    snapshotData?.billingPeriodStart;

  const rawEnd =
    invoice?.billingPeriodEnd ||
    taxCalc?.billingPeriodEnd ||
    snapshotData?.billingPeriodEnd;

  const billingPeriod =
    invoice?.billingPeriod ||
    (rawStart && rawEnd
      ? formatBillingPeriod(rawStart, rawEnd)
      : taxCalc?.billingPeriod || snapshotData?.billingPeriod || DEMO_TERMS.billingPeriod);

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    snapshotData?.projectName ||
    DEMO_PROJECT.name;

  const projectCode =
    invoice?.projectCode ||
    snapshotData?.projectCode ||
    taxCalc?.projectCode ||
    (invoice?.projectId ? `PRJ-${invoice.projectId}` : null) ||
    DEMO_PROJECT.code;

  const clientName =
    invoice?.clientName ||
    taxCalc?.clientName ||
    snapshotData?.clientName ||
    DEMO_CLIENT.legalName;

  const snapshotNumber =
    invoice?.snapshotNumber ||
    taxCalc?.snapshotNumber ||
    snapshotData?.snapshotNumber ||
    snapshotId ||
    "—";

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const taxBreakdown = Array.isArray(invoice?.taxBreakdown) ? invoice.taxBreakdown : [];

  const subtotal =
    invoice?.subtotal ??
    taxCalc?.taxableAmount ??
    snapshotData?.subtotal ??
    0;

  const totalTax =
    invoice?.totalTax ??
    taxCalc?.totalTaxAmount ??
    0;

  const grandTotal =
    invoice?.grandTotal ??
    taxCalc?.grandTotal ??
    (subtotal + totalTax);

  const effectiveTaxBreakdown =
    taxBreakdown.length > 0
      ? taxBreakdown
      : totalTax > 0
      ? [
          {
            id: "demo-cgst",
            taxComponent: "Central Goods and Services Tax",
            taxTypeCode: "CGST",
            applicability: "SAME_JURISDICTION",
            rate: 9.0,
            amount: totalTax / 2,
          },
          {
            id: "demo-sgst",
            taxComponent: "State Goods and Services Tax",
            taxTypeCode: "SGST",
            applicability: "SAME_JURISDICTION",
            rate: 9.0,
            amount: totalTax / 2,
          },
        ]
      : [];

  const invoiceStatus = (invoice?.invoiceStatus || "GENERATED").toUpperCase();

  return (
    <div className="space-y-3.5 text-slate-800 max-w-full">
      {/* 1. TOP CARD: Company Info (Left) & Invoice Info (Right) with vertical divider */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left: 2. Company Info Section */}
          <div className="p-4 sm:p-5 space-y-2">
            <img
              src={pavesLogo || "/paves-logo.png"}
              alt="PAVES TECHNOLOGIES"
              className="h-8 sm:h-9 w-auto object-contain mb-2"
            />
            <p className="text-sm font-bold text-slate-900 leading-snug">{DEMO_SELLER.legalName}</p>
            <div className="text-xs text-slate-600 leading-relaxed space-y-0.5">
              {DEMO_SELLER.addressLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <p>{DEMO_SELLER.city}, {DEMO_SELLER.state} - {DEMO_SELLER.postalCode}, {DEMO_SELLER.country}</p>
            </div>
            <div className="pt-2 text-xs text-slate-700 space-y-0.5 border-t border-slate-100">
              <p><span className="font-semibold text-slate-800">GSTIN:</span> {DEMO_SELLER.gstin}</p>
              <p><span className="font-semibold text-slate-800">Email:</span> {DEMO_SELLER.email}</p>
              <p><span className="font-semibold text-slate-800">Phone:</span> {DEMO_SELLER.phone}</p>
            </div>
          </div>

          {/* Right: 3. Invoice Info Section */}
          <div className="p-4 sm:p-5 space-y-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              INVOICE
            </h1>
            <div className="space-y-1.5 text-xs">
              <div className="grid grid-cols-[100px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Invoice Number</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className="font-mono font-bold text-slate-900">{invoice?.invoiceNumber || "—"}</span>
              </div>
              <div className="grid grid-cols-[100px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Invoice Date</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className="font-semibold text-slate-800">
                  {invoice?.invoiceDate ? formatDisplayDate(invoice.invoiceDate) : "—"}
                </span>
              </div>
              <div className="grid grid-cols-[100px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Due Date</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className="font-semibold text-slate-800">
                  {invoice?.dueDate ? formatDisplayDate(invoice.dueDate) : "—"}
                </span>
              </div>
              <div className="grid grid-cols-[100px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="text-slate-400 font-semibold">:</span>
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                    {invoiceStatus === "GENERATED"
                      ? "Invoice Generated"
                      : invoiceStatus === "PENDING_APPROVAL"
                      ? "Pending Approval"
                      : invoiceStatus}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-[100px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Delivery Status</span>
                <span className="text-slate-400 font-semibold">:</span>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow-2xs">
                    {deliveryState?.deliveryStatus === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT ? (
                      <>
                        <MailCheck className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-teal-700 font-semibold">Sent to Client</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span>Not Sent</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BILL TO & INVOICE DETAILS: Two Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 4. BILL TO Section */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">BILL TO</h3>
          </div>
          <div className="p-3.5 space-y-2.5">
            <p className="text-sm font-bold text-slate-900">{clientName}</p>
            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-[90px_12px_1fr] items-start">
                <span className="text-slate-500 font-medium">Billing Address</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={invoice?.billingAddress ? "text-slate-800" : "italic text-slate-400"}>
                  {invoice?.billingAddress || DEMO_CLIENT.billingAddress}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">GSTIN / Tax ID</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={invoice?.gstin ? "font-mono font-medium text-slate-800" : "italic text-slate-400"}>
                  {invoice?.gstin || DEMO_CLIENT.gstin}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Contact</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={invoice?.contact ? "text-slate-800" : "italic text-slate-400"}>
                  {invoice?.contact || DEMO_CLIENT.contact}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={invoice?.email ? "text-slate-800" : "italic text-slate-400"}>
                  {invoice?.email || DEMO_CLIENT.email}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Phone</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={invoice?.phone ? "text-slate-800" : "italic text-slate-400"}>
                  {invoice?.phone || DEMO_CLIENT.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. INVOICE DETAILS Section */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">INVOICE DETAILS</h3>
          </div>
          <div className="p-3.5 space-y-1 text-xs">
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Project</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-semibold text-slate-800">{projectName}</span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Project Code</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-mono font-medium text-slate-800">{projectCode}</span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Client</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-semibold text-slate-800">{clientName}</span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Billing Period</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-semibold text-slate-800 whitespace-nowrap">{billingPeriod}</span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Currency</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-mono font-bold text-slate-800">{currency}</span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Payment Terms</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-medium text-slate-800">{invoice?.paymentTerms || DEMO_TERMS.paymentTerms}</span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Snapshot Number</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-mono font-medium text-slate-800">{snapshotNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. TAX CONTEXT Section: In one row with dividers */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">TAX CONTEXT</h3>
        </div>
        <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
          <div className="sm:pr-4">
            <span className="block text-slate-500 font-medium text-[11px]">Supplier State</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{DEMO_TAX_CONTEXT.supplierState}</span>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="block text-slate-500 font-medium text-[11px]">Customer State</span>
            <span className="text-slate-400 italic text-sm mt-0.5 block">{DEMO_TAX_CONTEXT.customerState}</span>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="block text-slate-500 font-medium text-[11px]">Place of Supply</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{DEMO_TAX_CONTEXT.placeOfSupply}</span>
          </div>
          <div className="pt-2 sm:pt-0 sm:pl-4">
            <span className="block text-slate-500 font-medium text-[11px]">Tax Region</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{DEMO_TAX_CONTEXT.taxRegion}</span>
          </div>
        </div>
      </div>

      {/* 7. INVOICE LINE ITEMS Section */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">INVOICE LINE ITEMS</h3>
        </div>
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No individual invoice items returned by the backend.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                  <th className="py-2 px-3 text-left font-semibold w-8">#</th>
                  <th className="py-2 px-3 text-left font-semibold">Resource / Item</th>
                  <th className="py-2 px-3 text-left font-semibold">Role</th>
                  <th className="py-2 px-3 text-left font-semibold">Work Date</th>
                  <th className="py-2 px-3 text-right font-semibold">Hours / Qty</th>
                  <th className="py-2 px-3 text-right font-semibold">Rate</th>
                  <th className="py-2 pr-3.5 pl-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-2 px-3 text-slate-900 font-medium">
                      {it.resourceName || it.description || it.itemName || it.resource || "Item"}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {it.role || "Unknown"}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-medium">
                      {it.workDate ? formatDisplayDate(it.workDate) : (it.date ? formatDisplayDate(it.date) : "—")}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {it.hours !== undefined && it.hours !== null
                        ? Number(it.hours).toFixed(2)
                        : it.quantity !== undefined && it.quantity !== null
                        ? Number(it.quantity).toFixed(2)
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {it.rate !== undefined && it.rate !== null
                        ? `${currency} ${Number(it.rate).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-3.5 pl-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.amount ?? it.totalAmount ?? 0, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. TAX BREAKDOWN & 9. FINANCIAL SUMMARY: Two Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 8. TAX BREAKDOWN */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col">
          <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">TAX BREAKDOWN</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                  <th className="py-2 px-3 text-left font-semibold">Tax Component</th>
                  <th className="py-2 px-3 text-left font-semibold">Applicability</th>
                  <th className="py-2 px-3 text-right font-semibold">Rate</th>
                  <th className="py-2 pr-3.5 pl-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {effectiveTaxBreakdown.map((comp, idx) => (
                  <tr key={comp.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {comp.taxTypeCode || comp.taxComponent}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {humanizeApplicability(comp.applicability)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                      {formatRatePercentage(comp.rate) ?? "—"}
                    </td>
                    <td className="py-2 pr-3.5 pl-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(comp.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. FINANCIAL SUMMARY */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col">
          <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">FINANCIAL SUMMARY</h3>
          </div>
          <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-center text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Subtotal</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Tax</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(totalTax, currency)}
              </span>
            </div>
            <div className="rounded-md bg-blue-50/80 border border-blue-100 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-900">
                Grand Total
              </span>
              <span className="font-mono text-base font-extrabold text-blue-950">
                {formatCurrency(grandTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 10. TERMS & NOTES Section */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">TERMS & NOTES</h3>
        </div>
        <div className="p-3.5 text-xs space-y-1 text-slate-700">
          <p className="font-medium">
            <span className="font-bold">Payment Terms:</span> {invoice?.paymentTerms || DEMO_TERMS.paymentTerms}
            <span className="mx-3 text-slate-300">|</span>
            <span className="font-bold">Billing Period:</span> {billingPeriod}
          </p>
          <p className="text-[11px] text-slate-400 italic">
            Tax calculated and verified in Tax Calculation. All financial amounts and line items are authoritative values from the billing engine.
          </p>
        </div>
      </div>
    </div>
  );
}
