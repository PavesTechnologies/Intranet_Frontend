// Fields a selected cash advance fills in on a new expense report. Anything the employee types is left alone.
export const ADVANCE_PREFILL_FIELDS = ["title", "businessPurpose", "costCenterId", "currencyId", "tripStartDate", "tripEndDate"];

const sameId = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

/** The values a cash advance gives the report. Missing expected trip dates stay empty, for manual entry. */
export const buildAdvancePrefill = (advance, { costCenters = [], currencies = [] } = {}) => {
  if (!advance) return {};
  const costCenter = costCenters.find((c) => sameId(c.costCenterId, advance.costCenterId));
  const currency = currencies.find((c) => sameId(c.currencyId, advance.currencyId));
  return {
    title: advance.title || "",
    businessPurpose: advance.purpose || advance.title || "",
    costCenterId: costCenter ? costCenter.costCenterId : "",
    currencyId: currency ? currency.currencyId : "",
    tripStartDate: advance.expectedTripStartDate || "",
    tripEndDate: advance.expectedTripEndDate || "",
  };
};

/**
 * The form after the linked advance changes. A field is refreshed when it is empty or still holds the value the advance
 * put there last time, so switching advances never leaves a stale value behind. A field the employee has edited is kept.
 * Clearing the advance clears the values it had filled. Returns the new form and the values this change filled in.
 */
export const nextAdvanceSelection = ({ form, previousAuto = {}, advance, costCenters = [], currencies = [] }) => {
  const prefill = buildAdvancePrefill(advance, { costCenters, currencies });
  const next = { ...form };
  const autoFilled = {};
  ADVANCE_PREFILL_FIELDS.forEach((field) => {
    const current = form[field];
    const isEmpty = current === "" || current == null;
    const isOurs = previousAuto[field] !== undefined && current === previousAuto[field];
    if (!isEmpty && !isOurs) return;
    const value = prefill[field] || "";
    next[field] = value;
    if (value !== "") autoFilled[field] = value;
  });
  next.cashAdvanceId = advance ? advance.advanceId : "";
  return { form: next, autoFilled };
};
