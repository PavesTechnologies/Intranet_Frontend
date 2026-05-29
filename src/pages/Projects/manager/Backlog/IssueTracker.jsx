import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  EditIcon,
  DeleteIcon,
} from "../../../../components/icons";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  LayoutList,
  Search,
  RotateCcw,
} from "lucide-react";
import EditStoryForm from "./EditStoryForm";
import EditTaskForm from "./EditTaskForm";
import EditEpicForm from "./EditEpicForm";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import RiskBadge from "../RiskBadge";

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
  const [riskMap, setRiskMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [editModal, setEditModal] = useState({
    visible: false,
    type: null,
    id: null,
  });

  const [openEpics, setOpenEpics] = useState([]);
  const [openStories, setOpenStories] = useState([]);
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    type: "ALL",
    priority: "ALL",
    status: "ALL",
    assignee: "ALL",
  });

  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

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
      showStatusToast("Failed to load issues", "error");
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
      showStatusToast("Failed to load projects", "error");
    }
  };

  const fetchRiskMap = async () => {
    const numId = Number(projectId);
    if (!numId || isNaN(numId)) return;
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${numId}/risks/issues`,
        { headers, params: { page: 0, size: 5000 } },
      );
      const items = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data) ? res.data : [];
      const map = {};
      items.forEach((r) => {
        if (r.linkedType && r.linkedId) map[`${r.linkedType}-${r.linkedId}`] = r.riskCount ?? 1;
      });
      setRiskMap(map);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchIssues();
      fetchProjects();
      fetchRiskMap();
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
      showStatusToast(`${issue.type} deleted successfully!`, "success");
    } catch (err) {
      showStatusToast(`Failed to delete ${issue.type}`, "error");
    }
  };

  const handleDelete = (issue) => {
    setIssueToDelete(issue);
    setDeleteConfirmOpen(true);
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

  const allAssignees = Array.from(
    new Set([
      ...issues.epicsData.map((e) => e.assigneeName),
      ...issues.storiesData.map((s) => s.assigneeName),
      ...issues.tasksData.map((t) => t.assigneeName),
    ].filter(Boolean)),
  ).sort();

  const matchesFilters = (issue) => {
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        issue.title?.toLowerCase().includes(q) ||
        issue.reporterName?.toLowerCase().includes(q) ||
        issue.assigneeName?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Type
    if (filters.type !== "ALL" && issue.type !== filters.type) return false;

    // Priority
    if (filters.priority !== "ALL" && issue.priority !== filters.priority)
      return false;

    // Status
    if (filters.status !== "ALL") {
      const st = String(issue.status || "")
        .toUpperCase()
        .replace(/\s+/g, "_");
      if (st !== filters.status) return false;
    }

    // Assignee
    if (filters.assignee !== "ALL" && issue.assigneeName !== filters.assignee)
      return false;

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
    const riskCount = riskMap[`${issue.type}-${issue.id}`] ?? 0;
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
            <RiskBadge
              count={riskCount}
              issueType={issue.type}
              issueId={issue.id}
              projectId={Number(projectId) || projectId}
              navigate={navigate}
            />
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
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(issue);
              }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
              title="Edit"
            >
              <EditIcon size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(issue);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <DeleteIcon size={16} />
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

  // No-op for unused function clean up
  // const clearFilters = () =>
  //   setFilters({ types: [], statuses: [], priorities: [] });

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 pb-12 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center p-2.5 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* HORIZONTAL FILTER BAR */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by title, key or assignee..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
            />
          </div>

          <InlineFilter
            label="Type"
            value={filters.type}
            options={["ALL", "Epic", "Story", "Task"]}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          />

          <InlineFilter
            label="Priority"
            value={filters.priority}
            options={["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]}
            onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          />

          <InlineFilter
            label="Status"
            value={filters.status}
            options={[
              { label: "All", value: "ALL" },
              { label: "Backlog", value: "BACKLOG" },
              { label: "In Progress", value: "IN_PROGRESS" },
              { label: "Review", value: "REVIEW" },
              { label: "Done", value: "DONE" },
              { label: "To Do", value: "TO_DO" },
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />

          <InlineFilter
            label="Assignee"
            value={filters.assignee}
            options={["ALL", ...allAssignees]}
            onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))}
          />

          <button
            onClick={() =>
              setFilters({
                search: "",
                type: "ALL",
                priority: "ALL",
                status: "ALL",
                assignee: "ALL",
              })
            }
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all"
          >
            <RotateCcw size={16} />
            Reset
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

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title={`Delete ${issueToDelete?.type || "Issue"}`}
        message={`Are you sure you want to delete this ${issueToDelete?.type?.toLowerCase() || "issue"}? This action cannot be undone.`}
        onConfirm={() => { setDeleteConfirmOpen(false); executeDelete(issueToDelete); setIssueToDelete(null); }}
        onCancel={() => { setDeleteConfirmOpen(false); setIssueToDelete(null); }}
        confirmText="Delete"
        variant="danger"
      />
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

// --- Inline Filter Component ---
const InlineFilter = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayValue = typeof options[0] === 'object' 
    ? options.find(o => o.value === value)?.label || value
    : value;

  return (
    <div className="relative w-fit" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium transition-all shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/10"
      >
        <span className="text-slate-500 font-normal">{label}</span>
        <span className="text-slate-900">{displayValue === "ALL" ? "All" : displayValue}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 min-w-full w-max max-w-[280px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lab = typeof opt === 'object' ? opt.label : opt;
            const isSelected = value === val;

            return (
              <button
                key={val}
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  isSelected 
                    ? "bg-indigo-50 text-indigo-700 font-semibold" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {lab === "ALL" ? "All" : lab}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IssueTracker;
