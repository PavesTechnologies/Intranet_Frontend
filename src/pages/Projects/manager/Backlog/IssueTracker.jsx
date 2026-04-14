import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { FiEdit, FiTrash, FiX, FiFilter } from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ChevronDown, ChevronRight, ArrowLeft, LayoutList } from "lucide-react";
import EditStoryForm from "./EditStoryForm";
import EditTaskForm from "./EditTaskForm";
import EditEpicForm from "./EditEpicForm";
import LoadingSpinner from "../../../../components/LoadingSpinner";

const IssueTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId: paramProjectId } = useParams(); // 2. Keep this for fallback

  // 3. Extract your variables from the router state
  const projectId = location.state?.projectId || paramProjectId;
  const projectName = location.state?.projectName || "Unknown Project";

  const [issues, setIssues] = useState({
    epicsData: [],
    storiesData: [],
    tasksData: [],
  });

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [editModal, setEditModal] = useState({
    visible: false,
    type: null,
    id: null,
  });

  const [openEpics, setOpenEpics] = useState([]);
  const [openStories, setOpenStories] = useState([]);

  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [filters, setFilters] = useState({
    types: [],
    statuses: [],
    priorities: [],
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const [epicsRes, storiesRes, tasksRes] = await Promise.all([
        axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
          { headers },
        ),
        axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
          { headers },
        ),
        axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/tasks`,
          { headers },
        ),
      ]);

      const epicsData = epicsRes.data.map((e) => ({
        ...e,
        type: "Epic",
        title: e.name,
        reporterName: e.reporterName || e.reporter?.name || "Not Applicable",
        assigneeName: e.assigneeName || e.assignee?.name || "Not Applicable",
        priority: (e.priority || "MEDIUM").toUpperCase(),
        status: e.status || e.statusName || "BACKLOG",
      }));

      const storiesData = storiesRes.data.map((s) => ({
        ...s,
        type: "Story",
        title: s.title || s.name,
        epicId: s.epicId ?? null,
        reporterName: s.reporterName || s.reporter?.name || "Unassigned",
        assigneeName: s.assigneeName || s.assignee?.name || "Unassigned",
        priority: (s.priority || "MEDIUM").toUpperCase(),
        status: s.status?.name || s.statusName || "BACKLOG",
      }));

      const tasksData = tasksRes.data.map((t) => {
        const normalizedStatus = t.statusName
          ? String(t.statusName).toUpperCase().replace(/\s+/g, "_")
          : t.status
            ? String(t.status).toUpperCase().replace(/\s+/g, "_")
            : "BACKLOG";

        return {
          ...t,
          type: "Task",
          title: t.title,
          storyId: t.storyId ?? null,
          storyTitle: t.storyTitle || "",
          sprintId: t.sprintId ?? null,
          sprintName: t.sprintName || "",
          reporterName: t.reporterName || "Unassigned",
          assigneeName: t.assigneeName || "Unassigned",
          priority: (t.priority || "MEDIUM").toUpperCase(),
          status: normalizedStatus,
        };
      });

      setIssues({ epicsData, storiesData, tasksData });
    } catch (err) {
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`,
        { headers },
      );
      setProjects(res.data || []);
    } catch (err) {
      toast.error("Failed to load projects");
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchIssues();
      fetchProjects();
    }
  }, [projectId]);

  // --- NEW TOAST CONFIRMATION LOGIC ---
  const executeDelete = async (issue) => {
    let endpoint = "";
    if (issue.type === "Epic") endpoint = `/api/epics/${issue.id}`;
    if (issue.type === "Story") endpoint = `/api/stories/${issue.id}`;
    if (issue.type === "Task") endpoint = `/api/tasks/${issue.id}`;

    try {
      await axios.delete(`${window.__APP_CONFIG__.PMS_BASE_URL}${endpoint}`, {
        headers,
      });
      fetchIssues();
      toast.success(`${issue.type} deleted successfully!`);
    } catch (err) {
      toast.error(`Failed to delete ${issue.type}`);
    }
  };

  const handleDelete = (issue) => {
    // Custom UI injected directly into the Toast
    const ConfirmToast = ({ closeToast }) => (
      <div className="flex flex-col gap-3 py-1">
        <p className="text-sm text-gray-800 font-medium">
          Are you sure you want to delete this {issue.type}?
        </p>
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={closeToast}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              executeDelete(issue);
              closeToast();
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
          >
            Delete
          </button>
        </div>
      </div>
    );

    // Trigger the custom toast
    toast.warn(<ConfirmToast />, {
      position: "top-center",
      autoClose: false, // Stays open until they click a button
      closeOnClick: false, // Clicking the toast body won't close it
      draggable: false, // Prevents accidental swiping
      closeButton: false, // Hides the default 'X' button
      icon: false, // Hides the default warning icon to save space
    });
  };

  const handleEdit = (issue) =>
    setEditModal({ visible: true, type: issue.type, id: issue.id });

  const handleUpdated = (msg) => {
    setEditModal({ visible: false });
    setTimeout(() => {
      setOpenEpics([]);
      setOpenStories([]);
      fetchIssues();
    }, 300);
  };

  const handleView = (issue) => {
    navigate(
      `/projects/${projectId}/issues/${issue.type.toLowerCase()}/${issue.id}/view`,
      {
        state: { issue },
      },
    );
  };

  // const currentProject = projects.find((p) => p.id === Number(projectId));
  // const projectName = currentProject?.name || projectId;

  // --- POLISHED UI DICTIONARIES ---
  const typeColors = {
    Epic: "bg-purple-100 text-purple-700 border border-purple-200",
    Story: "bg-blue-100 text-blue-700 border border-blue-200",
    Task: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  };

  const priorityColors = {
    LOW: "bg-slate-100 text-slate-700 border border-slate-200",
    MEDIUM: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    HIGH: "bg-orange-100 text-orange-700 border border-orange-200",
    CRITICAL: "bg-red-100 text-red-700 border border-red-200 font-semibold",
  };

  const statusColors = {
    BACKLOG: "bg-gray-100 text-gray-700 border border-gray-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
    REVIEW: "bg-amber-50 text-amber-700 border border-amber-200",
    DONE: "bg-green-50 text-green-700 border border-green-200",
    TO_DO: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  const toggleEpic = (id) =>
    setOpenEpics((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const toggleStory = (id) =>
    setOpenStories((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const isFiltersEmpty = () =>
    filters.types.length === 0 &&
    filters.statuses.length === 0 &&
    filters.priorities.length === 0;

  const matchesFilters = (issue) => {
    if (isFiltersEmpty()) return true;
    if (filters.types.length > 0 && !filters.types.includes(issue.type))
      return false;
    if (filters.priorities.length > 0) {
      const pr = (issue.priority || "").toUpperCase();
      if (!filters.priorities.includes(pr)) return false;
    }
    if (filters.statuses.length > 0) {
      const st = String(issue.status || "")
        .toUpperCase()
        .replace(/\s+/g, "_");
      if (!filters.statuses.includes(st)) return false;
    }
    return true;
  };

  const epicMatchesHierarchy = (epic) => {
    if (matchesFilters(epic)) return true;
    const epicStories = issues.storiesData.filter((s) => s.epicId === epic.id);
    for (const story of epicStories) {
      if (matchesFilters(story)) return true;
      const storyTasks = issues.tasksData.filter((t) => t.storyId === story.id);
      for (const task of storyTasks) {
        if (matchesFilters(task)) return true;
      }
    }
    return false;
  };

  const storyMatchesHierarchy = (story) => {
    if (matchesFilters(story)) return true;
    const storyTasks = issues.tasksData.filter((t) => t.storyId === story.id);
    for (const task of storyTasks) {
      if (matchesFilters(task)) return true;
    }
    return false;
  };

  // --- POLISHED TABLE ROW ---
  const TableRow = ({ issue, level }) => {
    const isEpic = issue.type === "Epic";
    const isStory = issue.type === "Story";
    const rowBg =
      level === 0 ? "bg-white" : level === 1 ? "bg-slate-50/50" : "bg-white";

    return (
      <tr
        className={`${rowBg} hover:bg-indigo-50/60 border-b border-gray-100 cursor-pointer transition-all duration-200 group`}
        onClick={() => handleView(issue)}
      >
        <td className="py-3 px-4">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 28}px` }}
          >
            {isEpic || isStory ? (
              <button
                className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  isEpic ? toggleEpic(issue.id) : toggleStory(issue.id);
                }}
              >
                {(isEpic && openEpics.includes(issue.id)) ||
                (isStory && openStories.includes(issue.id)) ? (
                  <ChevronDown size={16} strokeWidth={2.5} />
                ) : (
                  <ChevronRight size={16} strokeWidth={2.5} />
                )}
              </button>
            ) : (
              <div className="w-6" /> // spacer
            )}
            <span
              className={`truncate text-gray-800 group-hover:text-indigo-700 transition-colors ${level === 0 ? "font-semibold" : "font-medium"}`}
            >
              {issue.title}
            </span>
          </div>
        </td>

        <td className="px-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${typeColors[issue.type]}`}
          >
            {issue.type}
          </span>
        </td>

        <td className="px-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${priorityColors[issue.priority] || "bg-gray-100 text-gray-700"}`}
          >
            {issue.priority}
          </span>
        </td>

        <td className="px-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase whitespace-nowrap ${statusColors[issue.status] || "bg-gray-100 text-gray-700"}`}
          >
            {String(issue.status).replace("_", " ")}
          </span>
        </td>

        <td className="px-3 text-sm text-gray-600 truncate max-w-[130px]">
          {issue.assigneeName}
        </td>
        <td className="px-3 text-sm text-gray-600 truncate max-w-[130px]">
          {issue.reporterName}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(issue);
              }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
              title="Edit"
            >
              <FiEdit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(issue);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <FiTrash size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderHierarchy = () => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="py-4 px-4 w-[35%]">Title</th>
            <th className="px-3 w-24">Type</th>
            <th className="px-3 w-24">Priority</th>
            <th className="px-3 w-32">Status</th>
            <th className="px-3 w-32">Assignee</th>
            <th className="px-3 w-32">Reporter</th>
            <th className="px-4 w-24">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {issues.epicsData
            .filter((epic) => epicMatchesHierarchy(epic))
            .map((epic) => (
              <React.Fragment key={`E-${epic.id}`}>
                <TableRow issue={epic} level={0} />

                {openEpics.includes(epic.id) &&
                  issues.storiesData
                    .filter((s) => s.epicId === epic.id)
                    .filter((s) => storyMatchesHierarchy(s))
                    .map((story) => (
                      <React.Fragment key={`S-${story.id}`}>
                        <TableRow issue={story} level={1} />

                        {openStories.includes(story.id) &&
                          issues.tasksData
                            .filter((t) => t.storyId === story.id)
                            .filter((t) => matchesFilters(t))
                            .map((task) => (
                              <TableRow
                                key={`T-${task.id}`}
                                issue={task}
                                level={2}
                              />
                            ))}
                      </React.Fragment>
                    ))}
              </React.Fragment>
            ))}

          {/* Orphan Stories */}
          {(() => {
            const orphanStories = issues.storiesData
              .filter((s) => !s.epicId)
              .filter((s) => storyMatchesHierarchy(s));
            if (orphanStories.length === 0) return null;
            return (
              <React.Fragment>
                <tr className="bg-slate-50">
                  <td
                    colSpan={7}
                    className="px-4 py-3 border-y border-gray-200"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Stories Unassigned to Epics
                    </div>
                  </td>
                </tr>
                {orphanStories.map((story) => (
                  <React.Fragment key={`OS-${story.id}`}>
                    <TableRow issue={story} level={0} />
                    {openStories.includes(story.id) &&
                      issues.tasksData
                        .filter((t) => t.storyId === story.id)
                        .filter((t) => matchesFilters(t))
                        .map((task) => (
                          <TableRow
                            key={`T2-${task.id}`}
                            issue={task}
                            level={1}
                          />
                        ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })()}

          {/* Orphan Tasks */}
          {(() => {
            const orphanTasks = issues.tasksData
              .filter((t) => !t.storyId)
              .filter((t) => matchesFilters(t));
            if (orphanTasks.length === 0) return null;
            return (
              <React.Fragment>
                <tr className="bg-slate-50">
                  <td
                    colSpan={7}
                    className="px-4 py-3 border-y border-gray-200"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Tasks Unassigned to Stories
                    </div>
                  </td>
                </tr>
                {orphanTasks.map((task) => (
                  <TableRow key={`OT-${task.id}`} issue={task} level={0} />
                ))}
              </React.Fragment>
            );
          })()}
        </tbody>
      </table>
    </div>
  );

  const TYPE_OPTIONS = ["Epic", "Story", "Task"];
  const STATUS_OPTIONS = [
    { label: "Backlog", value: "BACKLOG" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Review", value: "REVIEW" },
    { label: "Done", value: "DONE" },
    { label: "To Do", value: "TO_DO" },
  ];
  const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  const toggleFilterValue = (group, value) => {
    setFilters((prev) => {
      const arr = prev[group];
      if (arr.includes(value)) {
        return { ...prev, [group]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [group]: [...arr, value] };
    });
  };

  const clearFilters = () =>
    setFilters({ types: [], statuses: [], priorities: [] });

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 pb-12 space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutList className="text-indigo-600" size={26} />
            Issue Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Project:{" "}
            <span className="font-medium text-gray-800">{projectName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((s) => !s)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <FiFilter size={16} />
              Filter
              {(filters.types.length > 0 ||
                filters.statuses.length > 0 ||
                filters.priorities.length > 0) && (
                <span className="flex items-center justify-center w-5 h-5 ml-1 text-xs text-white bg-indigo-600 rounded-full">
                  {filters.types.length +
                    filters.statuses.length +
                    filters.priorities.length}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-30">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <strong className="text-sm font-semibold text-gray-800">
                    Filter Issues
                  </strong>
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Issue Type
                    </div>
                    <div className="space-y-2">
                      {TYPE_OPTIONS.map((t) => (
                        <label
                          key={t}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={filters.types.includes(t)}
                            onChange={() => toggleFilterValue("types", t)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">
                            {t}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Status
                    </div>
                    <div className="space-y-2">
                      {STATUS_OPTIONS.map((s) => (
                        <label
                          key={s.value}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes(s.value)}
                            onChange={() =>
                              toggleFilterValue("statuses", s.value)
                            }
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">
                            {s.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Priority
                    </div>
                    <div className="space-y-2">
                      {PRIORITY_OPTIONS.map((p) => (
                        <label
                          key={p}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={filters.priorities.includes(p)}
                            onChange={() => toggleFilterValue("priorities", p)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                            {p.toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setFilterOpen(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center p-2.5 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50 rounded-xl border border-gray-100">
          <LoadingSpinner text="Loading issues..." />
        </div>
      ) : (
        renderHierarchy()
      )}

      {/* MODAL */}
      {editModal.visible && (
        <Modal onClose={() => setEditModal({ visible: false })}>
          {editModal.type === "Epic" && (
            <EditEpicForm
              epicId={editModal.id}
              projectId={projectId}
              onClose={() => setEditModal({ visible: false })}
              onUpdated={() => handleUpdated("Epic")}
            />
          )}

          {editModal.type === "Story" && (
            <EditStoryForm
              storyId={editModal.id}
              projectId={projectId}
              mode="modal"
              onClose={() => setEditModal({ visible: false })}
              onUpdated={() => handleUpdated("Story")}
            />
          )}

          {editModal.type === "Task" && (
            <EditTaskForm
              taskId={editModal.id}
              projectId={projectId}
              mode="modal"
              onClose={() => setEditModal({ visible: false })}
              onUpdated={() => handleUpdated("Task")}
            />
          )}
        </Modal>
      )}
    </div>
  );
};

// Polished Modal Wrapper
const Modal = ({ children, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    {/* Notice p-0 instead of p-6 so the inner forms dictate the padding seamlessly */}
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hide the top-right X if the children (EditForms) are providing their own headers */}
      {children}
    </div>
  </div>
);

export default IssueTracker;
