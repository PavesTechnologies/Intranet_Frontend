import React, { useState } from "react";
import { CloseIcon } from "@/components/icons";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import Modal from "../../../../../components/Modal/modal";
import Button from "../../../../../components/Button/Button";

const CreateEscalationModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_role: "",
    email: "",
    phone: "",
    escalation_level: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // console.log("Escalation Contact Saved:", formData);
    onClose();
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        variant="ghost"
        onClick={onClose}
        className="px-4 py-2 text-sm"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={
          !formData.contact_name ||
          !formData.contact_role ||
          !formData.email ||
          !formData.escalation_level
        }
        className="px-4 py-2 text-sm bg-indigo-600 text-white"
      >
        Save Contact
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Add Escalation Contact"
      footer={footer}
      size="md"
      closeIcon={<CloseIcon size={18} />}
    >
      <div className="space-y-4">
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
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Escalation Level */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Escalation Level <span className="text-red-500">*</span>
          </label>
          <FilterListbox
            options={[
              { value: "", label: "Select level" },
              { value: "1", label: "Level 1" },
              { value: "2", label: "Level 2" },
              { value: "3", label: "Level 3" },
            ]}
            value={formData.escalation_level}
            onChange={(val) => handleChange({ target: { name: "escalation_level", value: val } })}
          />
        </div>
      </div>
    </Modal>
  );
};

export default CreateEscalationModal;
