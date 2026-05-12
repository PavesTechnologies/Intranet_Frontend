// src/api/axiosInstance.js
//
// Registers interceptors on the GLOBAL axios instance once.
// Every axios request automatically gets:
//
// ✅ access token auto-attached from localStorage("token")
// ✅ silent refresh ONLY when token is expired
// ✅ queued requests while refresh is in progress
// ✅ public routes skipped
// ✅ invalid issuer/signature/etc will NOT trigger refresh
//
// Import this file ONCE in main.jsx:
// import "./api/axiosInstance";

import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

// ─────────────────────────────────────────────────────────────
// Public routes
// ─────────────────────────────────────────────────────────────
const PUBLIC_URLS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/ms-login",
  "/auth/callback",
  "/auth/send-otp",
  "/auth/forgot-password",
];

const isPublicUrl = (url) => {
  if (!url) return false;

  try {
    // Handles full URLs
    const path = new URL(url).pathname;

    return PUBLIC_URLS.some((pub) => path.includes(pub));
  } catch {
    // Handles relative URLs
    return PUBLIC_URLS.some((pub) => url.includes(pub));
  }
};

// ─────────────────────────────────────────────────────────────
// Token Helpers
// ─────────────────────────────────────────────────────────────
const getAccessToken = () => {
  return localStorage.getItem("token");
};

const getRefreshToken = () => {
  return localStorage.getItem("refresh_token");
};

const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem("token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

// ─────────────────────────────────────────────────────────────
// Register interceptors only once
// ─────────────────────────────────────────────────────────────
if (!axios.__interceptorsRegistered) {
  axios.__interceptorsRegistered = true;

  // ============================================================
  // REQUEST INTERCEPTOR
  // ============================================================
  axios.interceptors.request.use(
    (config) => {
      // Skip public APIs
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

  // ============================================================
  // RESPONSE INTERCEPTOR
  // ============================================================
  let isRefreshing = false;

  // Queue for requests during refresh
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

  axios.interceptors.response.use(
    (response) => response,

    async (error) => {
      const originalRequest = error.config;

      const status = error.response?.status;
      const url = originalRequest?.url;

      // Backend response message
      const errorDetail = error.response?.data?.detail || "";

      const is401 = status === 401;

      // ONLY refresh for expired token
      const isExpiredToken =
        errorDetail === "401: Token has expired";

      const alreadyRetried = originalRequest?._retry;

      // --------------------------------------------------------
      // Skip refresh logic
      // --------------------------------------------------------
      if (
        !is401 ||
        !isExpiredToken ||
        isPublicUrl(url) ||
        alreadyRetried
      ) {
        return Promise.reject(error);
      }

      // --------------------------------------------------------
      // Queue requests while refresh is already running
      // --------------------------------------------------------
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newAccessToken) => {
            originalRequest.headers.Authorization =
              `Bearer ${newAccessToken}`;

            return axios(originalRequest);
          })
          .catch((queueError) => {
            return Promise.reject(queueError);
          });
      }

      // --------------------------------------------------------
      // Start refresh process
      // --------------------------------------------------------
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Using fetch to avoid interceptor loop
        const response = await fetch(
          `${BASE_URL}/auth/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              refresh_token: refreshToken,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Refresh failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        // Save new tokens
        saveTokens(newAccessToken, newRefreshToken);

        // Resolve queued requests
        processQueue(null, newAccessToken);

        // Retry original request
        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return axios(originalRequest);

      } catch (refreshError) {
        // Reject all queued requests
        processQueue(refreshError, null);

        // Clear auth data
        clearTokens();

        // Redirect to login
        if (
          window.location.pathname !== "/" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    },
  );
}

export default axios;