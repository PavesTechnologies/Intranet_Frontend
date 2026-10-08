import api from "../../../api/axiosInstance";
import { formatBillingPeriod, toIsoDateOnly } from "./billingDataAcquisitionService";

const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

/**
 * Extracts payload data from standard API response wrapper.
 */
const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object") {
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return payload.data;
    }
  }
  return payload?.data ?? payload ?? null;
};

/**
 * Formats client country code and phone number according to enterprise AR display rules:
 * - If both available: "<country code> <phone number>" (e.g. "+91 9876543210")
 * - If country code missing: "<phone number>" (e.g. "9876543210")
 * - If phone missing: "Not provided"
 * - If both missing: "Not provided"
 */
export const formatClientPhone = (countryCode, phone) => {
  const p = phone !== null && phone !== undefined ? String(phone).trim() : "";
  const cc = countryCode !== null && countryCode !== undefined ? String(countryCode).trim() : "";

  if (!p) {
    return "Not provided";
  }

  // If phone already starts with "+", it already includes dial code
  if (p.startsWith("+")) {
    return p;
  }

  if (cc) {
    const formattedCc = cc.startsWith("+") ? cc : `+${cc}`;
    return `${formattedCc} ${p}`;
  }

  return p;
};

/**
 * Maps backend errors to meaningful user-facing messages.
 * Does not expose raw database/SQL exception messages to the user.
 */
export const getInvoiceErrorMessage = (
  error,
  fallback = "Invoice operation could not be completed. Please try again."
) => {
  const status = error?.response?.status;
  const rawDetail =
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    "";

  const detail = String(rawDetail);

  // Mask database / SQL internal error messages
  const isDbError =
    detail.toLowerCase().includes("could not execute statement") ||
    detail.toLowerCase().includes("sql") ||
    detail.toLowerCase().includes("hibernate") ||
    detail.toLowerCase().includes("constraintviolation") ||
    detail.toLowerCase().includes("psqlexception") ||
    detail.toLowerCase().includes("jpatransaction");

  if (isDbError) {
    if (status === 409 || detail.toLowerCase().includes("unique") || detail.toLowerCase().includes("duplicate")) {
      return "Invoice already generated for this billing snapshot.";
    }
    return "A server database error occurred while processing the invoice. Please contact support.";
  }

  if (status === 404) {
    if (detail.toLowerCase().includes("invoice")) {
      return "Invoice not found. Please verify the invoice or refresh the queue.";
    }
    if (detail.toLowerCase().includes("tax")) {
      return "Tax calculation not found. Tax calculation must be completed before generating an invoice.";
    }
    return "Billing snapshot or invoice could not be found.";
  }

  if (status === 409 || detail.toLowerCase().includes("already exists") || detail.toLowerCase().includes("already generated")) {
    if (detail.toLowerCase().includes("approval") || detail.toLowerCase().includes("status")) {
      return "Invoice status transition conflict. The invoice may have already been processed or is not in the required state.";
    }
    return "Invoice already generated for this billing snapshot.";
  }

  if (status === 400 || status === 422) {
    if (detail.toLowerCase().includes("refresh") || detail.toLowerCase().includes("resubmission")) {
      return detail || "Invoice must be refreshed after correction before resubmission.";
    }
    if (detail.toLowerCase().includes("reason")) {
      return detail || "A valid rejection reason is required.";
    }
    if (detail.toLowerCase().includes("status") || detail.toLowerCase().includes("transition") || detail.toLowerCase().includes("pending")) {
      return detail || "Invalid invoice status transition. Please refresh the invoice and try again.";
    }
    if (
      detail.toLowerCase().includes("tax_completed") ||
      detail.toLowerCase().includes("tax not completed") ||
      detail.toLowerCase().includes("not completed") ||
      detail.toLowerCase().includes("ready_for_tax")
    ) {
      return "Billing snapshot is not in TAX_COMPLETED status. Please complete tax calculation first.";
    }
    if (detail.toLowerCase().includes("already")) {
      return "Invoice already generated for this billing snapshot.";
    }
    if (
      detail.toLowerCase().includes("client name") ||
      detail.toLowerCase().includes("project name") ||
      detail.toLowerCase().includes("correction") ||
      detail.toLowerCase().includes("reacquire") ||
      detail.toLowerCase().includes("re-acquire")
    ) {
      return detail;
    }
    if (detail.toLowerCase().includes("client") || detail.toLowerCase().includes("address")) {
      return detail || "Client billing details are incomplete in the configuration.";
    }
    return detail || "Invoice request validation failed. Please check the snapshot details.";
  }

  if (status === 403) {
    return "You do not have permission to perform this invoice operation.";
  }

  if (status >= 500) {
    return "The billing service encountered an internal error while processing the invoice. Please try again later.";
  }

  return detail || fallback;
};

/**
 * Normalizes a single invoice line item without deriving or calculating amounts.
 */
export const normalizeInvoiceItem = (item = {}, index = 0) => {
  const source = item && typeof item === "object" ? item : {};
  return {
    id:
      source.invoiceItemId ||
      source.invoice_item_id ||
      source.id ||
      source.sourceReferenceId ||
      `item-${index}`,
    itemName:
      source.itemName ||
      source.item_name ||
      source.item ||
      source.description ||
      "",
    item:
      source.itemName ||
      source.item_name ||
      source.item ||
      source.description ||
      "",
    resourceName: source.resourceName || source.resource_name || null,
    itemType: source.itemType || source.item_type || "",
    role: source.role || source.designation || "Unknown",
    workDate: toIsoDateOnly(source.workDate || source.work_date || source.date) || "",
    quantity:
      source.quantity !== undefined && source.quantity !== null
        ? Number(source.quantity)
        : source.hours !== undefined && source.hours !== null
          ? Number(source.hours)
          : 0,
    hours:
      source.hours !== undefined && source.hours !== null
        ? Number(source.hours)
        : source.quantity !== undefined && source.quantity !== null
          ? Number(source.quantity)
          : null,
    sourceReference: source.sourceReference || source.sourceReferenceId || source.source_reference || null,
    rate:
      source.rate !== undefined && source.rate !== null
        ? Number(source.rate)
        : source.hourlyRate !== undefined && source.hourlyRate !== null
          ? Number(source.hourlyRate)
          : 0,
    amount:
      source.amount !== undefined && source.amount !== null
        ? Number(source.amount)
        : source.total !== undefined && source.total !== null
          ? Number(source.total)
          : 0,
  };
};

/**
 * Normalizes a single tax component without recalculating or altering rates/amounts.
 */
export const normalizeTaxComponent = (component = {}, index = 0) => {
  const source = component && typeof component === "object" ? component : {};
  return {
    id:
      source.taxCalculationComponentId ||
      source.tax_calculation_component_id ||
      source.invoiceTaxComponentId ||
      source.invoice_tax_component_id ||
      source.id ||
      `${source.taxTypeCode || source.taxComponent || source.taxTypeName || "tax"}-${index}`,
    taxComponent:
      source.taxTypeName ||
      source.tax_type_name ||
      source.taxComponent ||
      source.tax_component ||
      source.taxTypeCode ||
      source.tax_type_code ||
      source.taxType ||
      source.tax_type ||
      source.name ||
      "Tax Component",
    taxTypeCode:
      source.taxTypeCode ||
      source.tax_type_code ||
      source.taxType ||
      source.tax_type ||
      "",
    applicability:
      source.applicabilityType ||
      source.applicability ||
      source.applicability_type ||
      "Not specified",
    rate:
      source.appliedRate !== undefined && source.appliedRate !== null
        ? Number(source.appliedRate)
        : source.rate !== undefined && source.rate !== null
          ? Number(source.rate)
          : source.taxRate !== undefined && source.taxRate !== null
            ? Number(source.taxRate)
            : source.tax_rate !== undefined && source.tax_rate !== null
              ? Number(source.tax_rate)
              : null,
    taxableAmount:
      source.taxableAmount !== undefined && source.taxableAmount !== null
        ? Number(source.taxableAmount)
        : source.taxable_amount !== undefined && source.taxable_amount !== null
          ? Number(source.taxable_amount)
          : source.taxableBase !== undefined && source.taxableBase !== null
            ? Number(source.taxableBase)
            : source.baseAmount !== undefined && source.baseAmount !== null
              ? Number(source.baseAmount)
              : source.base_amount !== undefined && source.base_amount !== null
                ? Number(source.base_amount)
                : null,
    amount:
      source.taxAmount !== undefined && source.taxAmount !== null
        ? Number(source.taxAmount)
        : source.amount !== undefined && source.amount !== null
          ? Number(source.amount)
          : source.tax_amount !== undefined && source.tax_amount !== null
            ? Number(source.tax_amount)
            : 0,
  };
};

/**
 * Normalizes backend Invoice response.
 * The backend is authoritative for all financial totals (subtotal, total tax, grand total)
 * and tax breakdown components. The frontend never derives or recalculates financial amounts.
 *
 * Missing client information remains null/empty without creating fake values.
 */
export const normalizeInvoice = (payload = {}) => {
  if (!payload || typeof payload !== "object") return null;

  // Handles payload wrapped in { invoice: { ... } }, { data: { invoice: { ... } } }, { data: { ... } }, or raw invoice object
  let data = payload;
  if (data.invoice && typeof data.invoice === "object" && !Array.isArray(data.invoice)) {
    data = data.invoice;
  } else if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    data = (data.data.invoice && typeof data.data.invoice === "object" && !Array.isArray(data.data.invoice))
      ? data.data.invoice
      : data.data;
  }

  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.invoiceItems)
      ? data.invoiceItems
      : Array.isArray(data.lineItems)
        ? data.lineItems
        : Array.isArray(data.timesheets)
          ? data.timesheets
          : [];

  const rawTaxComponents = Array.isArray(data.taxBreakdown)
    ? data.taxBreakdown
    : Array.isArray(data.taxComponents)
      ? data.taxComponents
      : Array.isArray(data.invoiceTaxComponents)
        ? data.invoiceTaxComponents
        : Array.isArray(data.invoice_tax_components)
          ? data.invoice_tax_components
          : Array.isArray(data.taxDetails)
            ? data.taxDetails
            : Array.isArray(data.components)
              ? data.components
              : Array.isArray(data.taxes)
                ? data.taxes
                : Array.isArray(data.taxCalculation?.components)
                  ? data.taxCalculation.components
                  : Array.isArray(data.taxCalculation?.taxComponents)
                    ? data.taxCalculation.taxComponents
                    : Array.isArray(data.taxContext?.components)
                      ? data.taxContext.components
                      : [];

  const normalizedTaxComponents = rawTaxComponents.map(normalizeTaxComponent);

  // Actual snapshot billing period handling
  const periodStart = toIsoDateOnly(
    data.billingPeriodStart || data.billing_period_start || data.periodStart
  );
  const periodEnd = toIsoDateOnly(
    data.billingPeriodEnd || data.billing_period_end || data.periodEnd
  );
  const displayPeriod =
    data.billingPeriod ||
    (periodStart && periodEnd ? formatBillingPeriod(periodStart, periodEnd) : "");

  // Address normalization: preserve null/empty if missing, format if object
  let formattedAddress = null;
  if (data.billingAddress) {
    if (typeof data.billingAddress === "string") {
      formattedAddress = data.billingAddress.trim() || null;
    } else if (typeof data.billingAddress === "object") {
      const parts = [
        data.billingAddress.street,
        data.billingAddress.city,
        data.billingAddress.state,
        data.billingAddress.postalCode || data.billingAddress.zipCode,
        data.billingAddress.country,
      ].filter(Boolean);
      formattedAddress = parts.length > 0 ? parts.join(", ") : null;
    }
  }

  // Authoritative financial totals directly from backend
  const subtotal =
    data.subtotal !== undefined && data.subtotal !== null
      ? Number(data.subtotal)
      : data.sub_total !== undefined && data.sub_total !== null
        ? Number(data.sub_total)
        : data.taxableAmount !== undefined && data.taxableAmount !== null
          ? Number(data.taxableAmount)
          : data.taxable_amount !== undefined && data.taxable_amount !== null
            ? Number(data.taxable_amount)
            : 0;

  const totalTax =
    data.totalTax !== undefined && data.totalTax !== null
      ? Number(data.totalTax)
      : data.totalTaxAmount !== undefined && data.totalTaxAmount !== null
        ? Number(data.totalTaxAmount)
        : data.total_tax !== undefined && data.total_tax !== null
          ? Number(data.total_tax)
          : data.total_tax_amount !== undefined && data.total_tax_amount !== null
            ? Number(data.total_tax_amount)
            : data.taxCalculation?.totalTaxAmount !== undefined && data.taxCalculation?.totalTaxAmount !== null
              ? Number(data.taxCalculation.totalTaxAmount)
              : (normalizedTaxComponents.length > 0
                  ? normalizedTaxComponents.reduce((acc, c) => acc + (c.amount || 0), 0)
                  : 0);

  const grandTotal =
    data.grandTotal !== undefined && data.grandTotal !== null
      ? Number(data.grandTotal)
      : data.grand_total !== undefined && data.grand_total !== null
        ? Number(data.grand_total)
        : data.totalAmount !== undefined && data.totalAmount !== null
          ? Number(data.totalAmount)
          : data.total_amount !== undefined && data.total_amount !== null
            ? Number(data.total_amount)
            : data.taxCalculation?.grandTotal !== undefined && data.taxCalculation?.grandTotal !== null
              ? Number(data.taxCalculation.grandTotal)
              : (subtotal + totalTax);

  return {
    invoiceId: data.invoiceId || data.invoice_id || data.id || "",
    invoiceNumber:
      data.invoiceNumber ||
      data.invoice_number ||
      (data.generated === false ? "Assigned on generation" : "—"),
    invoiceStatus:
      data.invoiceStatus ||
      data.status ||
      (data.generated === false ? "Draft Preview" : "GENERATED"),
    invoiceDate:
      toIsoDateOnly(data.invoiceDate || data.invoice_date || data.issueDate || data.createdAt) ||
      (data.generated === false ? null : ""),
    dueDate:
      toIsoDateOnly(data.dueDate || data.due_date) ||
      (data.generated === false ? null : ""),

    // Rejection reason if returned directly on invoice
    rejectionReason:
      data.rejectionReason ||
      data.rejection_reason ||
      data.reason ||
      data.comment ||
      "",

    // Phase 2B correction fields (authoritative from backend)
    correctionRequired:
      data.correctionRequired !== undefined && data.correctionRequired !== null
        ? Boolean(data.correctionRequired)
        : false,
    lastCorrectedAt: data.lastCorrectedAt || data.last_corrected_at || null,

    // Billing snapshot link (Timesheet/T&M invoices only)
    billingSnapshotId: data.billingSnapshotId || data.billing_snapshot_id || data.snapshotId || "",
    // Billing occurrence link (Fixed Price/Recurring invoices only) — an
    // invoice never carries both; whichever is present identifies which
    // detail/tax-calculation flow this invoice belongs to. There is no
    // occurrence-based invoice detail endpoint yet (see billingOccurrenceService.js),
    // so callers must not build a Billing Snapshot invoice/tax-calculation
    // URL from this id.
    billingScheduleId: data.billingScheduleId || data.billing_schedule_id || data.occurrenceId || data.occurrence_id || "",
    snapshotNumber:
      data.snapshotNumber ||
      data.snapshot_number ||
      data.billingSnapshotNumber ||
      data.billing_snapshot_number ||
      data.snapshot?.snapshotNumber ||
      data.snapshot?.snapshot_number ||
      data.billingSnapshot?.snapshotNumber ||
      data.billingSnapshot?.snapshot_number ||
      data.snapshotReference ||
      data.snapshot_reference ||
      data.snapshotCode ||
      data.snapshot_code ||
      data.billingSnapshotCode ||
      data.billing_snapshot_code ||
      data.billingSnapshot?.number ||
      data.snapshot?.number ||
      "",

    // Client / Bill To (Strictly backend provided; null if not provided)
    clientId:
      data.clientId ||
      data.client_id ||
      data.client?.clientId ||
      data.client?.id ||
      null,
    clientName:
      data.clientName ||
      data.client_name ||
      (typeof data.client === "string" ? data.client : null) ||
      data.client?.clientName ||
      data.client?.name ||
      null,
    billingAddress: formattedAddress,
    gstin: data.gstinOrTaxId || data.gstin || data.gstNumber || data.taxId || data.tax_id || null,
    gstinOrTaxId: data.gstinOrTaxId || data.gstin || data.gstNumber || data.taxId || data.tax_id || null,
    contact: data.contact || data.contactPerson || data.contactEmail || data.contactPhone || null,
    countryCode:
      data.countryCode ||
      data.country_code ||
      data.clientCountryCode ||
      data.client_country_code ||
      data.client?.countryCode ||
      data.client?.country_code ||
      null,
    email:
      data.email ||
      data.clientEmail ||
      data.client_email ||
      data.client?.email ||
      null,
    phone:
      data.phone ||
      data.clientPhone ||
      data.phoneNumber ||
      data.phone_number ||
      data.clientPhoneNumber ||
      data.client_phone_number ||
      data.client?.phone ||
      data.client?.phoneNumber ||
      null,

    // Invoice Context
    projectName: data.projectName || data.project_name || data.project || "",
    projectCode: data.projectCode || data.project_code || "",
    billingPeriod: displayPeriod,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    currency: data.currency || data.currencyCode || "USD",
    paymentTermCode: data.paymentTermCode || data.payment_term_code || null,
    paymentTermName: data.paymentTermName || data.payment_term_name || null,
    paymentTerms:
      data.paymentTermName ||
      data.payment_term_name ||
      (data.paymentTermCode ? `${data.paymentTermCode} Days` : null) ||
      (data.payment_term_code ? `${data.payment_term_code} Days` : null) ||
      null,

    // Items & Tax Breakdown (Authoritative from backend)
    items: rawItems.map(normalizeInvoiceItem),
    taxBreakdown: normalizedTaxComponents,
    taxComponents: normalizedTaxComponents,

    // Tax Context (Authoritative from backend; null if not provided)
    supplierState:
      data.supplierState ||
      data.supplier_state ||
      data.taxContext?.supplierState ||
      data.taxContext?.supplier_state ||
      data.taxCalculation?.supplierState ||
      data.taxCalculation?.supplier_state ||
      null,
    customerState:
      data.customerState ||
      data.customer_state ||
      data.taxContext?.customerState ||
      data.taxContext?.customer_state ||
      data.taxCalculation?.customerState ||
      data.taxCalculation?.customer_state ||
      null,
    placeOfSupply:
      data.placeOfSupply ||
      data.place_of_supply ||
      data.taxContext?.placeOfSupply ||
      data.taxContext?.place_of_supply ||
      data.taxCalculation?.placeOfSupply ||
      data.taxCalculation?.place_of_supply ||
      null,
    taxRegion:
      data.taxRegion ||
      data.tax_region ||
      data.taxRegionName ||
      data.tax_region_name ||
      data.taxContext?.taxRegion ||
      data.taxContext?.tax_region ||
      data.taxContext?.taxRegionName ||
      data.taxContext?.tax_region_name ||
      data.taxCalculation?.taxRegion ||
      data.taxCalculation?.tax_region ||
      data.taxCalculation?.taxRegionName ||
      data.taxCalculation?.tax_region_name ||
      null,
    taxRegionName:
      data.taxRegionName ||
      data.tax_region_name ||
      data.taxRegion ||
      data.tax_region ||
      data.taxContext?.taxRegionName ||
      data.taxContext?.tax_region_name ||
      data.taxCalculation?.taxRegionName ||
      data.taxCalculation?.tax_region_name ||
      null,

    // Seller Info (Authoritative from backend if provided)
    sellerLegalName:
      data.sellerLegalName ||
      data.seller_legal_name ||
      data.sellerName ||
      data.seller_name ||
      data.companyName ||
      data.company_name ||
      null,
    sellerName:
      data.sellerLegalName ||
      data.seller_legal_name ||
      data.sellerName ||
      data.seller_name ||
      data.companyName ||
      data.company_name ||
      null,
    sellerAddress:
      data.sellerAddress ||
      data.seller_address ||
      ([
        data.sellerAddressLine1,
        data.sellerAddressLine2,
        data.sellerCity,
        data.sellerState,
        data.sellerPostalCode,
        data.sellerCountry,
      ].filter(Boolean).length > 0
        ? [
            data.sellerAddressLine1,
            data.sellerAddressLine2,
            data.sellerCity,
            data.sellerState,
            data.sellerPostalCode,
            data.sellerCountry,
          ]
            .filter(Boolean)
            .join(", ")
        : null) ||
      data.companyAddress ||
      data.company_address ||
      null,
    sellerAddressLine1: data.sellerAddressLine1 || null,
    sellerAddressLine2: data.sellerAddressLine2 || null,
    sellerCity: data.sellerCity || null,
    sellerState: data.sellerState || null,
    sellerPostalCode: data.sellerPostalCode || null,
    sellerCountry: data.sellerCountry || null,
    sellerGstin:
      data.sellerGstin ||
      data.seller_gstin ||
      data.companyGstin ||
      data.company_gstin ||
      null,
    sellerEmail:
      data.sellerEmail ||
      data.seller_email ||
      data.companyEmail ||
      data.company_email ||
      null,
    sellerPhone:
      data.sellerPhone ||
      data.seller_phone ||
      data.companyPhone ||
      data.company_phone ||
      null,
    sellerLogoReference:
      data.sellerLogoReference ||
      data.seller_logo_reference ||
      data.logo ||
      data.logoUrl ||
      null,
    sellerInfo: {
      legalName: data.sellerLegalName || data.sellerName || data.companyName || null,
      address:
        data.sellerAddress ||
        [data.sellerAddressLine1, data.sellerAddressLine2, data.sellerCity, data.sellerState, data.sellerPostalCode, data.sellerCountry].filter(Boolean).join(", ") ||
        null,
      gstin: data.sellerGstin || data.companyGstin || null,
      email: data.sellerEmail || data.companyEmail || null,
      phone: data.sellerPhone || data.companyPhone || null,
      logoUrl: data.sellerLogoReference || data.logo || null,
    },

    // Pre-generation flag from backend
    generated:
      data.generated !== undefined && data.generated !== null
        ? Boolean(data.generated)
        : Boolean(data.invoiceNumber && data.invoiceNumber !== "Assigned on generation" && data.invoiceNumber !== "—"),

    // Financial Totals (Strictly backend authoritative)
    subtotal,
    totalTax,
    grandTotal,
  };
};

/**
 * GET /api/v1/billing-snapshots/{snapshotId}/invoice-preview
 * Authoritative pre-generation invoice preview endpoint.
 * Returns the complete preview with snapshot line items, authoritative totals,
 * client, project, seller, and generated status without creating or modifying an invoice.
 */
export const previewInvoice = async (snapshotId) => {
  if (!snapshotId) {
    throw new Error("Billing snapshot UUID is required to preview an invoice.");
  }
  const url = `${AR_BASE_URL}/api/v1/billing-snapshots/${snapshotId}/invoice-preview`;
  const response = await api.get(url);
  const data = unwrapData(response);
  return normalizeInvoice(data);
};

/**
 * POST /api/v1/billing-snapshots/{snapshotId}/invoice
 * Generates an invoice on the backend for the given billing snapshot.
 * Uses the real BillingSnapshot UUID.
 */
export const generateInvoice = async (snapshotId) => {
  if (!snapshotId) {
    throw new Error("Billing snapshot UUID is required to generate an invoice.");
  }
  const url = `${AR_BASE_URL}/api/v1/billing-snapshots/${snapshotId}/invoice`;
  const response = await api.post(url);
  return normalizeInvoice(unwrapData(response));
};

/**
 * POST /api/billing-occurrences/{occurrenceId}/invoice
 * Generates an invoice on the backend for the given Fixed Price / Recurring billing occurrence.
 * Uses the real BillingOccurrence UUID.
 */
export const generateInvoiceForOccurrence = async (occurrenceId) => {
  if (!occurrenceId) {
    throw new Error("Billing occurrence UUID is required to generate an invoice.");
  }
  const url = `${AR_BASE_URL}/api/billing-occurrences/${occurrenceId}/invoice`;
  const response = await api.post(url);
  return normalizeInvoice(unwrapData(response));
};

/**
 * Normalizes an item returned by GET /api/v1/invoices/approval-workspace.
 * Uses backend-provided fields directly.
 */
export const normalizeApprovalWorkspaceItem = (item = {}) => {
  const source = item && typeof item === "object" ? item : {};
  const periodStart = toIsoDateOnly(source.billingPeriodStart);
  const periodEnd = toIsoDateOnly(source.billingPeriodEnd);
  const displayPeriod =
    periodStart && periodEnd ? formatBillingPeriod(periodStart, periodEnd) : (source.billingPeriod || "—");

  return {
    invoiceId: source.invoiceId || source.id || "",
    invoiceNumber: source.invoiceNumber || "—",
    status: (source.status || source.invoiceStatus || "PENDING_APPROVAL").toUpperCase(),
    invoiceStatus: (source.status || source.invoiceStatus || "PENDING_APPROVAL").toUpperCase(),
    billingSnapshotId: source.billingSnapshotId || source.snapshotId || "",
    billingSnapshotNumber: source.billingSnapshotNumber || source.snapshotNumber || null,
    // Fixed Price/Recurring workspace entries carry this instead of a
    // billingSnapshotId — see normalizeInvoice above.
    billingScheduleId: source.billingScheduleId || source.billing_schedule_id || source.occurrenceId || source.occurrence_id || "",
    clientId:
      source.clientId ||
      source.client_id ||
      source.client?.clientId ||
      source.client?.id ||
      null,
    clientName: source.clientName || "—",
    countryCode:
      source.countryCode ||
      source.country_code ||
      source.clientCountryCode ||
      source.client_country_code ||
      source.client?.countryCode ||
      null,
    email:
      source.email ||
      source.clientEmail ||
      source.client_email ||
      source.client?.email ||
      null,
    phone:
      source.phone ||
      source.clientPhone ||
      source.phoneNumber ||
      source.phone_number ||
      source.clientPhoneNumber ||
      source.client?.phone ||
      null,
    projectName: source.projectName || "—",
    billingPeriod: displayPeriod,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    invoiceDate: toIsoDateOnly(source.invoiceDate) || "",
    dueDate: toIsoDateOnly(source.dueDate) || "",
    currency: source.currencyCode || source.currency || "USD",
    currencyCode: source.currencyCode || source.currency || "USD",
    grandTotal:
      source.grandTotal !== undefined && source.grandTotal !== null ? Number(source.grandTotal) : 0,
    submittedAt: source.submittedAt || null,
    submittedBy: source.submittedBy || "—",
    lastAction: source.lastAction || "—",
    lastActionAt: source.lastActionAt || null,
    correctionRequired:
      source.correctionRequired !== undefined && source.correctionRequired !== null
        ? Boolean(source.correctionRequired)
        : false,
    lastCorrectedAt: source.lastCorrectedAt || source.last_corrected_at || null,
  };
};

/**
 * GET /api/v1/invoices/approval-workspace
 * Retrieves all invoices in the approval workflow (pending, approved, rejected)
 * for the persistent approval dashboard.
 */
export const getInvoiceApprovalWorkspace = async () => {
  const url = `${AR_BASE_URL}/api/v1/invoices/approval-workspace`;
  const response = await api.get(url);
  const rawData = unwrapData(response);

  let items = [];
  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.content)) items = rawData.content;
    else if (Array.isArray(rawData.invoices)) items = rawData.invoices;
    else if (Array.isArray(rawData.items)) items = rawData.items;
    else if (Array.isArray(rawData.workspace)) items = rawData.workspace;
  }

  return items.map(normalizeApprovalWorkspaceItem).filter(Boolean);
};

/**
 * GET /api/v1/billing-snapshots/{snapshotId}/invoice
 * Retrieves the persisted invoice for the given billing snapshot.
 * Safely resolves snapshot UUID, invoice UUID, or snapshot number without triggering 500 errors.
 */
export const getInvoice = async (snapshotIdOrInvoiceId) => {
  if (!snapshotIdOrInvoiceId) {
    throw new Error("Billing snapshot UUID or Invoice ID is required to retrieve an invoice.");
  }

  const rawId = String(snapshotIdOrInvoiceId).trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);

  // 1. If it's a valid UUID, try fetching by billing snapshot endpoint
  if (isUuid) {
    try {
      const url = `${AR_BASE_URL}/api/v1/billing-snapshots/${rawId}/invoice`;
      const response = await api.get(url);
      return normalizeInvoice(unwrapData(response));
    } catch (err) {
      if (err?.response?.status !== 404) {
        throw err;
      }
      // If 404, rawId might be an invoiceId instead of billingSnapshotId; try GET /api/v1/invoices/{invoiceId}
      try {
        const invUrl = `${AR_BASE_URL}/api/v1/invoices/${rawId}`;
        const invResponse = await api.get(invUrl);
        return normalizeInvoice(unwrapData(invResponse));
      } catch (invErr) {
        if (invErr?.response?.status !== 404) {
          throw invErr;
        }
      }
    }
  }

  // 2. Resolve target billingSnapshotId from workspace or invoices API
  let targetSnapshotId = null;

  try {
    const workspaceItems = await getInvoiceApprovalWorkspace();
    const matched = workspaceItems.find(
      (w) =>
        w.invoiceId === rawId ||
        w.billingSnapshotId === rawId ||
        w.billingScheduleId === rawId ||
        (w.invoiceNumber && w.invoiceNumber.toLowerCase() === rawId.toLowerCase()) ||
        (w.billingSnapshotNumber && w.billingSnapshotNumber.toLowerCase() === rawId.toLowerCase())
    );
    if (matched?.billingSnapshotId) {
      targetSnapshotId = matched.billingSnapshotId;
    }
  } catch (wErr) {
    console.warn("[invoiceService] Lookup in approval workspace skipped:", wErr?.message);
  }

  if (!targetSnapshotId) {
    try {
      const { invoices } = await getInvoices();
      const matched = invoices.find(
        (i) =>
          i.invoiceId === rawId ||
          i.billingSnapshotId === rawId ||
          i.billingScheduleId === rawId ||
          (i.invoiceNumber && i.invoiceNumber.toLowerCase() === rawId.toLowerCase()) ||
          (i.snapshotNumber && i.snapshotNumber.toLowerCase() === rawId.toLowerCase())
      );
      if (matched?.billingSnapshotId) {
        targetSnapshotId = matched.billingSnapshotId;
      } else if (matched && (matched.billingScheduleId === rawId || matched.invoiceId === rawId)) {
        return matched;
      }
    } catch (iErr) {
      console.warn("[invoiceService] Lookup in invoices list skipped:", iErr?.message);
    }
  }

  // Check localStorage for acquired snapshot metadata
  if (!targetSnapshotId) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("ar_snapshot_period_")) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const meta = JSON.parse(raw);
            if (meta?.snapshotNumber === rawId || meta?.snapshotId === rawId) {
              targetSnapshotId = meta.snapshotId;
              break;
            }
          }
        }
      }
    } catch (lsErr) {
      console.warn("[invoiceService] Lookup in localStorage skipped:", lsErr?.message);
    }
  }

  if (targetSnapshotId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSnapshotId)) {
    const url = `${AR_BASE_URL}/api/v1/billing-snapshots/${targetSnapshotId}/invoice`;
    const response = await api.get(url);
    const normalized = normalizeInvoice(unwrapData(response));
    if (normalized && !normalized.snapshotNumber && rawId.startsWith("BS-")) {
      normalized.snapshotNumber = rawId;
    }
    return normalized;
  }

  // Fallback: try direct GET /api/v1/invoices/{rawId} in case rawId is a non-standard invoice ID format
  try {
    const invUrl = `${AR_BASE_URL}/api/v1/invoices/${rawId}`;
    const invResponse = await api.get(invUrl);
    const unwrapped = unwrapData(invResponse);
    if (unwrapped) {
      return normalizeInvoice(unwrapped);
    }
  } catch (invErr) {
    if (invErr?.response?.status && invErr.response.status !== 404) {
      throw invErr;
    }
  }

  const notFoundErr = new Error("Invoice could not be found for the provided identifier.");
  notFoundErr.response = { status: 404, data: { message: "Invoice could not be found." } };
  throw notFoundErr;
};

/**
 * GET /api/v1/invoices/{invoiceId}
 * Retrieves invoice by invoice UUID directly from the invoices controller.
 */
export const getInvoiceById = async (invoiceId) => {
  if (!invoiceId) throw new Error("Invoice ID is required.");
  const response = await api.get(`${AR_BASE_URL}/api/v1/invoices/${invoiceId}`);
  return normalizeInvoice(unwrapData(response));
};


/**
 * Normalizes a single row returned by GET /api/v1/invoice-generation/workspace.
 * Backend provides authoritative workspaceStatus and financial amounts.
 */
export const normalizeInvoiceGenerationWorkspaceItem = (row = {}) => {
  const source = row && typeof row === "object" ? row : {};
  const periodStart = toIsoDateOnly(source.billingPeriodStart);
  const periodEnd = toIsoDateOnly(source.billingPeriodEnd);
  const displayPeriod =
    periodStart && periodEnd
      ? formatBillingPeriod(periodStart, periodEnd)
      : (source.billingPeriod || "—");

  return {
    workspaceStatus: (source.workspaceStatus || (source.invoiceId ? "GENERATED" : "READY_FOR_INVOICE")).toUpperCase(),
    snapshotId: source.snapshotId || null,
    snapshotNumber: source.snapshotNumber || null,
    snapshotStatus: source.snapshotStatus || null,
    clientName: source.clientName || "—",
    projectName: source.projectName || "—",
    projectCode: source.projectCode || null,
    billingType: source.billingType || null,
    billingPeriod: displayPeriod,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    currency: source.currencyCode || source.currency || "USD",
    currencyCode: source.currencyCode || source.currency || "USD",
    amount: source.amount !== undefined && source.amount !== null ? Number(source.amount) : 0,
    totalTaxAmount: source.totalTaxAmount !== undefined && source.totalTaxAmount !== null ? Number(source.totalTaxAmount) : 0,
    grandTotal: source.grandTotal !== undefined && source.grandTotal !== null ? Number(source.grandTotal) : 0,
    invoiceId: source.invoiceId || null,
    invoiceNumber: source.invoiceNumber || null,
    invoiceStatus: source.invoiceStatus ? source.invoiceStatus.toUpperCase() : null,
    invoiceDate: toIsoDateOnly(source.invoiceDate) || null,
    dueDate: toIsoDateOnly(source.dueDate) || null,
  };
};

/**
 * GET /api/v1/invoice-generation/workspace
 * Retrieves the invoice generation workspace including summary metrics
 * and rows containing both TAX_COMPLETED candidates (ready for invoice generation)
 * and existing generated/in-progress invoices.
 */
export const getInvoiceGenerationWorkspace = async () => {
  const url = `${AR_BASE_URL}/api/v1/invoice-generation/workspace`;
  const response = await api.get(url);
  const rawData = unwrapData(response);

  let rows = [];
  let summary = null;

  if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.rows)) {
      rows = rawData.rows;
    } else if (Array.isArray(rawData.content)) {
      rows = rawData.content;
    } else if (Array.isArray(rawData.items)) {
      rows = rawData.items;
    } else if (Array.isArray(rawData)) {
      rows = rawData;
    }

    if (rawData.summary && typeof rawData.summary === "object") {
      summary = {
        readyForInvoiceCount: Number(rawData.summary.readyForInvoiceCount) || 0,
        readyForInvoiceAmount: Number(rawData.summary.readyForInvoiceAmount) || 0,
        generatedCount: Number(rawData.summary.generatedCount) || 0,
        pendingApprovalCount: Number(rawData.summary.pendingApprovalCount) || 0,
        approvedCount: Number(rawData.summary.approvedCount) || 0,
        rejectedCount: Number(rawData.summary.rejectedCount) || 0,
        invoicedCount: Number(rawData.summary.invoicedCount) || 0,
        totalInvoicedAmount: Number(rawData.summary.totalInvoicedAmount) || 0,
      };
    }
  } else if (Array.isArray(rawData)) {
    rows = rawData;
  }

  const normalizedRows = rows.map(normalizeInvoiceGenerationWorkspaceItem).filter(Boolean);

  if (!summary) {
    const readyForInvoiceRows = normalizedRows.filter(
      (r) => r.workspaceStatus === "READY_FOR_INVOICE"
    );
    const generatedRows = normalizedRows.filter(
      (r) => r.workspaceStatus === "GENERATED"
    );
    const invoicedRows = normalizedRows.filter(
      (r) => r.workspaceStatus === "INVOICED"
    );
    const totalInvoicedAmount = normalizedRows
      .filter((r) => r.workspaceStatus !== "READY_FOR_INVOICE")
      .reduce((sum, r) => sum + (Number(r.grandTotal) || 0), 0);

    summary = {
      readyForInvoiceCount: readyForInvoiceRows.length,
      readyForInvoiceAmount: readyForInvoiceRows.reduce(
        (sum, r) => sum + (Number(r.grandTotal) || 0),
        0
      ),
      generatedCount: generatedRows.length,
      pendingApprovalCount: normalizedRows.filter(
        (r) => r.workspaceStatus === "PENDING_APPROVAL"
      ).length,
      approvedCount: normalizedRows.filter(
        (r) => r.workspaceStatus === "APPROVED"
      ).length,
      rejectedCount: normalizedRows.filter(
        (r) => r.workspaceStatus === "REJECTED"
      ).length,
      invoicedCount: invoicedRows.length,
      totalInvoicedAmount,
    };
  }

  return {
    summary,
    rows: normalizedRows,
  };
};

/**
 * GET /api/v1/invoices
 * Retrieves persisted invoices directly from the backend InvoiceRepository.
 * Uses GET /api/v1/invoices as the exclusive source of truth.
 * If summary metrics or direct listing are returned, they are preserved.
 */
export const getInvoices = async () => {
  const url = `${AR_BASE_URL}/api/v1/invoices`;
  const response = await api.get(url);
  const rawData = unwrapData(response);

  // Support both direct array of invoices or wrapper object with content/invoices/items
  let items = [];
  let summary = null;

  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.content)) items = rawData.content;
    else if (Array.isArray(rawData.invoices)) items = rawData.invoices;
    else if (Array.isArray(rawData.items)) items = rawData.items;

    // Extract backend-authoritative summary/aggregates if provided by backend API
    if (rawData.summary && typeof rawData.summary === "object") {
      summary = rawData.summary;
    } else if (rawData.totalInvoicedAmount !== undefined || rawData.totalInvoices !== undefined) {
      summary = {
        totalInvoices: rawData.totalInvoices,
        generatedInvoices: rawData.generatedInvoices || rawData.totalGenerated,
        totalInvoicedAmount: rawData.totalInvoicedAmount,
        currency: rawData.currency,
      };
    }
  }

  const normalizedInvoices = items.map(normalizeInvoice).filter(Boolean);
  return {
    invoices: normalizedInvoices,
    summary,
  };
};

/**
 * GET /api/v1/invoices/pending-approval
 * Retrieves invoices currently waiting for approval directly from the backend.
 * Uses dedicated backend endpoint exclusively without snapshot scanning.
 */
export const getPendingApprovalInvoices = async () => {
  const url = `${AR_BASE_URL}/api/v1/invoices/pending-approval`;
  const response = await api.get(url);
  const rawData = unwrapData(response);

  let items = [];
  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.content)) items = rawData.content;
    else if (Array.isArray(rawData.invoices)) items = rawData.invoices;
    else if (Array.isArray(rawData.items)) items = rawData.items;
  }

  return items.map(normalizeInvoice).filter(Boolean);
};

/**
 * POST /api/v1/invoices/{invoiceId}/submit-for-approval
 * Transitions invoice from GENERATED to PENDING_APPROVAL.
 */
export const submitInvoiceForApproval = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to submit for approval.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/submit-for-approval`;
  const response = await api.post(url);
  return normalizeInvoice(unwrapData(response));
};

/**
 * POST /api/v1/invoices/{invoiceId}/approve
 * Transitions invoice from PENDING_APPROVAL to APPROVED.
 */
export const approveInvoice = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to approve the invoice.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/approve`;
  const response = await api.post(url);
  return normalizeInvoice(unwrapData(response));
};

/**
 * GET /api/v1/invoices/{invoiceId}/approval-history
 * Retrieves chronological approval audits for the given invoice.
 */
export const getInvoiceApprovalHistory = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to fetch approval history.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/approval-history`;
  const response = await api.get(url);
  const rawData = unwrapData(response);

  let list = [];
  if (Array.isArray(rawData)) {
    list = rawData;
  } else if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.history)) list = rawData.history;
    else if (Array.isArray(rawData.content)) list = rawData.content;
    else if (Array.isArray(rawData.items)) list = rawData.items;
  }

  return list.map((item, idx) => {
    const src = item && typeof item === "object" ? item : {};
    return {
      id: src.id || src.auditId || src.historyId || `hist-${idx}`,
      action: src.action || src.approvalAction || "SUBMITTED",
      previousStatus: src.previousStatus || src.fromStatus || "—",
      newStatus: src.newStatus || src.toStatus || src.status || "—",
      actionBy: src.actionBy || src.performedBy || src.userName || "SYSTEM",
      actionAt: src.actionAt || src.performedAt || src.createdAt || src.timestamp || "",
      comment: src.comment || src.comments || src.notes || "",
    };
  });
};

/**
 * POST /api/v1/invoices/{invoiceId}/reject
 * Rejects an invoice with a mandatory reason comment.
 * Transitions invoice from PENDING_APPROVAL to REJECTED.
 */
export const rejectInvoice = async (invoiceId, reason) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to reject the invoice.");
  }
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (!trimmedReason) {
    throw new Error("Rejection reason is required.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/reject`;
  const response = await api.post(url, { reason: trimmedReason });
  return normalizeInvoice(unwrapData(response));
};

/**
 * POST /api/v1/invoices/{invoiceId}/refresh-after-correction
 * Refreshes a rejected invoice from the authoritative billing snapshot & tax calculation data.
 * No request body.
 */
export const refreshInvoiceAfterCorrection = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to refresh invoice after correction.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/refresh-after-correction`;
  const response = await api.post(url);
  return normalizeInvoice(unwrapData(response));
};

/**
 * PATCH /api/v1/invoices/{invoiceId}/non-financial-correction
 * Refreshes non-financial fields (clientName, projectName) on a REJECTED invoice.
 * Does not modify or send financial values.
 */
export const correctNonFinancialInvoice = async (invoiceId, payload = {}) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to correct the invoice.");
  }
  const cleanClientName = typeof payload.clientName === "string" ? payload.clientName.trim() : "";
  const cleanProjectName = typeof payload.projectName === "string" ? payload.projectName.trim() : "";

  if (!cleanClientName) {
    throw new Error("Client Name is required.");
  }
  if (!cleanProjectName) {
    throw new Error("Project Name is required.");
  }

  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/non-financial-correction`;
  const response = await api.patch(url, {
    clientName: cleanClientName,
    projectName: cleanProjectName,
  });
  return normalizeInvoice(unwrapData(response));
};

/**
 * POST /api/v1/invoices/{invoiceId}/financial-correction/reacquire
 * Re-acquires authoritative billing source data, rebuilds billing snapshot,
 * recalculates tax calculation, and refreshes the REJECTED invoice.
 * No request body.
 */
export const financialCorrectionReacquire = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to re-acquire financial data.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/financial-correction/reacquire`;
  const response = await api.post(url);
  return normalizeInvoice(unwrapData(response));
};

/**
 * POST /api/v1/invoices/{invoiceId}/send
 * Sends an approved invoice to the client.
 * The backend delivery service resolves recipient email either from invoice.email
 * or falls back to invoice.clientId -> Client -> Client.email for legacy invoices.
 */
export const sendInvoiceToClient = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required to send the invoice to client.");
  }
  const url = `${AR_BASE_URL}/api/v1/invoices/${invoiceId}/send`;
  const response = await api.post(url);
  return unwrapData(response);
};

export default {
  generateInvoice,
  generateInvoiceForOccurrence,
  getInvoice,
  getInvoiceById,
  getInvoices,
  getPendingApprovalInvoices,
  getInvoiceApprovalWorkspace,
  submitInvoiceForApproval,
  approveInvoice,
  rejectInvoice,
  refreshInvoiceAfterCorrection,
  correctNonFinancialInvoice,
  financialCorrectionReacquire,
  sendInvoiceToClient,
  getInvoiceApprovalHistory,
  getInvoiceErrorMessage,
  normalizeInvoice,
};



