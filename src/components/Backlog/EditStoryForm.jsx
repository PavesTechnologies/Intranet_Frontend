import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { showStatusToast } from "../toastfy/toast";
import LoadingSpinner from "../LoadingSpinner";
import { X } from "lucide-react";

import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import FormTextArea from "../forms/FormTextArea";
import FormDatePicker from "../forms/FormDatePicker";
import Button from "../Button/Button";

// ===================== WRAPPER =====================
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

  // Drawer Mode
  return (
    <div
      className="w-full h-full flex flex-col bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

const EditStoryForm = ({
  storyId,
  projectId,
  onClose,
  onUpdated,
  mode = "drawer",
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    acceptanceCriteria: "",
    storyPoints: null,
    priority: "MEDIUM",
    epicId: null,
    sprintId: null,
    statusId: null,
    assigneeId: null,
    reporterId: null,
  });

  const [users, setUsers] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  // ===================== LOAD INITIAL DATA =====================
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storyRes, userRes, epicRes, sprintRes, statusRes] =
          await Promise.all([
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/statuses`,
              axiosConfig,
            ),
          ]);

        const data = storyRes.data;

        setFormData({
          title: data.title || "",
          description: data.description || "",
          acceptanceCriteria: data.acceptanceCriteria || "",
          storyPoints: data.storyPoints || "",
          priority: data.priority || "MEDIUM",
          epicId: data.epicId || "",
          sprintId: data.sprintId || "",
          statusId: data.statusId || "",
          assigneeId: data.assigneeId || "",
          reporterId: data.reporterId || "",
          startDate: data.startDate || "",
          dueDate: data.dueDate || "",
        });

        setUsers(userRes.data.content || userRes.data || []);
        setEpics(epicRes.data || []);
        setSprints(sprintRes.data || []);
        setStatuses(statusRes.data || []);
      } catch (err) {
        console.error("Error loading story:", err);
        showStatusToast("Failed to load story.", "error");
      } finally {
        setLoading(false);
      }
    };

    if (storyId && projectId) loadData();
  }, [storyId, projectId]);

  // ===================== HANDLE INPUT =====================
  const handleChange = (e) => {
    const { name, value } = e.target;

    const numericFields = [
      "epicId",
      "sprintId",
      "assigneeId",
      "reporterId",
      "storyPoints",
      "statusId",
    ];

    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? value
          ? Number(value)
          : null
        : value,
    }));
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async (e) => {
    if (!validateForm()) return;
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: formData.title,
      description: formData.description,
      acceptanceCriteria: formData.acceptanceCriteria,
      storyPoints: formData.storyPoints,
      assigneeId: formData.assigneeId,
      reporterId: formData.reporterId,
      projectId: Number(projectId),
      epicId: formData.epicId,
      sprintId: formData.sprintId,
       statusId: formData.statusId,
      priority: formData.priority,

      startDate: formData.startDate
        ? new Date(formData.startDate).toISOString()
        : null,

      dueDate: formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : null,
    };

    try {
      await api.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
        payload,
        axiosConfig,
      );

      showStatusToast("Story updated successfully!", "success");
      setTimeout(() => {
        onUpdated?.();
        onClose?.();
      }, 500);
    } catch (error) {
      console.error("Error updating:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update story";

      showStatusToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const title = formData.title?.trim();

    // Required validation
    if (!title) {
      showStatusToast("Story title is required.", "error");
      return false;
    }

    // Length validation
    if (title.length < 2 || title.length > 200) {
      showStatusToast("Story title must be between 2 and 200 characters.", "error");
      return false;
    }

    // Start Date vs Due Date validation
    if (formData.startDate && formData.dueDate) {
      const start = new Date(formData.startDate);
      const due = new Date(formData.dueDate);
      if (due < start) {
        showStatusToast("Due date cannot be earlier than the start date.", "error");
        return false;
      }
    }

    return true;
  };

  // ===================== LOADING STATE =====================
  if (loading) {
    return (
      <Wrapper mode={mode} onClose={onClose}>
        <div className="flex-1 flex items-center justify-center py-10">
          <LoadingSpinner size="md" text="Loading story details..." />
        </div>
      </Wrapper>
    );
  }

  // ===================== UI =====================
  return (
    <Wrapper mode={mode} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Edit User Story</h2>
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
            label="Title *"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />

        <FormTextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
        />

        <FormSelect
          label="Epic"
          name="epicId"
          value={formData.epicId || ""}
          onChange={handleChange}
          options={[
            { label: "Select Epic", value: "" },
            ...epics.map((e) => ({ label: e.name, value: e.id })),
          ]}
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
            value={formData.statusId || ""}
            onChange={handleChange}
            options={[
              { label: "Select Status", value: "" },
              ...statuses.map((s) => ({ label: s.name, value: s.id })),
            ]}
          /> */}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Story Points"
            name="storyPoints"
            type="number"
            value={formData.storyPoints || ""}
            onChange={handleChange}
          />

          <FormSelect
            label="Sprint"
            name="sprintId"
            value={formData.sprintId || ""}
            onChange={handleChange}
            options={[
              { label: "Select Sprint", value: "" },
              ...sprints.map((s) => ({ label: s.name, value: s.id })),
            ]}
          />
        </div>

        <FormTextArea
          label="Acceptance Criteria"
          name="acceptanceCriteria"
          value={formData.acceptanceCriteria}
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Assignee"
            name="assigneeId"
            value={formData.assigneeId || ""}
            onChange={handleChange}
            options={[
              { label: "Select Assignee", value: "" },
              ...users.map((u) => ({ label: u.name, value: u.id })),
            ]}
          />

          <FormSelect
            label="Reporter"
            name="reporterId"
            value={formData.reporterId || ""}
            onChange={handleChange}
            options={[
              { label: "Select Reporter", value: "" },
              ...users.map((u) => ({ label: u.name, value: u.id })),
            ]}
          />

          <FormDatePicker
            label="Start Date"
            name="startDate"
            value={formData.startDate || ""}
            onChange={handleChange}
          />

          <FormDatePicker
            label="Due Date"
            name="dueDate"
            value={formData.dueDate || ""}
            onChange={handleChange}
          />
        </div>
      </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3 shrink-0">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>

          <Button variant="primary" type="submit" disabled={loading}>Update Story</Button>
        </div>
      </form>
    </Wrapper>
  );
};

export default EditStoryForm;
