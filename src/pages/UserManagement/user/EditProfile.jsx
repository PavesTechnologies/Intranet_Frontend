import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../contexts/AuthContext";
import { showStatusToast } from "../../../components/toastfy/toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Simple reusable Modal component
function Modal({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-2xl shadow-lg w-96 p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Load user profile on mount
  useEffect(() => {
    if (user?.email) {
      axios
        .get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/general_user/profile`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )
        .then((res) => setForm(res.data))
        .catch((err) => {
          console.error("Failed to fetch profile", err);
          showStatusToast("Failed to load profile.", "error");
        });
    }
  }, [user]);

  // Handle text changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Save profile
  const doSave = async () => {
    const payload = { ...form };

    try {
      setSaving(true);
      console.log("Payload:", payload);
      const response = await axios.put(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/general_user/profile`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      console.log("Response:", response.data);
      showStatusToast("Profile updated!", "success");
      navigate("/profile");
    } catch (err) {
      console.error("Update failed:", err);
      showStatusToast(
        "Update failed: " + (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setSaving(false);
      setShowModal(false);
    }
  };

  const handleSave = () => setShowModal(true);
  const handleCancel = () => navigate("/profile");

  if (!user) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="bg-white shadow-md border border-gray-200 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">Edit Profile</h2>

        <div className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block font-medium mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name || ""}
              onChange={(e) => {
                if (/^[A-Za-z\s]*$/.test(e.target.value)) handleChange(e);
              }}
              placeholder="Enter your first name"
              className="w-full border px-3 py-2 rounded-md"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block font-medium mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name || ""}
              onChange={(e) => {
                if (/^[A-Za-z\s]*$/.test(e.target.value)) handleChange(e);
              }}
              placeholder="Enter your last name"
              className="w-full border px-3 py-2 rounded-md"
            />
          </div>

          {/* Contact with react-phone-input-2 */}
          <div>
            <label className="block font-medium mb-1">Contact</label>
            <PhoneInput
              country={"in"}
              value={form.contact || ""}
              onChange={(value) => setForm({ ...form, contact: value })}
              inputClass="!w-full !py-2 !text-base"
              dropdownClass="custom-phone-dropdown"
              countryCodeEditable={false}
              preferredCountries={["us", "in", "gb", "ca"]}
              enableSearch
              inputProps={{
                name: "contact",
                required: true,
                autoFocus: false,
              }}
            />
          </div>

          {/* Password (optional) */}
          <div>
            <label className="block font-medium mb-1">
              New Password (optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password || ""}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                className="w-full border px-3 py-2 pr-10 rounded-md appearance-none
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           [&::-ms-reveal]:hidden [&::-ms-clear]:hidden
                           [&::-webkit-credentials-auto-fill-button]:hidden
                           [&::-webkit-textfield-decoration-container]:hidden"
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

          {/* Buttons */}
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="w-full bg-gray-100 border border-gray-300 py-2 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={showModal}
        title="Confirm Profile Edit"
        message="Are you sure you want to save these changes?"
        onConfirm={doSave}
        onCancel={() => setShowModal(false)}
        loading={saving}
      />
    </div>
  );
}
