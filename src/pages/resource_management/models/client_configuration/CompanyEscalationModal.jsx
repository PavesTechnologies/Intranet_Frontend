import React, { useState, useEffect } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { toast } from "react-toastify";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";

const CompanyEscalationContactModal = ({
  initialData,
  onClose,
  onSave,
  loading,
  showButtons = true,
}) => {
  const { getEnumValues } = useEnums();
  const ESCALATION_LEVELS = getEnumValues("EscalationLevel");
  const isEditMode = Boolean(initialData);

  const [formData, setFormData] = useState({
    contactName: "",
    contactRole: "",
    email: "",
    phone: "",
    escalationLevel: ESCALATION_LEVELS[0] || "",
    activeFlag: true,
  });

  // Prefill data in edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({
        contactName: initialData.contactName || "",
        contactRole: initialData.contactRole || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        escalationLevel: initialData.escalationLevel || ESCALATION_LEVELS[0] || "",
        activeFlag:
          initialData.activeFlag !== undefined ? initialData.activeFlag : true,
      });
    }
  }, [initialData]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.contactName || !formData.contactRole || !formData.email) {
      toast.warning("Contact Name, Role and Email are mandatory");
      return;
    }
    if (isEditMode) {
      onSave({ ...initialData, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-5">
      {/* ===== ROW 1: NAME & ROLE ===== */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 items-start">
        {/* Contact Name */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Contact Name *
          </label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50"
            placeholder="John Doe"
            value={formData.contactName}
            onChange={(e) => handleChange("contactName", e.target.value)}
          />
        </div>

        {/* Role */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Contact Role *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "SELECT ROLE" },
              { value: "PROJECT_MANAGER", label: "PROJECT MANAGER" },
              { value: "DELIVERY_MANAGER", label: "DELIVERY MANAGER" },
              { value: "BU_HEAD", label: "BU HEAD" },
              { value: "RESOURCE_MANAGER", label: "RESOURCE MANAGER" },
            ]}
            value={formData.contactRole}
            onChange={(val) => handleChange("contactRole", val)}
          />
        </div>

        {/* ===== ROW 2: EMAIL & PHONE ===== */}
        {/* Email */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Email *
          </label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 transition-all outline-none bg-gray-50/50"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Phone
          </label>
          <PhoneInput
            country={"in"}
            value={formData.phone || ""}
            onChange={(value, country) => {
              const countryCode = `+${country.dialCode}`;
              const phoneNumber = value.slice(country.dialCode.length);
              setFormData({
                ...formData,
                phone: `${countryCode} ${phoneNumber}`,
              });
            }}
            inputClass="!w-full !py-2 !text-[13px] !rounded-xl !border-gray-200 !bg-gray-50/50"
            dropdownClass="custom-phone-dropdown"
            countryCodeEditable={false}
            preferredCountries={["us", "in", "gb", "ca"]}
            enableSearch
            inputProps={{
              name: "phone",
              required: true,
              autoFocus: false,
            }}
          />
        </div>

        {/* ===== ROW 3: LEVEL & STATUS ===== */}
        {/* Escalation Level */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Escalation Level
          </label>
          <FilterListbox
            options={[
              { value: "", label: "SELECT LEVEL" },
              ...ESCALATION_LEVELS.map((level) => ({
                value: level,
                label: level.replace(/_/g, " ").toUpperCase(),
              })),
            ]}
            value={formData.escalationLevel}
            onChange={(val) => handleChange("escalationLevel", val)}
          />
        </div>

        {/* Active Status */}
        <div className="pb-2">
          <label htmlFor="activeFlag" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="activeFlag"
              checked={formData.activeFlag}
              onChange={(e) => handleChange("activeFlag", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Active Status
            </span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      {showButtons && (
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95 text-[12px] uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-8 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md ${
              loading ? "opacity-50 cursor-not-allowed" : "active:scale-95"
            } text-[12px] uppercase tracking-wider`}
          >
            {isEditMode ? (loading ? "Updating..." : "Update") : (loading ? "Saving..." : "Save")}
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyEscalationContactModal;
