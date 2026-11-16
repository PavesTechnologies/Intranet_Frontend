// Invoice presentation — the single place that turns backend invoice /
// billing-occurrence data into what the invoice document shows: billing
// type, payment terms, date ranges and billing-type-specific line items.
// Used by the draft preview, the generation modal and the generated invoice
// view, so all of them render the same values.
//
// Nothing here calculates money or dates; it only selects and formats
// backend values. Missing data renders as a placeholder, never a made-up value.
import { formatCurrency, formatDisplayDate } from "./format";

export const INVOICE_BILLING_TYPES = {
  TIME_MATERIAL: "TIME_MATERIAL",
  MILESTONE_PLAN: "MILESTONE_PLAN",
  RECURRING: "RECURRING",
  FIXED_PRICE: "FIXED_PRICE",
};

export const INVOICE_BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  MILESTONE_PLAN: "Milestone Plan",
  RECURRING: "Recurring",
  FIXED_PRICE: "Fixed Price",
};

export const NOT_AVAILABLE = "Not Available";

const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";

// Backend billing type code/name ("Timesheet Based", "Milestone Based",
// "TIME_MATERIAL", "Time & Material", "Subscription", ...) -> canonical code.
// Same synonyms billingConfigurationService's normalizeBillingTypeValue uses.
export function normalizeInvoiceBillingType(value) {
  if (isBlank(value)) return null;
  const key = String(value).trim().toUpperCase().replace(/&/g, "AND").replace(/[\s-]+/g, "_");
  if (["TIME_MATERIAL", "TIME_AND_MATERIAL", "TIME_AND_MATERIALS", "TIMESHEET_BASED", "TIMESHEET", "T_AND_M", "TM"].includes(key)) {
    return INVOICE_BILLING_TYPES.TIME_MATERIAL;
  }
  if (["MILESTONE_PLAN", "MILESTONE_BASED", "MILESTONE"].includes(key)) return INVOICE_BILLING_TYPES.MILESTONE_PLAN;
  if (["RECURRING", "RECURRING_BILLING", "SUBSCRIPTION", "SUBSCRIPTION_BASED"].includes(key)) {
    return INVOICE_BILLING_TYPES.RECURRING;
  }
  if (["FIXED_PRICE", "FIXED"].includes(key)) return INVOICE_BILLING_TYPES.FIXED_PRICE;
  return null;
}

export const TIME_ENTRY_ITEM_TYPES = new Set(["TIME_ENTRY", "TIMESHEET", "TIMESHEET_ENTRY"]);

export const isExpenseLine = (it) =>
  String(it?.itemType || "").toUpperCase() === "EXPENSE" || String(it?.sourceSystem || "").toUpperCase() === "XMS";

const explicitBillingType = (record) =>
  record
    ? normalizeInvoiceBillingType(
        record.billingTypeCode ||
        record.billingType ||
        record.billingTypeName ||
        record.billingTypeLabel ||
        record.pricingModel ||
        record.billingModel ||
        record.billingScheduleType ||
        record.contractType ||
        record.scheduleType
      )
    : null;

/**
 * Authoritative billing type for an invoice, following
 * Invoice -> Billing Occurrence -> Billing Configuration -> Billing Type:
 *   1. a billing type the backend put on the invoice;
 *   2. the billing occurrence's billing type (billingTypeName);
 *   3. the occurrence's configuration link — recurringConfigurationId is a
 *      Recurring configuration; a billingConfigurationId schedule is a
 *      Milestone Plan (legacy FIXED scheduleType -> Fixed Price);
 *   4. the billing configuration/snapshot context the page was opened with;
 *   5. time & material subtotal indicators;
 *   6. backend item classification (itemType TIME_ENTRY or expenses -> T&M);
 *   7. billing snapshot identifier (Time & Material acquisition).
 * Returns null when unknown.
 */
export function resolveInvoiceBillingType({ invoice, occurrence, context } = {}) {
  const fromInvoice = explicitBillingType(invoice);
  if (fromInvoice) return fromInvoice;

  const fromOccurrence = explicitBillingType(occurrence);
  if (fromOccurrence) return fromOccurrence;

  if (occurrence) {
    const scheduleType = String(occurrence.scheduleType || "").trim().toUpperCase();
    if (occurrence.recurringConfigurationId || scheduleType.includes("RECUR") || scheduleType.includes("SUBSCRIPTION")) {
      return INVOICE_BILLING_TYPES.RECURRING;
    }
    if (scheduleType === "FIXED" || scheduleType === "FIXED_PRICE") return INVOICE_BILLING_TYPES.FIXED_PRICE;
    if (occurrence.billingConfigurationId) return INVOICE_BILLING_TYPES.MILESTONE_PLAN;
  }

  const fromContext = explicitBillingType(context);
  if (fromContext) return fromContext;

  if (
    (invoice?.timeMaterialSubtotal !== undefined && invoice?.timeMaterialSubtotal !== null) ||
    (invoice?.timeAndMaterialSubtotal !== undefined && invoice?.timeAndMaterialSubtotal !== null) ||
    (invoice?.tmSubtotal !== undefined && invoice?.tmSubtotal !== null) ||
    (context?.timeMaterialSubtotal !== undefined && context?.timeMaterialSubtotal !== null)
  ) {
    return INVOICE_BILLING_TYPES.TIME_MATERIAL;
  }

  // The backend classifies timesheet lines as itemType TIME_ENTRY — a typed
  // field on the invoice items that only T&M invoices carry.
  // In T&M invoices, items can include timesheet entries and/or reimbursable expenses.
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  if (items.length > 0) {
    const hasTimeEntry = items.some((it) => TIME_ENTRY_ITEM_TYPES.has(String(it?.itemType || "").toUpperCase()));
    const allTimeOrExpense = items.every(
      (it) => TIME_ENTRY_ITEM_TYPES.has(String(it?.itemType || "").toUpperCase()) || isExpenseLine(it)
    );
    if (hasTimeEntry || allTimeOrExpense) {
      return INVOICE_BILLING_TYPES.TIME_MATERIAL;
    }
  }

  // Billing snapshots in AR are specifically produced by Timesheet & Expense Billing Data Acquisition
  if (invoice?.billingSnapshotId || context?.billingSnapshotId) {
    return INVOICE_BILLING_TYPES.TIME_MATERIAL;
  }

  return null;
}

/**
 * Payment terms label. The backend's payment term name wins; otherwise a
 * numeric paymentTermCode ("15") is shown in the application's "Net 15"
 * form and any other code as-is. Returns null when neither is present.
 */
export function formatPaymentTerms({ paymentTermName, paymentTermCode } = {}) {
  if (!isBlank(paymentTermName)) return String(paymentTermName).trim();
  if (isBlank(paymentTermCode)) return null;
  const code = String(paymentTermCode).trim();
  return /^\d+$/.test(code) ? `Net ${code}` : code;
}

/**
 * "19 Aug 2026 – 07 Oct 2026" from two LocalDate values (arrays, ISO strings
 * or already formatted strings). A missing side shows "Not Available"; both
 * missing returns the fallback.
 */
export function formatDateRange(start, end, fallback = NOT_AVAILABLE) {
  const hasStart = !isBlank(start) && !(Array.isArray(start) && start.length === 0);
  const hasEnd = !isBlank(end) && !(Array.isArray(end) && end.length === 0);
  if (!hasStart && !hasEnd) return fallback;
  const s = hasStart ? formatDisplayDate(start) : NOT_AVAILABLE;
  const e = hasEnd ? formatDisplayDate(end) : NOT_AVAILABLE;
  return `${s} – ${e}`;
}

const formatDateOrDash = (value) => (isBlank(value) || (Array.isArray(value) && !value.length) ? "—" : formatDisplayDate(value));

const firstNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
};

const money = (value, currency) => (value === null ? "—" : formatCurrency(value, currency));

const firstText = (...values) => values.find((v) => !isBlank(v)) ?? null;

const PERCENT_FIELDS = ["paymentPercentage", "paymentPercent", "percentage", "milestonePercentage", "installmentPercentage"];
const readPercent = (...records) => {
  for (const record of records) {
    if (!record) continue;
    for (const field of PERCENT_FIELDS) {
      const num = firstNumber(record[field]);
      if (num !== null) return num;
    }
  }
  return null;
};

const formatPercent = (value) => (value === null ? "—" : `${Number(value).toFixed(2).replace(/\.?0+$/, "")}%`);

const column = (key, label, align = "left") => ({ key, label, align });

// "PERCENTAGE" / "FIXED" (backend) or "FIXED_AMOUNT" (UI) -> a short customer-facing label.
export function formatLineDiscount(discountType, discountValue, currency) {
  const value = firstNumber(discountValue);
  if (value === null || value <= 0) return null;
  return String(discountType || "").toUpperCase() === "PERCENTAGE"
    ? `${Number(value.toFixed(2))}%`
    : `${formatCurrency(value, currency)} off`;
}

function buildTimeMaterialLines(items, currency) {
  // Excluded entries (internal audit / non-billable / excluded from invoice) must not be presented as payable invoice lines
  const payableItems = items.filter(
    (it) => it.includeInInvoice !== false && it.isBillable !== false && it.excludedFromInvoice !== true
  );
  const targetItems = payableItems;
  const hasWorkDate = targetItems.some((it) => Boolean(it.workDate || it.date));
  const hasHours = targetItems.some((it) => it.hours !== undefined && it.hours !== null);
  const columns = [
    column("item", "Resource / Item"),
    column("role", "Role"),
    ...(hasWorkDate ? [column("workDate", "Work Date")] : []),
    column("quantity", hasHours ? "Hours / Qty" : "Quantity"),
    column("rate", "Rate"),
    column("amount", "Amount"),
  ];
  const rows = targetItems.map((it, idx) => {
    const expense = isExpenseLine(it);
    const quantity = firstNumber(it.hours, it.quantity);
    const rate = firstNumber(it.rate);
    // A T&M discount belongs to timesheet work only: an expense is billed at its approved amount, so none of the
    // rate/discount fields are read for it, whatever the payload carries.
    const baseRate = expense ? null : firstNumber(it.baseRate, it.standardRate);
    const discountValue = expense ? null : firstNumber(it.discountValue);
    const hasDiscount =
      !expense &&
      Boolean(
        it.discountApplied ||
          it.hasDiscount ||
          (discountValue !== null && discountValue > 0) ||
          (baseRate !== null && rate !== null && baseRate > rate)
      );

    const totalAmt = firstNumber(it.amount, it.totalAmount);
    const rateUnit = it.ratePeriod && String(it.ratePeriod).toUpperCase() === "DAILY" ? "day" : "hour";
    const unitLabel = quantity === 1 ? rateUnit : `${rateUnit}s`;
    const formattedQty = quantity !== null ? (quantity % 1 === 0 ? String(quantity) : quantity.toFixed(2)) : null;
    const calcBreakdown =
      !expense && formattedQty !== null && rate !== null && totalAmt !== null
        ? `${formattedQty} ${unitLabel} × ${money(rate, currency)}/${rateUnit} = ${money(totalAmt, currency)}`
        : null;

    const perUnitDiscount = expense
      ? null
      : firstNumber(
          it.perUnitDiscount,
          it.discountPerUnit,
          it.unitDiscount,
          baseRate !== null && rate !== null && baseRate > rate ? baseRate - rate : null
        );

    const rawDiscountType = expense ? null : String(it.discountType || "").toUpperCase();
    const isPercentageDiscount = hasDiscount && rawDiscountType === "PERCENTAGE";
    const isFixedDiscount =
      hasDiscount &&
      (rawDiscountType === "FIXED" || rawDiscountType === "FIXED_AMOUNT" || (!isPercentageDiscount && discountValue !== null));

    return {
      id: it.id || it.invoiceItemId || `item-${idx}`,
      lineType: expense ? "EXPENSE" : "TIME",
      // An expense leads with the real XMS description (itemName stays the category for older invoices).
      item:
        (expense
          ? firstText(it.expenseDescription, it.itemName, it.description)
          : firstText(it.resourceName, it.itemName, it.employee, it.description)) || "Line Item",
      role: expense ? "—" : firstText(it.role) || "—",
      workDate: formatDateOrDash(it.workDate || it.date),
      rawWorkDate: it.workDate || it.date || "",
      quantity: quantity === null ? "—" : quantity.toFixed(2),
      rawQuantity: quantity,
      rate: money(rate, currency),
      rawRate: rate,
      standardRate: baseRate,
      baseRate,
      discountValue: expense ? null : it.discountValue,
      discountType: expense ? null : it.discountType,
      discountLabel: hasDiscount ? formatLineDiscount(it.discountType, discountValue, currency) : null,
      periodName: expense ? null : firstText(it.discountPeriodName, it.periodName),
      includeInInvoice: it.includeInInvoice,
      includeBaseRateInInvoice: it.includeBaseRateInInvoice,
      discountApplied: hasDiscount,
      amount: money(totalAmt, currency),
      rawAmount: totalAmt,
      calcBreakdown,
      perUnitDiscount,
      perUnitDiscountDisplay: perUnitDiscount !== null && perUnitDiscount > 0 ? `-${money(perUnitDiscount, currency)}` : null,
      isPercentageDiscount,
      isFixedDiscount,
      category: expense ? firstText(it.expenseCategory, it.category, it.expense_category) : null,
      // Customer-disclosable XMS details frozen on the invoice item; absent values stay null (never a placeholder).
      expenseMerchant: expense ? firstText(it.expenseMerchant) : null,
      expenseReportRef: expense ? firstText(it.expenseReportNumber) : null,
      originalAmount: expense && it.exchangeRate != null ? firstNumber(it.originalAmount) : null,
      originalCurrency: expense && it.exchangeRate != null ? firstText(it.originalCurrency) : null,
      appliedExchangeRate: expense ? firstNumber(it.exchangeRate) : null,
      approvedAmount: expense ? firstNumber(it.approvedAmount, it.approvedBillableAmount, it.rate, totalAmt) : null,
      receiptReference: expense ? firstText(it.receiptNumber, it.receiptReference, it.claimId, it.expenseReference) : null,
      raw: it,
    };
  });
  return { columns, rows };
}

// --- Occurrence-based billing (Milestone Plan / Recurring / Fixed Price) ----
// One invoice bills one occurrence. Lines come from the backend invoice items
// when they exist (amount per item); before generation there are no items,
// so the occurrence itself is the line.

function occurrenceLineSources(items, occurrence) {
  if (items.length > 0) return items.map((item) => ({ item }));
  if (occurrence) return [{ item: null }];
  return [];
}

const lineAmount = (item, occurrence, single) =>
  firstNumber(item?.amount, item?.totalAmount, single ? occurrence?.billingAmount : null, single ? occurrence?.taxableAmount : null);

function buildMilestoneLines(items, { occurrence, currency }) {
  const sources = occurrenceLineSources(items, occurrence);
  const single = sources.length === 1;
  const lines = sources.map(({ item }, idx) => {
    const sequence = firstNumber(item?.sequence, item?.sequenceNumber, single ? occurrence?.periodNumber : null);
    const percent = readPercent(item, single ? occurrence : null);
    const backendName = firstText(
      item?.milestoneName,
      item?.paymentName,
      item?.installmentName,
      single ? occurrence?.milestoneName : null,
      single ? occurrence?.paymentName : null,
      single ? occurrence?.installmentName : null
    );
    return {
      id: item?.id || `milestone-${idx}`,
      payment: backendName || (sequence !== null ? `Payment ${sequence}` : firstText(item?.itemName, item?.description) || "Payment"),
      sequence: sequence === null ? "—" : String(sequence),
      percent,
      billingDate: formatDateOrDash(firstText(item?.billingDate, single ? occurrence?.billingDate : null)),
      amount: money(lineAmount(item, occurrence, single), currency),
    };
  });

  const showSequence = lines.some((l) => l.sequence !== "—") && !lines.every((l) => l.payment === `Payment ${l.sequence}`);
  const showPercent = lines.some((l) => l.percent !== null);
  const columns = [
    column("payment", "Payment / Milestone"),
    ...(showSequence ? [column("sequence", "Sequence")] : []),
    ...(showPercent ? [column("percent", "Payment %")] : []),
    column("billingDate", "Billing Date"),
    column("amount", "Amount"),
  ];
  return { columns, rows: lines.map((l) => ({ ...l, percent: formatPercent(l.percent) })) };
}

function buildPeriodLines(items, { occurrence, invoice, currency, itemLabel, fallbackName }) {
  const sources = occurrenceLineSources(items, occurrence);
  const single = sources.length === 1;
  const periodStart = firstText(single ? occurrence?.periodStartDate : null, invoice?.billingPeriodStart);
  const periodEnd = firstText(single ? occurrence?.periodEndDate : null, invoice?.billingPeriodEnd);
  const rows = sources.map(({ item }, idx) => ({
    id: item?.id || `period-${idx}`,
    item:
      firstText(
        single ? occurrence?.productName : null,
        single ? occurrence?.recurringItemName : null,
        item?.itemName,
        item?.description
      ) || fallbackName,
    billingPeriod: formatDateRange(
      firstText(item?.periodStartDate, periodStart),
      firstText(item?.periodEndDate, periodEnd),
      "—"
    ),
    billingDate: formatDateOrDash(firstText(item?.billingDate, single ? occurrence?.billingDate : null)),
    amount: money(lineAmount(item, occurrence, single), currency),
  }));
  const columns = [
    column("item", itemLabel),
    column("billingPeriod", "Billing Period"),
    column("billingDate", "Billing Date"),
    column("amount", "Amount"),
  ];
  return { columns, rows };
}

// --- Unknown billing type: the previous generic layout, unchanged ----------

function buildGenericLines(items, currency) {
  const hasRole = items.some((it) => !isBlank(it.role));
  const hasWorkDate = items.some((it) => Boolean(it.workDate || it.date));
  const hasHours = items.some((it) => it.hours !== undefined && it.hours !== null);
  const columns = [
    column("item", hasRole ? "Resource / Item" : "Description / Item"),
    ...(hasRole ? [column("role", "Role")] : []),
    ...(hasWorkDate ? [column("workDate", "Work Date")] : []),
    column("quantity", hasHours ? "Hours / Qty" : "Quantity"),
    column("rate", "Rate"),
    column("amount", "Amount"),
  ];
  const rows = items.map((it, idx) => {
    const quantity = firstNumber(it.hours, it.quantity);
    return {
      id: it.id || `item-${idx}`,
      item: firstText(it.itemName, it.resourceName, it.description, it.employee) || "Line Item",
      role: firstText(it.role) || "—",
      workDate: formatDateOrDash(it.workDate || it.date),
      quantity: quantity === null ? "—" : quantity.toFixed(2),
      rate: money(firstNumber(it.rate), currency),
      amount: money(firstNumber(it.amount, it.totalAmount) ?? 0, currency),
    };
  });
  return { columns, rows };
}

/**
 * Billing-type-specific invoice line items.
 * Returns { billingType, columns: [{ key, label, align }], rows: [{ id, [key]: displayValue }] }.
 */
export function buildInvoiceLineItems(arg1 = {}, arg2, arg3) {
  let billingType, items, occurrence, invoice, currency;
  if (typeof arg1 === "string") {
    billingType = arg1;
    items = arg2;
    currency = arg3;
  } else {
    ({ billingType, items, occurrence, invoice, currency } = arg1 || {});
  }
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  let result;
  switch (billingType) {
    case INVOICE_BILLING_TYPES.TIME_MATERIAL:
      result = buildTimeMaterialLines(list, currency);
      break;
    case INVOICE_BILLING_TYPES.MILESTONE_PLAN:
      result = buildMilestoneLines(list, { occurrence, currency });
      break;
    case INVOICE_BILLING_TYPES.RECURRING:
      result = buildPeriodLines(list, {
        occurrence,
        invoice,
        currency,
        itemLabel: "Recurring Item",
        fallbackName: "Recurring Billing",
      });
      break;
    case INVOICE_BILLING_TYPES.FIXED_PRICE:
      result = buildPeriodLines(list, {
        occurrence,
        invoice,
        currency,
        itemLabel: "Description",
        fallbackName: "Fixed Price Billing",
      });
      break;
    default:
      result = buildGenericLines(list, currency);
  }
  return { billingType: billingType || null, ...result };
}
