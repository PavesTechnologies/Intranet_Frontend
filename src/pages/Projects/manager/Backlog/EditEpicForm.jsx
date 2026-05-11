import React, { useEffect, useState } from "react";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { X } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";

const Wrapper = ({ children, mode, onClose }) => {
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
  return <div className="w-full h-full flex flex-col bg-white">{children}</div>;
};

const EditEpicForm = ({
  epicId,
  projectId,
  onClose,
  onUpdated,
  mode = "modal", // Preserved your default preference for this one based on previous implementation
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    statusId: "",
    priority: "MEDIUM",
    startDate: "",
    dueDate: "",
  });

  const [originalData, setOriginalData] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [createdDate, setCreatedDate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const today = new Date().toISOString().split("T")[0];

  // ===================== LOAD INITIAL DATA =====================
  useEffect(() => {
    const loadData = async () => {
      try {
        const requests = [
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
            axiosConfig,
          ),
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/statuses`,
            axiosConfig,
          ),
        ];

        if (epicId) {
          requests.push(
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/epics/${epicId}`,
              axiosConfig,
            ),
          );
        }

        const responses = await Promise.all(requests);

        setProjectName(responses[0].data.name || "");
        setStatuses(responses[1].data || []);

        if (epicId && responses[2]) {
          const epic = responses[2].data;
          const normalized = {
            name: epic.name || "",
            description: epic.description || "",
            statusId: epic.statusId ? String(epic.statusId) : "",
            priority: epic.priority || "MEDIUM",
            startDate: epic.startDate ? epic.startDate.split("T")[0] : "",
            dueDate: epic.dueDate ? epic.dueDate.split("T")[0] : "",
          };

          setOriginalData(normalized);
          setFormData(normalized);
          setCreatedDate(epic.createdAt ? epic.createdAt.split("T")[0] : null);
        } else {
          setCreatedDate(today);
        }
      } catch (err) {
        console.error("Error loading epic:", err);
        showStatusToast("Failed to load epic details.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [epicId, projectId]);

  // ===================== HANDLE INPUT =====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ===================== VALIDATION =====================
  const validateForm = () => {
    const name = formData.name?.trim();
    if (!name || name.length < 2 || name.length > 200) {
      showStatusToast("Epic name must be between 2 and 200 characters.", "error");
      return false;
    }
    if (createdDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(createdDate)) {
        showStatusToast("Due date cannot be earlier than the created date.", "error");
        return false;
      }
    }
    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        showStatusToast("Due date cannot be earlier than the start date.", "error");
        return false;
      }
    }
    return true;
  };

  // ===================== BUILD PAYLOAD =====================
  const buildUpdatedPayload = () => {
    return {
      name: formData.name,
      description: formData.description,
      statusId: formData.statusId !== "" ? Number(formData.statusId) : null,
      priority: formData.priority,
      startDate: formData.startDate ? `${formData.startDate}T00:00:00` : null,
      dueDate: formData.dueDate ? `${formData.dueDate}T00:00:00` : null,
    };
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const updatedPayload = buildUpdatedPayload();
    updatedPayload.projectId = Number(projectId);

    try {
      if (epicId) {
        await axios.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/epics/${epicId}`,
          updatedPayload,
          axiosConfig,
        );
        showStatusToast("Epic updated successfully!", "success");
      }
      // Add POST logic here later if needed when creating

      setTimeout(() => {
        onUpdated?.();
        onClose?.();
      }, 300);
    } catch (err) {
      console.error("Error saving epic:", err);
      showStatusToast(err.response?.data?.message || "Failed to save epic.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================== UI =====================
  if (loading) {
    return (
      <Wrapper mode={mode} onClose={onClose}>
        <div className="flex-1 flex items-center justify-center py-10">
          <LoadingSpinner size="md" text="Loading epic details..." />
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper mode={mode} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">
            {epicId ? "Edit Epic" : "Create Epic"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <FormInput
            label="Project"
            name="projectName"
            value={projectName}
            readOnly
            disabled
          />

        <FormInput
          label="Epic Name *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <FormTextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            options={[
              { label: "Low", value: "LOW" },
              { label: "Medium", value: "MEDIUM" },
              { label: "High", value: "HIGH" },
              { label: "Critical", value: "CRITICAL" },
            ]}
          />
          {/* <FormSelect
            label="Status *"
            name="statusId"
            value={formData.statusId}
            onChange={handleChange}
            options={[
              { label: "Select Status", value: "" },
              ...statuses.map((s) => ({ label: s.name, value: String(s.id) })),
            ]}
          /> */}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormDatePicker
            label="Start Date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
          />
          <FormDatePicker
            label="Due Date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
          />
        </div>

        {createdDate && (
          <p className="text-sm text-gray-500 italic">
            Created On: {createdDate}
          </p>
        )}
      </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3 shrink-0">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : epicId ? "Save Changes" : "Create Epic"}</Button>
        </div>
      </form>
    </Wrapper>
  );
};

export default EditEpicForm;
