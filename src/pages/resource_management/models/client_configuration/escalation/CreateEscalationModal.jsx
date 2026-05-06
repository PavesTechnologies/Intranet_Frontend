import React, { useState } from "react";
import { X } from "lucide-react";

const CreateEscalationModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_role: "",
    email: "",
    phone: "",
    escalation_level: "",
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
    console.log("Escalation Contact Saved:", formData);

    // Later:
    // - validate escalation level uniqueness
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
            Add Escalation Contact
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

          {/* Contact Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Role <span className="text-red-500">*</span>
            </label>
            <input
              name="contact_role"
              value={formData.contact_role}
              onChange={handleChange}
              placeholder="e.g. Delivery Manager"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john.doe@client.com"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +91 9876543210"
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Escalation Level */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Escalation Level <span className="text-red-500">*</span>
            </label>
            <select
              name="escalation_level"
              value={formData.escalation_level}
              onChange={handleChange}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select level</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
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
              !formData.contact_name ||
              !formData.contact_role ||
              !formData.email ||
              !formData.escalation_level
            }
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            Save Contact
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEscalationModal;
