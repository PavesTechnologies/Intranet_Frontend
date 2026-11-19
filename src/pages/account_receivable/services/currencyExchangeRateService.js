import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL || "http://localhost:8080";
export const EXCHANGE_RATES_URL = `${BASE_URL}/api/v1/exchange-rates`;

/**
 * Proposed API Contracts for missing backend Exchange Rate Management endpoints.
 * This represents the exact REST contract matching the backend currency_exchange_rate schema.
 */
export const PROPOSED_EXCHANGE_RATE_API_CONTRACTS = {
  databaseTable: "currency_exchange_rate",
  schemaColumns: [
    { column: "id / exchange_rate_id", type: "UUID / BIGINT", description: "Primary Key" },
    { column: "source_currency", type: "VARCHAR(10)", description: "Source/From ISO currency code (e.g. INR)" },
    { column: "target_currency", type: "VARCHAR(10)", description: "Target/To ISO currency code (e.g. USD)" },
    { column: "exchange_rate", type: "NUMERIC(18, 6)", description: "Authoritative exchange rate" },
    { column: "effective_date", type: "DATE", description: "Date from which rate is valid" },
    { column: "expiry_date", type: "DATE", description: "Optional date until which rate is valid" },
    { column: "rate_source", type: "VARCHAR(100)", description: "Rate authority (e.g. RBI Official, ECB, Manual)" },
    { column: "status", type: "VARCHAR(20)", description: "ACTIVE, INACTIVE, APPROVED, PENDING_APPROVAL" },
    { column: "created_at", type: "TIMESTAMP", description: "Record creation timestamp" },
    { column: "updated_at", type: "TIMESTAMP", description: "Record last update timestamp" },
  ],
  endpoints: [
    {
      method: "GET",
      path: "/api/v1/exchange-rates",
      summary: "List Exchange Rates",
      queryParams: [
        "sourceCurrency (optional string)",
        "targetCurrency (optional string)",
        "effectiveDate (optional string YYYY-MM-DD)",
        "status (optional string: ACTIVE | INACTIVE | APPROVED)",
        "page (optional int, default 0)",
        "size (optional int, default 20)",
      ],
      response: "ApiResponse<List<ExchangeRateResponseDto>>",
    },
    {
      method: "POST",
      path: "/api/v1/exchange-rates",
      summary: "Create Exchange Rate",
      requestBody: {
        sourceCurrency: "string (required, max 10, e.g. 'INR')",
        targetCurrency: "string (required, max 10, e.g. 'USD')",
        exchangeRate: "number (required, > 0, e.g. 0.011976)",
        effectiveDate: "string (required, YYYY-MM-DD)",
        rateSource: "string (required, max 100, e.g. 'RBI Official')",
        status: "string (optional, default 'ACTIVE')",
        notes: "string (optional, max 500)",
      },
      response: "ApiResponse<ExchangeRateResponseDto>",
    },
    {
      method: "GET",
      path: "/api/v1/exchange-rates/{id}",
      summary: "Get Exchange Rate by ID",
      response: "ApiResponse<ExchangeRateResponseDto>",
    },
    {
      method: "PUT",
      path: "/api/v1/exchange-rates/{id}",
      summary: "Update Exchange Rate",
      requestBody: {
        exchangeRate: "number (required, > 0)",
        effectiveDate: "string (required, YYYY-MM-DD)",
        rateSource: "string (required)",
        status: "string (ACTIVE | INACTIVE)",
        notes: "string (optional)",
      },
      response: "ApiResponse<ExchangeRateResponseDto>",
    },
    {
      method: "DELETE",
      path: "/api/v1/exchange-rates/{id}",
      summary: "Deactivate or Delete Exchange Rate",
      response: "ApiResponse<Void>",
    },
    {
      method: "GET",
      path: "/api/v1/exchange-rates/lookup",
      summary: "Authoritative Rate Lookup for Snapshot Acquisition",
      queryParams: ["sourceCurrency (required)", "targetCurrency (required)", "date (required)"],
      response: "ApiResponse<ExchangeRateResponseDto>",
    },
  ],
};

const unwrapData = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.data?.data)) return payload.data.data;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.content?.data)) return payload.content.data;
  }
  return payload?.data ?? payload ?? null;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.data?.data)) return value.data.data;
    if (Array.isArray(value.content)) return value.content;
    if (Array.isArray(value.content?.data)) return value.content.data;
  }
  return [];
};

/**
 * Checks if the backend error indicates that the exchange rate management API
 * has not been implemented yet (404 Not Found or 501 Not Implemented).
 */
export const isMissingEndpointError = (error) => {
  const status = error?.response?.status;
  if (status === 404 || status === 501) return true;
  const msg = String(error?.response?.data?.message || error?.message || "").toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("no static resource") ||
    msg.includes("cannot get") ||
    msg.includes("unknown endpoint")
  );
};

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.status === 403) {
    return "You do not have permission to manage currency exchange rates.";
  }

  if (isMissingEndpointError(error)) {
    return "The backend exchange rate management endpoint (POST/GET /api/v1/exchange-rates) is not yet implemented on the AR service.";
  }

  const resData = error?.response?.data;
  if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
    const firstErr = resData.errors[0];
    if (typeof firstErr === "string") return firstErr;
    if (firstErr?.defaultMessage) return firstErr.defaultMessage;
    if (firstErr?.message) return firstErr.message;
  }

  const rawMsg = resData?.message || resData?.detail || resData?.error;
  return rawMsg || error?.message || fallback;
};

/**
 * Normalizes an exchange rate record from backend DTO or event representation.
 */
export const normalizeExchangeRate = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.id || item.exchangeRateId || "";
  const sourceCurrency = String(item.sourceCurrency || item.fromCurrency || "").trim().toUpperCase();
  const targetCurrency = String(item.targetCurrency || item.toCurrency || "").trim().toUpperCase();

  const rawRate = item.exchangeRate ?? item.rate;
  const exchangeRate = typeof rawRate === "number" ? rawRate : parseFloat(rawRate) || 0;

  const effectiveDate = item.effectiveDate || item.rateDate || item.effectiveFrom || null;
  const expiryDate = item.expiryDate || item.effectiveTo || null;
  const rateSource = item.rateSource || item.source || "Manual";

  const rawStatus = String(item.status || (item.isActive === false ? "INACTIVE" : "ACTIVE")).toUpperCase();
  const isActive = rawStatus === "ACTIVE" || rawStatus === "APPROVED";
  const approvalStatus = item.approvalStatus || (rawStatus === "APPROVED" ? "APPROVED" : rawStatus === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : null);

  return {
    ...item,
    id,
    exchangeRateId: id,
    sourceCurrency,
    targetCurrency,
    exchangeRate,
    effectiveDate,
    expiryDate,
    rateSource,
    status: rawStatus,
    isActive,
    approvalStatus,
    notes: item.notes || item.description || "",
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    createdBy: item.createdBy || null,
    updatedBy: item.updatedBy || null,
  };
};

/**
 * GET /api/v1/exchange-rates
 */
export const getExchangeRates = async (params = {}) => {
  try {
    const response = await api.get(EXCHANGE_RATES_URL, { params });
    const records = asArray(unwrapData(response)).map(normalizeExchangeRate);
    return {
      success: true,
      data: records,
      isApiMissing: false,
    };
  } catch (error) {
    if (isMissingEndpointError(error)) {
      return {
        success: false,
        data: [],
        isApiMissing: true,
        error: "Exchange rate management API is not implemented on the AR backend.",
        proposedContracts: PROPOSED_EXCHANGE_RATE_API_CONTRACTS,
      };
    }
    throw error;
  }
};

/**
 * GET /api/v1/exchange-rates/{id}
 */
export const getExchangeRateById = async (id) => {
  const response = await api.get(`${EXCHANGE_RATES_URL}/${id}`);
  const data = unwrapData(response);
  return normalizeExchangeRate(data);
};

/**
 * POST /api/v1/exchange-rates
 */
export const createExchangeRate = async (payload) => {
  const response = await api.post(EXCHANGE_RATES_URL, payload);
  const data = unwrapData(response);
  return normalizeExchangeRate(data);
};

/**
 * POST /api/v1/exchange-rates/batch
 * Batch saves exchange rates for multiple target currencies against a base currency on an effective date.
 * Payload: { sourceCurrency, effectiveDate, rateSource, rates: [{ targetCurrency, exchangeRate }] }
 */
export const createDailyRatesBatch = async (batchPayload) => {
  const response = await api.post(`${EXCHANGE_RATES_URL}/batch`, batchPayload);
  const data = unwrapData(response);
  return asArray(data).map(normalizeExchangeRate);
};

/**
 * GET /api/v1/exchange-rates/lookup
 */
export const lookupExchangeRate = async ({ sourceCurrency, targetCurrency, asOfDate }) => {
  const response = await api.get(`${EXCHANGE_RATES_URL}/lookup`, {
    params: { sourceCurrency, targetCurrency, asOfDate },
  });
  const data = unwrapData(response);
  return normalizeExchangeRate(data);
};

/**
 * PUT /api/v1/exchange-rates/{id}
 */
export const updateExchangeRate = async (id, payload) => {
  const response = await api.put(`${EXCHANGE_RATES_URL}/${id}`, payload);
  const data = unwrapData(response);
  return normalizeExchangeRate(data);
};

/**
 * DELETE /api/v1/exchange-rates/{id}
 */
export const deleteExchangeRate = async (id) => {
  const response = await api.delete(`${EXCHANGE_RATES_URL}/${id}`);
  return response?.data;
};

