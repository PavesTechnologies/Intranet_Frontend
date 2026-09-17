// src/api/axiosInstance.js
import api from "../../../../api/axiosInstance";
import { notifySessionExpired } from "../../../../api/sessionExpiry";

// Detect / load backend base URL
const BASE_URL =
  window.__APP_CONFIG__.PMS_BASE_URL || "http://localhost:8080/api";

// Create instance
const axiosInstance = api.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

//  REQUEST INTERCEPTOR — Attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    // IMPORTANT: your real token key is `"token"` (NOT authToken)
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 🔥 RESPONSE INTERCEPTOR — Handle 401 errors
//
// NOTE: api.create() copies config but NOT interceptors, so this instance has
// none of the main client's refresh logic. It previously deleted the token and
// nothing else, which left the app rendered and "authenticated" while every
// later request went out unauthenticated. Route through the shared bridge
// instead and let AuthContext.logout() do the teardown.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      error.message = "Session expired. Please login again.";
      error.isSessionExpired = true;
      notifySessionExpired();
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
