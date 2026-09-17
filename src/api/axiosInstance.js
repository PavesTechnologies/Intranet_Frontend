// src/api/axiosInstance.js

import axios from "axios";
import { notifySessionExpired } from "./sessionExpiry";

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

// AIRS answers 401 rather than 503 when it can't reach the JWKS endpoint to
// verify signatures — see jwt_middleware.py, "Authentication service
// unavailable". That's an infrastructure outage, not a dead session, and
// treating it as one would sign every user out during a UMS deploy.
const isAuthServiceDown = (err) => {
  const detail =
    err?.response?.data?.detail || err?.response?.data?.message || "";
  return (
    typeof detail === "string" &&
    detail.toLowerCase().includes("authentication service unavailable")
  );
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

    // Let the browser set Content-Type for FormData (preserves multipart boundary)
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
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

    // Not a 401, a 401 from a public auth endpoint (bad credentials on the
    // login form, a bad OTP, the refresh call itself), or the auth service
    // being down. None of these mean this user's session has ended.
    if (!is401 || isPublicUrl(originalRequest?.url) || isAuthServiceDown(error)) {
      return Promise.reject(error);
    }

    // A 401 on a protected URL that a refresh cannot fix: "Invalid token",
    // "Not authenticated", a bare 401, a non-string detail, or a 401 that
    // survived a successful refresh. Retrying is pointless — end the session.
    if (!isExpiredToken || alreadyRetried) {
      error.message = "Session expired. Please login again.";
      error.isSessionExpired = true;
      notifySessionExpired();
      return Promise.reject(error);
    }

    // Otherwise the token is merely expired — fall through to the refresh flow.

    // ─────────────────────────────────────
    // REQUEST QUEUE HANDLING
    // ─────────────────────────────────────
    if (isRefreshing) {
      // Mark before queueing: without this a queued request that 401s again
      // after replay re-enters as virgin and starts a second refresh.
      originalRequest._retry = true;

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
      // console.log("🔄 Refreshing access token...");

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

      // Deliberately NOT setting api.defaults.headers.common.Authorization:
      // axios merges defaults before the request interceptor runs, so the
      // public-URL early return cannot strip it, and the next POST /auth/login
      // after an expiry would carry the dead token. The request interceptor
      // reads localStorage per request anyway.

      // Process queued requests
      processQueue(null, newAccessToken);

      // Retry original request
      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      // console.log("✅ Token refreshed successfully");

      return api(originalRequest);

    } catch (refreshError) {
      console.error("❌ Refresh token failed");

      processQueue(refreshError, null);

      // A transport failure says nothing about the session — don't throw the
      // user out over a Wi-Fi blip or a 5xx. The hand-thrown "No access token
      // returned" above is not an axios error, so it correctly counts as fatal.
      const isTransient =
        (Boolean(refreshError.isAxiosError) && !refreshError.response) ||
        isAuthServiceDown(refreshError);

      if (!isTransient) {
        refreshError.message = "Session expired. Please login again.";
        refreshError.isSessionExpired = true;

        // Hand control to React. AuthContext.logout(true) does the rest:
        // POST /auth/logout, clear storage, tear down both websockets,
        // reset state, navigate("/", { replace: true }).
        notifySessionExpired();
      }

      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  },
);

export default api;