import React, { useEffect, useState } from "react";
import axios from "axios";
import SprintColumn from "./SprintColumn";

const SprintBoard = ({ projectId, projectName }) => {
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [filter, setFilter] = useState("ALL");

  // Get JWT token from localStorage
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStories = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
        { headers },
      );
      setStories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load stories:", err);
      setStories([]);
    }
  };

  const fetchSprints = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
        { headers },
      );
      setSprints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load sprints:", err);
      setSprints([]);
    }
  };

  useEffect(() => {
    fetchStories();
    fetchSprints();
  }, [projectId]);

  const handleStatusChange = async (sprintId, action) => {
    try {
      const response = await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/${action}`,
        {},
        { headers },
      );
      const updatedSprint = response.data;

      setSprints((prev) =>
        prev.map((s) => (s.id === sprintId ? updatedSprint : s)),
      );

      await fetchStories();
    } catch (error) {
      console.error(`Failed to ${action} sprint:`, error);
    }
  };

  const filteredSprints =
    filter === "ALL" ? sprints : sprints.filter((s) => s.status === filter);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-indigo-900">
          Sprint Planning of {projectName}
        </h2>
      </div>

      {/* Filter Dropdown */}
      <div className="flex gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded bg-white text-gray-800"
        >
          <option value="ALL">ALL</option>
          <option value="PLANNING">PLANNING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      {/* Sprint Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSprints.map((sprint) => (
          <div key={sprint.id} className="bg-white rounded-2xl shadow p-6">
            <SprintColumn
              sprint={sprint}
              stories={stories.filter((story) => story.sprintId === sprint.id)}
              onChangeStatus={handleStatusChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SprintBoard;
