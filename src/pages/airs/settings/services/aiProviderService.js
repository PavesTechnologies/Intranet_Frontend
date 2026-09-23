// Settings -> AI model provider (GET/PUT/DELETE /ai-provider-config, plus
// /providers, /models and /verify). Same conventions as oauthService.js.
// The API key only ever travels in request bodies (never a URL), and the
// backend never sends it back - only a masked last-4.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// Turns any request failure into a sentence an admin can act on. Only the
// backend's own friendly messages (APIResponse {message} / HTTPException
// {detail} strings) are shown verbatim; everything else - network failures,
// plain-text 500s, validation-error arrays, auth failures - gets a fixed
// message here, so raw technical text never reaches the UI.
export const apiErrorMessage = (error, fallback) => {
  const response = error?.response;
  if (!response) {
    return error?.code === "ECONNABORTED"
      ? "The request took too long. Please try again."
      : "Can't reach the AIRS server. Check your connection and try again.";
  }

  const { status, data } = response;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to change these settings.";

  const serverMessage =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.detail === "string" && data.detail) ||
    "";

  if (status >= 500) {
    // 503s from this feature carry a friendly message; anything else 5xx
    // (e.g. an unhandled error's plain "Internal Server Error") does not.
    return status === 503 && serverMessage ? serverMessage : "Something went wrong on the server. Please try again.";
  }
  if (serverMessage) return serverMessage;
  if (status === 422) return "Some of the details entered aren't valid. Check the fields and try again.";
  return fallback;
};

export const getProviders = async () => {
  const response = await api.get(`${BASE_URL}/ai-provider-config/providers`, { headers: authHeaders() });
  return unwrap(response.data) || [];
};

export const getAiProviderConfig = async () => {
  const response = await api.get(`${BASE_URL}/ai-provider-config`, { headers: authHeaders() });
  return unwrap(response.data);
};

// apiKey may be blank - the backend then reuses the saved key, but only
// for the provider it was saved for.
export const listModels = async ({ provider, apiKey }) => {
  const response = await api.post(
    `${BASE_URL}/ai-provider-config/models`,
    { provider, api_key: apiKey || null },
    { headers: authHeaders() },
  );
  return unwrap(response.data) || [];
};

export const verifyAiProvider = async ({ provider, modelName, apiKey }) => {
  const response = await api.post(
    `${BASE_URL}/ai-provider-config/verify`,
    { provider, model_name: modelName, api_key: apiKey || null },
    { headers: authHeaders() },
  );
  return unwrap(response.data);
};

export const saveAiProviderConfig = async ({ provider, modelName, apiKey }) => {
  const response = await api.put(
    `${BASE_URL}/ai-provider-config`,
    { provider, model_name: modelName, api_key: apiKey || null },
    { headers: authHeaders() },
  );
  return unwrap(response.data);
};

export const resetAiProviderConfig = async () => {
  const response = await api.delete(`${BASE_URL}/ai-provider-config`, { headers: authHeaders() });
  return unwrap(response.data);
};
