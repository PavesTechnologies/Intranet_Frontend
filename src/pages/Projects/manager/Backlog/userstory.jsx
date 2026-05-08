import React, { useEffect, useState } from "react";
import axios from "axios";
import FilterListbox from "../../../../components/filter/FilterListbox";

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
        <FilterListbox
          options={[{value:"",label:"Select Project"},...projects.map(p=>({value:p.id,label:p.name}))]}
          value={projectId ?? ""}
          onChange={setProjectId}
        />

        {/* Epic */}
        <FilterListbox
          options={[{value:"",label:"Select Epic"},...epics.map(epic=>({value:epic.id,label:epic.name}))]}
          value={epicId ?? ""}
          onChange={setEpicId}
        />

        {/* Reporter */}
        <FilterListbox
          options={[{value:"",label:"Select Reporter"},...users.map(u=>({value:u.id,label:u.name}))]}
          value={reporterId ?? ""}
          onChange={setReporterId}
        />

        {/* Assignee */}
        <FilterListbox
          options={[{value:"",label:"Select Assignee"},...users.map(u=>({value:u.id,label:u.name}))]}
          value={assigneeId ?? ""}
          onChange={setAssigneeId}
        />

        {/* Sprint */}
        <FilterListbox
          options={[{value:"",label:"Select Sprint (Optional)"},...sprints.map(s=>({value:s.id,label:s.name}))]}
          value={sprintId ?? ""}
          onChange={setSprintId}
        />

        {/* Status */}
        <FilterListbox
          options={[{value:"",label:"Select Status"},...statuses.map(s=>({value:s.id,label:s.name}))]}
          value={statusId ?? ""}
          onChange={setStatusId}
        />

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserStory;
