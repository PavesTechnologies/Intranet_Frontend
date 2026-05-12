import React, { useEffect, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { showStatusToast } from "../../../../components/toastfy/toast";

import EpicFields from "./Fields/EpicFields";
import StoryFields from "./Fields/StoryFields";
import TaskFields from "./Fields/TaskFields";
import BugFields from "./Fields/BugFields";

import { normalizeId } from "./helpers/normalize";
import { toISODate } from "./helpers/dataParser";
import  Button  from "../../../../components/Button/Button";

// import FormInput from "@/components/forms/FormInput";
// import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "../../../../components/forms/FormSelect";
// import FormDatePicker from "@/components/forms/FormDatePicker";

import {
  validateEpic,
  validateStory,
  validateTask,
  validateBug,
} from "./helpers/validations";

import {
  buildEpicPayload,
  buildStoryPayload,
  buildTaskPayload,
  buildBugPayload,
} from "./helpers/payloadBuilder";

import { issueDependencyMap } from "./helpers/apiDependencies";

const CreateIssueForm = ({
  issueType: defaultIssueType = "Epic",
  initialData = {},
  projectId: initialProjectId = null,
  onClose,
  onCreated,
}) => {
  const [issueType, setIssueType] = useState(defaultIssueType);

  const [formData, setFormData] = useState({
    projectId: initialProjectId,
    ...initialData,
  });

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [epics, setEpics] = useState([]);
  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [selectedStorySprint, setSelectedStorySprint] = useState(null);

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  // ------------ Fetch projects & users -----------
  useEffect(() => {
    const init = async () => {
      try {
        const pid = initialProjectId;
        const [projectsRes, usersRes] = await Promise.all([
          axios.get(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`,
            axiosConfig,
          ),
          pid
            ? axios.get(
                `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${pid}/members-with-owner`,
                axiosConfig,
              )
            : Promise.resolve({ data: [] }),
        ]);

        setProjects(projectsRes.data?.content || projectsRes.data || []);
        setUsers(usersRes.data?.content || usersRes.data || []);
      } catch (e) {
        showStatusToast("Failed loading initial project or user data", "error");
      }
    };
    init();
  }, []);

  // -------- Load dependent data based on issue type -------
  useEffect(() => {
    const loadDependencies = async () => {
      const pid = formData.projectId;
      if (!pid) return;

      setLoading(true);
      const base = window.__APP_CONFIG__.PMS_BASE_URL;

      const deps = issueDependencyMap[issueType];
      const requests = [];
      const setters = [];

      deps.forEach((dep) => {
        if (dep === "statuses") {
          requests.push(
            axios.get(`${base}/api/projects/${pid}/statuses`, axiosConfig),
          );
          setters.push((res) => setStatuses(res.data || []));
        }
        if (dep === "epics") {
          requests.push(
            axios.get(`${base}/api/projects/${pid}/epics`, axiosConfig),
          );
          setters.push((res) => setEpics(res.data || []));
        }
        if (dep === "stories") {
          requests.push(
            axios.get(`${base}/api/projects/${pid}/stories`, axiosConfig),
          );
          setters.push((res) => setStories(res.data || []));
        }
        if (dep === "tasks") {
          requests.push(
            axios.get(`${base}/api/projects/${pid}/tasks`, axiosConfig),
          );
          setters.push((res) => setTasks(res.data || []));
        }
        if (dep === "sprints") {
          requests.push(
            axios.get(`${base}/api/projects/${pid}/sprints`, axiosConfig),
          );
          setters.push((res) => setSprints(res.data || []));
        }
      });

      try {
        const responses = await Promise.all(requests);
        responses.forEach((res, idx) => setters[idx](res));
      } catch (e) {
        showStatusToast("Failed loading project dependencies", "error");
      } finally {
        setLoading(false);
      }
    };

    loadDependencies();
  }, [issueType, formData.projectId]);

  // ------- Track sprint if Story changes --------
  useEffect(() => {
    if (!formData.storyId) return setSelectedStorySprint(null);
    const picked = stories.find((s) => s.id === Number(formData.storyId));
    if (picked) {
      const sid = picked.sprint?.id ?? picked.sprintId ?? null;
      setSelectedStorySprint(sid ? Number(sid) : null);
    }
  }, [formData.storyId, stories]);

  // -------- form updates ----------
  const handleChange = (e) => {
    const { name, value, checked } = e.target;

    setFormData((prev) => {
      const updated = { ...prev };

      if (name === "isBillable") {
        updated[name] = value === "true" || checked === true;
        return updated;
      }

      const idFields = [
        "projectId",
        "epicId",
        "storyId",
        "sprintId",
        "reporterId",
        "assigneeId",
        "statusId",
        "taskId",
      ];
      if (idFields.includes(name)) {
        updated[name] = normalizeId(value);

        if (name === "storyId") {
          const st = stories.find((s) => s.id === Number(value));
          updated.sprintId = st ? (st.sprint?.id ?? st.sprintId ?? null) : null;
        }

        return updated;
      }

      updated[name] = value;
      return updated;
    });
  };

  // -------- validation + payload + submit ----------
  const handleSubmit = async () => {
    const fd = formData;
    let endpoint = "";
    let payload = null;
    let err = null;

    if (issueType === "Epic") {
      if (formData.startDate && formData.dueDate) {
        if (new Date(formData.dueDate) < new Date(formData.startDate)) {
          showStatusToast("Due date cannot be earlier than start date", "error");
          return;
        }
      }
      err = validateEpic(fd);
      if (!err) payload = buildEpicPayload(fd);
      endpoint = "/api/epics";
    }

    if (issueType === "Story") {
      if (formData.startDate && formData.dueDate) {
        if (new Date(formData.dueDate) < new Date(formData.startDate)) {
          showStatusToast("Due date cannot be earlier than start date", "error");
          return;
        }
      }

      err = validateStory(fd);
      if (!err) payload = buildStoryPayload(fd);
      endpoint = "/api/stories";
    }

    if (issueType === "Task") {
      if (formData.startDate && formData.dueDate) {
        if (new Date(formData.dueDate) < new Date(formData.startDate)) {
          showStatusToast("Due date cannot be earlier than start date", "error");
          return;
        }
      }
      err = validateTask(fd);
      if (!err) payload = buildTaskPayload(fd, selectedStorySprint);
      endpoint = "/api/tasks";
    }

    // if (issueType === "Bug") {
    //   err = validateBug(fd);
    //   if (!err) payload = buildBugPayload(fd);
    //   endpoint = "/api/bugs";
    // }

    if (err) return showStatusToast(err, "error");

    try {
      await axios.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}${endpoint}`,
        payload,
        axiosConfig,
      );
      showStatusToast(`${issueType} created successfully!`, "success");
      setTimeout(() => {
        onCreated?.();
        onClose?.();
      }, 500);
    } catch (e) {
      console.error(e);

      const data = e.response?.data;

      // Case 1: structured validation errors
      if (data?.errors) {
        Object.entries(data.errors).forEach(([field, message]) => {
          showStatusToast(`${field}: ${message}`, "error");
        });
        return;
      }

      // Case 2: old hibernate interpolatedMessage error
      const msg = data?.message;
      if (msg && msg.includes("interpolatedMessage")) {
        const extracted = msg.match(/interpolatedMessage='([^']+)'/);
        showStatusToast(extracted ? extracted[1] : "Validation error", "error");
        return;
      }

      // Case 3: normal backend error message
      showStatusToast(msg || "Error creating issue", "error");
    }
  };

  const selectedProject = projects.find(
    (p) => p.id === formData.projectId || p.id === initialProjectId,
  );

  const today = new Date().toISOString().split("T")[0];

  // -----------------------------------------------------------
  //                UI  (Jira-Like Wide Modal)
  // -----------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white w-[85%] h-[85%] rounded-xl shadow-xl flex flex-col overflow-hidden">
        {/* ------ HEADER ------ */}
        <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-semibold">Create {issueType}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* -------- BODY -------- */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <div className="w-[28%] border-r p-6 bg-gray-50 overflow-y-auto space-y-6">
            <FormSelect
              label="Issue Type"
              name="issueType"
              value={issueType}
              onChange={(e) => {
                const next = e.target.value;
                setIssueType(next);
                setFormData({ projectId: initialProjectId });
                setEpics([]);
                setStories([]);
                setTasks([]);
                setSprints([]);
                setStatuses([]);
                setSelectedStorySprint(null);
              }}
              options={[
                { label: "Epic", value: "Epic" },
                { label: "Story", value: "Story" },
                { label: "Task", value: "Task" },
                // { label: "Bug", value: "Bug" },
              ]}
            />

            <div>
              <label className="text-sm font-medium text-gray-700">
                Project *
              </label>
              <div className="mt-1 px-3 py-2 bg-gray-200 rounded-md">
                {selectedProject ? selectedProject.name : "--"}
              </div>
            </div>

            {loading && (
              <div className="text-sm text-gray-500">Loading project data…</div>
            )}
          </div>

          {/* RIGHT FORM AREA */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">

            {issueType === "Epic" && (
              <EpicFields
                formData={formData}
                onChange={handleChange}
                statuses={statuses}
                today={today}
              />
            )}

            {issueType === "Story" && (
              <StoryFields
                formData={formData}
                onChange={handleChange}
                statuses={statuses}
                epics={epics}
                sprints={sprints}
                users={users}
                today={today}
              />
            )}

            {issueType === "Task" && (
              <TaskFields
                formData={formData}
                onChange={handleChange}
                statuses={statuses}
                stories={stories}
                sprints={sprints}
                users={users}
                today={today}
              />
            )}

            {issueType === "Bug" && (
              <BugFields
                formData={formData}
                onChange={handleChange}
                epics={epics}
                tasks={tasks}
                sprints={sprints}
                users={users}
              />
            )}
          </div>
        </div>

        {/* ------- FOOTER ------- */}
        <div className="border-t px-6 py-3 flex justify-end gap-3 bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Create {issueType}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateIssueForm;
