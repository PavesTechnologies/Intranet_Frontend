import React, { useState } from "react";
import { X } from "lucide-react";
import FilterListbox from "../../../../../components/filter/FilterListbox";

const CreateComplianceModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    requirement_type: "",
    requirement_name: "",
    mandatory_flag: true,
    active_flag: true,
  });

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // 🔹 MOCK SAVE (for now)
    console.log("Compliance Requirement Saved:", formData);

    // Later:
    // - validate duplicates
    // - store per client
    // - send to backend

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg">

        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Compliance Requirement
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* ===== Body ===== */}
        <div className="px-6 py-5 space-y-4">

          {/* Requirement Type */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Requirement Type <span className="text-red-500">*</span>
            </label>
            <FilterListbox
              options={[
                { value: "", label: "Select type" },
                { value: "Certification", label: "Certification" },
                { value: "Clearance", label: "Clearance" },
                { value: "Tool Access", label: "Tool Access" },
              ]}
              value={formData.requirement_type}
              onChange={(val) => handleChange({ target: { name: "requirement_type", value: val } })}
            />
          </div>

          {/* Requirement Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Requirement Name <span className="text-red-500">*</span>
            </label>
            <input
              name="requirement_name"
              value={formData.requirement_name}
              onChange={handleChange}
              placeholder="e.g. ISO 27001, VPN Access"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Mandatory Flag */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Mandatory
            </label>
            <FilterListbox
              options={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
              value={String(formData.mandatory_flag)}
              onChange={(val) => setFormData((prev) => ({ ...prev, mandatory_flag: val === "true" }))}
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Status
            </label>
            <FilterListbox
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={String(formData.active_flag)}
              onChange={(val) => setFormData((prev) => ({ ...prev, active_flag: val === "true" }))}
            />
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              !formData.requirement_type ||
              !formData.requirement_name
            }
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            Save Requirement
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateComplianceModal;
