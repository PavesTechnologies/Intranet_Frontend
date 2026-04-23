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
  const isLoggingOut = useRef(false); // ✅ Prevent multiple logout triggers

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

  const login = (token, isfirsttlogin = false) => {
    if (isfirsttlogin) {
      localStorage.setItem("lastPath", "/change-password");
      setIsfirsttlogin(true);
      localStorage.setItem("isfirsttlogin", true);
    } else {
      localStorage.setItem("lastPath", "/dashboard");
    }
    localStorage.setItem("token", token);
    loadUser(token);
  };

  const logout = (expired = false) => {
    // ✅ Prevent multiple logout calls
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    const token = localStorage.getItem("token");

    if (token) {
      axios
        .post(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )
        .then((response) => {
          console.log("Logout response:", response.data);
        })
        .catch((error) => {
          console.error(
            "Logout failed:",
            error.response?.data || error.message,
          );
        });
    }

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (localStorage.getItem("isfirsttlogin")) {
      localStorage.removeItem("isfirsttlogin");
      setIsfirsttlogin(false);
    }

    // Update state
    setUser(null);
    setIsAuthenticated(false);

    // Redirect to login
    if (expired) {
      navigate("/", { replace: true });
    }

    // Reset logout flag after short delay (for future sessions)
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 2000);
  };

  // ✅ Check and auto logout when token expires
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      loadUser(token);

      if (decoded.exp) {
        const currentTime = Date.now() / 1000;
        const timeLeft = decoded.exp - currentTime;

        if (timeLeft <= 0) {
          showStatusToast("Session expired. Please login again.");
          setTimeout(() => {
            logout(true);
          }, 1000);
        } else {
          const timer = setTimeout(() => {
            showStatusToast("Session expired. Please login again.");
            logout(true);
          }, timeLeft * 1000);
          return () => clearTimeout(timer);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        showStatusToast("Token tampered", "error");
        logout();
      } else {
        showStatusToast("Invalid token detected. Please login again.");
        logout(true);
      }
    }
  }, [navigate]);

  // ✅ Detect token tampering or invalid format on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      jwtDecode(token);
      loadUser(token);
    } catch {
      showStatusToast(
        "Invalid or tampered token detected. Please login again.",
      );
      logout(true);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, logout, isfirsttlogin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
