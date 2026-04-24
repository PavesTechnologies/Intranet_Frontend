import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../components/toastfy/toast";
import { FiEye, FiEyeOff } from "react-icons/fi"; // import icons
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

export default function Register() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    mail: "",
    contact: "", // store raw number without "+"
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false); // toggle state
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    try {
      // ✅ Normalize contact with "+"
      const payload = {
        ...form,
        contact: form.contact.startsWith("+")
          ? form.contact
          : `+${form.contact.replace(/\D/g, "")}`,
      };
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/register`,
        payload,
      );
      showStatusToast("Registered successfully!", "success");
      navigate("/");
    } catch (err) {
      showStatusToast(
        "Registration failed: " + (err.response?.data?.detail || err.message),
        "error",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
      <div className="bg-white p-8 shadow-lg rounded-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">
          Create Account
        </h2>

        <div className="space-y-4">
          <input
            name="first_name"
            placeholder="First Name"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={handleChange}
          />
          <input
            name="last_name"
            placeholder="Last Name"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={handleChange}
          />
          <input
            name="mail"
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={handleChange}
          />

          {/* ✅ Updated Contact Input (like EditUserForm) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact
            </label>
            <PhoneInput
              country={"us"} // default country
              value={form.contact}
              onChange={(phone) =>
                setForm((prev) => ({ ...prev, contact: phone }))
              }
              enableSearch={true}
              countryCodeEditable={false}
              disableDropdown={false}
              placeholder="Enter phone number"
              inputStyle={{
                width: "100%",
                padding: "6px 10px 6px 40px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                backgroundColor: "white",
              }}
              buttonStyle={{
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
              }}
              dropdownStyle={{
                maxHeight: "250px",
                overflowY: "auto",
              }}
              containerStyle={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-between",
              }}
            />
          </div>

          {/* Password Input with View/Hide Toggle */}
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
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
        </div>

        <button
          onClick={handleRegister}
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Sign Up
        </button>

        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="w-full mt-2 border border-blue-500 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition"
        >
          ← Back
        </button>

        <p className="text-sm text-center mt-4 text-gray-600">
          Already have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer hover:underline"
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
