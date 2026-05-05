import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../contexts/AuthContext";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import Button from "../../../components/Button/Button";

const ReadOnlyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || user?.user_id;
  const userName = user?.name || "User";

  const [projects, setProjects] = useState([]);
  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [expandedProjects, setExpandedProjects] = useState(null);
  const [expandedStories, setExpandedStories] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(null);

  // Filters
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [storyFilter, setStoryFilter] = useState("ALL");
  const [taskFilter, setTaskFilter] = useState("ALL");

  const token = localStorage.getItem("token");

  const axiosInstance = axios.create({
    baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
    headers: { "Content-Type": "application/json" },
  });

  axiosInstance.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  useEffect(() => {
    if (!userId) {
      setError("User not logged in or token missing");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectRes, storyRes, taskRes] = await Promise.all([
          axiosInstance.get(`/api/projects/member/${userId}`),
          axiosInstance.get(`/api/stories/assignee/${userId}`),
          axiosInstance.get(`/api/tasks/assignee/${userId}`),
        ]);

        setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
        setStories(Array.isArray(storyRes.data) ? storyRes.data : []);
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
      } catch (err) {
        console.error("Error fetching data:", err.response || err);
        setError("Failed to load user data");
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const toggleExpand = (id, type) => {
    if (type === "project")
      setExpandedProjects(expandedProjects === id ? null : id);
    if (type === "story")
      setExpandedStories(expandedStories === id ? null : id);
    if (type === "task") setExpandedTasks(expandedTasks === id ? null : id);
  };

  // 🔹 PROJECT RENDER
  const renderProject = (project) => (
    <li key={project.id} className="bg-white rounded-xl shadow p-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => toggleExpand(project.id, "project")}
      >
        <div className="flex items-center gap-2">
          {expandedProjects === project.id ? <ChevronDown /> : <ChevronRight />}
          <h2 className="text-xl font-semibold">{project.name}</h2>
          <span className="text-gray-500 text-sm">({project.projectKey})</span>
        </div>
      </div>

      {expandedProjects === project.id && (
        <div className="mt-4 border-t pt-4 text-gray-700 text-sm space-y-2">
          {project.description && (
            <p>
              <strong>Description:</strong> {project.description}
            </p>
          )}

          <p>
            <strong>Status:</strong> {project.status}
          </p>

          {project.owner && (
            <p>
              <strong>Owner:</strong> {project.owner.name}
            </p>
          )}

          {project.members?.length > 0 && (
            <p>
              <strong>Members:</strong>{" "}
              {project.members.map((m) => m.name).join(", ")}
            </p>
          )}

          {project.createdAt && (
            <p>
              <strong>Created At:</strong>{" "}
              {new Date(project.createdAt).toLocaleString()}
            </p>
          )}

          {project.updatedAt && (
            <p>
              <strong>Updated At:</strong>{" "}
              {new Date(project.updatedAt).toLocaleString()}
            </p>
          )}

          <div className="pt-2">
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate(`/projects/user/${project.id}`)}
            >
              Go to Project Tabs
            </Button>
          </div>
        </div>
      )}
    </li>
  );

  // 🔹 STORY RENDER
  const renderStory = (story) => {
    const projectId =
      story?.project?.id || story?.epic?.project?.id || story?.epic?.projectId;

    return (
      <li key={story.id} className="bg-white rounded-xl shadow p-4">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleExpand(story.id, "story")}
        >
          <div className="flex items-center gap-2">
            {expandedStories === story.id ? <ChevronDown /> : <ChevronRight />}
            <h2 className="text-lg font-semibold">{story.title}</h2>
            <span className="text-gray-500 text-sm">({story.status})</span>
          </div>
        </div>

        {expandedStories === story.id && (
          <div className="mt-2 border-t pt-2 text-gray-700 text-sm space-y-1">
            <p>
              <strong>Description:</strong> {story.description || "—"}
            </p>

            {story.epic && (
              <p>
                <strong>Epic:</strong> {story.epic.title}
              </p>
            )}

            {story.reporter && (
              <p>
                <strong>Reporter:</strong> {story.reporter.name}
              </p>
            )}

            {story.assignee && (
              <p>
                <strong>Assignee:</strong> {story.assignee.name}
              </p>
            )}

            {projectId && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  Go to Project Tabs
                </Button>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  // 🔹 TASK RENDER
  const renderTask = (task) => {
    const projectId =
      task?.story?.project?.id || task?.project?.id || task?.story?.projectId;

    return (
      <li key={task.id} className="bg-white rounded-xl shadow p-4">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleExpand(task.id, "task")}
        >
          <div className="flex items-center gap-2">
            {expandedTasks === task.id ? <ChevronDown /> : <ChevronRight />}
            <h2 className="text-lg font-semibold">{task.title}</h2>
            <span className="text-gray-500 text-sm">({task.status})</span>
          </div>
        </div>

        {expandedTasks === task.id && (
          <div className="mt-2 border-t pt-2 text-gray-700 text-sm space-y-1">
            <p>
              <strong>Description:</strong> {task.description || "—"}
            </p>

            {task.story && (
              <p>
                <strong>Story:</strong> {task.story.title}
              </p>
            )}

            {task.assignee && (
              <p>
                <strong>Assignee:</strong> {task.assignee.name}
              </p>
            )}

            {task.reporter && (
              <p>
                <strong>Reporter:</strong> {task.reporter.name}
              </p>
            )}

            {projectId && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  Go to Project Tabs
                </Button>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  // 🔹 FILTERING — FIXED & CLEANED
  const filteredProjects = projects.filter(
    (p) => projectFilter === "ALL" || p.status === projectFilter,
  );

  const filteredStories = stories.filter((s) => {
    if (storyFilter === "ALL") return true;

    return (
      s.status === storyFilter ||
      s.statusName === storyFilter ||
      s.statusId === storyFilter ||
      s.status?.name === storyFilter ||
      s.storyName === storyFilter
    );
  });

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "ALL") return true;

    return (
      t.status === taskFilter ||
      t.statusName === taskFilter ||
      t.statusId === taskFilter
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <ToastContainer />

      <h1 className="text-2xl font-bold mb-4 text-indigo-900">
        {userName} — Your Projects
      </h1>

      {loading && <p className="text-gray-600">Loading data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* PROJECTS */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Projects</h2>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>

        {filteredProjects.length === 0 ? (
          <p className="text-gray-500">No projects found.</p>
        ) : (
          <ul className="space-y-3">{filteredProjects.map(renderProject)}</ul>
        )}
      </section>

      {/* STORIES */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Stories</h2>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={storyFilter}
            onChange={(e) => setStoryFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TO_DO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {filteredStories.length === 0 ? (
          <p className="text-gray-500">No stories found.</p>
        ) : (
          <ul className="space-y-3">{filteredStories.map(renderStory)}</ul>
        )}
      </section>

      {/* TASKS */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TO_DO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="text-gray-500">No tasks found.</p>
        ) : (
          <ul className="space-y-3">{filteredTasks.map(renderTask)}</ul>
        )}
      </section>
    </div>
  );
};

export default ReadOnlyDashboard;
