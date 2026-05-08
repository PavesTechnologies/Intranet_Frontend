"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import FormInput from "../../../../components/forms/FormInput";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormSelect from "../../../../components/forms/FormSelect";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";

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
        showStatusToast("Failed to load epics or users", "error");
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
    if (!formData.title) return showStatusToast("Title is required", "error");
    if (!formData.reporterId) return showStatusToast("Reporter is required", "error");

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
      showStatusToast("Story created successfully!", "success");
      onCreated?.();
      onClose?.();
    } catch (err) {
      showStatusToast("Failed to create story", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Story" bodyClassName="p-4 pr-2">
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

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
            loading={loading}
            loadingText="Creating..."
          >
            Create Story
          </Button>
        </form>
    </Modal>
  );
};

export default CreateStoryForm;
