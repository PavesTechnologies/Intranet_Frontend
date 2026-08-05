import React, { useState } from "react";
import { CloseIcon } from "@/components/icons";
import FilterListbox from "../../../../../components/filter/FilterListbox";

const CreateSLAModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    sla_type: "",
    sla_duration_days: "",
    warning_threshold_days: "",
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
    // console.log("SLA Configuration Saved:", formData);

    // Later:
    // - validate
    // - push into JSON array
    // - send to backend

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg">

        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Add SLA Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* ===== Body ===== */}
        <div className="px-6 py-5 space-y-4">

          {/* SLA Type */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              SLA Type <span className="text-red-500">*</span>
            </label>
            <FilterListbox
              options={[
                { value: "", label: "Select SLA type" },
                { value: "New Demand", label: "New Demand" },
                { value: "Replacement", label: "Replacement" },
                { value: "Emergency", label: "Emergency" },
              ]}
              value={formData.sla_type}
              onChange={(val) => handleChange({ target: { name: "sla_type", value: val } })}
            />
          </div>

          {/* SLA Duration */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              SLA Duration (Days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="sla_duration_days"
              value={formData.sla_duration_days}
              onWheel={(e) => e.target.blur()}
              onChange={handleChange}
              placeholder="e.g. 15"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Warning Threshold */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Warning Threshold (Days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="warning_threshold_days"
              value={formData.warning_threshold_days}
              onWheel={(e) => e.target.blur()}
              onChange={handleChange}
              placeholder="e.g. 5"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
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
              !formData.sla_type ||
              !formData.sla_duration_days ||
              !formData.warning_threshold_days
            }
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            Save SLA
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSLAModal;
