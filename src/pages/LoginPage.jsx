import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { FaBuilding, FaMicrosoft } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { showStatusToast } from "../components/toastfy/toast";

let intranetLogo;
try {
  intranetLogo = require("../../assets/intranet-logo.png");
} catch (e) {
  intranetLogo = null;
}

const useQuery = () => new URLSearchParams(useLocation().search);

export default function LoginPage() {
  const [email, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();

  const calledOnce = useRef(false);

  useEffect(() => {
    if (localStorage.getItem("isfirsttlogin")) {
      showStatusToast("Please change your password first.");
      localStorage.removeItem("isfirsttlogin");
    }
  }, []);

  useEffect(() => {
    if (calledOnce.current) return;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      showStatusToast(`Login error: ${error}`, "error");
      navigate("/login", { replace: true });
      return;
    }
    if (!code) return;

    calledOnce.current = true;

    const doLogin = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/callback?code=${encodeURIComponent(
            code,
          )}`,
        );
        const { access_token, redirect: redirectPath } = response.data;

        navigate(redirectPath || "/dashboard", { replace: true });
        if (redirectPath === "/change-password") {
          login(access_token, true);
        } else {
          login(access_token, false);
        }
        localStorage.setItem("user", JSON.stringify({ access_token }));
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } catch (err) {
        const errDetail =
          err.response?.data?.error_description ||
          err.response?.data?.detail ||
          err.message;
        console.error("OAuth login failed:", err);
        showStatusToast("OAuth login failed: " + errDetail, "error");

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    doLogin();
  }, [location.search, login, navigate]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showStatusToast("Please enter both email and password.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/login`,
        {
          email,
          password,
        },
      );
      const token = res.data.access_token;

      navigate(res?.data?.redirect || "/dashboard", { replace: true });

      const redirectPath = res?.data?.redirect || "/dashboard";
      if (redirectPath === "/change-password") {
        login(token, true);
      } else {
        login(token, false);
      }
    } catch (err) {
      showStatusToast(
        "Login failed: " + (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/ms-login`;
  };

  // 🔹 Handle Enter key press for both inputs
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101a36]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 flex flex-col items-center">
        <div className="bg-[#27348b] rounded-xl p-4 mb-6 flex items-center justify-center">
          {intranetLogo ? (
            <img src={intranetLogo} alt="Intranet Logo" className="w-16 h-16" />
          ) : (
            <FaBuilding className="text-white text-4xl" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Enterprise Intranet
        </h2>
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={handleMicrosoftLogin}
              type="button"
              className="flex items-center justify-center gap-3 w-full px-4 py-2 border border-gray-300 rounded-lg bg-white hover:shadow-md transition text-sm font-medium"
              disabled={loading}
            >
              <div className="p-1 rounded bg-[#f3f3f3]">
                <FaMicrosoft className="text-2xl text-[#5c5c5c]" />
              </div>
              <span className="flex-1 text-gray-800">
                Continue with Microsoft
              </span>
            </button>
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-300" />
              <span className="mx-3 text-xs text-gray-400 font-medium">or</span>
              <div className="flex-grow border-t border-gray-300" />
            </div>
          </div>

          <input
            type="email"
            placeholder="Email address"
            value={email || ""}
            onChange={(e) => setMail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
          />

          {/* Password Input with View/Hide Toggle */}
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 pr-11 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 text-gray-800
               [&::-ms-reveal]:hidden [&::-ms-clear]:hidden 
               [&::-webkit-credentials-auto-fill-button]:hidden 
               [&::-webkit-textfield-decoration-container]:hidden 
               appearance-none"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#276ef1] text-white py-2 rounded-lg hover:bg-[#1d265c] transition disabled:opacity-50 text-lg font-semibold"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
        <div className="flex justify-between mt-6 text-sm text-gray-600 w-full">
          {/* <button
            onClick={() => navigate("/register")}
            className="hover:underline hover:text-blue-600"
            type="button"
          > */}
          {/* Create Account
          </button> */}
          <button
            onClick={() => navigate("/reset-password")}
            className="hover:underline hover:text-blue-600"
            type="button"
          >
            Reset Password?
          </button>
        </div>
      </div>
    </div>
  );
}
