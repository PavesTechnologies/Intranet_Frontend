/**
 * Maps between the frontend's camelCase TDS Configuration model (Rules/Nature of Payment/
 * Deductor) and the backend's TDS Configuration API (/apm/tds/config/*).
 *
 * IMPORTANT — provisional field mapping: the exact backend response shape has not been verified
 * against a live call yet (see the request relayed to the backend-connected session). Every
 * `raw.x ?? raw.y` fallback chain below is a defensive guess at plausible field-name variants,
 * NOT a confirmed contract. Once real responses are available, delete whichever branch of each
 * fallback chain didn't match and remove this notice. Do not treat this file as verified.
 */

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBooleanActive(raw) {
  // Status representation is unconfirmed — could be a boolean is_active, or a string status
  // ("ACTIVE"/"INACTIVE"). Handle both until confirmed.
  if (typeof raw.is_active === "boolean") return raw.is_active;
  if (typeof raw.status === "boolean") return raw.status;
  if (typeof raw.status === "string") return raw.status.toUpperCase() === "ACTIVE";
  return true;
}

/**
 * TDS Rule: raw API record -> frontend model. paymentNatureCode/deductorId are resolved from
 * whichever shape the backend actually returns (nested object vs. flat id/code fields) — see the
 * file header note. rateCondition is kept as the raw backend string (e.g.
 * "ENTITY_TYPE IN INDIVIDUAL,HUF") — TdsRateConditionEditor.js parses/builds this format.
 */
export function mapRuleFromApi(raw = {}) {
  const paymentNature = raw.payment_nature ?? raw.paymentNature ?? null;
  const deductor = raw.deductor ?? null;

  return {
    id: raw.id ?? raw.rule_id,
    code: raw.code ?? "",
    oldSection: raw.old_section ?? raw.oldSection ?? "",
    newSection: raw.new_section ?? raw.newSection ?? "",
    paymentNatureCode: paymentNature?.code ?? raw.payment_nature_code ?? raw.payment_nature ?? "",
    paymentNatureName: paymentNature?.name ?? raw.payment_nature_name ?? null,
    deductorId: deductor?.id ?? raw.deductor_id ?? null,
    deductorName: deductor?.name ?? raw.deductor_name ?? "",
    rateCondition: raw.rate_condition ?? raw.rateCondition ?? "",
    // The request body field is "rate" (never "rate_percent" — see spec section 17), but the
    // response may use "rate_percent" for display; read either so a display-only naming
    // difference between request/response doesn't show a blank rate in the table.
    rate: toNumberOrNull(raw.rate ?? raw.rate_percent) ?? 0,
    thresholdAmount: toNumberOrNull(raw.threshold_amount) ?? 0,
    thresholdPeriod: raw.threshold_period ?? raw.thresholdPeriod ?? "",
    effectiveFrom: raw.effective_from ?? raw.effectiveFrom ?? "",
    effectiveTo: raw.effective_to ?? raw.effectiveTo ?? "",
    isActive: toBooleanActive(raw),
    // Kept as-is for any field the mapper doesn't yet know about, so nothing is silently
    // dropped while the contract is still being confirmed.
    _raw: raw,
  };
}

/** Frontend rule form -> backend TDS Rule create/update payload. */
export function mapRuleToApi(form) {
  return {
    code: form.code,
    old_section: form.oldSection || null,
    new_section: form.newSection || null,
    payment_nature_code: form.paymentNatureCode,
    deductor_id: form.deductorId ?? null,
    rate_condition: form.rateCondition || null,
    rate: Number(form.rate),
    threshold_amount: form.thresholdAmount === "" ? 0 : Number(form.thresholdAmount),
    threshold_period: form.thresholdPeriod,
    effective_from: form.effectiveFrom,
    effective_to: form.effectiveTo || null,
  };
}

export function mapPaymentNatureFromApi(raw = {}) {
  return {
    id: raw.id,
    code: raw.code ?? "",
    name: raw.name ?? "",
    description: raw.description ?? "",
    isActive: toBooleanActive(raw),
  };
}

export function mapPaymentNatureToApi(form) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
  };
}

export function mapDeductorFromApi(raw = {}) {
  return {
    id: raw.id,
    name: raw.name ?? "",
    description: raw.description ?? "",
    isActive: toBooleanActive(raw),
  };
}

export function mapDeductorToApi(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
  };
}
