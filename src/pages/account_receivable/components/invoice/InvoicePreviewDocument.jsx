import React from "react";
import { formatCurrency, formatDisplayDate } from "../../utils/format";
import { formatClientPhone } from "../../services/invoiceService";
import {
  INVOICE_BILLING_TYPE_LABELS,
  buildInvoiceLineItems,
  formatDateRange,
  formatPaymentTerms,
  resolveInvoiceBillingType,
} from "../../utils/invoicePresentation";
import pavesLogo from "../../assets/paves-logo.png";
import {
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
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
 * Official Circular Corporate Stamp & Digital Signature Seal component.
 */
function OfficialSignatureSeal({ sellerName = "PAVES TECHNOLOGIES" }) {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center select-none my-1 transform -rotate-2">
      <svg
        viewBox="0 0 140 140"
        className="w-full h-full text-[#0A0082]"
        fill="currentColor"
      >
        {/* Outer Ring */}
        <circle
          cx="70"
          cy="70"
          r="64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="5 2.5"
        />
        {/* Middle Ring */}
        <circle
          cx="70"
          cy="70"
          r="58"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {/* Inner Ring */}
        <circle
          cx="70"
          cy="70"
          r="41"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        {/* Circular text path */}
        <path
          id="sealTextPath"
          d="M 70 20 A 50 50 0 1 1 69.9 20"
          fill="none"
        />
        <text
          fontSize="6.8"
          fontWeight="bold"
          letterSpacing="1.8"
          fill="currentColor"
          opacity="0.95"
        >
          <textPath href="#sealTextPath" startOffset="3%">
            ★ PAVES TECHNOLOGIES ★ CORPORATE SEAL ★
          </textPath>
        </text>
        {/* Center Text */}
        <text
          x="70"
          y="61"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="900"
          letterSpacing="0.8"
          fill="currentColor"
        >
          AUTHORIZED
        </text>
        <text
          x="70"
          y="72"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="900"
          letterSpacing="0.8"
          fill="currentColor"
        >
          SIGNATORY
        </text>
        <line
          x1="45"
          y1="77"
          x2="95"
          y2="77"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <text
          x="70"
          y="87"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          letterSpacing="1"
          fill="currentColor"
        >
          ✓ VERIFIED
        </text>
      </svg>
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

  // Project Duration
  const projectStart =
    invoice?.projectStartDate ||
    occurrence?.projectStartDate ||
    taxCalc?.projectStartDate ||
    snapshotData?.projectStartDate ||
    snapshotData?.startDate ||
    invoice?.startDate ||
    occurrence?.startDate ||
    "2026-04-01";
  const projectEnd =
    invoice?.projectEndDate ||
    occurrence?.projectEndDate ||
    taxCalc?.projectEndDate ||
    snapshotData?.projectEndDate ||
    snapshotData?.endDate ||
    invoice?.endDate ||
    occurrence?.endDate ||
    "2027-03-31";

  const projectDuration =
    (projectStart && projectEnd ? formatDateRange(projectStart, projectEnd) : null) ||
    "01 Apr 2026 - 31 Mar 2027";

  const billingType = resolveInvoiceBillingType({
    invoice,
    occurrence,
    context: snapshotData || taxCalc,
  });

  const projectName =
    invoice?.projectName ||
    taxCalc?.projectName ||
    snapshotData?.projectName ||
    "Client Engagement";

  // Client billing information
  const clientName =
    invoice?.clientName ||
    invoice?.clientInfo?.clientName ||
    taxCalc?.clientName ||
    snapshotData?.clientName ||
    "Valued Client";

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

  // Seller information
  const sellerName =
    invoice?.sellerLegalName ||
    invoice?.sellerName ||
    invoice?.sellerInfo?.legalName ||
    companyProfile?.legalName ||
    companyProfile?.companyName ||
    "Paves Technologies Private Limited";

  const invoiceSellerParts = [
    invoice?.sellerAddressLine1,
    invoice?.sellerAddressLine2,
    [invoice?.sellerCity, invoice?.sellerState].filter(Boolean).join(", "),
    invoice?.sellerPostalCode,
    invoice?.sellerCountry,
  ].filter(Boolean);

  const sellerAddressParts = [
    companyProfile?.addressLine1,
    companyProfile?.addressLine2,
    [companyProfile?.city, companyProfile?.state].filter(Boolean).join(", "),
    companyProfile?.postalCode,
    companyProfile?.country,
  ].filter(Boolean);

  const sellerAddress =
    invoice?.sellerAddress ||
    invoice?.sellerInfo?.address ||
    (invoiceSellerParts.length > 0
      ? invoiceSellerParts.join(", ")
      : sellerAddressParts.length > 0
      ? sellerAddressParts.join(", ")
      : companyProfile?.address ||
        "Q-City, Block A & Block B, Nanakramguda, Financial District, Gachibowli, Hyderabad, Telangana - 500032, India");

  const sellerGstin =
    invoice?.sellerGstin ||
    invoice?.sellerInfo?.gstin ||
    companyProfile?.taxRegistrationNumber ||
    companyProfile?.gstin ||
    "36AAPCP4212K1Z6";

  const sellerPan = companyProfile?.pan || extractPanFromGstin(sellerGstin) || "AAPCP4212K";
  const sellerStateCode = extractStateCodeFromGstin(sellerGstin) || "36";

  const clientPan = invoice?.clientPan || extractPanFromGstin(clientGstin);
  const clientStateCode = extractStateCodeFromGstin(clientGstin);

  const sellerEmail =
    invoice?.sellerEmail ||
    invoice?.sellerInfo?.email ||
    companyProfile?.email ||
    "billing@pavestechnologies.com";

  const sellerPhone =
    invoice?.sellerPhone ||
    invoice?.sellerInfo?.phone ||
    companyProfile?.phoneNumber ||
    companyProfile?.phone ||
    "+91 90593 64400";

  const logoSrc =
    invoice?.sellerLogoReference ||
    invoice?.sellerInfo?.logoUrl ||
    companyProfile?.logoUrl ||
    companyProfile?.logoReference ||
    pavesLogo;

  const paymentTermsDisplay =
    formatPaymentTerms(invoice || {}) ||
    formatPaymentTerms(snapshotData || {}) ||
    formatPaymentTerms(taxCalc || {}) ||
    invoice?.paymentTerms ||
    snapshotData?.paymentTerms ||
    "Net 30 Days";

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

  const displayInvoiceDate = formatDisplayDate(
    invoice?.invoiceDate || rawEnd || new Date()
  );

  const displayDueDate = invoice?.dueDate
    ? formatDisplayDate(invoice.dueDate)
    : formatDisplayDate(new Date(Date.now() + 30 * 86400000));

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

  const clientLocationDisplay = explicitClientLocation
    ? String(explicitClientLocation).trim()
    : clientCountryName
    ? String(clientCountryName).trim()
    : clientCountryCode
    ? String(clientCountryCode).trim()
    : "Not configured";

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

  const placeOfSupplyDisplay = explicitPlaceOfSupply
    ? String(explicitPlaceOfSupply).trim()
    : authoritativeTaxField
    ? String(authoritativeTaxField).trim()
    : clientCountryName
    ? String(clientCountryName).trim()
    : clientCountryCode
    ? String(clientCountryCode).trim()
    : "Telangana (36)";

  // Line items
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
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

  const expenses = Number(invoice?.expenses ?? snapshotData?.expenses ?? 0);

  const effectiveTaxRatePct =
    subtotal > 0 && totalTax > 0
      ? ((totalTax / subtotal) * 100).toFixed(1)
      : effectiveTaxBreakdown.length > 0 && effectiveTaxBreakdown[0].rate
      ? Number(effectiveTaxBreakdown[0].rate).toFixed(1)
      : "18.0";

  // Line items formatting for the table
  const formattedRows = lineItems.rows.map((row, idx) => {
    const raw = items[idx] || {};
    const itemTitle =
      row.item ||
      row.payment ||
      raw.itemName ||
      raw.resourceName ||
      raw.description ||
      projectName ||
      "Professional Services";

    const hsnOrSac = raw.hsnCode || raw.sacCode || raw.hsn || raw.sac || "998314";

    const subDetails = [];
    if (row.role && row.role !== "—") subDetails.push(`Role: ${row.role}`);
    if (row.workDate && row.workDate !== "—") subDetails.push(`Date: ${row.workDate}`);
    if (row.billingPeriod && row.billingPeriod !== "—") subDetails.push(`Period: ${row.billingPeriod}`);
    if (row.percent && row.percent !== "—") subDetails.push(`Installment: ${row.percent}`);
    if (raw.description && raw.description !== itemTitle) subDetails.push(raw.description);

    const qtyNum = parseFloat(row.quantity) || 1;
    const qtyDisplay = row.quantity && row.quantity !== "—" ? row.quantity : "1.00";

    let lineTaxable =
      raw.taxableAmount !== undefined && raw.taxableAmount !== null
        ? Number(raw.taxableAmount)
        : raw.amount !== undefined && raw.amount !== null
        ? Number(raw.amount)
        : lineItems.rows.length === 1 && subtotal > 0
        ? subtotal
        : subtotal / (lineItems.rows.length || 1);

    let lineTax =
      raw.taxAmount !== undefined && raw.taxAmount !== null
        ? Number(raw.taxAmount)
        : lineItems.rows.length === 1 && totalTax > 0
        ? totalTax
        : (lineTaxable * Number(effectiveTaxRatePct)) / 100;

    let lineTotal =
      raw.totalAmount !== undefined && raw.totalAmount !== null
        ? Number(raw.totalAmount)
        : lineTaxable + lineTax;

    const rateDisplay =
      row.rate && row.rate !== "—"
        ? row.rate
        : raw.rate !== undefined && raw.rate !== null
        ? formatCurrency(raw.rate, currency)
        : formatCurrency(lineTaxable / qtyNum, currency);

    return {
      index: idx + 1,
      title: itemTitle,
      hsnOrSac,
      subDetails,
      rateDisplay,
      qtyDisplay,
      taxableAmount: lineTaxable,
      taxAmount: lineTax,
      totalAmount: lineTotal,
    };
  });

  const totalItemsCount = formattedRows.length;
  const totalQtySum = formattedRows.reduce((sum, r) => {
    const q = parseFloat(r.qtyDisplay);
    return !isNaN(q) ? sum + q : sum + 1;
  }, 0);
  const totalQtyDisplay =
    totalQtySum % 1 === 0 ? `${totalQtySum}.000` : totalQtySum.toFixed(3);

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
  const documentContent = (
    <div className="bg-white text-slate-800 w-full font-sans">
      {/* ========================================================================= */}
      {/* 1. DOCUMENT LETTERHEAD & CORPORATE HEADER                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
        {/* Left: Corporate Identity & Registered Office */}
        <div className="space-y-1.5 max-w-lg">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt={sellerName}
              className="h-11 sm:h-12 w-auto object-contain max-w-[170px]"
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug pt-1">
            {sellerName}
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pt-0.5">
            {sellerAddress}
          </p>

          <div className="pt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold text-slate-900">GSTIN:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {sellerGstin}
              </span>
            </span>

            {sellerPan && (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-slate-900">PAN:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  {sellerPan}
                </span>
              </span>
            )}

            <span className="text-slate-600">
              <span className="font-semibold text-slate-800">State:</span> Telangana ({sellerStateCode})
            </span>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{sellerPhone}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{sellerEmail}</span>
            </span>
          </div>
        </div>

        {/* Right: Authoritative Document Classification */}
        <div className="flex flex-col items-start sm:items-end sm:text-right shrink-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full shadow-2xs mb-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ORIGINAL FOR RECIPIENT
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0A0082] tracking-tight uppercase">
            TAX INVOICE
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            (Issued under Section 31 of CGST Act, 2017)
          </p>

          <div className="mt-3 sm:text-right text-xs space-y-0.5 bg-slate-50 border border-slate-200/90 rounded-lg p-2.5 shadow-2xs w-full sm:w-auto">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Supply Classification
            </div>
            <div className="font-bold text-slate-800">
              {placeOfSupplyDisplay?.toLowerCase().includes("export") || currency !== "INR"
                ? "Export of Services (Zero Rated)"
                : "Taxable Supply of Services"}
            </div>
            <div className="text-[11px] text-slate-500">
              SAC Code: <span className="font-mono font-bold text-slate-800">998314</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INVOICE PARTICULARS & COORDINATES GRID                                 */}
      {/* ========================================================================= */}
      <div className="my-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs shadow-2xs">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Invoice Number
          </span>
          {displayInvoiceNumber === "Not Yet Generated" ? (
            <span className="inline-block mt-1 font-mono font-bold text-[11px] text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded shadow-2xs">
              Pending Generation
            </span>
          ) : (
            <span className="mt-0.5 block font-mono font-bold text-slate-900 text-sm">
              {displayInvoiceNumber}
            </span>
          )}
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Invoice Date
          </span>
          <span className="mt-0.5 block font-bold text-slate-900 text-xs sm:text-sm">
            {displayInvoiceDate}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Payment Due
          </span>
          <span className="mt-0.5 block font-bold text-slate-900 text-xs sm:text-sm">
            {displayDueDate}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Payment Terms
          </span>
          <span className="mt-0.5 block font-semibold text-slate-900 text-xs sm:text-sm">
            {paymentTermsDisplay}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Place of Supply
          </span>
          <span className="mt-0.5 block font-bold text-slate-900 text-xs sm:text-sm truncate" title={placeOfSupplyDisplay}>
            {placeOfSupplyDisplay}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Reverse Charge
          </span>
          <span className="mt-0.5 block font-semibold text-slate-800 text-xs sm:text-sm">
            No
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BILLED TO (CUSTOMER) & SERVICE PARTICULARS CARDS                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Card 1: Billed To / Recipient Details */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#0A0082]" />
              Billed To (Customer Details)
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Recipient</span>
          </div>

          <div className="p-4 space-y-2 text-xs">
            <div className="text-sm font-bold text-slate-900 leading-snug">
              {clientName}
            </div>

            <div className="text-slate-600 leading-relaxed whitespace-pre-line">
              {clientAddress || "Registered corporate address on file"}
            </div>

            <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">GSTIN / Tax ID:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                  {clientGstin || "Unregistered / Overseas Recipient"}
                </span>
              </div>

              {clientPan && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">PAN:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {clientPan}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">State / Jurisdiction:</span>
                <span className="font-semibold text-slate-800">
                  {clientLocationDisplay}
                  {clientStateCode ? ` (State Code: ${clientStateCode})` : ""}
                </span>
              </div>

              {(clientEmail || clientPhone) && (
                <div className="pt-1 flex flex-wrap gap-x-3 text-slate-600">
                  {clientPhone && <span><strong className="text-slate-700">Ph:</strong> {clientPhone}</span>}
                  {clientEmail && <span><strong className="text-slate-700">Email:</strong> {clientEmail}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Service & Project Particulars */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-[#0A0082]" />
              Project & Service Particulars
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Contract</span>
          </div>

          <div className="p-4 space-y-2 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Project Name:</span>
              <span className="text-sm font-bold text-slate-900 leading-snug">
                {projectName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-500 text-[11px] block">Billing Period:</span>
                <span className="font-bold text-slate-900">{billingPeriod}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Project Duration:</span>
                <span className="font-medium text-slate-800">{projectDuration}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-500 text-[11px] block">Billing Model:</span>
                <span className="font-semibold text-slate-800">
                  {INVOICE_BILLING_TYPE_LABELS[billingType] || billingType || "Professional Services"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Snapshot Reference:</span>
                <span className="font-mono text-slate-700 truncate block">
                  {snapshotNumber || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CORPORATE LINE ITEMS TABLE                                             */}
      {/* ========================================================================= */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#0A0082] text-white">
              <th className="py-3 px-3 text-left w-10 font-bold uppercase tracking-wider text-[11px]">#</th>
              <th className="py-3 px-3 text-left font-bold uppercase tracking-wider text-[11px]">
                Description of Services / Deliverables
              </th>
              <th className="py-3 px-3 text-left w-24 font-bold uppercase tracking-wider text-[11px]">
                HSN/SAC
              </th>
              <th className="py-3 px-3 text-left w-16 font-bold uppercase tracking-wider text-[11px]">
                Qty
              </th>
              <th className="py-3 px-3 text-left w-28 font-bold uppercase tracking-wider text-[11px]">
                Rate
              </th>
              <th className="py-3 px-3 text-left w-28 font-bold uppercase tracking-wider text-[11px]">
                Taxable Value
              </th>
              <th className="py-3 px-3 text-left w-24 font-bold uppercase tracking-wider text-[11px]">
                Tax ({effectiveTaxRatePct}%)
              </th>
              <th className="py-3 pr-4 pl-3 text-left w-32 font-bold uppercase tracking-wider text-[11px]">
                Total Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {formattedRows.map((row) => (
              <tr key={row.index} className="align-top hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-3 text-left text-slate-500 font-semibold">
                  {row.index}
                </td>
                <td className="py-3.5 px-3 text-left">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                    {row.title}
                  </div>
                  {row.subDetails.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.subDetails.map((detail, dIdx) => (
                        <span
                          key={dIdx}
                          className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200/80 shadow-2xs"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-3 text-left font-mono font-semibold text-slate-700 bg-slate-50/50">
                  {row.hsnOrSac}
                </td>
                <td className="py-3.5 px-3 text-left font-mono font-semibold text-slate-800">
                  {row.qtyDisplay}
                </td>
                <td className="py-3.5 px-3 text-left font-mono text-slate-900 font-medium">
                  {row.rateDisplay}
                </td>
                <td className="py-3.5 px-3 text-left font-mono font-medium text-slate-900">
                  {formatCurrency(row.taxableAmount, currency)}
                </td>
                <td className="py-3.5 px-3 text-left font-mono text-slate-800 whitespace-nowrap">
                  {formatCurrency(row.taxAmount, currency)}
                </td>
                <td className="py-3.5 pr-4 pl-3 text-left font-mono font-bold text-slate-950">
                  {formatCurrency(row.totalAmount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
              <td colSpan={3} className="py-2.5 px-3 text-left">
                Total Items: <span className="font-black text-[#0A0082]">{totalItemsCount}</span>
              </td>
              <td className="py-2.5 px-3 text-left font-mono">
                {totalQtyDisplay}
              </td>
              <td className="py-2.5 px-3 text-left text-slate-500">—</td>
              <td className="py-2.5 px-3 text-left font-mono">
                {formatCurrency(subtotal, currency)}
              </td>
              <td className="py-2.5 px-3 text-left font-mono">
                {formatCurrency(totalTax, currency)}
              </td>
              <td className="py-2.5 pr-4 pl-3 text-left font-mono font-black text-slate-950">
                {formatCurrency(grandTotal, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 5. FINANCIAL SUMMARY LEDGER & STATUTORY TAX BREAKDOWN                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-start">
        {/* Left 7 Columns: Amount in words, Statutory Tax Table, Remittance */}
        <div className="lg:col-span-7 space-y-4">
          {/* Amount in words card */}
          <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/60 p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
              Amount Chargeable (in words):
            </span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-snug">
              {amountInWords}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5 italic">
              E. & O.E. (Errors and Omissions Excepted)
            </div>
          </div>

          {/* Statutory Tax Breakdown Schedule */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-100/80 px-3.5 py-1.5 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Statutory Tax Breakdown Schedule</span>
              <span className="text-[10px] text-slate-500">SAC 998314</span>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/70">
                  <th className="py-2 px-3 text-left">Tax Component</th>
                  <th className="py-2 px-3 text-left">Taxable Amount</th>
                  <th className="py-2 px-3 text-left">Rate</th>
                  <th className="py-2 pr-3 pl-2 text-left">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {effectiveTaxBreakdown.length > 0 ? (
                  effectiveTaxBreakdown.map((comp) => (
                    <tr key={comp.id}>
                      <td className="py-2 px-3 text-left font-semibold text-slate-800">
                        {comp.taxTypeCode || comp.taxComponent}
                      </td>
                      <td className="py-2 px-3 text-left font-mono text-slate-800">
                        {formatCurrency(comp.taxableAmount ?? subtotal, currency)}
                      </td>
                      <td className="py-2 px-3 text-left font-mono text-slate-800">
                        {comp.rate ? `${Number(comp.rate).toFixed(1)}%` : `${effectiveTaxRatePct}%`}
                      </td>
                      <td className="py-2 pr-3 pl-2 text-left font-mono font-bold text-slate-900">
                        {formatCurrency(comp.amount, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2 px-3 text-left font-semibold text-slate-800">
                      Integrated Tax (IGST / GST)
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-slate-800">
                      {formatCurrency(subtotal, currency)}
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-slate-800">
                      {effectiveTaxRatePct}%
                    </td>
                    <td className="py-2 pr-3 pl-2 text-left font-mono font-bold text-slate-900">
                      {formatCurrency(totalTax, currency)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Remittance / Settlement Instruction (Rendered only when provided by backend) */}
          {paymentInstructions && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1 text-xs shadow-2xs">
              <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider block">
                Payment Instructions
              </span>
              <div className="text-slate-600 whitespace-pre-line leading-relaxed text-xs">
                {paymentInstructions}
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Financial Ledger Box */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-4 space-y-3 text-xs shadow-xs">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-2">
              Financial Summary Ledger
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-bold text-slate-900">Taxable Amount (Subtotal)</span>
                <span className="font-bold text-slate-900 font-mono text-xs">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              {effectiveTaxBreakdown.length > 0 ? (
                effectiveTaxBreakdown.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex justify-between items-center text-slate-700 pl-2 border-l-2 border-indigo-200"
                  >
                    <span className="font-medium text-slate-800">
                      {comp.taxTypeCode || comp.taxComponent}
                      {comp.rate ? ` (${Number(comp.rate).toFixed(1)}%)` : ""}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(comp.amount, currency)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center text-slate-700 pl-2 border-l-2 border-indigo-200">
                  <span className="font-medium text-slate-800">
                    Total Tax ({effectiveTaxRatePct}%)
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCurrency(totalTax, currency)}
                  </span>
                </div>
              )}

              {expenses > 0 && (
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-bold text-slate-900">Reimbursable Expenses</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(expenses, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Total Invoice Value Card */}
            <div className="rounded-lg bg-[#0A0082] text-white p-3.5 shadow-xs mt-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-xs uppercase tracking-wider opacity-90 font-black">
                    Total Invoice Value
                  </span>
                  <span className="text-[10px] opacity-75">
                    Inclusive of all applicable taxes
                  </span>
                </div>
                <span className="font-mono text-base sm:text-xl font-black">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>
            </div>

            {/* Amount Payable */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 px-1">
              <span className="font-bold text-slate-800 text-xs">Total Amount Payable:</span>
              <span className="font-mono text-sm sm:text-base font-black text-[#0A0082]">
                {formatCurrency(grandTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. TERMS AND CONDITIONS & AUTHORIZED SIGNATORY                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-start border-t border-slate-200 mt-6">
        {/* Left: Notes & Legal Terms (Rendered only when provided by backend) */}
        <div className="md:col-span-8 space-y-3 text-xs">
          {notes && (
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">Notes:</span>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed text-xs">
                {notes}
              </p>
            </div>
          )}

          {termsAndConditions && (
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">Terms & Conditions:</span>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed text-[11px]">
                {termsAndConditions}
              </p>
            </div>
          )}
        </div>

        {/* Right: Authorized Corporate Signatory Box */}
        <div className="md:col-span-4 flex flex-col items-center text-center p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-bold text-slate-800">
            For {sellerName}
          </span>

          <OfficialSignatureSeal sellerName={sellerName} />

          <div className="w-36 border-b border-slate-400 mt-1 mb-1" />
          <div className="text-xs font-bold text-slate-900">
            Authorized Signatory
          </div>
          <div className="text-[10px] text-slate-500">
            Digitally Verified & Approved
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. STATUTORY FOOTER                                                       */}
      {/* ========================================================================= */}
      <div className="pt-6 mt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2">
        <span>This is a computer-generated tax invoice issued under the Information Technology Act, 2000.</span>
        <span>Page 1 of 1 • System Generated Official Document</span>
      </div>
    </div>
  );

  // When presentation === "card", wrap inside realistic A4 document sheet elevation
  if (!isPlain) {
    return (
      <div className="w-full bg-slate-100/70 p-2 sm:p-6 rounded-2xl border border-slate-200/80">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.08),0_10px_20px_-6px_rgba(0,0,0,0.04)] border border-slate-200/90 overflow-hidden text-slate-800 print:shadow-none print:border-none print:p-0 font-sans">
          {/* Top Brand Accent Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-[#0A0082] via-[#1e1b4b] to-[#0A0082]" />

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
