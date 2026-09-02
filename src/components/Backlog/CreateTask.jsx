import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { showStatusToast } from "../toastfy/toast";
import FormInput from "../forms/FormInput";
import Modal from "../Modal/modal";
import Button from "../Button/Button";
import FormTextArea from "../forms/FormTextArea";
import FormSelect from "../forms/FormSelect";
import FormDatePicker from "../forms/FormDatePicker";

const CreateTaskForm = ({
  projectId,
  onClose,
  onCreated,
  defaultStatusId,
  defaultSprintId,
}) => {
  // 1. Define 'today' to resolve the ReferenceError
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    projectId,
    title: "",
    description: "",
    statusId: defaultStatusId || "",
    sprintId: defaultSprintId || "",
    storyId: "",
    priority: "MEDIUM",
    reporterId: "",
    assigneeId: "",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    isBillable: "false",
  });

  const [stories, setStories] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStorySprint, setSelectedStorySprint] = useState(
    defaultSprintId || null,
  );
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  // Helper for date formatting
  const toISODate = (date) => (date ? new Date(date).toISOString().split('T')[0] : null);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      try {
        const [storyRes, userRes] = await Promise.all([
          api.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/sprint/${defaultSprintId}`,
            axiosConfig
          ),
          api.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
            axiosConfig,
          ),
        ]);
        setStories(storyRes.data || []);
        setUsers(userRes.data || []);
      } catch (err) {
        showStatusToast("Failed to load project details", "error");
        console.error(err);
      }
    };
    load();
  }, [projectId]);

  useEffect(() => {
    const selectedStory = stories.find(
      (s) => s.id === Number(formData.storyId),
    );
    setSelectedStorySprint(
      selectedStory?.sprint?.id ?? selectedStory?.sprintId ?? defaultSprintId,
    );
  }, [formData.storyId, stories, defaultSprintId]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.statusId || !formData.reporterId)
      return showStatusToast("Title, Status, and Reporter are required", "error");

    // 2. Fixed references: Changed 'd.startDate' to 'formData.startDate'
    const payload = {
      title: formData.title,
      description: formData.description || null,
      statusId: Number(formData.statusId),
      priority: formData.priority || "MEDIUM",
      storyId: Number(formData.storyId) || null,
      reporterId: Number(formData.reporterId),
      assigneeId: Number(formData.assigneeId) || null,
      sprintId: Number(formData.sprintId) || selectedStorySprint || null,
      startDate: toISODate(formData.startDate),
      dueDate: toISODate(formData.dueDate),
      estimatedHours: Number(formData.estimatedHours) || 0,
      billable: formData.isBillable === "true",
      projectId,
    };

    try {
      setLoading(true);
      const res = await api.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks`,
        payload,
        axiosConfig,
      );
      showStatusToast("Task created successfully!", "success");
      setTimeout(() => {
        onCreated?.(res.data);
        onClose?.();
      }, 500);
    } catch (err) {
      showStatusToast("Failed to create task", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Task">
        <form onSubmit={submit} className="space-y-4">
          <FormInput
            label="Title *"
            name="title"
            value={formData.title || ""}
            onChange={handleChange}
            required
          />
          <FormTextArea
            label="Description"
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
          />
          <FormSelect
            label="Story "
            name="storyId"
            value={formData.storyId || ""}
            onChange={handleChange}
            options={stories.map((s) => ({ label: s.title, value: s.id }))}
            required
          />
          <FormSelect
            label="Priority"
            name="priority"
            value={formData.priority || "MEDIUM"}
            onChange={handleChange}
            options={[
              { label: "Low", value: "LOW" },
              { label: "Medium", value: "MEDIUM" },
              { label: "High", value: "HIGH" },
              { label: "Critical", value: "CRITICAL" },
            ]}
          />
          <FormSelect
            label="Assignee"
            name="assigneeId"
            value={formData.assigneeId || ""}
            onChange={handleChange}
            options={users.map((u) => ({ label: u.name, value: u.id }))}
          />
          <FormSelect
            label="Reporter *"
            name="reporterId"
            value={formData.reporterId || ""}
            onChange={handleChange}
            options={users.map((u) => ({ label: u.name, value: u.id }))}
          />

          <FormDatePicker
            label="Start Date"
            name="startDate"
            value={formData.startDate || ""}
            onChange={handleChange}
            min={today}
          />

          <FormDatePicker
            label="Due Date"
            name="dueDate"
            value={formData.dueDate || ""}
            onChange={handleChange}
            min={today}
          />

          <FormInput
            label="Estimated Hours"
            name="estimatedHours"
            type="number"
            min="0"
            value={formData.estimatedHours ?? ""}
            onChange={handleChange}
          />

          <FormSelect
            label="Billable"
            name="isBillable"
            value={formData.isBillable || "false"}
            onChange={handleChange}
            options={[
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ]}
          />

          <Button variant="primary" type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </form>
    </Modal>
  );
};

export default CreateTaskForm;