// src/pages/accounts-payable/vendor/config/vendorCountryConfig.js
import { Country } from "country-state-city";

/**
 * Country-driven vendor onboarding config. The India flow (GSTIN/PAN) stays
 * hardcoded in VendorOnboardingPage/VendorForm exactly as it was; everything
 * else (Brazil/US/UK/Other) is config-driven from here so new countries can
 * be added without touching the shared form components.
 */
export const COUNTRY_KIND = {
  INDIA: "INDIA",
  BRAZIL: "BRAZIL",
  US: "US",
  UK: "UK",
  OTHER: "OTHER",
};

const COUNTRY_NAME_TO_KIND = [
  { kind: COUNTRY_KIND.INDIA, names: ["india"] },
  { kind: COUNTRY_KIND.BRAZIL, names: ["brazil"] },
  { kind: COUNTRY_KIND.US, names: ["united states", "united states of america", "usa", "u.s.a", "u.s."] },
  { kind: COUNTRY_KIND.UK, names: ["united kingdom", "uk", "great britain"] },
];

export const getCountryLabel = (countryOptions = [], countryId) => {
  if (!countryId && countryId !== 0) return "";
  return countryOptions.find((c) => String(c.value) === String(countryId))?.label || "";
};

/**
 * Classifies the selected country into a config bucket.
 * Returns null when no country is selected yet, so callers can keep
 * showing the original (India-first) UI until the user picks one.
 */
export const getCountryKind = (countryOptions = [], countryId) => {
  const label = getCountryLabel(countryOptions, countryId).trim().toLowerCase();
  if (!label) return null;

  const found = COUNTRY_NAME_TO_KIND.find(({ names }) => names.includes(label));
  return found ? found.kind : COUNTRY_KIND.OTHER;
};

const ISO_CODE_BY_KIND = {
  [COUNTRY_KIND.BRAZIL]: "BR",
  [COUNTRY_KIND.US]: "US",
  [COUNTRY_KIND.UK]: "GB",
};

/** Best-effort ISO lookup for the generic "Other" bucket, used to drive State/City selects. */
export const getIsoCodeForCountryLabel = (label) => {
  if (!label) return undefined;
  const normalized = label.trim().toLowerCase();
  return Country.getAllCountries().find((c) => c.name.toLowerCase() === normalized)?.isoCode;
};

export const getIsoCodeForKind = (kind, countryLabel) =>
  ISO_CODE_BY_KIND[kind] || getIsoCodeForCountryLabel(countryLabel);

const CURRENCY_CODE_BY_KIND = {
  [COUNTRY_KIND.BRAZIL]: "BRL",
  [COUNTRY_KIND.US]: "USD",
  [COUNTRY_KIND.UK]: "GBP",
};

/** Looks up the AP currency lookup's numeric id for a country's default currency code. */
export const findCurrencyIdByKind = (currencyOptions = [], kind) => {
  const code = CURRENCY_CODE_BY_KIND[kind];
  if (!code) return undefined;
  return currencyOptions.find((c) => c.label?.toUpperCase().startsWith(code))?.value;
};

export const BRAZIL_MOCK_DATA = {
  name: "Central Real Estate",
  tax_id: "",
  contact: "",
  postal_code: "01310-100",
  number: "1500",
  street: "Paulista Avenue",
  complement: "Set 82",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
};

export const EMPTY_BRAZIL_FIELDS = {
  cpf_cnpj: "",
  contact: "",
  postal_code: "",
  number: "",
  street: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export const EMPTY_US_FIELDS = {
  ein: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
};

export const EMPTY_UK_FIELDS = {
  vat_number: "",
  company_registration_number: "",
  address: "",
  city: "",
  region: "",
  postcode: "",
};

export const EMPTY_OTHER_FIELDS = {
  tax_registration_type: "",
  tax_registration_number: "",
  address: "",
  city: "",
  state_province: "",
  postal_code: "",
};

export const EMPTY_COUNTRY_FIELDS_BY_KIND = {
  [COUNTRY_KIND.BRAZIL]: EMPTY_BRAZIL_FIELDS,
  [COUNTRY_KIND.US]: EMPTY_US_FIELDS,
  [COUNTRY_KIND.UK]: EMPTY_UK_FIELDS,
  [COUNTRY_KIND.OTHER]: EMPTY_OTHER_FIELDS,
};

// Field metadata for the config-driven country-specific grid. `type: "state"`
// and `type: "city"` render a country-state-city-backed select instead of a
// plain text input (city select depends on whichever field has type "state").
export const BRAZIL_FIELD_META = [
  { name: "postal_code", label: "CEP / Zip Code", required: true, type: "text" },
  { name: "number", label: "Number", required: true, type: "text" },
  { name: "street", label: "Logradouro", required: true, type: "text", fullWidth: true },
  { name: "complement", label: "Complement", required: false, type: "text" },
  { name: "neighborhood", label: "Neighborhood / Bairro", required: true, type: "text" },
  { name: "city", label: "City", required: true, type: "city" },
  { name: "state", label: "UF", required: true, type: "state" },
];

export const US_FIELD_META = [
  { name: "ein", label: "EIN", required: false, type: "text" },
  { name: "address", label: "Address", required: false, type: "text", fullWidth: true },
  { name: "city", label: "City", required: false, type: "text" },
  { name: "state", label: "State", required: false, type: "state" },
  { name: "zip_code", label: "ZIP Code", required: false, type: "text" },
];

export const UK_FIELD_META = [
  { name: "vat_number", label: "VAT Number", required: false, type: "text" },
  { name: "company_registration_number", label: "Company Registration Number", required: false, type: "text" },
  { name: "address", label: "Address", required: false, type: "text", fullWidth: true },
  { name: "city", label: "City", required: false, type: "text" },
  { name: "region", label: "Region", required: false, type: "state" },
  { name: "postcode", label: "Postcode", required: false, type: "text" },
];

export const OTHER_FIELD_META = [
  { name: "tax_registration_type", label: "Tax Registration Type", required: false, type: "text" },
  { name: "tax_registration_number", label: "Tax Registration Number", required: false, type: "text" },
  { name: "address", label: "Address", required: false, type: "text", fullWidth: true },
  { name: "city", label: "City", required: false, type: "city" },
  { name: "state_province", label: "State / Province", required: false, type: "state" },
  { name: "postal_code", label: "Postal Code", required: false, type: "text" },
];

export const FIELD_META_BY_KIND = {
  [COUNTRY_KIND.BRAZIL]: BRAZIL_FIELD_META,
  [COUNTRY_KIND.US]: US_FIELD_META,
  [COUNTRY_KIND.UK]: UK_FIELD_META,
  [COUNTRY_KIND.OTHER]: OTHER_FIELD_META,
};

export const REQUIRED_BRAZIL_FIELDS = [
  "cpf_cnpj",
  "postal_code",
  "number",
  "street",
  "neighborhood",
  "city",
  "state",
];

/** Only Brazil has a hard field-level gate today; US/UK/Other are display-only prep configs. */
export const validateCountryFields = (kind, values = {}) => {
  if (kind !== COUNTRY_KIND.BRAZIL) return {};
  const errors = {};
  REQUIRED_BRAZIL_FIELDS.forEach((field) => {
    if (!String(values[field] || "").trim()) {
      errors[field] = "This field is required.";
    }
  });
  return errors;
};
