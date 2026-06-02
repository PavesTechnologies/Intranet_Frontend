import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import { showStatusToast } from "../../../../components/toastfy/toast";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";

import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";

const EditBugForm = ({ bugId, projectId, onClose, onUpdated }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [tasks, setTasks] = useState([]);

  const token = localStorage.getItem("token");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  // 🟦 Fetch bug + related data
  useEffect(() => {
    const fetchData = async () => {
      if (!bugId || !projectId) return;
      setLoading(true);
      try {
        const [bugRes, membersRes, sprintsRes, epicsRes, tasksRes] =
          await Promise.all([
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/bugs/${bugId}`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
              axiosConfig,
            ),
            api.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/tasks`,
              axiosConfig,
            ),
          ]);

        const bug = bugRes.data;

        setFormData({
          title: bug.title || "",
          description: bug.description || "",
          priority: bug.priority || "MEDIUM",
          status: bug.status || "OPEN",
          severity: bug.severity || "MINOR",
          type: bug.type || "",
          assignedTo: bug.assignedTo || bug.assigneeId || null,
          reporter: bug.reporter || bug.reporterId || null,
          projectId: Number(projectId),
          sprintId: bug.sprintId || null,
          epicId: bug.epicId || null,
          taskId: bug.taskId || null,
          stepsToReproduce: bug.stepsToReproduce || "",
          expectedResult: bug.expectedResult || "",
          actualResult: bug.actualResult || "",
          attachments: bug.attachments || "",
        });

        setUsers(membersRes.data || []);
        setSprints(sprintsRes.data || []);
        setEpics(epicsRes.data || []);
        setTasks(tasksRes.data || []);
      } catch (error) {
        console.error("Error loading bug data:", error);
        showStatusToast("Failed to load bug details.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bugId, projectId]);

  // 🟧 Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: [
        "assignedTo",
        "reporter",
        "sprintId",
        "epicId",
        "taskId",
      ].includes(name)
        ? value
          ? Number(value)
          : null
        : value,
    }));
  };

  // 🟥 Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bugId) return;

    const payload = {
      ...formData,
      projectId: Number(projectId),
    };

    try {
      setLoading(true);
      await api.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/bugs/${bugId}`,
        payload,
        axiosConfig,
      );
      showStatusToast("Bug updated successfully!", "success");
      setTimeout(() => {
        onUpdated?.();
        onClose?.();
      }, 1000);
    } catch (error) {
      console.error("Error updating bug:", error.response || error);
      showStatusToast(error.response?.data?.message || "Failed to update bug.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="md" text="Loading bug details..." />;

  // 🟩 Render
  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Bug" className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Status *"
              name="status"
              value={formData.status || "OPEN"}
              onChange={handleChange}
              options={[
                { label: "Open", value: "OPEN" },
                { label: "In Progress", value: "IN_PROGRESS" },
                { label: "Resolved", value: "RESOLVED" },
                { label: "Closed", value: "CLOSED" },
                { label: "Reopened", value: "REOPENED" },
              ]}
            />

            <FormSelect
              label="Priority *"
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
          </div>

          <FormSelect
            label="Severity *"
            name="severity"
            value={formData.severity || "MAJOR"}
            onChange={handleChange}
            options={[
              { label: "Minor", value: "MINOR" },
              { label: "Major", value: "MAJOR" },
              { label: "Blocker", value: "BLOCKER" },
            ]}
          />

          <FormInput
            label="Type"
            name="type"
            value={formData.type || ""}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Task"
              name="taskId"
              value={formData.taskId || ""}
              onChange={handleChange}
              options={[
                { label: "Select", value: "" },
                ...tasks.map((t) => ({ label: t.title, value: t.id })),
              ]}
            />

            <FormSelect
              label="Sprint"
              name="sprintId"
              value={formData.sprintId || ""}
              onChange={handleChange}
              options={[
                { label: "Select", value: "" },
                ...sprints.map((s) => ({ label: s.name, value: s.id })),
              ]}
            />
          </div>

          <FormSelect
            label="Epic"
            name="epicId"
            value={formData.epicId || ""}
            onChange={handleChange}
            options={[
              { label: "Select", value: "" },
              ...epics.map((e) => ({ label: e.name, value: e.id })),
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Assignee"
              name="assignedTo"
              value={formData.assignedTo || ""}
              onChange={handleChange}
              options={[
                { label: "Select", value: "" },
                ...users.map((u) => ({ label: u.name, value: u.id })),
              ]}
            />

            <FormSelect
              label="Reporter"
              name="reporter"
              value={formData.reporter || ""}
              onChange={handleChange}
              options={[
                { label: "Select", value: "" },
                ...users.map((u) => ({ label: u.name, value: u.id })),
              ]}
            />
          </div>

          <FormTextArea
            label="Steps to Reproduce"
            name="stepsToReproduce"
            value={formData.stepsToReproduce || ""}
            onChange={handleChange}
          />

          <FormTextArea
            label="Expected Result"
            name="expectedResult"
            value={formData.expectedResult || ""}
            onChange={handleChange}
          />

          <FormTextArea
            label="Actual Result"
            name="actualResult"
            value={formData.actualResult || ""}
            onChange={handleChange}
          />

          <FormInput
            label="Attachments (URL or path)"
            name="attachments"
            value={formData.attachments || ""}
            onChange={handleChange}
          />

          <Button variant="primary" type="submit" disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Bug"}
          </Button>
        </form>
    </Modal>
  );
};

export default EditBugForm;
