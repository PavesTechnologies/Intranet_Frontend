// Calendar OAuth connect/status — Microsoft + Google. Same conventions as
// src/pages/airs/prompt-templates/services/promptTemplateService.js.
//
// The connect endpoints were originally documented as returning a bare,
// unwrapped body ({"auth_url": "..."}), but the real backend wraps it in
// the standard {success, message, data} envelope like most other AIRS
// endpoints — confirmed live (data.auth_url, not a top-level auth_url).
// Unwrapped defensively (data?.data ?? data itself) in case the actual
// shape shifts again, rather than hard-coding just one of the two.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

export const getMicrosoftStatus = async () => {
  try {
    const response = await api.get(`${BASE_URL}/oauth/microsoft/status`, { headers: authHeaders() });
    return !!unwrap(response.data).connected;
  } catch (error) {
    console.error("Error fetching Microsoft connection status:", error);
    throw error;
  }
};

// Returns the consent-screen URL — navigation is the caller's job, not
// this function's, so it stays testable without redirecting the page.
export const connectMicrosoft = async () => {
  try {
    const response = await api.get(`${BASE_URL}/oauth/microsoft/connect`, { headers: authHeaders() });
    return unwrap(response.data).auth_url || null;
  } catch (error) {
    console.error("Error starting the Microsoft OAuth connection:", error);
    throw error;
  }
};

export const getGoogleStatus = async () => {
  try {
    const response = await api.get(`${BASE_URL}/oauth/google/status`, { headers: authHeaders() });
    return !!unwrap(response.data).connected;
  } catch (error) {
    console.error("Error fetching Google connection status:", error);
    throw error;
  }
};

export const connectGoogle = async () => {
  try {
    const response = await api.get(`${BASE_URL}/oauth/google/connect`, { headers: authHeaders() });
    return unwrap(response.data).auth_url || null;
  } catch (error) {
    console.error("Error starting the Google OAuth connection:", error);
    throw error;
  }
};
