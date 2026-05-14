// src/api/axiosInstance.js

import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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
];

const isPublicUrl = (url) => {
  if (!url) return false;

  try {
    const path = new URL(url).pathname;

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
      errorDetail.toLowerCase().includes("token has expired");

    const alreadyRetried = originalRequest?._retry;

    if (
      !is401 ||
      !isExpiredToken ||
      isPublicUrl(originalRequest?.url) ||
      alreadyRetried
    ) {
      return Promise.reject(error);
    }

    // Queue requests
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
      const response = await fetch(
        `${BASE_URL}/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      const data = await response.json();

      const newAccessToken = data.access_token;

      saveTokens(newAccessToken);

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);

      clearTokens();

      window.location.href = "/login";

      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  },
);

export default api;