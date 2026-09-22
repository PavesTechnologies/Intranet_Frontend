import api from "../../../api/axiosInstance";

const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

const COMPANY_PROFILE_URL = `${AR_BASE_URL}/api/v1/company-profile`;

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object") {
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return payload.data;
    }
  }
  return payload?.data ?? payload ?? null;
};

export const normalizeCompanyProfile = (item) => {
  if (!item || typeof item !== "object" || Object.keys(item).length === 0) return null;

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

export default {
  getActiveCompanyProfile,
  getCompanyProfileById,
  normalizeCompanyProfile,
};
