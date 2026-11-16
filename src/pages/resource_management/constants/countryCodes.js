// Comprehensive country / territory calling-code dataset for the Client
// "Country Code" field. Built at module-load time from two libraries the
// project already depends on (no new dependency introduced):
//   - libphonenumber-js: authoritative list of ISO codes + calling codes
//   - countries-and-timezones: ISO code -> country display name
// Flags are rendered as Unicode regional-indicator emoji derived from the
// ISO alpha-2 code, so no flag image assets/library are required.
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import ct from "countries-and-timezones";

// A handful of ISO codes libphonenumber-js supports that
// countries-and-timezones has no display name for.
const NAME_OVERRIDES = {
  AC: "Ascension Island",
  TA: "Tristan da Cunha",
  XK: "Kosovo",
};

// Common colloquial abbreviations that don't appear as a substring of the
// country's full official name, so search needs an explicit alias.
const SEARCH_ALIASES = {
  USA: "US",
  UK: "GB",
  UAE: "AE",
};

const isoToFlagEmoji = (isoCode) =>
  isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

// Every ISO territory with a calling code, keyed uniquely by ISO alpha-2
// `code` (NOT by dialCode - many territories share a calling code, e.g.
// US/CA both use +1, so dialCode alone can never be a unique identifier).
export const COUNTRIES = getCountries()
  .map((isoCode) => ({
    name:
      NAME_OVERRIDES[isoCode] || ct.getCountry(isoCode)?.name || isoCode,
    code: isoCode,
    dialCode: `+${getCountryCallingCode(isoCode)}`,
    flag: isoToFlagEmoji(isoCode),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ISO alpha-2 code is always unique -> safe direct lookup.
export const getCountryByCode = (isoCode) => {
  if (!isoCode) return null;
  const upper = String(isoCode).trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === upper) || null;
};

// A dial code (e.g. "+1") can match several countries/territories.
export const getCountriesByDialCode = (dialCode) => {
  const code = extractDialCode(dialCode);
  if (!code) return [];
  return COUNTRIES.filter((c) => c.dialCode === code);
};

// A handful of calling codes are shared by one clear, widely-recognized
// primary nation plus a few small dependent territories (e.g. +44 is the
// UK's code, but Guernsey/Isle of Man/Jersey also use it). For those we
// resolve to the primary nation. Codes shared between co-equal sovereign
// nations with no obvious "main" one (+1: USA/Canada, +7: Russia/
// Kazakhstan, +590/+599/+262: equally-ranked overseas territories) are
// deliberately left out - those must stay ambiguous rather than guessed.
const PRIMARY_COUNTRY_FOR_DIAL_CODE = {
  "+61": "AU", // vs Christmas Island (CX), Cocos Islands (CC)
  "+358": "FI", // vs the Åland Islands (AX)
  "+212": "MA", // vs Western Sahara (EH)
  "+44": "GB", // vs Guernsey (GG), Isle of Man (IM), Jersey (JE)
  "+39": "IT", // vs Vatican City (VA)
  "+47": "NO", // vs Svalbard and Jan Mayen (SJ)
  "+290": "SH", // vs Tristan da Cunha (TA)
};

// Resolves a bare dial code to a single country when it is unambiguous,
// or to its designated primary nation (see above). Returns null for
// codes with no safe resolution - callers must not guess/invent a
// country for a shared code like "+1".
export const findCountryForDialCode = (dialCode) => {
  const code = extractDialCode(dialCode);
  if (!code) return null;
  const matches = getCountriesByDialCode(code);
  if (matches.length === 1) return matches[0];
  const primaryIso = PRIMARY_COUNTRY_FOR_DIAL_CODE[code];
  return primaryIso ? getCountryByCode(primaryIso) : null;
};

// Normalizes a value that may be a country object, a bare dial code
// string ("+91"), or a legacy "+91 India"-style label down to the bare
// leading "+<digits>" dial code. Returns "" for anything else.
export const extractDialCode = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value.dialCode) return value.dialCode;
  const match = String(value).match(/^\+\d+/);
  return match ? match[0] : "";
};

export const formatCountryLabel = (country) =>
  country ? `${country.flag} ${country.name} (${country.dialCode})` : "";

// Case-insensitive search across country name, ISO code, and calling
// code - matches "India", "US", "USA", "United", "+91", and "91".
export const searchCountries = (term) => {
  const query = String(term || "").trim();
  if (!query) return COUNTRIES;

  // Explicit dial-code search, e.g. "+91" -> match on the leading digits
  // of the calling code (not a loose "contains" - "+91" must not also
  // surface "+591", "+291", etc).
  if (query.startsWith("+")) {
    return COUNTRIES.filter((country) => country.dialCode.startsWith(query));
  }

  // Bare digits, e.g. "91" -> same prefix match against the numeric part.
  if (/^\d+$/.test(query)) {
    return COUNTRIES.filter((country) =>
      country.dialCode.slice(1).startsWith(query),
    );
  }

  const lowerQuery = query.toLowerCase();
  const aliasIso = SEARCH_ALIASES[query.toUpperCase()];
  const aliasCountry = aliasIso ? getCountryByCode(aliasIso) : null;

  // Very short alphabetic queries are treated as ISO-code lookups rather
  // than name substrings - otherwise "US" would also match every country
  // whose name merely contains "us" (Australia, Russia, Mauritius, ...).
  if (query.length <= 2) {
    return COUNTRIES.filter(
      (country) =>
        country.code.toLowerCase() === lowerQuery || country === aliasCountry,
    );
  }

  return COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(lowerQuery) ||
      country.code.toLowerCase() === lowerQuery ||
      country === aliasCountry,
  );
};
