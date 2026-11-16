/**
 * Normalization helpers for the AWS Textract-backed quotation extraction response.
 *
 * Every function returns null (never undefined / NaN / misleading raw input)
 * when a value cannot be confidently normalized.
 */

const pad2 = (value) => String(value).padStart(2, "0");

function isValidDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!y || y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // Prevent JavaScript Date from silently normalizing invalid dates
  // such as February 30.
  const roundTrip = new Date(Date.UTC(y, m - 1, d));

  return (
    roundTrip.getUTCFullYear() === y &&
    roundTrip.getUTCMonth() === m - 1 &&
    roundTrip.getUTCDate() === d
  );
}

/**
 * Normalizes an extracted date string to YYYY-MM-DD
 * for a native <input type="date">.
 *
 * Supported formats:
 * - YYYY-MM-DD
 * - YYYY/MM/DD
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * - MM/DD/YYYY when the first segment is <= 12
 *
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeExtractedDate(value) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();

  if (!raw) return null;

  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoMatch) {
    const [, y, m, d] = isoMatch;

    return isValidDateParts(y, m, d)
      ? `${y}-${pad2(m)}-${pad2(d)}`
      : null;
  }

  // YYYY/MM/DD
  const slashIsoMatch = raw.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
  );

  if (slashIsoMatch) {
    const [, y, m, d] = slashIsoMatch;

    return isValidDateParts(y, m, d)
      ? `${y}-${pad2(m)}-${pad2(d)}`
      : null;
  }

  // DD/MM/YYYY, DD-MM-YYYY or MM/DD/YYYY
  const dayFirstMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (dayFirstMatch) {
    const [, first, second, y] = dayFirstMatch;

    const firstNum = Number(first);
    const secondNum = Number(second);

    /**
     * If the first segment is greater than 12,
     * it cannot be a month.
     *
     * Example:
     * 13/05/2026 -> 2026-05-13
     */
    const monthFirst =
      firstNum > 12 && secondNum <= 12;

    const [m, d] = monthFirst
      ? [second, first]
      : [first, second];

    return isValidDateParts(y, m, d)
      ? `${y}-${pad2(m)}-${pad2(d)}`
      : null;
  }

  return null;
}

/**
 * Normalizes an extracted amount to a non-negative finite number.
 *
 * Examples:
 * "$1,234.50" -> 1234.5
 * "₹436,600.00" -> 436600
 *
 * @param {number|string|null|undefined} value
 * @returns {number|null}
 */
export function normalizeExtractedAmount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0
      ? value
      : null;
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, "");

  if (!cleaned) return null;

  const num = Number(cleaned);

  return Number.isFinite(num) && num >= 0
    ? num
    : null;
}

/**
 * Normalizes extracted delivery days to a non-negative integer.
 *
 * Examples:
 * "15 days" -> 15
 * "Within 15 working days" -> 15
 *
 * @param {number|string|null|undefined} value
 * @returns {number|null}
 */
export function normalizeExtractedDeliveryDays(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9]/g, ""));

  return Number.isInteger(num) && num >= 0
    ? num
    : null;
}

/**
 * Normalizes an extracted free-text value.
 *
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeExtractedText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed || null;
}

/**
 * Normalizes a vendor ID returned by the backend.
 *
 * @param {number|string|null|undefined} value
 * @returns {number|null}
 */
export function normalizeExtractedVendorId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

/**
 * Builds a partial QuotationFormModal form patch from the
 * quotation extraction response.
 *
 * Expected backend data:
 *
 * {
 *   vendor_id: 123,
 *   vendor_name: "Amazon Web Services India Pvt Ltd",
 *   vendor_match_confidence: 90,
 *   quotation_number: "QT-2026-0142",
 *   quotation_date: "02-Sep-2026",
 *   valid_until: "30-Sep-2026",
 *   total_amount: 436600,
 *   delivery_days: 15,
 *   payment_terms: "30 days from invoice date"
 * }
 *
 * Vendor matching itself is NOT performed here.
 * The backend matcher resolves the extracted vendor name
 * against Vendor Master and returns vendor_id.
 *
 * @param {Object|null|undefined} data
 * @returns {{
 *   vendorId?: number,
 *   vendorName?: string,
 *   quotationNumber?: string,
 *   quotationDate?: string,
 *   validUntil?: string,
 *   totalAmount?: string,
 *   deliveryDays?: string,
 *   paymentTerms?: string
 * }}
 */
export function buildQuotationFormPatch(data) {
  const patch = {};

  if (!data) return patch;

  // ---------------------------------------------------------
  // Vendor
  // ---------------------------------------------------------

  const vendorId = normalizeExtractedVendorId(data.vendor_id);

  if (vendorId !== null) {
    patch.vendorId = vendorId;
  }

  const vendorName = normalizeExtractedText(data.vendor_name);

  if (vendorName) {
    patch.vendorName = vendorName;
  }

  // ---------------------------------------------------------
  // Quotation Number
  // ---------------------------------------------------------

  const quotationNumber = normalizeExtractedText(
    data.quotation_number
  );

  if (quotationNumber) {
    patch.quotationNumber = quotationNumber;
  }

  // ---------------------------------------------------------
  // Quotation Date
  // ---------------------------------------------------------

  const quotationDate = normalizeExtractedDate(
    data.quotation_date
  );

  if (quotationDate) {
    patch.quotationDate = quotationDate;
  }

  // ---------------------------------------------------------
  // Valid Until
  // ---------------------------------------------------------

  const validUntil = normalizeExtractedDate(
    data.valid_until
  );

  if (validUntil) {
    patch.validUntil = validUntil;
  }

  // ---------------------------------------------------------
  // Total Amount
  // ---------------------------------------------------------

  const totalAmount = normalizeExtractedAmount(
    data.total_amount
  );

  if (totalAmount !== null) {
    patch.totalAmount = String(totalAmount);
  }

  // ---------------------------------------------------------
  // Delivery Days
  // ---------------------------------------------------------

  const deliveryDays = normalizeExtractedDeliveryDays(
    data.delivery_days
  );

  if (deliveryDays !== null) {
    patch.deliveryDays = String(deliveryDays);
  }

  // ---------------------------------------------------------
  // Payment Terms
  // ---------------------------------------------------------

  const paymentTerms = normalizeExtractedText(
    data.payment_terms
  );

  if (paymentTerms) {
    patch.paymentTerms = paymentTerms;
  }

  return patch;
}