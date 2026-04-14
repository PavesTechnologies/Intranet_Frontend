import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { X } from "lucide-react";

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
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/bugs/${bugId}`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/members-with-owner`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
              axiosConfig,
            ),
            axios.get(
              `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
              axiosConfig,
            ),
            axios.get(
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
        toast.error("❌ Failed to load bug details.");
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
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/bugs/${bugId}`,
        payload,
        axiosConfig,
      );
      toast.success("✅ Bug updated successfully!");
      setTimeout(() => {
        onUpdated?.();
        onClose?.();
      }, 1000);
    } catch (error) {
      console.error("Error updating bug:", error.response || error);
      toast.error(error.response?.data?.message || "❌ Failed to update bug.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <p className="text-gray-600 text-center">Loading bug details...</p>;

  // 🟩 Render
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto scrollbar-hide">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={20} />
        </button>

        {/* Toast notifications */}
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
        />

        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Edit Bug
        </h2>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Bug"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditBugForm;
