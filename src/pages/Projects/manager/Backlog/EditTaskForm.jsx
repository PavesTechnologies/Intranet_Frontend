import React, { useEffect, useState } from "react";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { X } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";

// 🔥 Moved Wrapper OUTSIDE to prevent focus loss on re-render
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

const EditTaskForm = ({
  taskId,
  projectId,
  onClose,
  onUpdated,
  mode = "drawer",
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    statusId: "",
    sprintId: "",
    assigneeId: "",
    reporterId: "",
    storyId: "",
    startDate: "",
    dueDate: "",
    billable: "false",
  });

  const [originalData, setOriginalData] = useState(null);
  const [users, setUsers] = useState([]);
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!taskId || !projectId) return null;

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const today = new Date().toISOString().split("T")[0];

  // 🔥 Fetch Task + Dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, userRes, storyRes, sprintRes, statusRes] =
          await Promise.all([
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/statuses`,
              axiosConfig,
            ),
          ]);

        const task = taskRes.data;

        // 🔥 Ensure all IDs are strings (VERY IMPORTANT for prefill)
        const normalized = {
          title: task.title ?? "",
          description: task.description ?? "",
          priority: task.priority ?? "MEDIUM",

          statusId: task.statusId ? String(task.statusId) : "",
          storyId: task.storyId ? String(task.storyId) : "",
          sprintId: task.sprintId ? String(task.sprintId) : "",
          assigneeId: task.assigneeId ? String(task.assigneeId) : "",
          reporterId: task.reporterId ? String(task.reporterId) : "",

          startDate: task.startDate ? task.startDate.split("T")[0] : "",
          dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
          billable: task.billable ? "true" : "false",
        };

        setOriginalData(normalized);
        setFormData(normalized);

        setUsers(userRes.data.content || userRes.data || []);
        setStories(storyRes.data || []);
        setSprints(sprintRes.data || []);
        setStatuses(statusRes.data || []);
      } catch (err) {
        console.error(err);
        showStatusToast("Failed to load task details", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId, projectId]);

  // 🔥 Handle Input Change (Keep values as STRING)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔥 Build Changed Fields Only
  //   const buildUpdatedPayload = () => {

  //     const dateKeys = ["startDate", "dueDate"];
  //     if (!originalData) return formData;
  //     const payload = {};

  //     const numericKeys = [
  //       "statusId",
  //       "sprintId",
  //       "assigneeId",
  //       "reporterId",
  //       "storyId",
  //     ];

  //     Object.keys(formData).forEach((key) => {
  //       if (String(formData[key]) !== String(originalData[key])) {
  //         if (key === "billable") {
  //           payload[key] = formData[key] === "true";
  //         } else if (numericKeys.includes(key)) {
  //           // Convert to Number, or send null if cleared out
  //           payload[key] = formData[key] !== "" ? Number(formData[key]) : null;
  //         } else if (dateKeys.includes(key)) {
  //   payload[key] = formData[key] ? `${formData[key]}T00:00:00` : null;
  // } else {
  //   payload[key] = formData[key];
  // }
  //       }
  //     });

  //     return payload;
  //   };

  // 🔥 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const numericKeys = [
      "statusId",
      "sprintId",
      "assigneeId",
      "reporterId",
      "storyId",
    ];

    const updatedPayload = {
      ...formData,
      projectId: Number(projectId),
    };

    numericKeys.forEach((key) => {
      if (updatedPayload[key] !== "") {
        updatedPayload[key] = Number(updatedPayload[key]);
      }
    });

    updatedPayload.billable = updatedPayload.billable === "true";

    // 🔥 convert LocalDate to LocalDateTime
    if (updatedPayload.startDate) {
      updatedPayload.startDate = `${updatedPayload.startDate}T00:00:00`;
    }

    if (updatedPayload.dueDate) {
      updatedPayload.dueDate = `${updatedPayload.dueDate}T00:00:00`;
    }

    // date validation
    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        showStatusToast("Due date cannot be earlier than the start date.", "error");
        return;
      }
    }

    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}`,
        updatedPayload,
        axiosConfig,
      );

      showStatusToast("Task updated successfully!", "success");

      setTimeout(() => {
        onUpdated?.();
        onClose?.();
      }, 500);
    } catch (error) {
      console.error(error);
      showStatusToast(error.response?.data?.message || "Failed to update task", "error");
    }
  };

  if (loading) {
    return (
      <Wrapper mode={mode} onClose={onClose}>
        <div className="text-center py-10">Loading task...</div>
      </Wrapper>
    );
  }

  // UI
  return (
    <Wrapper mode={mode} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Task</h2>
          <button type="button" onClick={onClose}>
            <X className="text-gray-600 hover:text-gray-900" />
          </button>
        </div>

        {/* BODY (scrollable) */}
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

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Story"
            name="storyId"
            value={formData.storyId}
            onChange={handleChange}
            options={[
              { label: "Select Story", value: "" },
              ...stories.map((story) => ({
                label: story.title,
                value: String(story.id),
              })),
            ]}
          />

          <FormSelect
            label="Sprint"
            name="sprintId"
            value={formData.sprintId}
            onChange={handleChange}
            options={[
              { label: "Select Sprint", value: "" },
              ...sprints.map((s) => ({
                label: s.name,
                value: String(s.id),
              })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Status *"
            name="statusId"
            value={formData.statusId}
            onChange={handleChange}
            options={[
              { label: "Select Status", value: "" },
              ...statuses.map((st) => ({
                label: st.name,
                value: String(st.id),
              })),
            ]}
          />

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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Assignee"
            name="assigneeId"
            value={formData.assigneeId}
            onChange={handleChange}
            options={[
              { label: "Unassigned", value: "" },
              ...users.map((u) => ({
                label: u.name,
                value: String(u.id),
              })),
            ]}
          />

          <FormSelect
            label="Reporter *"
            name="reporterId"
            value={formData.reporterId}
            onChange={handleChange}
            options={[
              { label: "Select Reporter", value: "" },
              ...users.map((u) => ({
                label: u.name,
                value: String(u.id),
              })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormDatePicker
            label="Start Date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            min={today}
          />

          <FormDatePicker
            label="Due Date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            min={today}
          />
        </div>

        <FormSelect
          label="Billable"
          name="billable"
          value={formData.billable}
          onChange={handleChange}
          options={[
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ]}
        />
      </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>

          <Button variant="primary" type="submit">Save Changes</Button>
        </div>
      </form>
    </Wrapper>
  );
};

export default EditTaskForm;
