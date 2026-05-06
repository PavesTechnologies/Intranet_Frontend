import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const EditSprintForm = ({ sprintId, projectId, onClose, onUpdated }) => {
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
    status: "",
    projectId: projectId,
  });

  const [loading, setLoading] = useState(false);

  // Load sprint details
  useEffect(() => {
    const fetchSprint = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const sprint = res.data;

        setFormData({
          name: sprint.name,
          goal: sprint.goal,
          startDate: sprint.startDate?.slice(0, 16),
          endDate: sprint.endDate?.slice(0, 16),
          status: sprint.status,
          projectId: sprint.projectId,
        });
      } catch (err) {
        toast.success("Sprint updated successfully!", { autoClose: 3000, containerId: "global" });
      } finally {
        setLoading(false);
      }
    };

    fetchSprint();
  }, [sprintId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      projectId: parseInt(projectId),
    };

    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showStatusToast("Sprint updated successfully!", "success", 3000);

      onUpdated?.();
      onClose?.();
    } catch (err) {
      toast.error("Failed to load sprint details", { autoClose: 3000, containerId: "global" });
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <p className="text-center text-gray-500">Loading sprint...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block font-medium">Sprint Name</label>
        <input
          type="text"
          name="name"
          className="w-full border p-2 rounded"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="block font-medium">Goal</label>
        <textarea
          name="goal"
          className="w-full border p-2 rounded"
          rows={3}
          value={formData.goal || ""}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block font-medium">Start Date</label>
        <input
          type="datetime-local"
          name="startDate"
          className="w-full border p-2 rounded"
          value={formData.startDate}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block font-medium">End Date</label>
        <input
          type="datetime-local"
          name="endDate"
          className="w-full border p-2 rounded"
          value={formData.endDate}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block font-medium">Status</label>
        <select
          name="status"
          className="w-full border p-2 rounded"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Update Sprint
        </button>
      </div>
    </form>
  );
};

export default EditSprintForm;
