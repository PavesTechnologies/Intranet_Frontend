import React from "react";
import { Loader2 } from "lucide-react";
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

/**
 * InvoicePreviewDocument
 *
 * Professional corporate / tax invoice document presentation.
 * Renders authoritative backend data on a single continuous, printable document sheet.
 * Strictly avoids mock business data (no bank details, QR, signatures, fake HSN/SAC, or fake terms).
 */
export default function InvoicePreviewDocument({
  invoice,
  snapshotId,
  taxCalc,
  snapshotData,
  companyProfile,
  isGenerating = false,
  presentation = "card",
  showStatus = true,
}) {
  const isPlain = presentation === "plain";
  const isDraft =
    !invoice?.invoiceNumber ||
    invoice?.invoiceStatus === "DRAFT_PREVIEW" ||
    invoice?.isDraftPreview;

  const invoiceStatus = isGenerating
    ? "GENERATING"
    : isDraft
    ? "DRAFT_PREVIEW"
    : (invoice?.invoiceStatus || "GENERATED").toUpperCase();

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
      : invoice?.billingPeriod ||
        taxCalc?.billingPeriod ||
        snapshotData?.billingPeriod ||
        "Not provided";

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    snapshotData?.projectName ||
    "Not provided";

  const projectCode =
    invoice?.projectCode ||
    snapshotData?.projectCode ||
    taxCalc?.projectCode ||
    "Not provided";

  // Client billing information from backend
  const clientName =
    invoice?.clientName ||
    taxCalc?.clientName ||
    snapshotData?.clientName ||
    "Not provided";

  const clientAddress =
    invoice?.billingAddress ||
    snapshotData?.billingAddress ||
    taxCalc?.billingAddress ||
    "Not configured";

  const clientGstin =
    invoice?.gstinOrTaxId ||
    invoice?.gstin ||
    snapshotData?.clientTaxId ||
    taxCalc?.clientTaxId ||
    "Not configured";

  const clientEmail =
    invoice?.email ||
    snapshotData?.clientEmail ||
    taxCalc?.email ||
    "Not configured";

  const clientContact =
    invoice?.contact ||
    snapshotData?.contact ||
    taxCalc?.contact ||
    null;

  const clientCountryCode =
    invoice?.countryCode ||
    taxCalc?.countryCode ||
    snapshotData?.countryCode ||
    null;

  const rawClientPhone =
    invoice?.phone ||
    taxCalc?.phone ||
    snapshotData?.clientPhone ||
    snapshotData?.phone ||
    null;

  const clientPhone = rawClientPhone
    ? formatClientPhone(clientCountryCode, rawClientPhone)
    : "Not configured";

  // Seller information from authoritative CompanyProfile API
  const sellerName =
    companyProfile?.legalName ||
    companyProfile?.companyName ||
    invoice?.sellerName ||
    "Not configured";

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
      : companyProfile?.address || invoice?.sellerAddress || "Not configured";

  const sellerGstin =
    companyProfile?.taxRegistrationNumber ||
    companyProfile?.gstin ||
    invoice?.sellerGstin ||
    "Not configured";

  const sellerEmail =
    companyProfile?.email || invoice?.sellerEmail || "Not configured";

  const sellerPhone =
    companyProfile?.phoneNumber ||
    companyProfile?.phone ||
    invoice?.sellerPhone ||
    "Not configured";

  const logoSrc =
    companyProfile?.logoUrl || companyProfile?.logoReference || pavesLogo;

  const paymentTermsDisplay =
    invoice?.paymentTermName ||
    snapshotData?.paymentTermName ||
    taxCalc?.paymentTermName ||
    (invoice?.paymentTermCode ? `${invoice.paymentTermCode} Days` : null) ||
    (snapshotData?.paymentTermCode ? `${snapshotData.paymentTermCode} Days` : null) ||
    (taxCalc?.paymentTermCode ? `${taxCalc.paymentTermCode} Days` : null) ||
    "Not provided";

  const snapshotNumber =
    invoice?.snapshotNumber ||
    taxCalc?.snapshotNumber ||
    snapshotData?.snapshotNumber ||
    snapshotId ||
    "—";

  // Tax Context
  const taxRegion =
    invoice?.taxRegionName ||
    invoice?.taxRegion ||
    taxCalc?.taxRegionName ||
    taxCalc?.taxRegion ||
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

  // Items
  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  // Check if items have T&M-specific attributes (role, workDate, hours)
  const hasWorkDate = items.some((it) => Boolean(it.workDate || it.date));
  const hasRole = items.some((it) => Boolean(it.role));
  const hasHours = items.some((it) => it.hours !== undefined && it.hours !== null);

  // Authoritative Tax Breakdown
  const rawBreakdown =
    Array.isArray(invoice?.taxBreakdown) && invoice.taxBreakdown.length > 0
      ? invoice.taxBreakdown
      : Array.isArray(invoice?.taxComponents) && invoice.taxComponents.length > 0
      ? invoice.taxComponents
      : Array.isArray(taxCalc?.components) && taxCalc.components.length > 0
      ? taxCalc.components
      : [];

  const effectiveTaxBreakdown = rawBreakdown.map((c, idx) => ({
    id:
      c.id ||
      c.taxCalculationComponentId ||
      c.invoiceTaxComponentId ||
      `tax-${idx}`,
    taxComponent:
      c.taxTypeName ||
      c.tax_type_name ||
      c.taxComponent ||
      c.tax_component ||
      c.taxTypeCode ||
      c.tax_type_code ||
      c.name ||
      "Tax Component",
    taxTypeCode:
      c.taxTypeCode ||
      c.tax_type_code ||
      c.taxType ||
      "",
    applicability:
      c.applicabilityType ||
      c.applicability ||
      c.applicability_type ||
      "Not specified",
    rate:
      c.appliedRate !== undefined && c.appliedRate !== null
        ? Number(c.appliedRate)
        : c.rate !== undefined && c.rate !== null
        ? Number(c.rate)
        : c.taxRate !== undefined && c.taxRate !== null
        ? Number(c.taxRate)
        : null,
    taxableAmount:
      c.taxableAmount !== undefined && c.taxableAmount !== null
        ? Number(c.taxableAmount)
        : c.taxable_amount !== undefined && c.taxable_amount !== null
        ? Number(c.taxable_amount)
        : c.taxableBase !== undefined && c.taxableBase !== null
        ? Number(c.taxableBase)
        : c.baseAmount !== undefined && c.baseAmount !== null
        ? Number(c.baseAmount)
        : null,
    amount:
      c.taxAmount !== undefined && c.taxAmount !== null
        ? Number(c.taxAmount)
        : c.amount !== undefined && c.amount !== null
        ? Number(c.amount)
        : 0,
  }));

  const sumFromComponents = effectiveTaxBreakdown.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  const subtotal =
    invoice?.subtotal !== undefined && invoice?.subtotal !== null
      ? Number(invoice.subtotal)
      : invoice?.taxableAmount !== undefined && invoice?.taxableAmount !== null
      ? Number(invoice.taxableAmount)
      : taxCalc?.taxableAmount !== undefined && taxCalc?.taxableAmount !== null
      ? Number(taxCalc.taxableAmount)
      : snapshotData?.subtotal !== undefined && snapshotData?.subtotal !== null
      ? Number(snapshotData.subtotal)
      : 0;

  const totalTax =
    invoice?.totalTax !== undefined &&
    invoice?.totalTax !== null &&
    Number(invoice.totalTax) > 0
      ? Number(invoice.totalTax)
      : invoice?.totalTaxAmount !== undefined &&
        invoice?.totalTaxAmount !== null &&
        Number(invoice.totalTaxAmount) > 0
      ? Number(invoice.totalTaxAmount)
      : taxCalc?.totalTaxAmount !== undefined &&
        taxCalc?.totalTaxAmount !== null &&
        Number(taxCalc.totalTaxAmount) > 0
      ? Number(taxCalc.totalTaxAmount)
      : sumFromComponents > 0
      ? sumFromComponents
      : 0;

  const grandTotal =
    invoice?.grandTotal !== undefined && invoice?.grandTotal !== null
      ? Number(invoice.grandTotal)
      : invoice?.totalAmount !== undefined && invoice?.totalAmount !== null
      ? Number(invoice.totalAmount)
      : taxCalc?.grandTotal !== undefined && taxCalc?.grandTotal !== null
      ? Number(taxCalc.grandTotal)
      : subtotal + totalTax;

  const expenses = Number(invoice?.expenses ?? snapshotData?.expenses ?? 0);

  // Optional real notes / terms (only if actual data exists)
  const additionalNotes = invoice?.additionalNotes || null;
  const termsAndConditions = invoice?.termsAndConditions || null;
  const hasNotesOrTerms = Boolean(additionalNotes || termsAndConditions);

  return (
    <div className={`bg-white ${isPlain ? "p-0 sm:p-2 space-y-8" : "border border-slate-300 rounded-lg shadow-sm p-6 sm:p-10 space-y-7"} text-slate-800 w-full print:border-none print:shadow-none print:p-0`}>
      {/* ========================================================================= */}
      {/* 1. DOCUMENT HEADER: Seller Information (Left) & Invoice Metadata (Right)  */}
      {/* ========================================================================= */}
      <div className={`gap-6 pb-6 border-b border-slate-200 md:items-start ${isPlain ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_420px]" : "flex flex-col md:flex-row md:justify-between"}`}>
        {/* Left: Seller Corporate Profile */}
        <div className={`space-y-2.5 ${isPlain ? "min-w-0" : "max-w-md"}`}>
          <img
            src={logoSrc}
            alt="Company Logo"
            className="h-10 w-auto object-contain mb-1"
          />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
              {sellerName}
            </h2>
            <div className="text-xs text-slate-600 leading-relaxed mt-1">
              {sellerAddress !== "Not configured" && sellerAddress !== "Not provided" ? (
                <p>{sellerAddress}</p>
              ) : (
                <p className="italic text-slate-400">Address: Not configured</p>
              )}
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-700 space-y-1.5 border-t border-slate-100">
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">GSTIN / Tax ID</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={sellerGstin !== "Not configured" ? "font-mono font-medium text-slate-900" : "italic text-slate-400"}>
                {sellerGstin}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Email</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={sellerEmail !== "Not configured" ? "text-slate-900" : "italic text-slate-400"}>
                {sellerEmail}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Phone</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={sellerPhone !== "Not configured" ? "text-slate-900" : "italic text-slate-400"}>
                {sellerPhone}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Tax Invoice Title & Authoritative Metadata */}
        <div className={`md:flex md:flex-col space-y-3 ${isPlain ? "min-w-0 md:items-stretch" : "shrink-0 md:items-end"}`}>
          <div className="md:text-right">
            {showStatus && <div className="mt-1 flex md:justify-end">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                  isGenerating
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : isDraft
                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-[#0A0082]" />
                    Generating
                  </>
                ) : isDraft ? (
                  "DRAFT – NOT GENERATED"
                ) : invoiceStatus === "GENERATED" ? (
                  "INVOICE GENERATED"
                ) : (
                  invoiceStatus
                )}
              </span>
            </div>}
          </div>

          <div className={`space-y-2 text-xs text-slate-700 w-full ${isPlain ? "py-3 border-y border-slate-300" : "md:w-auto min-w-[270px] bg-slate-50/70 p-3 rounded-md border border-slate-200/80"}`}>
            <div className={`grid items-center gap-x-3 ${isPlain ? "grid-cols-[135px_minmax(0,1fr)]" : "grid-cols-[105px_12px_1fr]"}`}>
              <span className="text-slate-500 font-medium">Invoice Number</span>
              {!isPlain && <span className="text-slate-400 font-semibold">:</span>}
              <span
                className={`font-mono ${
                  isGenerating
                    ? "text-indigo-600 font-semibold flex items-center gap-1"
                    : isDraft
                    ? "text-slate-500 italic"
                    : "font-bold text-slate-900"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-600 inline" /> Assigning...
                  </>
                ) : (
                  invoice?.invoiceNumber || "Assigned on generation"
                )}
              </span>
            </div>
            <div className={`grid items-center gap-x-3 ${isPlain ? "grid-cols-[135px_minmax(0,1fr)]" : "grid-cols-[105px_12px_1fr]"}`}>
              <span className="text-slate-500 font-medium">Invoice Date</span>
              {!isPlain && <span className="text-slate-400 font-semibold">:</span>}
              <span className="font-medium text-slate-900">
                {isGenerating ? (
                  <span className="text-slate-500 italic">Assigning...</span>
                ) : invoice?.invoiceDate ? (
                  formatDisplayDate(invoice.invoiceDate)
                ) : isDraft ? (
                  "Set on generation"
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className={`grid items-center gap-x-3 ${isPlain ? "grid-cols-[135px_minmax(0,1fr)]" : "grid-cols-[105px_12px_1fr]"}`}>
              <span className="text-slate-500 font-medium">Due Date</span>
              {!isPlain && <span className="text-slate-400 font-semibold">:</span>}
              <span className="font-medium text-slate-900">
                {isGenerating ? (
                  <span className="text-slate-500 italic">Calculating...</span>
                ) : invoice?.dueDate ? (
                  formatDisplayDate(invoice.dueDate)
                ) : isDraft ? (
                  "Set on generation"
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className={`grid items-center gap-x-3 ${isPlain ? "grid-cols-[135px_minmax(0,1fr)]" : "grid-cols-[105px_12px_1fr]"}`}>
              <span className="text-slate-500 font-medium">Currency</span>
              {!isPlain && <span className="text-slate-400 font-semibold">:</span>}
              <span className="font-mono font-bold text-slate-900">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BILL TO & PROJECT DETAILS SECTION                                      */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isPlain ? "py-5 border-b border-slate-200" : "p-5 rounded-lg border border-slate-200 bg-slate-50/50"}`}>
        {/* Left Column: Bill To */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              BILL TO
            </h3>
          </div>
          <div className="space-y-1.5 text-xs pt-0.5">
            <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
              <span className="text-slate-500 font-medium">Client Name</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-bold text-slate-900 text-sm">{clientName}</span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-start">
              <span className="text-slate-500 font-medium">Billing Address</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={clientAddress !== "Not configured" && clientAddress !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                {clientAddress}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Email</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={clientEmail !== "Not configured" && clientEmail !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                {clientEmail}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Phone</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={clientPhone !== "Not configured" && clientPhone !== "Not provided" ? "text-slate-800" : "italic text-slate-400"}>
                {clientPhone}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">GSTIN / Tax ID</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={clientGstin !== "Not configured" && clientGstin !== "Not provided" ? "font-mono font-medium text-slate-900" : "italic text-slate-400"}>
                {clientGstin}
              </span>
            </div>
            {clientContact && (
              <div className="grid grid-cols-[105px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Contact</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className="text-slate-800">{clientContact}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Project / Billing Details */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              PROJECT / BILLING DETAILS
            </h3>
          </div>
          <div className="space-y-1.5 text-xs pt-0.5">
            <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
              <span className="text-slate-500 font-medium">Project Name</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-bold text-slate-900 text-sm">{projectName}</span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Project Code</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={projectCode !== "Not provided" ? "font-mono text-slate-900" : "italic text-slate-400"}>
                {projectCode}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Billing Period</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="text-slate-900 whitespace-nowrap">{billingPeriod}</span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Payment Terms</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className={paymentTermsDisplay !== "Not provided" ? "text-slate-900" : "italic text-slate-400"}>
                {paymentTermsDisplay}
              </span>
            </div>
            <div className="grid grid-cols-[105px_12px_1fr] items-center">
              <span className="text-slate-500 font-medium">Snapshot ID</span>
              <span className="text-slate-400 font-semibold">:</span>
              <span className="font-mono text-slate-700">{snapshotNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INVOICE LINE ITEMS TABLE                                               */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            INVOICE LINE ITEMS
          </h3>
          <span className="text-[11px] font-medium text-slate-500">
            {items.length} {items.length === 1 ? "Item" : "Items"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-md">
            No line items recorded for this billing snapshot.
          </div>
        ) : (
          <div className={`overflow-x-auto ${isPlain ? "border-y border-slate-300" : "rounded-md border border-slate-200"}`}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-3 !text-left w-10">#</th>
                  <th className="py-2.5 px-3 !text-left">
                    {hasRole ? "Resource / Item" : "Description / Item"}
                  </th>
                  {hasRole && <th className="py-2.5 px-3 !text-left">Role</th>}
                  {hasWorkDate && <th className="py-2.5 px-3 !text-left">Work Date</th>}
                  <th className="py-2.5 px-3 !text-left">
                    {hasHours ? "Hours / Qty" : "Quantity"}
                  </th>
                  <th className="py-2.5 px-3 !text-left">Rate</th>
                  <th className="py-2.5 pr-4 pl-3 !text-left">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr
                    key={it.id || idx}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 !text-left text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 !text-left text-slate-900 font-semibold">
                      {it.itemName || it.resourceName || it.description || it.employee || "Line Item"}
                    </td>
                    {hasRole && (
                      <td className="py-2.5 px-3 !text-left text-slate-600">{it.role || "—"}</td>
                    )}
                    {hasWorkDate && (
                      <td className="py-2.5 px-3 !text-left text-slate-600 font-medium">
                        {it.workDate
                          ? formatDisplayDate(it.workDate)
                          : it.date
                          ? formatDisplayDate(it.date)
                          : "—"}
                      </td>
                    )}
                    <td className="py-2.5 px-3 !text-left font-mono font-medium text-slate-700">
                      {it.hours !== undefined && it.hours !== null
                        ? Number(it.hours).toFixed(2)
                        : it.quantity !== undefined && it.quantity !== null
                        ? Number(it.quantity).toFixed(2)
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 !text-left font-mono font-medium text-slate-700">
                      {it.rate !== undefined && it.rate !== null
                        ? formatCurrency(it.rate, currency)
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-4 pl-3 !text-left font-mono font-bold text-slate-900">
                      {formatCurrency(it.amount ?? it.totalAmount ?? 0, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. TAX BREAKDOWN TABLE                                                    */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            TAX BREAKDOWN
          </h3>
        </div>

        {effectiveTaxBreakdown.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-md">
            No tax components available
          </div>
        ) : (
          <div className={`overflow-x-auto ${isPlain ? "border-y border-slate-300" : "rounded-md border border-slate-200"}`}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-3 !text-left">Tax Type</th>
                  <th className="py-2.5 px-3 !text-left">Applicability</th>
                  <th className="py-2.5 px-3 !text-left">Rate</th>
                  <th className="py-2.5 px-3 !text-left">Taxable Amount</th>
                  <th className="py-2.5 pr-4 pl-3 !text-left">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {effectiveTaxBreakdown.map((comp, idx) => (
                  <tr
                    key={comp.id || idx}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 !text-left font-semibold text-slate-900">
                      {comp.taxTypeCode || comp.taxComponent}
                    </td>
                    <td className="py-2.5 px-3 !text-left text-slate-600">
                      {humanizeApplicability(comp.applicability)}
                    </td>
                    <td className="py-2.5 px-3 !text-left font-mono font-semibold text-slate-700">
                      {formatRatePercentage(comp.rate) ?? "—"}
                    </td>
                    <td className="py-2.5 px-3 !text-left font-mono font-medium text-slate-700">
                      {comp.taxableAmount !== null && comp.taxableAmount !== undefined
                        ? formatCurrency(comp.taxableAmount, currency)
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-4 pl-3 !text-left font-mono font-bold text-slate-900">
                      {formatCurrency(comp.amount, currency)}
                    </td>
                  </tr>
                ))}
                {/* Total Tax Summary Row inside Tax Table */}
                <tr className="border-t-2 border-slate-300 bg-slate-50/80 font-bold">
                  <td colSpan={4} className="py-2.5 px-3 !text-left text-slate-800">
                    Total Tax
                  </td>
                  <td className="py-2.5 pr-4 pl-3 !text-left font-mono text-slate-900 font-extrabold">
                    {formatCurrency(totalTax, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. TAX CONTEXT (Left) & FINANCIAL SUMMARY (Right)                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left: Tax Context */}
        <div className={`${isPlain ? "py-4 border-y border-slate-200" : "p-5 rounded-lg border border-slate-200 bg-slate-50/50"} space-y-3 flex flex-col justify-between`}>
          <div>
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                TAX CONTEXT
              </h3>
            </div>
            <div className="space-y-2 text-xs pt-3">
              <div className="grid grid-cols-[110px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Tax Region</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={taxRegion !== "Not provided" ? "font-semibold text-slate-800" : "italic text-slate-400"}>
                  {taxRegion}
                </span>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Supplier State</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={supplierState !== "Not provided" ? "font-semibold text-slate-800" : "italic text-slate-400"}>
                  {supplierState}
                </span>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Customer State</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={customerState !== "Not provided" ? "font-semibold text-slate-800" : "italic text-slate-400"}>
                  {customerState}
                </span>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr] items-center">
                <span className="text-slate-500 font-medium">Place of Supply</span>
                <span className="text-slate-400 font-semibold">:</span>
                <span className={placeOfSupply !== "Not provided" ? "font-semibold text-slate-800" : "italic text-slate-400"}>
                  {placeOfSupply}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-200/80">
            Authoritative tax configuration and jurisdiction evaluated by the AR tax engine.
          </p>
        </div>

        {/* Right: Financial Summary */}
        <div className={`${isPlain ? "py-4" : "p-5 rounded-lg border border-slate-200 bg-slate-50/50"} space-y-3 flex flex-col justify-between`}>
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              FINANCIAL SUMMARY
            </h3>
          </div>

          <div className="space-y-2 text-xs py-1">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">Subtotal</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>
            {expenses > 0 && (
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Expenses</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(expenses, currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">Tax</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(totalTax, currency)}
              </span>
            </div>
          </div>

          {/* Strong Grand Total Box */}
          <div className={`${isPlain ? "border-t-2 border-slate-900 pt-3 text-slate-900" : "rounded-md bg-slate-900 text-white p-3.5 shadow-xs"} flex items-center justify-between`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${isPlain ? "text-slate-600" : "text-slate-200"}`}>
              Grand Total
            </span>
            <span className={`font-mono text-lg sm:text-xl font-black ${isPlain ? "text-slate-900" : "text-white"}`}>
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. NOTES & TERMS: Only rendered if actual data exists in backend          */}
      {/* ========================================================================= */}
      {hasNotesOrTerms && (
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            NOTES & TERMS
          </h3>
          {additionalNotes && (
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {additionalNotes}
            </p>
          )}
          {termsAndConditions && (
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
              {termsAndConditions}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
