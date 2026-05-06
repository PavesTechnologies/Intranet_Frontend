import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { X } from "lucide-react";
import FormInput from "../../../../components/forms/FormInput";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";

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
          axios.get(
            `${import.meta.env.VITE_PMS_BASE_URL}/api/stories/sprint/${defaultSprintId}`,
            axiosConfig
          ),
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
            axiosConfig,
          ),
        ]);
        setStories(storyRes.data || []);
        setUsers(userRes.data || []);
      } catch (err) {
        toast.error("Failed to load project details");
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
      return toast.error("Title, Status, and Reporter are required");

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
      billable: formData.isBillable === "true",
      projectId,
    };

    try {
      setLoading(true);
      const res = await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks`,
        payload,
        axiosConfig,
      );
      toast.success("Task created successfully!");
      setTimeout(() => {
        onCreated?.(res.data);
        onClose?.();
      }, 500);
    } catch (err) {
      toast.error("Failed to create task");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-[500px] max-w-full max-h-[90vh] overflow-y-auto relative">
        <ToastContainer />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-center">Create Task</h2>

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
            label="Story *"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskForm;