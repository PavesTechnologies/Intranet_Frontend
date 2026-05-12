import React, { useState, useEffect } from "react";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { toast } from "react-toastify";
 
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
 
      {/* Contact Name */}
      <input
        className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Contact Name"
        value={formData.contactName}
        onChange={(e) => handleChange("contactName", e.target.value)}
      />
 
      {/* Role */}
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
 
      {/* Email */}
      <input
        type="email"
        className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => handleChange("email", e.target.value)}
      />
 
      {/* Phone */}
      <input
        className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Phone"
        value={formData.phone}
        onChange={(e) => handleChange("phone", e.target.value)}
      />
 
      {/* Escalation Level */}
      <FilterListbox
        options={[
          { value: "Level-1", label: "Level 1" },
          { value: "Level-2", label: "Level 2" },
          { value: "Level-3", label: "Level 3" },
        ]}
        value={formData.escalationLevel}
        onChange={(val) => handleChange("escalationLevel", val)}
      />
 
      {/* Active Flag */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.activeFlag}
          onChange={(e) => handleChange("activeFlag", e.target.checked)}
        />
        Active
      </label>
 
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
 