import api from "../../../api/axiosInstance";

const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

const COMPANY_PROFILE_URL = `${AR_BASE_URL}/api/v1/company-profile`;
const INVOICE_CONTENT_DEFAULTS_URL = `${COMPANY_PROFILE_URL}/invoice-content-defaults`;

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object") {
    // Unwrap ApiResponse<T> envelope ({ success, message, data })
    if ("data" in payload && payload.data !== undefined) {
      return payload.data;
    }
  }
  return payload ?? null;
};

export const normalizeCompanyProfile = (item) => {
  if (!item || typeof item !== "object" || Object.keys(item).length === 0) return null;

  const notesVal =
    item.defaultInvoiceNotes !== undefined && item.defaultInvoiceNotes !== null
      ? String(item.defaultInvoiceNotes).trim() || null
      : item.invoiceNotes !== undefined && item.invoiceNotes !== null
      ? String(item.invoiceNotes).trim() || null
      : item.notes !== undefined && item.notes !== null
      ? String(item.notes).trim() || null
      : item.additionalNotes !== undefined && item.additionalNotes !== null
      ? String(item.additionalNotes).trim() || null
      : null;

  const termsVal =
    item.defaultTermsAndConditions !== undefined && item.defaultTermsAndConditions !== null
      ? String(item.defaultTermsAndConditions).trim() || null
      : item.termsAndConditions !== undefined && item.termsAndConditions !== null
      ? String(item.termsAndConditions).trim() || null
      : item.terms !== undefined && item.terms !== null
      ? String(item.terms).trim() || null
      : null;

  const paymentVal =
    item.defaultPaymentInstructions !== undefined && item.defaultPaymentInstructions !== null
      ? String(item.defaultPaymentInstructions).trim() || null
      : item.paymentInstructions !== undefined && item.paymentInstructions !== null
      ? String(item.paymentInstructions).trim() || null
      : item.paymentInstruction !== undefined && item.paymentInstruction !== null
      ? String(item.paymentInstruction).trim() || null
      : null;

  return {
    companyProfileId: item.companyProfileId || item.id || null,
    legalName: item.legalName ? String(item.legalName).trim() : null,
    addressLine1: item.addressLine1 ? String(item.addressLine1).trim() : null,
    addressLine2: item.addressLine2 ? String(item.addressLine2).trim() : null,
    city: item.city ? String(item.city).trim() : null,
    state: item.state ? String(item.state).trim() : null,
    postalCode: item.postalCode ? String(item.postalCode).trim() : null,
    country: item.country ? String(item.country).trim() : null,
    gstin: item.gstin ? String(item.gstin).trim() : null,
    email: item.email ? String(item.email).trim() : null,
    phone: item.phone ? String(item.phone).trim() : null,
    logoReference: item.logoReference || null,
    isActive: Boolean(item.isActive ?? true),
    // Company Profile API defaults
    defaultInvoiceNotes: notesVal,
    defaultTermsAndConditions: termsVal,
    defaultPaymentInstructions: paymentVal,
    // Aliases for convenience across frontend components
    invoiceNotes: notesVal,
    notes: notesVal,
    additionalNotes: notesVal,
    termsAndConditions: termsVal,
    terms: termsVal,
    paymentInstructions: paymentVal,
  };
};

/**
 * GET /api/v1/company-profile
 * Fetches the active seller company profile for invoice generation and invoice preview.
 * Returns null if 404 or profile not configured.
 */
export const getActiveCompanyProfile = async () => {
  try {
    const response = await api.get(COMPANY_PROFILE_URL);
    const data = unwrapData(response);
    return normalizeCompanyProfile(data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    console.warn("[companyProfileService] Could not load active company profile:", error?.message);
    return null;
  }
};

/**
 * GET /api/v1/company-profile/{id}
 * Fetches company profile by ID.
 */
export const getCompanyProfileById = async (companyProfileId) => {
  if (!companyProfileId) return null;
  try {
    const response = await api.get(`${COMPANY_PROFILE_URL}/${companyProfileId}`);
    const data = unwrapData(response);
    return normalizeCompanyProfile(data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * POST /api/v1/company-profile
 * Creates the authoritative seller company profile.
 * Newly created company profiles are automatically saved as ACTIVE by the backend.
 */
export const createCompanyProfile = async (payload) => {
  const response = await api.post(COMPANY_PROFILE_URL, payload);
  const data = unwrapData(response);
  return normalizeCompanyProfile(data);
};

/**
 * PUT /api/v1/company-profile/{id}
 * Updates the existing company profile.
 */
export const updateCompanyProfile = async (companyProfileId, payload) => {
  if (!companyProfileId) {
    throw new Error("Company profile ID is required for update.");
  }
  const response = await api.put(`${COMPANY_PROFILE_URL}/${companyProfileId}`, payload);
  const data = unwrapData(response);
  return normalizeCompanyProfile(data);
};

/**
 * GET /api/v1/company-profile/invoice-content-defaults
 * Fetches default Invoice Notes, Terms & Conditions, and Payment Instructions from backend.
 * Dedicated endpoint response: { companyProfileId, invoiceNotes, termsAndConditions, paymentInstructions, updatedAt }
 * Falls back to active company profile defaults (defaultInvoiceNotes, defaultTermsAndConditions, defaultPaymentInstructions) if needed.
 */
export const getInvoiceContentDefaults = async () => {
  try {
    try {
      const response = await api.get(INVOICE_CONTENT_DEFAULTS_URL);
      const data = unwrapData(response);
      if (data && typeof data === "object") {
        const invoiceNotes = data.invoiceNotes ?? data.notes ?? null;
        const termsAndConditions = data.termsAndConditions ?? data.terms ?? null;
        const paymentInstructions = data.paymentInstructions ?? data.paymentInstruction ?? null;

        return {
          companyProfileId: data.companyProfileId || null,
          invoiceNotes,
          notes: invoiceNotes,
          termsAndConditions,
          paymentInstructions,
          updatedAt: data.updatedAt || null,
        };
      }
    } catch (err) {
      if (err?.response?.status !== 404 && err?.response?.status !== 405) {
        throw err;
      }
    }

    const profile = await getActiveCompanyProfile();
    const invoiceNotes = profile?.defaultInvoiceNotes || profile?.invoiceNotes || profile?.notes || null;
    const termsAndConditions = profile?.defaultTermsAndConditions || profile?.termsAndConditions || profile?.terms || null;
    const paymentInstructions = profile?.defaultPaymentInstructions || profile?.paymentInstructions || profile?.paymentInstruction || null;

    return {
      companyProfileId: profile?.companyProfileId || null,
      invoiceNotes,
      notes: invoiceNotes,
      termsAndConditions,
      paymentInstructions,
      updatedAt: null,
    };
  } catch (error) {
    console.warn("[companyProfileService] Could not load invoice content defaults:", error?.message);
    return {
      companyProfileId: null,
      invoiceNotes: null,
      notes: null,
      termsAndConditions: null,
      paymentInstructions: null,
      updatedAt: null,
    };
  }
};

/**
 * PUT /api/v1/company-profile/invoice-content-defaults
 * Persists updated default Notes, Terms & Conditions, and Payment Instructions to backend.
 * Dedicated endpoint accepts: { invoiceNotes, termsAndConditions, paymentInstructions }
 */
export const updateInvoiceContentDefaults = async (payload) => {
  const invoiceNotes =
    payload?.invoiceNotes !== undefined && payload?.invoiceNotes !== null
      ? String(payload.invoiceNotes).trim() || null
      : payload?.notes !== undefined && payload?.notes !== null
      ? String(payload.notes).trim() || null
      : null;

  const termsAndConditions =
    payload?.termsAndConditions !== undefined && payload?.termsAndConditions !== null
      ? String(payload.termsAndConditions).trim() || null
      : payload?.terms !== undefined && payload?.terms !== null
      ? String(payload.terms).trim() || null
      : null;

  const paymentInstructions =
    payload?.paymentInstructions !== undefined && payload?.paymentInstructions !== null
      ? String(payload.paymentInstructions).trim() || null
      : payload?.paymentInstruction !== undefined && payload?.paymentInstruction !== null
      ? String(payload.paymentInstruction).trim() || null
      : null;

  const cleanPayload = {
    invoiceNotes,
    termsAndConditions,
    paymentInstructions,
  };

  try {
    try {
      const response = await api.put(INVOICE_CONTENT_DEFAULTS_URL, cleanPayload);
      const data = unwrapData(response);
      if (data && typeof data === "object") {
        return {
          companyProfileId: data.companyProfileId || null,
          invoiceNotes: data.invoiceNotes ?? null,
          notes: data.invoiceNotes ?? null,
          termsAndConditions: data.termsAndConditions ?? null,
          paymentInstructions: data.paymentInstructions ?? null,
          updatedAt: data.updatedAt || null,
        };
      }
      return data;
    } catch (err) {
      if (err?.response?.status !== 404 && err?.response?.status !== 405) {
        throw err;
      }
    }

    const active = await getActiveCompanyProfile();
    if (!active?.companyProfileId) {
      throw new Error("No active company profile found to update invoice content defaults.");
    }

    const updated = await updateCompanyProfile(active.companyProfileId, {
      ...active,
      defaultInvoiceNotes: cleanPayload.invoiceNotes,
      defaultTermsAndConditions: cleanPayload.termsAndConditions,
      defaultPaymentInstructions: cleanPayload.paymentInstructions,
      invoiceNotes: cleanPayload.invoiceNotes,
      termsAndConditions: cleanPayload.termsAndConditions,
      paymentInstructions: cleanPayload.paymentInstructions,
    });

    return {
      companyProfileId: updated.companyProfileId || null,
      invoiceNotes: updated.defaultInvoiceNotes || updated.invoiceNotes || null,
      notes: updated.defaultInvoiceNotes || updated.invoiceNotes || null,
      termsAndConditions: updated.defaultTermsAndConditions || updated.termsAndConditions || null,
      paymentInstructions: updated.defaultPaymentInstructions || updated.paymentInstructions || null,
      updatedAt: null,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Extracts backend or network error messages consistently.
 */
export const getCompanyProfileErrorMessage = (
  error,
  defaultFallback = "An error occurred with the company profile."
) => {
  const respData = error?.response?.data;
  if (typeof respData === "string" && respData.trim()) {
    return respData.trim();
  }
  if (respData && typeof respData === "object") {
    if (respData.message && typeof respData.message === "string" && respData.message.trim()) {
      return respData.message.trim();
    }
    if (respData.error && typeof respData.error === "string" && respData.error.trim()) {
      return respData.error.trim();
    }
  }
  if (error?.message && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return defaultFallback;
};

export default {
  getActiveCompanyProfile,
  getCompanyProfileById,
  createCompanyProfile,
  updateCompanyProfile,
  getInvoiceContentDefaults,
  updateInvoiceContentDefaults,
  normalizeCompanyProfile,
  getCompanyProfileErrorMessage,
};
