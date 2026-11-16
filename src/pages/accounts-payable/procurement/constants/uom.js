/**
 * UOM options for a purchase requisition line now come from the backend master
 * (GET /apm/master/uoms, via useUoms in accounts-payable/hooks/useApLookups.js) — this file only
 * holds the "Custom UOM" sentinel and the quantity-validation rule, which no longer looks up a
 * hardcoded UOM->allowDecimal map: the caller passes the allowDecimal flag straight from the
 * selected backend row (or `true` for Custom UOM, which the backend also always treats as
 * decimal-allowed — see Backend/Business_Layer/services/procurement_service.py `_build_line`).
 */
export const CUSTOM_UOM_VALUE = "__CUSTOM__";

export const QUANTITY_MESSAGES = {
  required: "Quantity is required.",
  invalid: "Please enter a valid quantity.",
  nonPositive: "Quantity must be greater than zero.",
  wholeNumber: "Quantity must be a whole number for this unit of measure.",
};

/**
 * Validates a PR line quantity. Never rounds or coerces the value — an invalid combination
 * (e.g. "2.5" with a whole-number UOM) is always rejected rather than silently converted, so the
 * caller must block submission on a non-null message.
 * @param {string} quantity raw form input value (string, possibly empty)
 * @param {boolean} allowDecimal whether the selected UOM (or Custom UOM) permits a decimal quantity
 * @returns {string|null} an error message, or null when the quantity is valid
 */
export function validateQuantityForUom(quantity, allowDecimal) {
  if (quantity === "" || quantity === null || quantity === undefined) {
    return QUANTITY_MESSAGES.required;
  }
  const value = Number(quantity);
  if (!Number.isFinite(value)) {
    return QUANTITY_MESSAGES.invalid;
  }
  if (value <= 0) {
    return QUANTITY_MESSAGES.nonPositive;
  }
  if (!allowDecimal && !Number.isInteger(value)) {
    return QUANTITY_MESSAGES.wholeNumber;
  }
  return null;
}
