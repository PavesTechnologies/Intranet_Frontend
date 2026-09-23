import React from "react";

import { formatCurrency, formatDisplayDate } from "../../utils/format";
import { formatBillingPeriod } from "../../services/billingDataAcquisitionService";
import { formatClientPhone } from "../../services/invoiceService";
import pavesLogo from "../../assets/paves-logo.png";

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
  taxCalc,
  snapshotData,
  companyProfile,
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
    rawStart && rawEnd
      ? formatBillingPeriod(rawStart, rawEnd)
      : invoice?.billingPeriod || taxCalc?.billingPeriod || snapshotData?.billingPeriod || "Not provided";

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    snapshotData?.projectName ||
    "Not provided";

  // Backend does not provide projectCode; keep as "Not provided"
  const projectCode =
    invoice?.projectCode ||
    snapshotData?.projectCode ||
    taxCalc?.projectCode ||
    "Not provided";

  // Client billing information from backend InvoiceResponseDto
  const clientName =
    invoice?.clientName ||
    taxCalc?.clientName ||
    snapshotData?.clientName ||
    "Not provided";

  const clientAddress = invoice?.billingAddress || "Not provided";
  const clientGstin = invoice?.gstinOrTaxId || invoice?.gstin || "Not provided";
  const clientContact = invoice?.contact || "Not provided";
  const clientEmail = invoice?.email || "Not provided";
  const clientCountryCode =
    invoice?.countryCode ||
    taxCalc?.countryCode ||
    snapshotData?.countryCode ||
    null;
  const rawClientPhone =
    invoice?.phone ||
    taxCalc?.phone ||
    snapshotData?.phone ||
    null;
  const clientPhone = formatClientPhone(clientCountryCode, rawClientPhone);

  // Seller information from authoritative CompanyProfile API
  const sellerName = companyProfile?.legalName || invoice?.sellerName || "Not provided";

  const sellerAddressParts = [
    companyProfile?.addressLine1,
    companyProfile?.addressLine2,
    [companyProfile?.city, companyProfile?.state].filter(Boolean).join(", "),
    companyProfile?.postalCode,
    companyProfile?.country,
  ].filter(Boolean);

  const sellerAddress =
    sellerAddressParts.length > 0
      ? sellerAddressParts.join(", ")
      : invoice?.sellerAddress || "Not provided";

  const sellerGstin = companyProfile?.gstin || invoice?.sellerGstin || "Not provided";
  const sellerEmail = companyProfile?.email || invoice?.sellerEmail || "Not provided";
  const sellerPhone = companyProfile?.phone || invoice?.sellerPhone || "Not provided";
  const logoSrc = companyProfile?.logoReference || pavesLogo || "/paves-logo.png";

  // Payment terms: invoice.paymentTermName -> invoice.paymentTermCode + " Days" -> "Not provided"
  const paymentTermsDisplay =
    invoice?.paymentTermName ||
    snapshotData?.paymentTermName ||
    taxCalc?.paymentTermName ||
    (invoice?.paymentTermCode ? `${invoice.paymentTermCode} Days` : null) ||
    (snapshotData?.paymentTermCode ? `${snapshotData.paymentTermCode} Days` : null) ||
    (taxCalc?.paymentTermCode ? `${taxCalc.paymentTermCode} Days` : null) ||
    "Not provided";

  const supplierState =
    invoice?.supplierState ||
    taxCalc?.supplierState ||
    companyProfile?.state ||
    "Not provided";

  const customerState =
    invoice?.customerState ||
    taxCalc?.customerState ||
    "Not provided";

  const placeOfSupply =
    invoice?.placeOfSupply ||
    taxCalc?.placeOfSupply ||
    "Not provided";

  const taxRegion =
    invoice?.taxRegionName ||
    invoice?.taxRegion ||
    taxCalc?.taxRegionName ||
    taxCalc?.taxRegion ||
    "Not provided";

  const snapshotNumber =
    invoice?.snapshotNumber ||
    taxCalc?.snapshotNumber ||
    snapshotData?.snapshotNumber ||
    snapshotId ||
    "—";

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const taxBreakdown = Array.isArray(invoice?.taxBreakdown)
    ? invoice.taxBreakdown
    : Array.isArray(invoice?.taxComponents)
    ? invoice.taxComponents.map((c, idx) => ({
        id: c.invoiceTaxComponentId || c.id || `tax-${idx}`,
        taxComponent: c.taxTypeName || c.taxComponent || c.taxTypeCode || "Tax Component",
        taxTypeCode: c.taxTypeCode || "",
        applicability: c.applicabilityType || c.applicability || "Not specified",
        rate: c.appliedRate ?? c.rate ?? null,
        amount: c.taxAmount ?? c.amount ?? 0,
      }))
    : Array.isArray(taxCalc?.components)
    ? taxCalc.components.map((c, idx) => ({
        id: c.id || c.taxCalculationComponentId || `tax-${idx}`,
        taxComponent: c.taxComponent || c.taxTypeName || c.taxTypeCode || "Tax Component",
        taxTypeCode: c.taxTypeCode || "",
        applicability: c.applicability || c.applicabilityType || "Not specified",
        rate: c.rate ?? c.appliedRate ?? null,
        amount: c.amount ?? c.taxAmount ?? 0,
      }))
    : [];

  // Tax rows must only come from authoritative backend data; never invent synthetic tax components
  const effectiveTaxBreakdown = taxBreakdown;

  const subtotal =
    invoice?.subtotal ??
    taxCalc?.taxableAmount ??
    snapshotData?.subtotal ??
    0;

  const totalTax =
    invoice?.totalTax ??
    invoice?.totalTaxAmount ??
    taxCalc?.totalTaxAmount ??
    0;

  const grandTotal =
    invoice?.grandTotal ??
    taxCalc?.grandTotal ??
    (subtotal + totalTax);

  const invoiceStatus = (invoice?.invoiceStatus || "GENERATED").toUpperCase();

  return (
    <div className="space-y-3.5 text-slate-800 max-w-full">
      {/* 1. TOP CARD: Company Info (Left) & Invoice Info (Right) with vertical divider */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left: Company / Seller Info Section */}
          <div className="p-4 sm:p-5 space-y-2">
            <img
              src={logoSrc}
              alt="Company Logo"
              className="h-8 sm:h-9 w-auto object-contain mb-2"
            />
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {sellerName}
            </p>
            <div className="text-xs text-slate-600 leading-relaxed space-y-0.5">
              {sellerAddress !== "Not provided" ? (
                <>
                  {companyProfile?.addressLine1 && <p>{companyProfile.addressLine1}</p>}
                  {companyProfile?.addressLine2 && <p>{companyProfile.addressLine2}</p>}
                  {(companyProfile?.city || companyProfile?.state || companyProfile?.postalCode) && (
                    <p>
                      {[companyProfile?.city, companyProfile?.state].filter(Boolean).join(", ")}
                      {companyProfile?.postalCode ? ` - ${companyProfile.postalCode}` : ""}
                    </p>
                  )}
                  {companyProfile?.country && <p>{companyProfile.country}</p>}
                  {!companyProfile && <p>{sellerAddress}</p>}
                </>
              ) : (
                <p className="italic text-slate-400">Address: Not provided</p>
              )}
            </div>
            <div className="pt-2 text-xs text-slate-700 space-y-0.5 border-t border-slate-100">
              <p>
                <span className="font-semibold text-slate-800">GSTIN:</span>{" "}
                <span className={sellerGstin !== "Not provided" ? "font-mono" : "italic text-slate-400"}>
                  {sellerGstin}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Email:</span>{" "}
                <span className={sellerEmail !== "Not provided" ? "" : "italic text-slate-400"}>
                  {sellerEmail}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Phone:</span>{" "}
                <span className={sellerPhone !== "Not provided" ? "" : "italic text-slate-400"}>
                  {sellerPhone}
                </span>
              </p>
            </div>
          </div>

          {/* Right: Invoice Info Section */}
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
            </div>
          </div>
        </div>
      </div>

      {/* 2. BILL TO & INVOICE DETAILS: Two Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* BILL TO Section */}
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
                <span className={clientAddress !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                  {clientAddress}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">GSTIN / Tax ID</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={clientGstin !== "Not provided" ? "font-mono font-medium text-slate-800" : "italic text-slate-400"}>
                  {clientGstin}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Contact</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={clientContact !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                  {clientContact}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={clientEmail !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                  {clientEmail}
                </span>
              </div>
              <div className="grid grid-cols-[90px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Phone</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={clientPhone !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                  {clientPhone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* INVOICE DETAILS Section */}
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
              <span className={projectCode !== "Not provided" ? "font-mono font-medium text-slate-800" : "italic text-slate-400"}>
                {projectCode}
              </span>
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
              <span className={paymentTermsDisplay !== "Not provided" ? "font-medium text-slate-800" : "italic text-slate-400"}>
                {paymentTermsDisplay}
              </span>
            </div>
            <div className="grid grid-cols-[95px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Snapshot Number</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-mono font-medium text-slate-800">{snapshotNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TAX CONTEXT Section */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">TAX CONTEXT</h3>
        </div>
        <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
          <div className="sm:pr-4">
            <span className="block text-slate-500 font-medium text-[11px]">Supplier State</span>
            <span className={`text-sm mt-0.5 block ${supplierState === "Not provided" ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
              {supplierState}
            </span>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="block text-slate-500 font-medium text-[11px]">Customer State</span>
            <span className={`text-sm mt-0.5 block ${customerState === "Not provided" ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
              {customerState}
            </span>
          </div>
          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="block text-slate-500 font-medium text-[11px]">Place of Supply</span>
            <span className={`text-sm mt-0.5 block ${placeOfSupply === "Not provided" ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
              {placeOfSupply}
            </span>
          </div>
          <div className="pt-2 sm:pt-0 sm:pl-4">
            <span className="block text-slate-500 font-medium text-[11px]">Tax Region</span>
            <span className={`text-sm mt-0.5 block ${taxRegion === "Not provided" ? "italic text-slate-400" : "font-semibold text-slate-800"}`}>
              {taxRegion}
            </span>
          </div>
        </div>
      </div>

      {/* INVOICE LINE ITEMS Section */}
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
                      {it.resourceName || it.itemName || "Item"}
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

      {/* TAX BREAKDOWN & FINANCIAL SUMMARY: Two Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* TAX BREAKDOWN */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col">
          <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">TAX BREAKDOWN</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            {effectiveTaxBreakdown.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No tax components available
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* FINANCIAL SUMMARY */}
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

      {/* TERMS & NOTES Section */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="bg-slate-50/80 border-b border-slate-200 px-3.5 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">TERMS & NOTES</h3>
        </div>
        <div className="p-3.5 text-xs space-y-1 text-slate-700">
          <p className="font-medium">
            <span className="font-bold">Payment Terms:</span>{" "}
            <span className={paymentTermsDisplay !== "Not provided" ? "" : "italic text-slate-400"}>
              {paymentTermsDisplay}
            </span>
            <span className="mx-3 text-slate-300">|</span>
            <span className="font-bold">Billing Period:</span>{" "}
            <span className={billingPeriod !== "Not provided" ? "" : "italic text-slate-400"}>
              {billingPeriod}
            </span>
          </p>
          <p className="text-[11px] text-slate-400 italic">
            Tax calculated and verified in Tax Calculation. All financial amounts and line items are authoritative values from the billing engine.
          </p>
        </div>
      </div>
    </div>
  );
}
