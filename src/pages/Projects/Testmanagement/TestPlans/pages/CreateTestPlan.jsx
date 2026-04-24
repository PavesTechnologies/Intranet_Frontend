import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import FormInput from "../../../../../components/forms/FormInput";
import FormTextArea from "../../../../../components/forms/FormTextArea";

// Wrapper component
const Wrapper = ({ mode, onClose, children }) => {
  if (mode === "modal") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-lg relative max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return <div className="w-full h-full bg-white flex flex-col">{children}</div>;
};

const CreateTestPlan = ({ projectId, onClose, onSuccess, mode = "modal" }) => {
  const token = localStorage.getItem("token");
  const createdBy = localStorage.getItem("userId");

  const [formData, setFormData] = useState({
    name: "",
    objective: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Test Plan Name is required.");
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name,
      objective: formData.objective,
      projectId: Number(projectId),
      createdBy: Number(createdBy),
    };

    try {
      await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/plans`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      toast.success("Test Plan created successfully");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create Test Plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper mode={mode} onClose={onClose}>
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-xl font-semibold">Create Test Plan</h2>
        <button type="button" onClick={onClose}>
          <X className="text-gray-600" />
        </button>
      </div>

      {/* BODY */}
      <form
        className="p-6 overflow-y-auto flex-1 space-y-6"
        onSubmit={handleSubmit}
      >
        <FormInput
          label="Test Plan Name *"
          name="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          required
        />

        <FormTextArea
          label="Objective"
          name="objective"
          value={formData.objective}
          onChange={(e) => handleChange("objective", e.target.value)}
          placeholder="What is the purpose of this test plan?"
        />

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${
              loading ? "opacity-60" : ""
            }`}
          >
            {loading ? "Creating..." : "Create Test Plan"}
          </button>
        </div>
      </form>
    </Wrapper>
  );
};

export default CreateTestPlan;
