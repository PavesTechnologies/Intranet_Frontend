import React, { useEffect, useState } from "react";
import axios from "axios";
import Button from "../../../../components/Button/Button";

const CreateUserStory = ({ onClose }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [storyPoints, setStoryPoints] = useState(1);
  const [priority, setPriority] = useState("MEDIUM");

  const [projectId, setProjectId] = useState(null);
  const [epicId, setEpicId] = useState(null);
  const [reporterId, setReporterId] = useState(null);
  const [assigneeId, setAssigneeId] = useState(null);
  const [sprintId, setSprintId] = useState(null);
  const [statusId, setStatusId] = useState(null);

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const token = localStorage.getItem("token");

  // Load users, projects, sprints
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersRes, projectsRes, sprintsRes] = await Promise.all([
          axios.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setUsers(usersRes.data?.content ?? usersRes.data ?? []);
        setProjects(projectsRes.data?.content ?? projectsRes.data ?? []);
        setSprints(sprintsRes.data?.content ?? sprintsRes.data ?? []);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      }
    };

    loadInitialData();
  }, [token]);

  // Load Epics when project changes
  useEffect(() => {
    if (!projectId) return;

    axios
      .get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then((res) => setEpics(res.data?.content ?? res.data ?? []))
      .catch(() => setEpics([]));
  }, [projectId, token]);

  // Load Statuses when project changes
  useEffect(() => {
    if (!projectId) return;

    axios
      .get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/statuses`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then((res) => setStatuses(res.data?.content ?? res.data ?? []))
      .catch(() => setStatuses([]));
  }, [projectId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title,
      description,
      acceptanceCriteria,
      storyPoints: Number(storyPoints),
      assigneeId,
      reporterId,
      projectId,
      epicId,
      sprintId: sprintId || 0,
      statusId,
      priority,
    };

    try {
      const res = await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("Story created:", res.data);
      onClose();
    } catch (error) {
      console.error("Error creating story:", error);
      alert(error?.response?.data?.message ?? "Failed to create story");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Create User Story</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          className="w-full border px-3 py-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          className="w-full border px-3 py-2 rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <textarea
          placeholder="Acceptance Criteria"
          className="w-full border px-3 py-2 rounded"
          value={acceptanceCriteria}
          onChange={(e) => setAcceptanceCriteria(e.target.value)}
        />

        {/* Story Points */}
        <input
          type="number"
          min="1"
          className="w-full border px-3 py-2 rounded"
          value={storyPoints}
          onChange={(e) => setStoryPoints(Number(e.target.value))}
        />

        {/* Project Selection */}
        <select
          className="w-full border px-3 py-2 rounded"
          value={projectId ?? ""}
          onChange={(e) => setProjectId(Number(e.target.value))}
          required
        >
          <option value="">Select Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Epic */}
        <select
          className="w-full border px-3 py-2 rounded"
          value={epicId ?? ""}
          onChange={(e) => setEpicId(Number(e.target.value))}
          required
        >
          <option value="">Select Epic</option>
          {epics.map((epic) => (
            <option key={epic.id} value={epic.id}>
              {epic.name}
            </option>
          ))}
        </select>

        {/* Reporter */}
        <select
          className="w-full border px-3 py-2 rounded"
          value={reporterId ?? ""}
          onChange={(e) => setReporterId(Number(e.target.value))}
          required
        >
          <option value="">Select Reporter</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Assignee */}
        <select
          className="w-full border px-3 py-2 rounded"
          value={assigneeId ?? ""}
          onChange={(e) => setAssigneeId(Number(e.target.value))}
          required
        >
          <option value="">Select Assignee</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Sprint */}
        <select
          className="w-full border px-3 py-2 rounded"
          value={sprintId ?? ""}
          onChange={(e) => setSprintId(Number(e.target.value))}
        >
          <option value="">Select Sprint (Optional)</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          className="w-full border px-3 py-2 rounded"
          value={statusId ?? ""}
          onChange={(e) => setStatusId(Number(e.target.value))}
          required
        >
          <option value="">Select Status</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Create</Button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserStory;
