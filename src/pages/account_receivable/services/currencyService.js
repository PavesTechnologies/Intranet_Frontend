import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL || "http://localhost:8080";
const CURRENCY_URL = `${BASE_URL}/api/currency`;

const unwrapData = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.content)) return payload.content;
  }
  return payload?.data ?? payload ?? null;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.content)) return value.content;
  }
  return [];
};

export const normalizeCurrency = (item = {}) => {
  if (!item || typeof item !== "object") return null;
  const id = item.currencyId || item.id || "";
  const code = String(item.currencyCode || item.code || "").trim().toUpperCase();
  if (!code) return null;
  const name = String(item.currencyName || item.name || code).trim();
  const symbol = String(item.currencySymbol || item.symbol || "").trim();
  const isActive = Boolean(item.isActive ?? true);

  return {
    ...item,
    id,
    currencyId: id,
    currencyCode: code,
    currencyName: name,
    currencySymbol: symbol,
    description: item.description || "",
    isActive,
    status: isActive ? "ACTIVE" : "INACTIVE",
    value: code,
    label: `${code}${name && name !== code ? ` - ${name}` : ""}`,
  };
};

/**
 * Standard fallback currencies supported by default in multi-currency AR billing
 */
export const DEFAULT_SUPPORTED_CURRENCIES = [
  { currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$", isActive: true },
  { currencyCode: "INR", currencyName: "Indian Rupee", currencySymbol: "₹", isActive: true },
  { currencyCode: "EUR", currencyName: "Euro", currencySymbol: "€", isActive: true },
  { currencyCode: "GBP", currencyName: "British Pound", currencySymbol: "£", isActive: true },
  { currencyCode: "CAD", currencyName: "Canadian Dollar", currencySymbol: "C$", isActive: true },
  { currencyCode: "AUD", currencyName: "Australian Dollar", currencySymbol: "A$", isActive: true },
  { currencyCode: "SGD", currencyName: "Singapore Dollar", currencySymbol: "S$", isActive: true },
  { currencyCode: "JPY", currencyName: "Japanese Yen", currencySymbol: "¥", isActive: true },
].map(normalizeCurrency).filter(Boolean);

/**
 * GET /api/currency
 */
export const getCurrencies = async () => {
  try {
    const response = await api.get(CURRENCY_URL);
    const list = asArray(unwrapData(response)).map(normalizeCurrency).filter(Boolean);
    return list.length > 0 ? list : DEFAULT_SUPPORTED_CURRENCIES;
  } catch {
    return DEFAULT_SUPPORTED_CURRENCIES;
  }
};

/**
 * GET /api/currency/active
 */
export const getActiveCurrencies = async () => {
  try {
    const response = await api.get(`${CURRENCY_URL}/active`);
    const list = asArray(unwrapData(response)).map(normalizeCurrency).filter(Boolean);
    return list.length > 0 ? list.filter((c) => c.isActive) : DEFAULT_SUPPORTED_CURRENCIES;
  } catch {
    return DEFAULT_SUPPORTED_CURRENCIES;
  }
};
