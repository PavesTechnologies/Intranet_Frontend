/**
 * NOT USED AT RUNTIME ANYMORE. TDS Configuration now calls the real /apm/tds/config/* API (see
 * services/tdsConfigService.js, services/tdsConfigMapper.js, hooks/useTdsConfig.js) — every
 * component that used to import from this file (TdsRulesSection/TdsPaymentNatureSection/
 * TdsDeductorSection/TdsConfigurationTab) has been rewired. Kept only for reference — e.g. the
 * shape of a realistic multi-variant rule set — per instruction not to delete it immediately.
 * Safe to delete once no longer useful as a reference.
 *
 * These figures (rates/thresholds) are illustrative examples matching the shape described in the
 * Finance team's sample sheet — NOT verified current Income-tax Act figures.
 */

/**
 * TDS Rule master — the actual rate/threshold/variant records.
 * Intended backend contract:
 *   GET    /tds/rule                 -> TdsRule[]
 *   POST   /tds/rule                  <- { code, oldSection, newSection, paymentNatureCode,
 *                                          deductor, rateCondition, rate, thresholdAmount,
 *                                          thresholdPeriod, effectiveFrom, effectiveTo, isActive }
 *   PUT    /tds/rule/{id}              <- same body as POST
 *   PATCH  /tds/rule/{id}/status       <- { isActive }
 *   DELETE /tds/rule/{id}
 *   POST   /tds/rule/import/validate  <- multipart Excel file -> { totalRows, newCount,
 *                                          updatedCount, unchangedCount, errors: [{row, field,
 *                                          message}] }
 *   POST   /tds/rule/import/commit    <- multipart Excel file (or a token from validate) -> same
 *                                          TdsRule[] shape, persisted
 * Each row is one section+variant combination — a single "section" (e.g. 194C) legitimately
 * appears as multiple rows here, one per rateCondition variant (see rateCondition below).
 */
export const TDS_RULES_MOCK = [
  {
    id: 1,
    code: "194C_IND_HUF",
    oldSection: "194C",
    newSection: "194C",
    paymentNatureCode: "CONTRACTOR",
    deductor: "Any person",
    rateCondition: "Individual/HUF",
    rate: 1,
    thresholdAmount: 30000,
    thresholdPeriod: "SINGLE_TRANSACTION",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 2,
    code: "194C_OTHER",
    oldSection: "194C",
    newSection: "194C",
    paymentNatureCode: "CONTRACTOR",
    deductor: "Any person",
    rateCondition: "Other than Individual/HUF",
    rate: 2,
    thresholdAmount: 30000,
    thresholdPeriod: "SINGLE_TRANSACTION",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 3,
    code: "194H",
    oldSection: "194H",
    newSection: "194H",
    paymentNatureCode: "COMMISSION",
    deductor: "Any person",
    rateCondition: "",
    rate: 5,
    thresholdAmount: 15000,
    thresholdPeriod: "FINANCIAL_YEAR",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 4,
    code: "194I_PLANT",
    oldSection: "194I",
    newSection: "194I",
    paymentNatureCode: "RENT",
    deductor: "Any person",
    rateCondition: "Plant and Machinery",
    rate: 2,
    thresholdAmount: 240000,
    thresholdPeriod: "FINANCIAL_YEAR",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 5,
    code: "194I_LAND",
    oldSection: "194I",
    newSection: "194I",
    paymentNatureCode: "RENT",
    deductor: "Any person",
    rateCondition: "Land and Buildings",
    rate: 10,
    thresholdAmount: 240000,
    thresholdPeriod: "FINANCIAL_YEAR",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 6,
    code: "194J_TECH",
    oldSection: "194J",
    newSection: "194J",
    paymentNatureCode: "TECHNICAL_SERVICE",
    deductor: "Any person",
    rateCondition: "Technical Services",
    rate: 2,
    thresholdAmount: 30000,
    thresholdPeriod: "SINGLE_TRANSACTION",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 7,
    code: "194J_PROF",
    oldSection: "194J",
    newSection: "194J",
    paymentNatureCode: "PROFESSIONAL_SERVICE",
    deductor: "Any person",
    rateCondition: "Professional Services",
    rate: 10,
    thresholdAmount: 30000,
    thresholdPeriod: "SINGLE_TRANSACTION",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 8,
    code: "194J_DIRECTOR",
    oldSection: "194J",
    newSection: "194J",
    paymentNatureCode: "PROFESSIONAL_SERVICE",
    deductor: "Company",
    rateCondition: "Remuneration to Directors",
    rate: 10,
    thresholdAmount: 0,
    thresholdPeriod: "SINGLE_TRANSACTION",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 9,
    code: "194J_ROYALTY",
    oldSection: "194J",
    newSection: "194J",
    paymentNatureCode: "OTHER",
    deductor: "Any person",
    rateCondition: "Royalty",
    rate: 2,
    thresholdAmount: 30000,
    thresholdPeriod: "SINGLE_TRANSACTION",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
  {
    id: 10,
    code: "194Q",
    oldSection: "194Q",
    newSection: "194Q",
    paymentNatureCode: "PURCHASE_OF_GOODS",
    deductor: "Buyer",
    rateCondition: "",
    rate: 0.1,
    thresholdAmount: 5000000,
    thresholdPeriod: "FINANCIAL_YEAR",
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    isActive: true,
  },
];

export const THRESHOLD_PERIOD_OPTIONS = [
  { value: "SINGLE_TRANSACTION", label: "Single Transaction" },
  { value: "FINANCIAL_YEAR", label: "Financial Year (Aggregate)" },
];

/**
 * TDS Nature of Payment master — configurable, not hard-coded into the rule form; seeded from
 * the same 8 codes constants/tdsPaymentNature.js already uses for the invoice-side TDS
 * determination feature (continuity only — this list is independently editable here and not
 * runtime-coupled to that file).
 * Intended backend contract:
 *   GET    /tds/payment-nature        -> TdsPaymentNature[]
 *   POST   /tds/payment-nature         <- { code, name, description, isActive }
 *   PUT    /tds/payment-nature/{id}    <- same body as POST
 *   DELETE /tds/payment-nature/{id}
 */
export const NATURE_OF_PAYMENT_MOCK = [
  { id: 1, code: "CONTRACTOR", name: "Contractor", description: "Payments to contractors/sub-contractors for work.", isActive: true },
  { id: 2, code: "PROFESSIONAL_SERVICE", name: "Professional Services", description: "Fees for professional services.", isActive: true },
  { id: 3, code: "TECHNICAL_SERVICE", name: "Technical Services", description: "Fees for technical services.", isActive: true },
  { id: 4, code: "RENT", name: "Rent", description: "Rent for land, building, plant, or machinery.", isActive: true },
  { id: 5, code: "COMMISSION", name: "Commission / Brokerage", description: "Commission or brokerage payments.", isActive: true },
  { id: 6, code: "PURCHASE_OF_GOODS", name: "Purchase of Goods", description: "Purchase of goods above the aggregate threshold.", isActive: true },
  { id: 7, code: "INTEREST", name: "Interest", description: "Interest payments other than on securities.", isActive: true },
  { id: 8, code: "OTHER", name: "Other", description: "Any nature of payment not covered above.", isActive: true },
];

/**
 * TDS Deductor master — who is responsible for deducting tax at source for a given rule.
 * Intended backend contract:
 *   GET    /tds/deductor        -> TdsDeductor[]
 *   POST   /tds/deductor         <- { name, description, isActive }
 *   PUT    /tds/deductor/{id}    <- same body as POST
 *   DELETE /tds/deductor/{id}
 */
export const DEDUCTOR_MOCK = [
  { id: 1, name: "Employer", description: "The employer deducting TDS on salary payments.", isActive: true },
  { id: 2, name: "Any person", description: "Any person responsible for making the payment.", isActive: true },
  { id: 3, name: "Specified Person", description: "A person specifically named under the relevant section.", isActive: true },
  { id: 4, name: "Buyer", description: "The buyer of goods, responsible for TDS on purchase.", isActive: true },
  { id: 5, name: "Company", description: "A company making the payment.", isActive: true },
  { id: 6, name: "Firm", description: "A partnership firm making the payment.", isActive: true },
];
