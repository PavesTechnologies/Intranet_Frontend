import React, { useState } from "react";
import { X } from "lucide-react";

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
            <select
              name="requirement_type"
              value={formData.requirement_type}
              onChange={handleChange}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select type</option>
              <option value="Certification">Certification</option>
              <option value="Clearance">Clearance</option>
              <option value="Tool Access">Tool Access</option>
            </select>
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
            <select
              name="mandatory_flag"
              value={formData.mandatory_flag}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  mandatory_flag: e.target.value === "true",
                }))
              }
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="active_flag"
              value={formData.active_flag}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  active_flag: e.target.value === "true",
                }))
              }
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
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
