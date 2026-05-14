import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import FormInput from "../../../../components/forms/FormInput";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

export default function EditUserForm({ userId, onSuccess, onClose }) {
  const [user, setUser] = useState({
    first_name: "",
    last_name: "",
    mail: "",
    contact: "",
    password: "",
    is_active: true,
  });

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: window.__APP_CONFIG__.USER_MANAGEMENT_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use((config) => {
      const latestToken = localStorage.getItem("token");

      if (latestToken) {
        config.headers.Authorization = `Bearer ${latestToken}`;
      }

      return config;
    });

    return instance;
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      try {
        setFetching(true);

        const res = await axiosInstance.get(`/admin/users/uuid/${userId}`);

        const { password, contact, ...rest } = res.data || {};

        setUser((prev) => ({
          ...prev,
          ...rest,
          password: "",
          contact: String(contact || "").replace(/\D/g, ""),
        }));
      } catch (err) {
        console.error("Failed to fetch user:", err);
        showStatusToast("Access denied or user not found.", "error");
        onClose();
      } finally {
        setFetching(false);
      }
    };

    fetchUser();
  }, [userId, axiosInstance, onClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!user.first_name.trim()) return "First Name is required.";

    if (!/^[A-Za-z ]*$/.test(user.first_name)) {
      return "First Name must contain only letters and spaces.";
    }

    if (!user.last_name.trim()) return "Last Name is required.";

    if (!/^[A-Za-z ]*$/.test(user.last_name)) {
      return "Last Name must contain only letters and spaces.";
    }

    if (!user.mail.trim()) return "Email is required.";

    if (!/^[a-zA-Z0-9@._-]+$/.test(user.mail)) {
      return "Email contains invalid characters.";
    }

    if (!user.contact.trim()) return "Contact number is required.";

    const digitsOnly = user.contact.replace(/\D/g, "");
    const phoneNumber = parsePhoneNumberFromString(`+${digitsOnly}`);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return "Invalid phone number for the selected country.";
    }

    if (
      phoneNumber.countryCallingCode === "91" &&
      phoneNumber.nationalNumber.length !== 10
    ) {
      return "Indian contact number must be exactly 10 digits.";
    }

    if (
      phoneNumber.countryCallingCode === "1" &&
      phoneNumber.nationalNumber.length !== 10
    ) {
      return "US contact number must be exactly 10 digits.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || isSubmittingRef.current) return;

    const validationError = validateForm();

    if (validationError) {
      showStatusToast(validationError, "error");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const digitsOnly = user.contact.replace(/\D/g, "");

      const payload = {
        first_name: user.first_name.trim(),
        last_name: user.last_name.trim(),
        mail: user.mail.trim(),
        contact: `+${digitsOnly}`,
        is_active: user.is_active,
      };

      if (user.password?.trim()) {
        payload.password = user.password.trim();
      }

      await axiosInstance.put(`/admin/users/uuid/${userId}`, payload);

      // showStatusToast("User updated successfully.", "success");

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (err) {
      console.error("Update failed:", err);

      showStatusToast(
        err.response?.data?.detail || "Failed to update user.",
        "error"
      );
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (fetching) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-12">
        <LoadingSpinner text="Loading user details..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl rounded-xl bg-white">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[70vh] flex-col overflow-hidden"
      >
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div>
            <h3 className={Fonts.heading4}>Edit User</h3>
            <p className={Fonts.paragraphMuted}>
              Update user information and save changes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="First Name"
              name="first_name"
              value={user.first_name}
              onChange={(e) => {
                if (/^[A-Za-z ]*$/.test(e.target.value)) handleChange(e);
              }}
              placeholder="Enter first name"
            />

            <FormInput
              label="Last Name"
              name="last_name"
              value={user.last_name}
              onChange={(e) => {
                if (/^[A-Za-z ]*$/.test(e.target.value)) handleChange(e);
              }}
              placeholder="Enter last name"
            />
          </div>

          <FormInput
            label="Email"
            name="mail"
            type="email"
            value={user.mail}
            onChange={(e) => {
              if (/^[a-zA-Z0-9@._-]*$/.test(e.target.value)) handleChange(e);
            }}
            placeholder="Enter email"
          />

          <div className="space-y-1">
            <label className={Fonts.label}>Contact</label>

            <PhoneInput
              country="in"
              value={user.contact}
              onChange={(phone) => {
                setUser((prev) => ({
                  ...prev,
                  contact: String(phone || "").replace(/\D/g, ""),
                }));
              }}
              enableSearch={true}
              countryCodeEditable={false}
              disableDropdown={false}
              placeholder="Enter phone number"
              inputStyle={{
                width: "100%",
                height: "42px",
                padding: "0px 12px 0px 48px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "0.875rem",
                backgroundColor: "white",
              }}
              buttonStyle={{
                border: "1px solid #d1d5db",
                borderRight: "none",
                borderRadius: "10px 0 0 10px",
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

          <FormInput
            label="New Password (Optional)"
            name="password"
            type="password"
            value={user.password}
            onChange={handleChange}
            placeholder="Leave blank to keep current password"
          />
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || isSubmittingRef.current}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            loadingText="Saving..."
            disabled={loading || isSubmittingRef.current}
            className="w-full sm:w-auto"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}