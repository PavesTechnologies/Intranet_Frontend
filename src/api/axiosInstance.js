// src/api/axiosInstance.js
//
// Registers interceptors on the GLOBAL axios instance once.
// Every file that does axios.get/post/put/delete gets:
//   ✅ access token auto-attached from localStorage("token")
//   ✅ silent refresh on 401 using localStorage("refresh_token")
//   ✅ public routes (login, refresh, etc) skipped — no token attached
//
// Import this file ONCE in main.jsx:
//   import "./api/axiosInstance";

import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

// ─── public routes — skip token attachment and 401 interception ───
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
    // handles full URLs like "http://127.0.0.1:8000/auth/login"
    const path = new URL(url).pathname;
    return PUBLIC_URLS.some((pub) => path.includes(pub));
  } catch {
    // handles relative paths like "/auth/login"
    return PUBLIC_URLS.some((pub) => url.includes(pub));
  }
};

// ─── token helpers — must match AuthContext storage keys ──────────
// AuthContext.login() stores: localStorage("token") and localStorage("refresh_token")

const getAccessToken  = () => localStorage.getItem("token");
const getRefreshToken = () => localStorage.getItem("refresh_token");

const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem("token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

// ─── register interceptors exactly once ──────────────────────────
// guard prevents double-registration if this file is imported multiple times
if (!axios.__interceptorsRegistered) {
  axios.__interceptorsRegistered = true;

  // ── REQUEST — attach access token ──────────────────────────────
  axios.interceptors.request.use((config) => {
    if (isPublicUrl(config.url)) return config; // skip public routes

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ── RESPONSE — silent refresh on 401 ───────────────────────────
  let isRefreshing = false;
  let failedQueue  = []; // queue requests that arrive while refresh is in progress

  const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
    failedQueue = [];
  };

  axios.interceptors.response.use(
    (response) => response, // success — pass through

    async (error) => {
      const originalRequest = error.config;
      const url             = originalRequest?.url;
      const status          = error.response?.status;

      const is401          = status === 401;
      const alreadyRetried = originalRequest._retry;

      // don't intercept: non-401, public routes, already retried once
      if (!is401 || isPublicUrl(url) || alreadyRetried) {
        return Promise.reject(error);
      }

      // another refresh already running — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing           = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // use fetch (not axios) to avoid triggering this interceptor again
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
          throw new Error(`Refresh failed: ${res.status}`);
        }

        const data = await res.json();

        // rotate both tokens
        saveTokens(data.access_token, data.refresh_token);

        // resolve all queued requests with new token
        processQueue(null, data.access_token);

        // retry the original failed request
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return axios(originalRequest);

      } catch (refreshError) {
        // refresh failed — clear tokens, let AuthContext/app handle redirect
        processQueue(refreshError, null);
        clearTokens();

        // only redirect if not already on login page
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