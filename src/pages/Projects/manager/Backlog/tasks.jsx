import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import FilterListbox from "../../../../components/filter/FilterListbox";

const CreateTaskModal = ({ onTaskCreated }) => {
  const [showForm, setShowForm] = useState(true);

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    statusId: "",
    priority: "LOW",
    storyPoints: 0,
    estimatedHours: 0,
    dueDate: "",
    projectId: "",
    reporterId: "",
    assigneeId: "",
    storyId: "",
    sprintId: "",
    billable: true,
  });

  const token = localStorage.getItem("token");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes, storiesRes, sprintsRes] =
          await Promise.all([
            api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/users`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

        setUsers(usersRes.data.content || []);
        setProjects(projectsRes.data.content || []);
        setStories(storiesRes.data.content || []);
        setSprints(sprintsRes.data.content || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, [token]);

  // Fetch statuses when project is selected
  useEffect(() => {
    if (!formData.projectId) return;

    const fetchStatuses = async () => {
      try {
        const res = await api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${formData.projectId}/statuses`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setStatuses(res.data);
      } catch (err) {
        console.error("Error loading statuses:", err);
      }
    };

    fetchStatuses();
  }, [formData.projectId, token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        storyPoints: Number(formData.storyPoints),
        estimatedHours: Number(formData.estimatedHours) || 0,
        projectId: Number(formData.projectId),
        reporterId: Number(formData.reporterId),
        assigneeId: formData.assigneeId ? Number(formData.assigneeId) : null,
        sprintId: formData.sprintId ? Number(formData.sprintId) : null,
        storyId: formData.storyId ? Number(formData.storyId) : null,
        statusId: Number(formData.statusId),
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : null,
      };

      await api.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("Task created successfully!");
      onTaskCreated && onTaskCreated();

      setShowForm(false);
    } catch (err) {
      console.error("Task creation error:", err.response?.data || err.message);
      alert("Error creating task! Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative space-y-6 max-w-3xl mx-auto mt-10 p-6 border rounded-xl shadow-lg bg-white"
    >
      {/* Close */}
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-xl font-bold"
      >
        ×
      </button>

      <h2 className="text-2xl font-bold text-center text-gray-800">
        Create New Task
      </h2>

      {/* Title */}
      <input
        name="title"
        placeholder="Title *"
        value={formData.title}
        onChange={handleChange}
        required
        className="w-full border rounded px-4 py-2"
      />

      {/* Description */}
      <textarea
        name="description"
        placeholder="Description"
        rows={3}
        value={formData.description}
        onChange={handleChange}
        className="w-full border rounded px-4 py-2"
      />

      {/* Project */}
      <FilterListbox
        options={[{value:"",label:"Select Project *"},...projects.map(p=>({value:p.id,label:p.name}))]}
        value={formData.projectId}
        onChange={(val) => handleChange({ target: { name: "projectId", value: val } })}
      />

      {/* Status (dynamic) */}
      <FilterListbox
        options={[{value:"",label:"Select Status *"},...statuses.map(s=>({value:s.id,label:s.name}))]}
        value={formData.statusId}
        onChange={(val) => handleChange({ target: { name: "statusId", value: val } })}
      />

      {/* Priority */}
      <FilterListbox
        options={["LOW","MEDIUM","HIGH","CRITICAL"].map(p=>({value:p,label:p}))}
        value={formData.priority}
        onChange={(val) => handleChange({ target: { name: "priority", value: val } })}
      />

      {/* Story Points + Due Date */}
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          name="storyPoints"
          value={formData.storyPoints}
          onChange={handleChange}
          placeholder="Story Points"
          className="w-full border rounded px-4 py-2"
        />

        <input
          type="datetime-local"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          className="w-full border rounded px-4 py-2"
        />
      </div>

      {/* Estimated Hours */}
      <input
        type="number"
        name="estimatedHours"
        min="0"
        value={formData.estimatedHours}
        onChange={handleChange}
        placeholder="Estimated Hours"
        className="w-full border rounded px-4 py-2"
      />

      {/* Reporter */}
      <FilterListbox
        options={[{value:"",label:"Select Reporter *"},...users.map(u=>({value:u.id,label:u.name}))]}
        value={formData.reporterId}
        onChange={(val) => handleChange({ target: { name: "reporterId", value: val } })}
      />

      {/* Assignee */}
      <FilterListbox
        options={[{value:"",label:"Select Assignee (Optional)"},...users.map(u=>({value:u.id,label:u.name}))]}
        value={formData.assigneeId}
        onChange={(val) => handleChange({ target: { name: "assigneeId", value: val } })}
      />

      {/* Story */}
      <FilterListbox
        options={[{value:"",label:"Select Story"},...stories.map(s=>({value:s.id,label:s.title}))]}
        value={formData.storyId}
        onChange={(val) => handleChange({ target: { name: "storyId", value: val } })}
      />

      {/* Sprint */}
      <FilterListbox
        options={[{value:"",label:"Select Sprint"},...sprints.map(s=>({value:s.id,label:s.name}))]}
        value={formData.sprintId}
        onChange={(val) => handleChange({ target: { name: "sprintId", value: val } })}
      />

      {/* Billable */}
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="billable"
          checked={formData.billable}
          onChange={handleChange}
        />
        <span>Billable</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded"
      >
        {isSubmitting ? "Creating..." : "Create Task"}
      </button>
    </form>
  );
};

export default CreateTaskModal;
