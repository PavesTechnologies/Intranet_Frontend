import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../components/toastfy/toast";
import { FaLock } from "react-icons/fa";
import { useAuth } from "../../../contexts/AuthContext";

let intranetLogo;
try {
  intranetLogo = require("../../assets/intranet-logo.png");
} catch (e) {
  intranetLogo = null;
}

export default function InitialPasswordSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const email = user?.email;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);


  const authHeader = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  // Password validation rules
  const passwordRules = {
    minLength: newPassword.length >= 8 && newPassword.length <= 12,
    firstCapital: /^[A-Z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    specialChar: /[!@#$%^&*()_+\-=[\]{}|;':",.<>/?]/.test(newPassword),
    noSpaces: !/\s/.test(newPassword),
    notEasy: !/(password|123456|qwerty)/i.test(newPassword),
  };

  const allRulesSatisfied = Object.values(passwordRules).every(Boolean);

  // ✅ Step 3: Send OTP
  const handleSendOtp = async () => {
    if (!email) {
      showStatusToast("Email not found. Please login again.", "error");
      navigate("/");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/send-otp`,
        {
          email,
        },
      );
      setOtpSent(true);
      showStatusToast("OTP sent to your email. Check inbox/spam.", "success");
    } catch (err) {
      console.error("Send OTP Error:", err);
      showStatusToast(
        "Failed to send OTP: " + (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 6: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showStatusToast("Please enter the OTP sent to your email.", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/validate-otp`,
        {
          email,
          otp: otp.trim(),
        },
      );
      setOtpVerified(true);
      showStatusToast("OTP verified successfully!", "success");
    } catch (err) {
      console.error("OTP Verify Error:", err);
      showStatusToast(
        "OTP verification failed: " +
          (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 7: Setup new password
  const handleSetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      showStatusToast("Please enter and confirm your new password.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showStatusToast("Passwords do not match.", "error");
      return;
    }
    if (!allRulesSatisfied) {
      showStatusToast("Please satisfy all password requirements.", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/first-login/change-password`,
        {
          email,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        authHeader,
      );

      showStatusToast(
        "Password set successfully! Please login again.",
        "success",
      );
      logout();

      navigate("/");
    } catch (err) {
      console.error("Set Password Error:", err);
      showStatusToast(
        "Error setting password: " +
          (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101a36]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 flex flex-col items-center">
        <div className="bg-[#27348b] rounded-xl p-4 mb-6 flex items-center justify-center">
          {intranetLogo ? (
            <img src={intranetLogo} alt="Intranet Logo" className="w-16 h-16" />
          ) : (
            <FaLock className="text-white text-4xl" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-blue-900 text-center mb-2">
          Setup Your New Password
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Please complete the steps to activate your intranet account.
        </p>

        {/* Step 1 & 2: Email (non-editable) + Send OTP */}
        <div className="w-full flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            readOnly
            className="flex-1 px-4 py-2 border rounded-lg bg-blue-50 text-gray-600 cursor-not-allowed"
          />
          {!otpVerified && (
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="px-4 py-2 bg-[#276ef1] text-white rounded-lg hover:bg-[#1d265c] transition disabled:opacity-50"
            >
              {otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          )}
        </div>

        {/* Step 5: OTP Input (only visible after sending OTP) */}
        {otpSent && !otpVerified && (
          <div className="w-full space-y-4">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        )}

        {/* Step 7: Password setup (only after OTP verified) */}
        {otpVerified && (
          <div className="w-full space-y-2 mt-2">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
            />

            {/* ✅ Password Rules */}
            <div className="text-sm text-gray-600">
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={passwordRules.minLength}
                    readOnly
                  />
                  Minimum 8–12 characters
                </li>
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={passwordRules.firstCapital}
                    readOnly
                  />
                  First letter capital
                </li>
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={passwordRules.digit}
                    readOnly
                  />
                  At least one digit
                </li>
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={passwordRules.specialChar}
                    readOnly
                  />
                  At least one special character
                </li>
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={passwordRules.noSpaces}
                    readOnly
                  />
                  No spaces
                </li>
                <li className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={passwordRules.notEasy}
                    readOnly
                  />
                  Avoid common passwords (e.g., "password", "123456")
                </li>
              </ul>
            </div>

            <button
              onClick={handleSetPassword}
              disabled={loading || !allRulesSatisfied}
              className="w-full bg-[#276ef1] text-white py-2 rounded-lg hover:bg-[#1d265c] transition disabled:opacity-50 text-lg font-semibold"
            >
              {loading ? "Setting Password..." : "Set Password"}
            </button>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <button
            onClick={() => {
              navigate("/");
              logout();
            }}
            className="hover:underline hover:text-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
