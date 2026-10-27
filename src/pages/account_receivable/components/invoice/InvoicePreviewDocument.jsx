import React from "react";
import { formatCurrency, formatDisplayDate } from "../../utils/format";
import { formatClientPhone } from "../../services/invoiceService";
import {
  INVOICE_BILLING_TYPE_LABELS,
  buildInvoiceLineItems,
  formatDateRange,
  formatPaymentTerms,
  resolveInvoiceBillingType,
  isExpenseLine,
  TIME_ENTRY_ITEM_TYPES,
} from "../../utils/invoicePresentation";
import { toIsoDateOnly } from "../../services/billingDataAcquisitionService";
import pavesLogo from "../../assets/paves-logo.png";
import useSignatureImage from "../../hooks/useSignatureImage";
import {
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
} from "lucide-react";

/**
 * Converts a numeric amount to formal words supporting Indian numbering (Crores, Lakhs, Thousands)
 * and international currencies (Dollars/Cents, etc.).
 *
 * Example: 19498 INR -> "INR Nineteen Thousand, Four Hundred And Ninety-Eight Rupees Only."
 */
export function formatAmountInWords(amount, currency = "INR") {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "Zero Only.";
  }
  const num = Math.abs(Number(amount));
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const inWords = (n) => {
    if (n === 0) return "";
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " And " + inWords(n % 100) : "")
      );
    return "";
  };

  const convertIndian = (n) => {
    if (n === 0) return "Zero";
    let str = "";
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const remainder = n;

    if (crore > 0) str += inWords(crore) + " Crore, ";
    if (lakh > 0) str += inWords(lakh) + " Lakh, ";
    if (thousand > 0) str += inWords(thousand) + " Thousand, ";
    if (remainder > 0) {
      if (str.length > 0 && remainder < 100) {
        str += "And " + inWords(remainder);
      } else {
        str += inWords(remainder);
      }
    }
    return str.replace(/,\s*$/, "").trim();
  };

  const curr = String(currency || "INR").toUpperCase();
  const words = convertIndian(intPart);

  let result = `${curr} ${words}`;

  if (curr === "INR") {
    result += " Rupees";
    if (decPart > 0) {
      result += ` And ${inWords(decPart)} Paise`;
    }
    result += " Only.";
  } else if (curr === "USD") {
    result += " Dollars";
    if (decPart > 0) {
      result += ` And ${inWords(decPart)} Cents`;
    }
    result += " Only.";
  } else {
    if (decPart > 0) {
      result += ` And ${decPart}/100`;
    }
    result += " Only.";
  }

  return result;
}

/**
 * Extracts 10-digit Indian Permanent Account Number (PAN) from a 15-character GSTIN.
 * In Indian GST numbering, characters 3 through 12 represent the legal entity's PAN.
 */
export function extractPanFromGstin(gstin) {
  if (gstin && typeof gstin === "string") {
    const clean = gstin.trim().toUpperCase();
    if (clean.length >= 12 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(clean)) {
      return clean.substring(2, 12);
    }
  }
  return null;
}

/**
 * Extracts 2-digit Indian State Code from a GSTIN.
 */
export function extractStateCodeFromGstin(gstin) {
  if (gstin && typeof gstin === "string") {
    const clean = gstin.trim();
    if (/^[0-9]{2}/.test(clean)) {
      return clean.substring(0, 2);
    }
  }
  return null;
}

/**
 * Formats a raw address string into clean, logical lines (e.g. building/area, city/state/PIN, country)
 * to avoid awkward mid-word or single-item dangling wraps.
 */
export function formatAddressString(rawAddress) {
  if (!rawAddress || typeof rawAddress !== "string") return rawAddress || "—";
  const trimmed = rawAddress.trim();
  if (!trimmed || trimmed === "—") return "—";
  if (trimmed.includes("\n")) return trimmed;

  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 2) return trimmed;

  // Search for postal code (e.g. 5-6 digits like 500020 or 500081)
  const pinIdx = parts.findIndex((p) => /^\d{5,6}$/.test(p));
  if (pinIdx !== -1) {
    const pin = parts[pinIdx];
    const state = pinIdx > 0 ? parts[pinIdx - 1] : "";
    const city = pinIdx > 1 ? parts[pinIdx - 2] : "";
    const streetParts = pinIdx > 2 ? parts.slice(0, pinIdx - 2) : [];
    const countryParts = parts.slice(pinIdx + 1);

    const lines = [];
    if (streetParts.length > 0) {
      lines.push(streetParts.join(", "));
    }
    const cityStatePin = [[city, state].filter(Boolean).join(", "), pin].filter(Boolean).join(" ");
    if (cityStatePin) {
      lines.push(cityStatePin);
    }
    if (countryParts.length > 0) {
      lines.push(countryParts.join(", "));
    }

    if (lines.length > 0) {
      return lines.join("\n");
    }
  }

  // Fallback: group into street parts, city/state, country
  if (parts.length >= 4) {
    const country = parts[parts.length - 1];
    const cityState = parts[parts.length - 2];
    const streets = parts.slice(0, parts.length - 2).join(", ");
    return [streets, cityState, country].filter(Boolean).join("\n");
  }

  return parts.join("\n");
}


// A4 print rules, scoped to the invoice document: only .invoice-print-area is printed, so the surrounding app
// (navigation, preview banner, Generate / Submit buttons) never lands on paper or in a "Save as PDF".
const INVOICE_PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  body * { visibility: hidden !important; }
  .invoice-print-area, .invoice-print-area * { visibility: visible !important; }
  .invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; font-size: 11px; }
  .invoice-print-area table { width: 100%; }
  .invoice-print-area thead { display: table-header-group; }
  .invoice-print-area tr, .invoice-print-area section { break-inside: avoid; }
}
`;

function InvoiceMeta({ label, children }) {
  return (
    <div className="min-w-0 bg-white p-3 sm:p-3.5 flex flex-col justify-center">
      <dt className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900 text-xs sm:text-sm">{children}</dd>
    </div>
  );
}

/**
 * InvoicePreviewDocument
 *
 * Authentic Indian Corporate Tax Invoice presentation matching standard professional invoice formats
 * (e.g., Swipe / ClearTax / SAP / Zoho Invoice / Stripe corporate layout).
 * Renders authoritative backend data with complete statutory transparency, high-fidelity letterhead,
 * line items ledger, HSN/SAC summary, and official digital authentication.
 */
export default function InvoicePreviewDocument({
  invoice,
  snapshotId,
  taxCalc,
  snapshotData,
  occurrence = null,
  companyProfile,
  presentation = "card",
  isGenerating = false,
}) {
  const isPlain = presentation === "plain";

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

  const billingPeriod = formatDateRange(
    rawStart,
    rawEnd,
    invoice?.billingPeriod || taxCalc?.billingPeriod || snapshotData?.billingPeriod || "Not provided"
  );

  // Project Duration (strictly from authoritative backend dates; never fabricated)
  const projectStart =
    invoice?.projectStartDate ||
    occurrence?.projectStartDate ||
    taxCalc?.projectStartDate ||
    snapshotData?.projectStartDate ||
    snapshotData?.startDate ||
    invoice?.startDate ||
    occurrence?.startDate ||
    null;
  const projectEnd =
    invoice?.projectEndDate ||
    occurrence?.projectEndDate ||
    taxCalc?.projectEndDate ||
    snapshotData?.projectEndDate ||
    snapshotData?.endDate ||
    invoice?.endDate ||
    occurrence?.endDate ||
    null;

  const projectDuration =
    projectStart && projectEnd ? formatDateRange(projectStart, projectEnd) : null;

  const billingType = resolveInvoiceBillingType({
    invoice,
    occurrence,
    context: snapshotData || taxCalc,
  });

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    snapshotData?.projectName ||
    "—";

  // Client billing information
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const clientName =
    [invoice?.clientName, invoice?.clientInfo?.clientName, taxCalc?.clientName, snapshotData?.clientName]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find((value) => value && value !== "—" && !UUID_PATTERN.test(value)) || "Client name not available";

  const clientAddress =
    invoice?.billingAddress ||
    invoice?.clientInfo?.billingAddress ||
    snapshotData?.billingAddress ||
    taxCalc?.billingAddress ||
    "";

  const clientGstin =
    invoice?.gstinOrTaxId ||
    invoice?.gstin ||
    invoice?.clientInfo?.taxId ||
    snapshotData?.clientTaxId ||
    taxCalc?.clientTaxId ||
    "";

  const clientEmail =
    invoice?.email ||
    invoice?.clientInfo?.email ||
    snapshotData?.clientEmail ||
    taxCalc?.email ||
    "";

  const clientCountryCode =
    invoice?.countryCode ||
    taxCalc?.countryCode ||
    snapshotData?.countryCode ||
    null;

  const rawClientPhone =
    invoice?.phone ||
    invoice?.clientInfo?.phone ||
    taxCalc?.phone ||
    snapshotData?.clientPhone ||
    snapshotData?.phone ||
    null;

  const clientPhone = rawClientPhone
    ? formatClientPhone(clientCountryCode, rawClientPhone)
    : "";

  // Seller information (strictly from persisted invoice or active Company Profile; never fabricated)
  const sellerName =
    invoice?.sellerLegalName ||
    invoice?.sellerName ||
    invoice?.sellerInfo?.legalName ||
    companyProfile?.legalName ||
    companyProfile?.companyName ||
    "—";

  // One line per address element ("City, State PIN" together), so a long address wraps by line, not as one run.
  const addressLines = ({ line1, line2, city, state, postalCode, country }) =>
    [
      line1,
      line2,
      [[city, state].filter(Boolean).join(", "), postalCode].filter(Boolean).join(" "),
      country,
    ]
      .map((part) => (typeof part === "string" ? part.trim() : part))
      .filter(Boolean);

  const invoiceSellerParts = addressLines({
    line1: invoice?.sellerAddressLine1,
    line2: invoice?.sellerAddressLine2,
    city: invoice?.sellerCity,
    state: invoice?.sellerState,
    postalCode: invoice?.sellerPostalCode,
    country: invoice?.sellerCountry,
  });

  const sellerAddressParts = addressLines({
    line1: companyProfile?.addressLine1,
    line2: companyProfile?.addressLine2,
    city: companyProfile?.city,
    state: companyProfile?.state,
    postalCode: companyProfile?.postalCode,
    country: companyProfile?.country,
  });

  const rawSellerAddress =
    (invoiceSellerParts.length > 0
      ? invoiceSellerParts.join("\n")
      : sellerAddressParts.length > 0
        ? sellerAddressParts.join("\n")
        : invoice?.sellerAddress ||
          invoice?.sellerInfo?.address ||
          companyProfile?.address ||
          "—");

  const sellerAddress = formatAddressString(rawSellerAddress);

  const sellerGstin =
    invoice?.sellerGstin ||
    invoice?.sellerInfo?.gstin ||
    companyProfile?.taxRegistrationNumber ||
    companyProfile?.gstin ||
    null;

  const sellerPan =
    invoice?.sellerPan ||
    invoice?.sellerInfo?.pan ||
    companyProfile?.pan ||
    extractPanFromGstin(sellerGstin) ||
    null;
  const sellerStateCode = extractStateCodeFromGstin(sellerGstin) || null;

  const clientPan =
    invoice?.clientPan ||
    invoice?.clientInfo?.pan ||
    extractPanFromGstin(clientGstin) ||
    null;
  const clientStateCode = extractStateCodeFromGstin(clientGstin);

  const sellerEmail =
    invoice?.sellerEmail ||
    invoice?.sellerInfo?.email ||
    companyProfile?.email ||
    null;

  const sellerPhone =
    invoice?.sellerPhone ||
    invoice?.sellerInfo?.phone ||
    companyProfile?.phoneNumber ||
    companyProfile?.phone ||
    null;

  const logoSrc =
    invoice?.sellerLogoReference ||
    invoice?.sellerInfo?.logoUrl ||
    companyProfile?.logoUrl ||
    companyProfile?.logoReference ||
    pavesLogo;

  const rawSignatureRef =
    invoice?.sellerSignatureReference ||
    invoice?.sellerInfo?.signatureUrl ||
    companyProfile?.signatureReference ||
    companyProfile?.signatureUrl ||
    null;

  const { imageUrl: authenticatedSignatureUrl } = useSignatureImage(rawSignatureRef);
  const signatureSrc = authenticatedSignatureUrl || rawSignatureRef;

  const paymentTermsDisplay =
    formatPaymentTerms(invoice || {}) ||
    formatPaymentTerms(snapshotData || {}) ||
    formatPaymentTerms(taxCalc || {}) ||
    invoice?.paymentTerms ||
    snapshotData?.paymentTerms ||
    "—";

  const snapshotNumber =
    invoice?.snapshotNumber ||
    taxCalc?.snapshotNumber ||
    snapshotData?.snapshotNumber ||
    snapshotId ||
    "";

  // Authoritative invoice number display:
  // Must ALWAYS keep the "Invoice Number:" field/label visible.
  // BEFORE generation: UI displays "Not Yet Generated" (UI display text only).
  // AFTER generation: display the actual invoice number returned by the backend.
  const displayInvoiceNumber = (() => {
    if (invoice?.isDraftPreview || invoice?.generated === false) {
      return "Not Yet Generated";
    }

    const raw = invoice?.invoiceNumber;
    if (!raw || typeof raw !== "string") {
      return "Not Yet Generated";
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return "Not Yet Generated";
    }

    const lower = trimmed.toLowerCase();

    if (
      lower === "null" ||
      lower === "undefined" ||
      lower === "not generated" ||
      lower === "not yet generated" ||
      lower === "assigned on generation" ||
      lower === "draft-preview" ||
      lower === "n/a" ||
      lower === "na" ||
      trimmed === "—" ||
      trimmed === "-" ||
      lower.includes("draft") ||
      lower.includes("occurrence")
    ) {
      return "Not Yet Generated";
    }

    const forbiddenIdentifiers = [
      invoice?.billingScheduleId,
      invoice?.billingSnapshotId,
      invoice?.snapshotId,
      invoice?.occurrenceId,
      invoice?.scheduleId,
      invoice?.projectId,
      invoice?.clientId,
      snapshotId,
      snapshotData?.snapshotId,
      snapshotNumber,
      occurrence?.occurrenceId,
      occurrence?.billingScheduleId,
    ]
      .filter(Boolean)
      .map((id) => String(id).toLowerCase().trim());

    if (forbiddenIdentifiers.includes(lower)) {
      return "Not Yet Generated";
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return "Not Yet Generated";
    }

    return trimmed;
  })();

  const isDocumentGenerated = Boolean(
    invoice?.generated ||
    (invoice?.invoiceNumber &&
      invoice?.invoiceNumber !== "Assigned on generation" &&
      !String(invoice?.invoiceNumber).toLowerCase().includes("draft") &&
      invoice?.invoiceNumber !== "Not Yet Generated")
  );

  const displayInvoiceDate = invoice?.invoiceDate
    ? formatDisplayDate(invoice.invoiceDate)
    : isDocumentGenerated
      ? (rawEnd ? formatDisplayDate(rawEnd) : "—")
      : "Upon Generation";

  // The backend resolves the due date (invoice date + the payment term's days) for the draft and for the generated
  // invoice alike; when it cannot (no payment term), say so instead of inventing one.
  const displayDueDate = invoice?.dueDate ? formatDisplayDate(invoice.dueDate) : "Not available";

  // Client location
  const clientCountryName =
    invoice?.countryName ||
    invoice?.clientCountryName ||
    invoice?.clientInfo?.countryName ||
    invoice?.clientInfo?.country ||
    invoice?.client?.countryName ||
    invoice?.client?.country ||
    snapshotData?.countryName ||
    snapshotData?.clientCountryName ||
    snapshotData?.country ||
    taxCalc?.countryName ||
    taxCalc?.clientCountryName ||
    taxCalc?.country ||
    occurrence?.countryName ||
    occurrence?.clientCountryName ||
    occurrence?.country ||
    null;

  const explicitClientLocation =
    invoice?.clientLocation ||
    invoice?.primaryLocation ||
    invoice?.clientInfo?.location ||
    invoice?.clientInfo?.primaryLocation ||
    occurrence?.clientLocation ||
    occurrence?.primaryLocation ||
    snapshotData?.clientLocation ||
    snapshotData?.primaryLocation ||
    taxCalc?.clientLocation ||
    taxCalc?.primaryLocation ||
    null;

  const isDialCode = (val) => Boolean(val && /^\+\d+$/.test(String(val).trim()));

  const cleanClientCountryCode =
    clientCountryCode && !isDialCode(clientCountryCode)
      ? String(clientCountryCode).trim()
      : null;

  const clientLocationDisplay = (explicitClientLocation && !isDialCode(explicitClientLocation))
    ? String(explicitClientLocation).trim()
    : (clientCountryName && !isDialCode(clientCountryName))
      ? String(clientCountryName).trim()
      : cleanClientCountryCode
        ? String(cleanClientCountryCode).trim()
        : "—";

  // Place of Supply
  const explicitPlaceOfSupply =
    invoice?.placeOfSupply ||
    invoice?.place_of_supply ||
    taxCalc?.placeOfSupply ||
    taxCalc?.place_of_supply ||
    occurrence?.placeOfSupply ||
    occurrence?.place_of_supply ||
    snapshotData?.placeOfSupply ||
    null;

  const authoritativeTaxField =
    invoice?.customerState ||
    taxCalc?.customerState ||
    null;

  const placeOfSupplyDisplay = (explicitPlaceOfSupply && !isDialCode(explicitPlaceOfSupply))
    ? String(explicitPlaceOfSupply).trim()
    : (authoritativeTaxField && !isDialCode(authoritativeTaxField))
      ? String(authoritativeTaxField).trim()
      : (clientCountryName && !isDialCode(clientCountryName))
        ? String(clientCountryName).trim()
        : cleanClientCountryCode
          ? String(cleanClientCountryCode).trim()
          : "—";

  // Line items
  const rawItems = Array.isArray(invoice?.items) ? invoice.items : [];
  const items = rawItems.filter(
    (it) => it.includeInInvoice !== false && it.isBillable !== false && it.excludedFromInvoice !== true
  );
  const lineItems = buildInvoiceLineItems({ billingType, items, occurrence, invoice, currency });

  // Tax Breakdown
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

  const expenses = Number(
    invoice?.expenseAmount ??
    (typeof invoice?.expenses === "number" ? invoice.expenses : null) ??
    snapshotData?.expenseAmount ??
    (typeof snapshotData?.expenses === "number" ? snapshotData.expenses : null) ??
    0
  );

  const effectiveTaxRatePct =
    subtotal > 0 && totalTax > 0
      ? ((totalTax / subtotal) * 100).toFixed(1)
      : effectiveTaxBreakdown.length > 0 && effectiveTaxBreakdown[0].rate !== null && effectiveTaxBreakdown[0].rate !== undefined
        ? Number(effectiveTaxBreakdown[0].rate).toFixed(1)
        : "0.0";

  const explicitSupplyClassification =
    invoice?.supplyClassification ||
    invoice?.supply_classification ||
    taxCalc?.supplyClassification ||
    taxCalc?.supply_classification ||
    null;

  // Domestic taxes presence (e.g. CGST / SGST) precludes export / zero-rated treatment
  const hasDomesticTaxes =
    effectiveTaxBreakdown.some(
      (c) =>
        /cgst|sgst/i.test(c.taxTypeCode || c.taxComponent || "") &&
        Number(c.amount || 0) > 0
    ) ||
    (totalTax > 0 &&
      invoice?.taxRegionCode !== "EXPORT" &&
      taxCalc?.taxRegionCode !== "EXPORT" &&
      !taxCalc?.isZeroRated);

  // Authoritative supply classification strictly backed by backend tax data
  const isZeroRatedOrExport =
    !hasDomesticTaxes &&
    Boolean(
      (totalTax === 0 &&
        (effectiveTaxBreakdown.length === 0 ||
          effectiveTaxBreakdown.every((c) => Number(c.rate || 0) === 0))) ||
      invoice?.taxRegionCode === "EXPORT" ||
      invoice?.taxRegionCode === "ZERO_RATED" ||
      taxCalc?.taxRegionCode === "EXPORT" ||
      taxCalc?.taxRegionCode === "ZERO_RATED" ||
      taxCalc?.isZeroRated ||
      taxCalc?.isExempt ||
      String(taxCalc?.taxRuleName || "").toLowerCase().includes("export") ||
      String(taxCalc?.taxRuleName || "").toLowerCase().includes("zero")
    );

  const supplyClassification =
    explicitSupplyClassification ||
    (isZeroRatedOrExport
      ? "Export of Services (Zero Rated)"
      : totalTax > 0
        ? "Taxable Supply of Services"
        : taxCalc?.taxRuleName || "Taxable Supply of Services");

  // Reverse charge: strictly from persisted invoice or tax data; never hardcoded
  const isReverseCharge = Boolean(
    invoice?.reverseCharge === true ||
    invoice?.isReverseCharge === true ||
    invoice?.reverse_charge === true ||
    taxCalc?.reverseCharge === true ||
    taxCalc?.isReverseCharge === true ||
    taxCalc?.reverse_charge === true ||
    (typeof invoice?.reverseCharge === "string" && /^(yes|true)$/i.test(invoice.reverseCharge.trim())) ||
    (typeof invoice?.reverse_charge === "string" && /^(yes|true)$/i.test(invoice.reverse_charge.trim())) ||
    String(invoice?.taxPreference || "").toUpperCase() === "REVERSE_CHARGE" ||
    String(snapshotData?.taxPreference || "").toUpperCase() === "REVERSE_CHARGE" ||
    String(taxCalc?.taxRuleName || "").toLowerCase().includes("reverse charge")
  );

  const hasReverseChargeData = Boolean(
    typeof invoice?.reverseCharge === "boolean" ||
    typeof invoice?.isReverseCharge === "boolean" ||
    typeof invoice?.reverse_charge === "boolean" ||
    typeof invoice?.reverseCharge === "string" ||
    typeof invoice?.reverse_charge === "string" ||
    typeof taxCalc?.reverseCharge === "boolean" ||
    typeof taxCalc?.isReverseCharge === "boolean" ||
    typeof taxCalc?.reverse_charge === "boolean" ||
    invoice?.taxPreference ||
    snapshotData?.taxPreference ||
    String(taxCalc?.taxRuleName || "").toLowerCase().includes("reverse charge")
  );

  // ---- Line items --------------------------------------------------------------------------------------
  // Everything shown for a line comes from that backend line: the net rate and amount are the backend-calculated
  // values, and base rate / discount are the rate audit frozen on a TIME line. Nothing is derived here from the
  // configuration's discount periods, and an expense line never shows a T&M discount. Tax is shown only in the
  // invoice-level summary (the backend does not tax line by line).
  const toNumberOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const formattedRows = lineItems.rows.map((row, idx) => {
    const raw = items[idx] || row.raw || {};
    const isExpense = row.lineType === "EXPENSE" || isExpenseLine(raw);
    const isTime = row.lineType === "TIME" || TIME_ENTRY_ITEM_TYPES.has(String(raw?.itemType || "").toUpperCase());
    const kind = isExpense ? "EXPENSE" : isTime ? "TIME" : "OTHER";
    const title =
      row.item ||
      row.payment ||
      raw.itemName ||
      raw.resourceName ||
      raw.description ||
      projectName ||
      "Line Item";

    const amountNumber =
      [row.rawAmount, raw.amount, raw.totalAmount].map(toNumberOrNull).find((v) => v !== null) ?? null;
    const amountDisplay =
      row.amount && row.amount !== "—"
        ? row.amount
        : amountNumber !== null
          ? formatCurrency(amountNumber, currency)
          : "—";

    const details = [];
    if (kind === "OTHER") {
      if (row.role && row.role !== "—" && String(row.role).trim().toLowerCase() !== "unknown") {
        details.push(`Role: ${row.role}`);
      }
      if (row.workDate && row.workDate !== "—") details.push(`Date: ${row.workDate}`);
      if (row.billingPeriod && row.billingPeriod !== "—") details.push(`Period: ${row.billingPeriod}`);
      if (row.percent && row.percent !== "—") details.push(`Installment: ${row.percent}`);
    }
    if (raw.description && raw.description !== title) details.push(raw.description);

    const qtyDisplay =
      row.quantity && row.quantity !== "—"
        ? row.quantity
        : raw.quantity !== undefined && raw.quantity !== null
          ? Number(raw.quantity).toFixed(2)
          : "1.00";

    const rateDisplay =
      row.rate && row.rate !== "—"
        ? row.rate
        : raw.rate !== undefined && raw.rate !== null
          ? formatCurrency(raw.rate, currency)
          : "—";

    return {
      index: idx + 1,
      kind,
      title,
      role: row.role && row.role !== "—" ? row.role : null,
      dateDisplay: row.workDate && row.workDate !== "—" ? row.workDate : "—",
      qtyDisplay,
      baseRateDisplay:
        kind === "TIME" && row.baseRate !== null && row.baseRate !== undefined
          ? formatCurrency(row.baseRate, currency)
          : "—",
      discountDisplay: kind === "TIME" && row.discountApplied ? row.discountLabel || "Discount applied" : null,
      discountPeriod: kind === "TIME" && row.discountApplied ? row.periodName || null : null,
      rateDisplay,
      amountDisplay,
      amountNumber,
      isPercentageDiscount: Boolean(row.isPercentageDiscount),
      isFixedDiscount: Boolean(row.isFixedDiscount),
      category: row.category || raw.category || raw.expenseCategory || null,
      receiptReference: row.receiptReference || raw.receiptNumber || null,
      expenseMerchant: row.expenseMerchant || null,
      expenseReportRef: row.expenseReportRef || null,
      fxNote:
        row.originalAmount != null && row.originalCurrency && row.appliedExchangeRate != null
          ? `Original ${Number(row.originalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${row.originalCurrency} @ ${Number(row.appliedExchangeRate)}`
          : null,
      details,
    };
  });

  const timeRows = formattedRows.filter((r) => r.kind === "TIME");
  const expenseRows = formattedRows.filter((r) => r.kind === "EXPENSE");
  const otherRows = formattedRows.filter((r) => r.kind === "OTHER");
  // The reference column exists only when XMS supplied an expense report number for at least one expense.
  const showExpenseRef = expenseRows.some((r) => r.expenseReportRef);
  // Section subtotals: use backend-supplied field if available, falling back to line sums
  const sumLineAmounts = (rows) => rows.reduce((sum, r) => sum + (r.amountNumber ?? 0), 0);
  const timeSubtotal =
    invoice?.timeMaterialSubtotal !== undefined && invoice?.timeMaterialSubtotal !== null
      ? Number(invoice.timeMaterialSubtotal)
      : invoice?.timeAndMaterialSubtotal !== undefined && invoice?.timeAndMaterialSubtotal !== null
        ? Number(invoice.timeAndMaterialSubtotal)
        : invoice?.tmSubtotal !== undefined && invoice?.tmSubtotal !== null
          ? Number(invoice.tmSubtotal)
          : sumLineAmounts(timeRows);

  const expenseSubtotal =
    invoice?.expenseSubtotal !== undefined && invoice?.expenseSubtotal !== null
      ? Number(invoice.expenseSubtotal)
      : invoice?.expensesSubtotal !== undefined && invoice?.expensesSubtotal !== null
        ? Number(invoice.expensesSubtotal)
        : expenseRows.length > 0
          ? sumLineAmounts(expenseRows)
          : expenses;

  const showSectionSubtotals = timeRows.length > 0 && (expenseRows.length > 0 || expenses > 0 || expenseSubtotal > 0);

  const isGenerated = Boolean(
    invoice?.generated ||
    (invoice?.invoiceNumber &&
      invoice?.invoiceNumber !== "Assigned on generation" &&
      !String(invoice?.invoiceNumber).toLowerCase().includes("draft") &&
      invoice?.invoiceNumber !== "Not Yet Generated")
  );

  // For already-generated invoices: strictly use persisted invoice-level snapshot values!
  // If an existing generated invoice has empty values, it must NOT fall back to company defaults.
  // For ungenerated draft previews: use invoice-level values if present, else active companyProfile defaults.
  const notes = isGenerated
    ? (invoice?.invoiceNotes !== undefined && invoice?.invoiceNotes !== null && String(invoice?.invoiceNotes).trim()
      ? String(invoice.invoiceNotes).trim()
      : invoice?.notes !== undefined && invoice?.notes !== null && String(invoice?.notes).trim()
        ? String(invoice.notes).trim()
        : invoice?.additionalNotes !== undefined && invoice?.additionalNotes !== null && String(invoice?.additionalNotes).trim()
          ? String(invoice.additionalNotes).trim()
          : null)
    : (invoice?.invoiceNotes !== undefined && invoice?.invoiceNotes !== null && String(invoice?.invoiceNotes).trim()
      ? String(invoice.invoiceNotes).trim()
      : invoice?.notes !== undefined && invoice?.notes !== null && String(invoice?.notes).trim()
        ? String(invoice.notes).trim()
        : invoice?.additionalNotes !== undefined && invoice?.additionalNotes !== null && String(invoice?.additionalNotes).trim()
          ? String(invoice.additionalNotes).trim()
          : companyProfile?.defaultInvoiceNotes && String(companyProfile.defaultInvoiceNotes).trim()
            ? String(companyProfile.defaultInvoiceNotes).trim()
            : companyProfile?.invoiceNotes && String(companyProfile.invoiceNotes).trim()
              ? String(companyProfile.invoiceNotes).trim()
              : companyProfile?.notes && String(companyProfile.notes).trim()
                ? String(companyProfile.notes).trim()
                : companyProfile?.additionalNotes && String(companyProfile.additionalNotes).trim()
                  ? String(companyProfile.additionalNotes).trim()
                  : null);

  const termsAndConditions = isGenerated
    ? (invoice?.termsAndConditions !== undefined && invoice?.termsAndConditions !== null && String(invoice?.termsAndConditions).trim()
      ? String(invoice.termsAndConditions).trim()
      : invoice?.terms !== undefined && invoice?.terms !== null && String(invoice?.terms).trim()
        ? String(invoice.terms).trim()
        : null)
    : (invoice?.termsAndConditions !== undefined && invoice?.termsAndConditions !== null && String(invoice?.termsAndConditions).trim()
      ? String(invoice.termsAndConditions).trim()
      : invoice?.terms !== undefined && invoice?.terms !== null && String(invoice?.terms).trim()
        ? String(invoice.terms).trim()
        : companyProfile?.defaultTermsAndConditions && String(companyProfile.defaultTermsAndConditions).trim()
          ? String(companyProfile.defaultTermsAndConditions).trim()
          : companyProfile?.termsAndConditions && String(companyProfile.termsAndConditions).trim()
            ? String(companyProfile.termsAndConditions).trim()
            : companyProfile?.terms && String(companyProfile.terms).trim()
              ? String(companyProfile.terms).trim()
              : null);

  const paymentInstructions = isGenerated
    ? (invoice?.paymentInstructions !== undefined && invoice?.paymentInstructions !== null && String(invoice?.paymentInstructions).trim()
      ? String(invoice.paymentInstructions).trim()
      : invoice?.paymentInstruction !== undefined && invoice?.paymentInstruction !== null && String(invoice?.paymentInstruction).trim()
        ? String(invoice.paymentInstruction).trim()
        : null)
    : (invoice?.paymentInstructions !== undefined && invoice?.paymentInstructions !== null && String(invoice?.paymentInstructions).trim()
      ? String(invoice.paymentInstructions).trim()
      : invoice?.paymentInstruction !== undefined && invoice?.paymentInstruction !== null && String(invoice?.paymentInstruction).trim()
        ? String(invoice.paymentInstruction).trim()
        : companyProfile?.defaultPaymentInstructions && String(companyProfile.defaultPaymentInstructions).trim()
          ? String(companyProfile.defaultPaymentInstructions).trim()
          : companyProfile?.paymentInstructions && String(companyProfile.paymentInstructions).trim()
            ? String(companyProfile.paymentInstructions).trim()
            : companyProfile?.paymentInstruction && String(companyProfile.paymentInstruction).trim()
              ? String(companyProfile.paymentInstruction).trim()
              : null);

  const amountInWords = formatAmountInWords(grandTotal, currency);

  // The Inner Document Sheet
  const documentSubtitle = invoice?.documentSubtitle || "";

  const documentContent = (
    <div className="invoice-print-area bg-white text-slate-800 w-full font-sans">
      <style>{INVOICE_PRINT_CSS}</style>
      {/* ========================================================================= */}
      {/* 1. LETTERHEAD: seller identity (left) and document title (right)          */}
      {/* ========================================================================= */}
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-lg space-y-2">
          <img src={logoSrc} alt={sellerName} className="h-12 w-auto max-w-[180px] object-contain" />

          <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {sellerName}
          </h2>

          {sellerAddress && (
            <p className="max-w-md whitespace-pre-line break-words text-xs sm:text-sm leading-relaxed text-slate-600">{sellerAddress}</p>
          )}

          {sellerGstin && (
            <dl className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200/90 px-2.5 py-1 shadow-2xs">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GSTIN:</dt>
                <dd className="font-mono font-semibold text-slate-900">{sellerGstin}</dd>
              </div>
              {sellerPan && (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200/90 px-2.5 py-1 shadow-2xs">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">PAN:</dt>
                  <dd className="font-mono font-semibold text-slate-900">{sellerPan}</dd>
                </div>
              )}
              {sellerStateCode && (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200/90 px-2.5 py-1 shadow-2xs">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State:</dt>
                  <dd className="font-medium text-slate-800">
                    {[companyProfile?.state || invoice?.sellerState, `(${sellerStateCode})`].filter(Boolean).join(" ")}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {(sellerPhone || sellerEmail) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-0.5 text-xs text-slate-600">
              {sellerPhone && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{sellerPhone}</span>
                </span>
              )}
              {sellerEmail && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{sellerEmail}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
          {invoice?.recipientBadge && (
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {invoice.recipientBadge}
            </span>
          )}

          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#0A0082] sm:text-3xl">
            INVOICE
          </h1>
          {documentSubtitle && <p className="text-xs text-slate-500">{documentSubtitle}</p>}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. INVOICE DETAILS                                                        */}
      {/* ========================================================================= */}
      <dl
        className={`my-5 grid grid-cols-2 gap-px rounded-xl border border-slate-200 bg-slate-200 overflow-hidden text-sm sm:grid-cols-3 ${hasReverseChargeData ? "lg:grid-cols-7" : "lg:grid-cols-6"
          }`}
      >
        <InvoiceMeta label="Invoice Number">
          {displayInvoiceNumber === "Not Yet Generated" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs">
              Pending Generation
            </span>
          ) : (
            <span className="font-mono">{displayInvoiceNumber}</span>
          )}
        </InvoiceMeta>

        <InvoiceMeta label="Invoice Date">{displayInvoiceDate}</InvoiceMeta>
        <InvoiceMeta label="Due Date">{displayDueDate}</InvoiceMeta>
        <InvoiceMeta label="Payment Terms">{paymentTermsDisplay}</InvoiceMeta>
        <InvoiceMeta label="Currency">
          <span className="font-semibold text-slate-900">{currency}</span>
        </InvoiceMeta>
        <InvoiceMeta label="Place of Supply">
          <span className="block truncate" title={placeOfSupplyDisplay}>
            {placeOfSupplyDisplay}
          </span>
        </InvoiceMeta>
        {hasReverseChargeData && <InvoiceMeta label="Reverse Charge">{isReverseCharge ? "Yes" : "No"}</InvoiceMeta>}
      </dl>

      {/* ========================================================================= */}
      {/* 3. BILLED TO and PROJECT PARTICULARS                                      */}
      {/* ========================================================================= */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <section aria-label="Billed to" className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0A0082]/10 text-[#0A0082]">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Billed To
            </h3>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Name</div>
              <div className="mt-0.5 text-base font-bold leading-snug text-slate-900">{clientName}</div>
              {clientAddress && (
                <div className="mt-1.5 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-600">
                  {clientAddress}
                </div>
              )}
            </div>

            <dl className="space-y-2 border-t border-slate-100 pt-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-slate-500 font-medium">GSTIN / Tax ID:</dt>
                <dd className="font-mono font-semibold text-slate-900">{clientGstin || "—"}</dd>
              </div>
              {clientPan && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-slate-500 font-medium">PAN:</dt>
                  <dd className="font-mono font-semibold text-slate-900">{clientPan}</dd>
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-slate-500 font-medium">State / Jurisdiction:</dt>
                <dd className="text-slate-900 font-medium">
                  {clientLocationDisplay}
                  {clientStateCode ? ` (State Code: ${clientStateCode})` : ""}
                </dd>
              </div>
              {(clientEmail || clientPhone) && (
                <div className="flex flex-wrap gap-x-4 pt-1 text-slate-600">
                  {clientPhone && <span>Ph: {clientPhone}</span>}
                  {clientEmail && <span className="break-all">Email: {clientEmail}</span>}
                </div>
              )}
            </dl>
          </div>
        </section>

        <section aria-label="Project particulars" className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0A0082]/10 text-[#0A0082]">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Project &amp; Service
            </h3>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project Name</div>
              <div className="mt-0.5 text-base font-bold leading-snug text-slate-900">{projectName}</div>
            </div>

            <dl className="space-y-3 border-t border-slate-100 pt-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-100">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Billing Period</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{billingPeriod}</dd>
                </div>
                <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-100">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project Duration</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{projectDuration}</dd>
                </div>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 pt-1">
                <dt className="text-slate-500 font-medium">Billing Model:</dt>
                <dd className="font-semibold text-slate-900">
                  {(() => {
                    const baseLabel = INVOICE_BILLING_TYPE_LABELS[billingType] || billingType || "Professional Services";
                    if (billingType === "TIME_MATERIAL" || billingType === "TIME_AND_MATERIALS") {
                      const rateModel =
                        invoice?.rateModel ||
                        invoice?.pricingModel ||
                        snapshotData?.rateModel ||
                        snapshotData?.pricingModel ||
                        snapshotData?.billingConfig?.rateModel ||
                        snapshotData?.billingConfig?.pricingModel ||
                        null;
                      if (rateModel === "ROLE_BASED") return `${baseLabel} (Role-Based Rate)`;
                      if (rateModel === "STANDARD") return `${baseLabel} (Standard Rate)`;
                    }
                    return baseLabel;
                  })()}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 4. LINE ITEMS (time & material, expenses and other charges kept apart)     */}
      {/* ========================================================================= */}
      <div className="space-y-5 print:space-y-3">
        {formattedRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {isDocumentGenerated
                ? "No billable line items on this invoice."
                : "No line items available for this draft invoice."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Work excluded from invoicing is kept for audit but does not appear here or in the totals.
            </p>
          </div>
        )}

        {timeRows.length > 0 && (
          <section aria-label="Time and material charges" className="print:break-inside-avoid">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0A0082] text-white">
                  <Clock className="h-3 w-3" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Professional Services (Time &amp; Material)</h3>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {timeRows.length} {timeRows.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="w-full min-w-[680px] border-collapse text-sm table-fixed">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[31%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th scope="col" className="px-3.5 py-2.5 text-left">Date</th>
                    <th scope="col" className="px-3.5 py-2.5 text-left">Description / Role</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Hours</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Base Rate</th>
                    <th scope="col" className="px-3.5 py-2.5 text-center">Discount</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Net Rate</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeRows.map((row) => (
                    <tr key={row.index} className="align-top hover:bg-slate-50/40 transition-colors">
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-xs font-medium text-slate-600">{row.dateDisplay}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900 break-words">{row.title}</div>
                        {row.role && (
                          <div className="mt-0.5 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {row.role}
                          </div>
                        )}
                        {row.details.map((detail, dIdx) => (
                          <div key={dIdx} className="text-xs text-slate-500 break-words mt-0.5">{detail}</div>
                        ))}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-800 font-medium whitespace-nowrap">{row.qtyDisplay}</td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-600 font-medium whitespace-nowrap">{row.baseRateDisplay}</td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {row.discountDisplay ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            {row.isFixedDiscount ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 border border-sky-200/90 shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                                {row.discountDisplay}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200/90 shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                {row.discountDisplay}
                              </span>
                            )}
                            {row.discountPeriod && (
                              <span className="text-[10px] text-slate-500 font-medium">{row.discountPeriod}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-800 font-semibold whitespace-nowrap">{row.rateDisplay}</td>
                      <td className="px-3.5 py-2.5 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">{row.amountDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {expenseRows.length > 0 && (
          <section aria-label="Expenses" className="print:break-inside-avoid">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-700 text-white">
                  <CreditCard className="h-3 w-3" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Expenses</h3>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {expenseRows.length} {expenseRows.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="w-full min-w-[540px] border-collapse text-sm table-fixed">
                <colgroup>
                  <col className={showExpenseRef ? "w-[14%]" : "w-[18%]"} />
                  <col className={showExpenseRef ? "w-[38%]" : "w-[52%]"} />
                  {showExpenseRef && <col className="w-[16%]" />}
                  <col className={showExpenseRef ? "w-[10%]" : "w-[15%]"} />
                  <col className={showExpenseRef ? "w-[22%]" : "w-[15%]"} />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th scope="col" className="px-3.5 py-2.5 text-left">Date</th>
                    <th scope="col" className="px-3.5 py-2.5 text-left">Expense Description</th>
                    {showExpenseRef && <th scope="col" className="px-3.5 py-2.5 text-left">Expense Report Ref.</th>}
                    <th scope="col" className="px-3.5 py-2.5 text-right">Quantity</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Billable Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseRows.map((row) => (
                    <tr key={row.index} className="align-top hover:bg-slate-50/40 transition-colors">
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-xs font-medium text-slate-600">{row.dateDisplay}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900 break-words">{row.title}</div>
                        {row.category && row.category.toLowerCase() !== String(row.title).toLowerCase() && (
                          <span className="mt-0.5 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {row.category}
                          </span>
                        )}
                        {row.expenseMerchant && (
                          <div className="text-xs text-slate-500 break-words mt-0.5">{row.expenseMerchant}</div>
                        )}
                        {row.fxNote && (
                          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">{row.fxNote}</div>
                        )}
                        {row.receiptReference && (
                          <div className="text-[11px] text-slate-500 mt-0.5">Ref: {row.receiptReference}</div>
                        )}
                        {row.details.map((detail, dIdx) => (
                          <div key={dIdx} className="text-xs text-slate-500 break-words mt-0.5">{detail}</div>
                        ))}
                      </td>
                      {showExpenseRef && (
                        <td className="px-3.5 py-2.5 text-xs text-slate-700 break-words">{row.expenseReportRef || ""}</td>
                      )}
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-800 font-medium whitespace-nowrap">{row.qtyDisplay}</td>
                      <td className="px-3.5 py-2.5 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">{row.amountDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {otherRows.length > 0 && (
          <section aria-label="Invoice items" className="print:break-inside-avoid">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0A0082] text-white">
                  <Receipt className="h-3 w-3" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Line Items</h3>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {otherRows.length} {otherRows.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th scope="col" className="px-4 py-3 text-left">Description</th>
                    <th scope="col" className="px-4 py-3 text-right">Qty</th>
                    <th scope="col" className="px-4 py-3 text-right">Rate</th>
                    <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {otherRows.map((row) => (
                    <tr key={row.index} className="align-top hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 break-words">{row.title}</div>
                        {row.details.map((detail, dIdx) => (
                          <div key={dIdx} className="text-xs text-slate-500 break-words mt-0.5">{detail}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800 font-medium">{row.qtyDisplay}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800 font-medium">{row.rateDisplay}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{row.amountDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. FINANCIAL SUMMARY (TAX & INVOICE SUMMARY)                              */}
      {/* ========================================================================= */}
      <section
        aria-label="Tax and invoice summary"
        className="mt-5 print:mt-4 print:break-inside-avoid"
      >
        {/* Section Heading Row matching Professional Services and Expenses */}
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0A0082] text-white">
              <Receipt className="h-3 w-3" />
            </span>
            <span>Tax &amp; Invoice Summary</span>
          </h3>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 font-mono">
            Currency: {currency}
          </span>
        </div>

        {/* Summary Content Container */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Left Panel: Amount in Words and Supply Classification */}
            <div className="p-5 sm:p-6 bg-slate-50/20 flex flex-col justify-between gap-4">
              <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Amount Chargeable (in words):
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 italic">
                    E. &amp; O.E.
                  </span>
                </div>
                <div className="font-bold leading-relaxed text-slate-900 text-sm sm:text-base break-words">
                  {amountInWords}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-2xs text-xs space-y-1.5">
                <span className="font-bold text-slate-500 block text-[11px] uppercase tracking-wider">
                  Supply Classification
                </span>
                <div className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                  Nature of Supply: {supplyClassification}
                </div>
                {isZeroRatedOrExport && (
                  <div className="text-slate-500 text-[11px] pt-0.5">
                    Non-taxable export supply — 0.0% tax applicable.
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Subtotals and Tax Breakdown */}
            <div className="p-5 sm:p-6 bg-slate-50/40 flex flex-col justify-center">
              <dl className="space-y-2.5 text-sm">
                {showSectionSubtotals && (
                  <>
                    <div className="flex justify-between gap-4 text-slate-600">
                      <dt>Time &amp; Material Subtotal</dt>
                      <dd className="tabular-nums font-semibold text-slate-800">{formatCurrency(timeSubtotal, currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 text-slate-600">
                      <dt>Expenses Subtotal</dt>
                      <dd className="tabular-nums font-semibold text-slate-800">{formatCurrency(expenseSubtotal, currency)}</dd>
                    </div>
                  </>
                )}

                <div className="flex justify-between gap-4 border-t border-slate-200/90 pt-2.5 font-bold text-slate-900">
                  <dt>Taxable Subtotal</dt>
                  <dd className="tabular-nums font-bold text-slate-900">{formatCurrency(subtotal, currency)}</dd>
                </div>

                {effectiveTaxBreakdown.length > 0 ? (
                  effectiveTaxBreakdown.map((comp) => (
                    <div key={comp.id} className="flex justify-between gap-4 text-slate-600">
                      <dt className="flex items-center gap-2">
                        <span>{comp.taxTypeCode || comp.taxComponent}</span>
                        {comp.rate !== null && comp.rate !== undefined && (
                          <span className="rounded bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {Number(comp.rate).toFixed(1)}%
                          </span>
                        )}
                      </dt>
                      <dd className="tabular-nums font-semibold text-slate-800">{formatCurrency(comp.amount, currency)}</dd>
                    </div>
                  ))
                ) : totalTax > 0 ? (
                  <div className="flex justify-between gap-4 text-slate-600">
                    <dt>Total Tax</dt>
                    <dd className="tabular-nums font-semibold text-slate-800">{formatCurrency(totalTax, currency)}</dd>
                  </div>
                ) : isZeroRatedOrExport ? (
                  <div className="rounded-lg bg-slate-100/80 p-2.5 text-xs text-slate-600 italic">
                    Zero-rated or exempt supply — no tax charged.
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          {/* Prominent Full-Width Total Invoice Amount Banner */}
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#0A0082] px-6 py-4 text-white shadow-inner">
            <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-indigo-100">Total Invoice Amount</span>
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight">{formatCurrency(grandTotal, currency)}</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. BOTTOM PARTICULARS: Payment, Notes, Terms & Corporate Signatory        */}
      {/* ========================================================================= */}
      {paymentInstructions || notes || termsAndConditions ? (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 print:mt-4 print:break-inside-avoid">
          {/* Left Column: Payment Instructions & Terms */}
          <div className="space-y-4">
            {paymentInstructions && (
              <section
                aria-label="Payment instructions"
                className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 text-sm shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#0A0082]/10 text-[#0A0082]">
                    <Landmark className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Instructions</h3>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-slate-700 text-xs sm:text-sm bg-slate-50/80 p-3 rounded-lg border border-slate-200/70 font-mono">
                  {paymentInstructions}
                </div>
                <p className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A0082]" />
                  Please quote the invoice number as the payment reference to ensure prompt reconciliation.
                </p>
              </section>
            )}

            {termsAndConditions && (
              <section
                aria-label="Terms and conditions"
                className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 text-sm shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-[#0A0082]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Terms &amp; Conditions</h3>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600 break-words">
                  {termsAndConditions}
                </p>
              </section>
            )}
          </div>

          {/* Right Column: Notes & Authorized Signatory */}
          <div className="space-y-4 flex flex-col justify-between">
            {notes && (
              <section
                aria-label="Invoice notes"
                className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 text-sm shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-[#0A0082]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Notes</h3>
                </div>
                <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-600 break-words">
                  {notes}
                </p>
              </section>
            )}

            {/* Authorized Signatory */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-5 shadow-2xs text-center flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-800">
                For {sellerName}
              </span>

              <div className="h-16 w-full flex items-center justify-center text-slate-400 text-xs italic select-none py-1">
                {signatureSrc ? (
                  <img
                    src={signatureSrc}
                    alt="Authorized Signatory Signature"
                    className="max-h-full max-w-[150px] object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <span>
                    {isDocumentGenerated ? "(Authorized Signatory)" : "(Draft Preview — Pending Generation)"}
                  </span>
                )}
              </div>

              <div className="w-40 border-b border-slate-300 mt-1 mb-1.5" />
              <div className="text-xs font-bold text-slate-900">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex justify-end print:mt-4 print:break-inside-avoid">
          <div className="w-full sm:w-64 flex flex-col items-center text-center p-5 rounded-xl border border-slate-200/90 bg-slate-50/30 shadow-2xs">
            <span className="text-xs font-bold text-slate-800">
              For {sellerName}
            </span>

            <div className="h-16 w-full flex items-center justify-center text-slate-400 text-xs italic select-none py-1">
              {signatureSrc ? (
                <img
                  src={signatureSrc}
                  alt="Authorized Signatory Signature"
                  className="max-h-full max-w-[150px] object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <span>
                  {isDocumentGenerated ? "(Authorized Signatory)" : "(Draft Preview — Pending Generation)"}
                </span>
              )}
            </div>

            <div className="w-36 border-b border-slate-300 mt-1 mb-1.5" />
            <div className="text-xs font-bold text-slate-900">
              Authorized Signatory
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. STATUTORY FOOTER                                                       */}
      {/* ========================================================================= */}
      <div className="pt-4 mt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2 print:mt-4 print:pt-4">
        <span>
          {isDocumentGenerated
            ? "This is an official computer-generated invoice."
            : "Invoice Generation Draft Preview • Not an official tax invoice until generated."}
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
          {isDocumentGenerated ? "Official Document" : "Draft Preview"}
        </span>
      </div>
    </div>
  );

  // When presentation === "card", wrap inside realistic A4 document sheet elevation
  if (!isPlain) {
    return (
      <div className="w-full bg-slate-100/70 p-3 sm:p-6 lg:p-8 rounded-2xl border border-slate-200/80">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.08),0_10px_20px_-6px_rgba(0,0,0,0.04)] border border-slate-200/90 overflow-hidden text-slate-800 print:shadow-none print:border-none print:p-0 font-sans">
          {/* Top Brand Accent Bar */}
          <div className="h-1.5 w-full bg-[#0A0082] print:hidden" />

          {/* Paper Content */}
          <div className="p-6 sm:p-10 md:p-12">
            {documentContent}
          </div>
        </div>
      </div>
    );
  }

  // Plain presentation (e.g. inside modals)
  return (
    <div className="w-full p-0 sm:p-2">
      {documentContent}
    </div>
  );
}
