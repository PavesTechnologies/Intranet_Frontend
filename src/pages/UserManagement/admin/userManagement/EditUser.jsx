import { useState } from "react";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import FormInput from "../../../../components/forms/FormInput";
import Button from "../../../../components/Button/Button";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
export default function CreateUserForm({ onSuccess, onClose }) {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    mail: "",
    contact: "",
    password: "",
    is_active: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [generating, setGenerating] = useState(false);

  const showSingleToast = (message, type = "error") => {
    if (!toastActive) {
      setToastActive(true);
      showStatusToast(message, type);
      setTimeout(() => setToastActive(false), 3000);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const generatePasswordFromUser = (firstName, mobile) => {
    if (!firstName.trim()) return showSingleToast("First Name is required.");
    if (!/^[A-Za-z ]*$/.test(form.first_name))
      return showSingleToast(
        "First Name must contain only letters and spaces.",
      );

    const namePart = (firstName || "").slice(0, 4);
    const digits = String(mobile || "").replace(/\D/g, "");
    const mobilePart = digits.slice(-4);

    let base = `${namePart}@${mobilePart}`;
    if (!/[A-Z]/.test(base))
      base = base.replace(/^[a-z]/, (c) => c.toUpperCase()) || `T${base}`;
    if (!/[a-z]/.test(base)) base += "a";
    if (!/\d/.test(base)) base += "1";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(base)) base += "!";
    while (base.length < 8) base += "0";
    return base;
  };

  const validateForm = () => {
    if (!form.first_name.trim())
      return showSingleToast("First Name is required.");
    if (!/^[A-Za-z ]*$/.test(form.first_name))
      return showSingleToast(
        "First Name must contain only letters and spaces.",
      );
    if (!form.last_name.trim())
      return showSingleToast("Last Name is required.");
    if (!/^[A-Za-z ]*$/.test(form.last_name))
      return showSingleToast("Last Name must contain only letters and spaces.");
    if (!form.mail.trim()) return showSingleToast("Email is required.");
    if (!/^[a-zA-Z0-9@._-]+$/.test(form.mail))
      return showSingleToast("Email contains invalid characters.");
    if (!form.contact.trim())
      return showSingleToast("Contact number is required.");

    const digitsOnly = form.contact.replace(/\D/g, "");
    if (digitsOnly.length < 8)
      return showSingleToast("Phone number seems too short.");

    if (!form.password.trim()) return showSingleToast("Password is required.");
    if (form.password.length < 6)
      return showSingleToast("Password must be at least 6 characters long.");

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !validateForm()) return;
    setLoading(true);

    const password = generatePasswordFromUser(form.first_name, form.contact);
    if (form.password !== password) {
      showSingleToast(
        "Password does not match the criteria. Please click 'Generate' again.",
        "error",
      );
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users`,
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onSuccess();
    } catch (err) {
      console.error("User creation failed:", err);
      showSingleToast(
        err?.response?.data?.detail || "Failed to create user.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-h-[80vh] bg-white rounded-md">
      {/* Scrollable form area */}
      <form
        onSubmit={handleSubmit}
        className="flex-grow overflow-y-auto p-4 space-y-3"
      >
        {/* First + Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormInput
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={(e) => {
              if (/^[A-Za-z ]*$/.test(e.target.value)) handleChange(e);
            }}
            placeholder="Enter first name"
            required
            labelClassName="text-xs"
            inputClassName="text-sm"
          />
          <FormInput
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={(e) => {
              if (/^[A-Za-z ]*$/.test(e.target.value)) handleChange(e);
            }}
            placeholder="Enter last name"
            required
            labelClassName="text-xs"
            inputClassName="text-sm"
          />
        </div>

        {/* Email */}
        <FormInput
          label="Email"
          type="email"
          name="mail"
          value={form.mail}
          onChange={(e) => {
            if (/^[a-zA-Z0-9@._-]*$/.test(e.target.value)) handleChange(e);
          }}
          placeholder="Enter email"
          required
          labelClassName="text-xs"
          inputClassName="text-sm"
        />

        {/* Contact */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Contact
          </label>
          <PhoneInput
            country={"us"}
            value={form.contact}
            onChange={(phone) =>
              setForm((prev) => ({ ...prev, contact: phone }))
            }
            countryCodeEditable={false}
            placeholder="Enter phone number"
            enableSearch={true}
            inputStyle={{
              width: "100%",
              padding: "6px 10px 6px 40px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
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
          />
        </div>

        {/* Password + Generate */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <FormInput
              type="text"
              name="password"
              value={form.password}
              onChange={handleChange}
              onFocus={() => {
                if (!form.password) {
                  const localGenerated = generatePasswordFromUser(
                    form.first_name,
                    form.contact,
                  );
                  if (localGenerated) {
                    setForm((prev) => ({ ...prev, password: localGenerated }));
                    setGeneratedPassword(localGenerated);
                  }
                }
              }}
              placeholder="Generate or enter a password"
              minLength={8}
              labelClassName="text-xs"
              inputClassName="text-sm"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={generating} // disable while generating
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                const suggestion = generatePasswordFromUser(
                  form.first_name,
                  form.contact,
                );
                if (suggestion) {
                  setForm((prev) => ({ ...prev, password: suggestion }));
                  setGeneratedPassword(suggestion);
                  showStatusToast(
                    "Password generated from current First Name & Contact.",
                    "info",
                  );
                } else {
                  showStatusToast("Failed to generate password.", "error");
                }
                setGenerating(false);
              }, 600); // short delay for UX (optional)
            }}
            className="whitespace-nowrap h-[34px]"
          >
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>

        {/* Active checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="is_active_modal"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="is_active_modal" className="text-xs text-gray-700">
            Active
          </label>
        </div>
      </form>

      {/* Fixed Footer (does not scroll) */}
      <div className="flex justify-start gap-3 p-3 border-t bg-gray-50 sticky bottom-0">
        <Button
          type="submit"
          variant="primary"
          size="small"
          disabled={loading}
          className="px-4"
          onClick={handleSubmit}
        >
          {loading ? "Creating..." : "Create User"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={onClose}
          disabled={loading}
          className="px-4"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
