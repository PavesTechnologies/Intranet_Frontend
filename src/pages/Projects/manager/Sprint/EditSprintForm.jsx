import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";

const EditSprintForm = ({ sprintId, projectId, onClose, onUpdated }) => {
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    startedAt: "",
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
        const res = await api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const sprint = res.data;

        setFormData({
          name: sprint.name,
          goal: sprint.goal,
          startDate: sprint.startDate,
          startedAt: (sprint.startedAt ?? sprint.startDate)?.slice(0, 16),
          endDate: sprint.endDate?.slice(0, 16),
          status: sprint.status,
          projectId: sprint.projectId,
        });
      } catch (err) {
        showStatusToast("Sprint updated successfully!", "success");
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
      await api.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showStatusToast("Sprint updated successfully!", "success");

      onUpdated?.();
      onClose?.();
    } catch (err) {
      showStatusToast("Failed to load sprint details", "error");
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
          name="startedAt"
          className="w-full border p-2 rounded"
          value={formData.startedAt}
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

      {/* <div>
        <label className="block font-medium">Status</label>
        <FilterListbox
          options={[{value:"PLANNING",label:"Planning"},{value:"ACTIVE",label:"Active"},{value:"COMPLETED",label:"Completed"}]}
          value={formData.status}
          onChange={(val) => handleChange({ target: { name: "status", value: val } })}
        />
      </div> */}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>

        <Button variant="primary" type="submit">Update Sprint</Button>
      </div>
    </form>
  );
};

export default EditSprintForm;
