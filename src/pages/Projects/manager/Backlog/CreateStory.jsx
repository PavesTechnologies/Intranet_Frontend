"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import FormInput from "../../../../components/forms/FormInput";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormSelect from "../../../../components/forms/FormSelect";

const CreateStoryForm = ({
  projectId,
  onClose,
  onCreated,
  defaultStatusId,
  defaultSprintId,
}) => {
  const [formData, setFormData] = useState({
    projectId,
    statusId: defaultStatusId,
    sprintId: defaultSprintId,
    priority: "LOW",
  });

  const [epics, setEpics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      statusId: defaultStatusId,
      sprintId: defaultSprintId,
    }));
  }, [defaultStatusId, defaultSprintId]);

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      try {
        const [epicsRes, usersRes] = await Promise.all([
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
            axiosConfig,
          ),
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
            axiosConfig,
          ),
        ]);
        setEpics(epicsRes.data || []);
        setUsers(usersRes.data || []);
      } catch (err) {
        toast.error("Failed to load epics or users");
      }
    };

    loadData();
  }, [projectId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Title is required");
    if (!formData.reporterId) return toast.error("Reporter is required");

    const payload = {
      title: formData.title,
      description: formData.description || null,
      acceptanceCriteria: formData.acceptanceCriteria || null,
      storyPoints: Number(formData.storyPoints) || 0,
      assigneeId: Number(formData.assigneeId) || null,
      reporterId: Number(formData.reporterId),
      sprintId: Number(formData.sprintId) || null,
      epicId: Number(formData.epicId) || null,
      statusId: Number(formData.statusId),
      priority: formData.priority || "LOW",
      projectId,
    };

    try {
      setLoading(true);
      await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories`,
        payload,
        axiosConfig,
      );
      toast.success("Story created successfully!");
      onCreated?.();
      onClose?.();
    } catch (err) {
      toast.error("Failed to create story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-auto p-4">
      <ToastContainer />
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4 text-center">Create Story</h2>

        <form
          onSubmit={submit}
          className="space-y-4 max-h-[80vh] overflow-y-auto pr-2"
        >
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
          <FormTextArea
            label="Acceptance Criteria"
            name="acceptanceCriteria"
            value={formData.acceptanceCriteria || ""}
            onChange={handleChange}
          />
          <FormInput
            label="Story Points"
            name="storyPoints"
            type="number"
            value={formData.storyPoints || ""}
            onChange={handleChange}
          />

          <FormSelect
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            options={[
              { label: "LOW", value: "LOW" },
              { label: "MEDIUM", value: "MEDIUM" },
              { label: "HIGH", value: "HIGH" },
              { label: "CRITICAL", value: "CRITICAL" },
            ]}
          />

          <FormSelect
            label="Epic"
            name="epicId"
            value={formData.epicId || ""}
            onChange={handleChange}
            options={epics.map((e) => ({ label: e.name, value: e.id }))}
          />

          <input
            type="hidden"
            name="sprintId"
            value={formData.sprintId || ""}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg"
          >
            {loading ? "Creating..." : "Create Story"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateStoryForm;
