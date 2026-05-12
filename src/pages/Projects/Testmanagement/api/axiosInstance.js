// src/api/axiosInstance.js
import axios from "axios";

// Detect / load backend base URL
const BASE_URL =
  window.__APP_CONFIG__.PMS_BASE_URL || "http://localhost:8080/api";

// Create instance
const axiosInstance = axios.create({
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
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("⚠️ 401 Unauthorized — Redirecting to login...");

      // OPTIONAL:
      localStorage.removeItem("token");
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
