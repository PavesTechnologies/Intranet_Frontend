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
    if (detail.toLowerCase().includes("client") || detail.toLowerCase().includes("address")) {
      return "Client billing details are incomplete in the configuration.";
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
const normalizeInvoiceItem = (item = {}, index = 0) => {
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
    itemType: source.itemType || source.item_type || "",
    role: source.role || source.designation || "Unknown",
    workDate: toIsoDateOnly(source.workDate || source.work_date || source.date) || "",
    quantity:
      source.quantity !== undefined && source.quantity !== null
        ? Number(source.quantity)
        : source.hours !== undefined && source.hours !== null
        ? Number(source.hours)
        : 0,
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
const normalizeTaxComponent = (component = {}, index = 0) => {
  const source = component && typeof component === "object" ? component : {};
  return {
    id:
      source.taxCalculationComponentId ||
      source.tax_calculation_component_id ||
      source.id ||
      `${source.taxTypeCode || source.taxComponent || "tax"}-${index}`,
    taxComponent:
      source.taxComponent ||
      source.taxTypeName ||
      source.taxTypeCode ||
      source.name ||
      "Tax Component",
    taxTypeCode: source.taxTypeCode || source.tax_type_code || "",
    applicability:
      source.applicability ||
      source.applicabilityType ||
      source.applicability_type ||
      "Not specified",
    rate:
      source.appliedRate !== undefined && source.appliedRate !== null
        ? Number(source.appliedRate)
        : source.rate !== undefined && source.rate !== null
        ? Number(source.rate)
        : null,
    amount:
      source.taxAmount !== undefined && source.taxAmount !== null
        ? Number(source.taxAmount)
        : source.amount !== undefined && source.amount !== null
        ? Number(source.amount)
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

  // Handles payload wrapped in { invoice: { ... } } or raw invoice object
  const data = payload.invoice && typeof payload.invoice === "object" ? payload.invoice : payload;

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
    : Array.isArray(data.components)
    ? data.components
    : Array.isArray(data.taxes)
    ? data.taxes
    : [];

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

  return {
    invoiceId: data.invoiceId || data.invoice_id || data.id || "",
    invoiceNumber: data.invoiceNumber || data.invoice_number || "—",
    invoiceStatus: data.invoiceStatus || data.status || "GENERATED",
    invoiceDate: toIsoDateOnly(data.invoiceDate || data.invoice_date || data.issueDate || data.createdAt) || "",
    dueDate: toIsoDateOnly(data.dueDate || data.due_date) || "",

    // Billing snapshot link
    billingSnapshotId: data.billingSnapshotId || data.billing_snapshot_id || data.snapshotId || "",
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
    clientName: data.clientName || data.client_name || data.client || null,
    billingAddress: formattedAddress,
    gstin: data.gstin || data.gstNumber || data.taxId || data.tax_id || null,
    contact: data.contact || data.contactPerson || data.contactEmail || data.contactPhone || null,

    // Invoice Context
    projectName: data.projectName || data.project_name || data.project || "",
    projectCode: data.projectCode || data.project_code || "",
    billingPeriod: displayPeriod,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    currency: data.currency || data.currencyCode || "USD",
    paymentTerms: data.paymentTerms || data.payment_terms || "Net 30",

    // Items & Tax Breakdown
    items: rawItems.map(normalizeInvoiceItem),
    taxBreakdown: rawTaxComponents.map(normalizeTaxComponent),

    // Financial Totals (Strictly backend authoritative)
    subtotal:
      data.subtotal !== undefined && data.subtotal !== null
        ? Number(data.subtotal)
        : data.taxableAmount !== undefined && data.taxableAmount !== null
        ? Number(data.taxableAmount)
        : 0,
    totalTax:
      data.totalTax !== undefined && data.totalTax !== null
        ? Number(data.totalTax)
        : data.totalTaxAmount !== undefined && data.totalTaxAmount !== null
        ? Number(data.totalTaxAmount)
        : 0,
    grandTotal:
      data.grandTotal !== undefined && data.grandTotal !== null
        ? Number(data.grandTotal)
        : data.totalAmount !== undefined && data.totalAmount !== null
        ? Number(data.totalAmount)
        : 0,
  };
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
    clientName: source.clientName || "—",
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
      // If 404, rawId might be an invoiceId instead of billingSnapshotId; proceed to resolve
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
          (i.invoiceNumber && i.invoiceNumber.toLowerCase() === rawId.toLowerCase()) ||
          (i.snapshotNumber && i.snapshotNumber.toLowerCase() === rawId.toLowerCase())
      );
      if (matched?.billingSnapshotId) {
        targetSnapshotId = matched.billingSnapshotId;
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

  const notFoundErr = new Error("Invoice could not be found for the provided identifier.");
  notFoundErr.response = { status: 404, data: { message: "Invoice could not be found." } };
  throw notFoundErr;
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

export default {
  generateInvoice,
  getInvoice,
  getInvoices,
  getPendingApprovalInvoices,
  getInvoiceApprovalWorkspace,
  submitInvoiceForApproval,
  approveInvoice,
  getInvoiceApprovalHistory,
  getInvoiceErrorMessage,
  normalizeInvoice,
};


