import React, { useState, useEffect } from "react";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { toast } from "react-toastify";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
 
const CompanyEscalationContactModal = ({
  initialData,
  onClose,
  onSave,
  loading,
}) => {
  const isEditMode = Boolean(initialData);
 
  const [formData, setFormData] = useState({
    contactName: "",
    contactRole: "",
    email: "",
    phone: "",
    escalationLevel: "Level-1",
    activeFlag: true,
  });
 
  // 🔹 Prefill data in edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({
        contactName: initialData.contactName || "",
        contactRole: initialData.contactRole || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        escalationLevel: initialData.escalationLevel || "Level-1",
        activeFlag:
          initialData.activeFlag !== undefined
            ? initialData.activeFlag
            : true,
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {isEditMode ? "Edit Escalation Contact" : "Add Escalation Contact"}
      </h3>
 
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact Name *</label>
          <input
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="John Doe"
            value={formData.contactName}
            onChange={(e) => handleChange("contactName", e.target.value)}
          />
        </div>

        {/* Role */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact Role *</label>
          <FilterListbox
            options={[
              { value: "", label: "Select Role" },
              { value: "PROJECT_MANAGER", label: "Project Manager" },
              { value: "DELIVERY_MANAGER", label: "Delivery Manager" },
              { value: "BU_HEAD", label: "BU Head" },
              { value: "RESOURCE_MANAGER", label: "Resource Manager" },
            ]}
            value={formData.contactRole}
            onChange={(val) => handleChange("contactRole", val)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email *</label>
          <input
            type="email"
            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</label>
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
            inputClass="!w-full !py-2 !text-base"
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        {/* Escalation Level */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Escalation Level</label>
          <FilterListbox
            options={[
              { value: "Level-1", label: "Level 1" },
              { value: "Level-2", label: "Level 2" },
              { value: "Level-3", label: "Level 3" },
            ]}
            value={formData.escalationLevel}
            onChange={(val) => handleChange("escalationLevel", val)}
          />
        </div>

        {/* Active Flag */}
        <div className="flex items-center gap-3 py-2">
          <label htmlFor="activeFlag" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="activeFlag"
              checked={formData.activeFlag}
              onChange={(e) => handleChange("activeFlag", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">Active Status</span>
          </label>
        </div>
      </div>
 
      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={loading}
          onClick={handleSubmit}
        >
          {isEditMode ? loading ? "Updating..." : "Update" : loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};
 
export default CompanyEscalationContactModal;
 
