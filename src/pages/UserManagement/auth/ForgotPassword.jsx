import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { showStatusToast } from "../../../components/toastfy/toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isEmailValid = (value) => /\S+@\S+\.\S+/.test(value);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      showStatusToast("Email is required to send OTP.", "error");
      return;
    }
    if (!isEmailValid(email.trim())) {
      showStatusToast("Please enter a valid email.", "error");
      return;
    }
    setSendingOtp(true);
    try {
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/send-otp`,
        {
          email: email.trim(),
        },
      );
      setOtpSent(true);
      showStatusToast("OTP sent to your email. Check inbox/spam.", "success");
    } catch (err) {
      console.error("sendOtp error:", err);
      showStatusToast(
        "Failed to send OTP: " + (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      showStatusToast("Email, OTP, and new password are required.", "error");
      return;
    }
    if (!isEmailValid(email.trim())) {
      showStatusToast("Please enter a valid email.", "error");
      return;
    }
    setResetting(true);
    try {
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/forgot-password`,
        {
          email: email.trim(),
          otp: otp.trim(),
          new_password: newPassword,
        },
      );
      showStatusToast("Password reset successfully!", "success");
      navigate("/");
    } catch (err) {
      console.error("handleReset error:", err);
      showStatusToast(
        "Error resetting password: " +
          (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 to-blue-100">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Reset Password
        </h2>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          </div>

          {otpSent && (
            <>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Password input with single toggle icon */}
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-11 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                             bg-white text-gray-800 appearance-none
                             [&::-ms-reveal]:hidden [&::-ms-clear]:hidden
                             [&::-webkit-credentials-auto-fill-button]:hidden
                             [&::-webkit-textfield-decoration-container]:hidden"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </>
          )}

          <button
            onClick={handleReset}
            disabled={resetting || !otpSent}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {resetting ? "Resetting..." : "Reset Password"}
          </button>

          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="w-full mt-2 border border-blue-500 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
