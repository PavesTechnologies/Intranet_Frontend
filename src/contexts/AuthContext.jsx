// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { showStatusToast } from "../components/toastfy/toast";
import axios from "axios";

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isfirsttlogin, setIsfirsttlogin] = useState(false);
  const isLoggingOut = useRef(false);

  const loadUser = (token) => {
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
      setIsAuthenticated(true);
    } catch {
      showStatusToast("Invalid or tampered token. Please login again.");
      logout(true);
    }
  };

  // ✅ stores access token + refresh token
  const login = (token, isFirstLogin = false) => {
    if (isFirstLogin) {
      localStorage.setItem("lastPath", "/change-password");
      setIsfirsttlogin(true);
      localStorage.setItem("isfirsttlogin", true);
    } else {
      localStorage.setItem("lastPath", "/dashboard");
    }

    // store access token — axiosInstance reads this key
    localStorage.setItem("token", token);

    loadUser(token);
  };

  const logout = (expired = false) => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

// blacklist both tokens on backend
    if (localStorage.getItem("token")) {

      axios.post(
      `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/logout`,
      {},
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    )
        .then((res) => console.log("Logout:", res.data))
        .catch((err) => console.error("Logout failed:", err.response?.data || err.message));
    }

    // clear all auth keys
    localStorage.removeItem("token");
    // localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastPath");

    if (localStorage.getItem("isfirsttlogin")) {
      localStorage.removeItem("isfirsttlogin");
      setIsfirsttlogin(false);
    }

    setUser(null);
    setIsAuthenticated(false);

    if (expired) {
      navigate("/", { replace: true });
    }

    setTimeout(() => {
      isLoggingOut.current = false;
    }, 2000);
  };

  // ✅ single useEffect on mount — restore session from localStorage
  // also sets expiry timer (interceptor handles actual refresh)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);

      // validate token can be decoded before loading user
      loadUser(token);

      if (decoded.exp) {
        const timeLeft = decoded.exp - Date.now() / 1000;

        if (timeLeft <= 0) {
          // already expired — interceptor will try refresh on next API call
          // if no refresh token, will reject and user stays on page
          // optionally show toast
          showStatusToast("Session expired. Please login again.");
          setTimeout(() => logout(true), 1000);
        } else {
          // show toast when access token expires (interceptor handles refresh silently)
          const timer = setTimeout(() => {
            // showStatusToast("Session refreshing...");
          }, timeLeft * 1000);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      showStatusToast("Invalid token detected. Please login again.");
      logout(true);
    }
  }, []); // ✅ empty deps — runs once on mount only

  const getUserRoles = () => {
    if (!user) return [];
    const roles = user.roles || user.role || [];
    if (!roles) return [];
    if (Array.isArray(roles)) return roles.map((r) => r.toUpperCase());
    return roles.split(",").map((r) => r.trim().toUpperCase());
  };

  const hasRole = (allowedRoles) => {
    const userRoles = getUserRoles();
    return allowedRoles.some((role) => userRoles.includes(role.toUpperCase()));
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, logout, isfirsttlogin, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
};