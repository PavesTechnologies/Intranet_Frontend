// src/api/axiosInstance.js

import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

// ─────────────────────────────────────
// MAIN API INSTANCE
// ─────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─────────────────────────────────────
// REFRESH CLIENT
// Separate client to avoid interceptor loops
// ─────────────────────────────────────
const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ─────────────────────────────────────
// Public APIs
// ─────────────────────────────────────
const PUBLIC_URLS = [
  "/auth/login",
  "/auth/ms-login",
  "/auth/callback",
  "/auth/send-otp",
  "/auth/forgot-password",
  "/auth/refresh",
];

const isPublicUrl = (url) => {
  if (!url) return false;

  try {
    const path = new URL(url, window.location.origin).pathname;

    return PUBLIC_URLS.some((pub) => path.includes(pub));
  } catch {
    return PUBLIC_URLS.some((pub) => url.includes(pub));
  }
};

// ─────────────────────────────────────
// Token Helpers
// ─────────────────────────────────────
const getAccessToken = () => localStorage.getItem("token");

const saveTokens = (accessToken) => {
  localStorage.setItem("token", accessToken);
};

const clearTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// ─────────────────────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (isPublicUrl(config.url)) {
      return config;
    }

    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────
// RESPONSE INTERCEPTOR
// ─────────────────────────────────────
let isRefreshing = false;

let failedQueue = [];

// Process queued requests
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const status = error.response?.status;

    const errorDetail =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      "";

    const is401 = status === 401;

    const isExpiredToken =
      typeof errorDetail === "string" &&
      (
        errorDetail.toLowerCase().includes("token expired") ||
        errorDetail.toLowerCase().includes("token has expired")
      );

    const alreadyRetried = originalRequest?._retry;

    // Ignore non-token-expiry errors
    if (
      !is401 ||
      !isExpiredToken ||
      isPublicUrl(originalRequest?.url) ||
      alreadyRetried
    ) {
      return Promise.reject(error);
    }

    // ─────────────────────────────────────
    // REQUEST QUEUE HANDLING
    // ─────────────────────────────────────
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization =
            `Bearer ${newToken}`;

          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;

    isRefreshing = true;

    try {
      console.log("🔄 Refreshing access token...");

      // ─────────────────────────────────────
      // REFRESH TOKEN API
      // ─────────────────────────────────────
      const response = await refreshClient.post(
        "/auth/refresh",
        {},
      );

      const newAccessToken = response.data?.access_token;

      if (!newAccessToken) {
        throw new Error("No access token returned");
      }

      // Save new token
      saveTokens(newAccessToken);

      // Update default headers
      api.defaults.headers.common.Authorization =
        `Bearer ${newAccessToken}`;

      // Process queued requests
      processQueue(null, newAccessToken);

      // Retry original request
      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      console.log("✅ Token refreshed successfully");

      return api(originalRequest);

    } catch (refreshError) {
      console.error("❌ Refresh token failed");

      processQueue(refreshError, null);

      // Only logout if token truly missing
      const latestToken = getAccessToken();

      if (!latestToken) {
        clearTokens();

        window.location.href = "/login";
      }

      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  },
);

export default api;