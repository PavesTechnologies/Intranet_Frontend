// src/pages/Projects/manager/BacklogAndSprints.jsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plus, List, ChevronRight, ChevronDown } from "lucide-react";
import { showStatusToast } from "../../../components/toastfy/toast";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../../../contexts/AuthContext";

import Button from "../../../components/Button/Button";
import StoryCard from "./Sprint/StoryCard";
import SprintColumn from "./Sprint/SprintColumn";
import CreateSprintModal from "./Sprint/CreateSprintModal";
import CreateIssueForm from "./CreateIssue/CreateIssueForm";
import TaskCard from "./Sprint/TaskCard";
import EditTaskForm from "../../../components/Backlog/EditTaskForm";
import EditStoryForm from "../../../components/Backlog/EditStoryForm";
import RightSidePanel from "./Sprint/RightSidePanel";
import SprintDetailsPanel from "./Sprint/SprintDetailsPanel";
import SprintPendingModal from "./Sprint/SprintPendingModal";
import ExcelImportPanel from "./Backlog/ExcelImportPanel";
import { ca } from "date-fns/locale";
import { useLocation } from "react-router-dom";

// BacklogAndSprints unmounts whenever the user switches project tabs
// (Summary/Backlog/Board), so without a cache every return trip re-ran all
// 6 fetches (stories, tasks, sprints, epics, permissions, risk map) from
// scratch, flashing an empty backlog before anything appeared. This
// module-level, per-project cache lets a revisit render the last known
// snapshot instantly while a silent background refetch keeps it current —
// stale-while-revalidate, scoped to the browser session.
const backlogCache = new Map();
const BACKLOG_CACHE_TTL_MS = 60_000;
const getCachedBacklogSnapshot = (projectId) => backlogCache.get(projectId) || null;
const saveBacklogCache = (projectId, partial) => {
  if (!projectId) return;
  const prev = backlogCache.get(projectId) || {};
  backlogCache.set(projectId, { ...prev, ...partial, timestamp: Date.now() });
};

const BacklogAndSprints = ({ projectId, projectName }) => {
  const navigate = useNavigate();

  const [stories, setStories] = useState(() => getCachedBacklogSnapshot(projectId)?.stories || []);
  const [tasks, setTasks] = useState(() => getCachedBacklogSnapshot(projectId)?.tasks || []);
  const [sprints, setSprints] = useState(() => getCachedBacklogSnapshot(projectId)?.sprints || []);
  const [epics, setEpics] = useState(() => getCachedBacklogSnapshot(projectId)?.epics || []);
  const [backlogStories, setBacklogStories] = useState(
    () => getCachedBacklogSnapshot(projectId)?.stories?.filter((s) => !s.sprintId) || [],
  );
  const [backlogTasks, setBacklogTasks] = useState(
    () => getCachedBacklogSnapshot(projectId)?.tasks?.filter((t) => !t.sprintId) || [],
  );
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState("story");
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [showCompletedSprints, setShowCompletedSprints] = useState(false);
  const [expandedBacklogStories, setExpandedBacklogStories] = useState([]);
  const [permissions, setPermissions] = useState(() => getCachedBacklogSnapshot(projectId)?.permissions || null);
  const [deleteSprintConfirmOpen, setDeleteSprintConfirmOpen] = useState(false);
  const [sprintIdToDelete, setSprintIdToDelete] = useState(null);
  const [riskMap, setRiskMap] = useState(() => getCachedBacklogSnapshot(projectId)?.riskMap || {});

  // Opening/closing the right side panel (story/task/sprint details) must not
  // move the user away from where they were scrolled on the backlog list.
  const scrollContainerRef = useRef(null);
  const scrollPosRef = useRef({ window: 0, container: 0 });

  useEffect(() => {
    const captureWindowScroll = () => {
      scrollPosRef.current.window = window.scrollY;
    };
    const captureContainerScroll = () => {
      if (scrollContainerRef.current) {
        scrollPosRef.current.container = scrollContainerRef.current.scrollTop;
      }
    };
    window.addEventListener("scroll", captureWindowScroll, { passive: true });
    const el = scrollContainerRef.current;
    el?.addEventListener("scroll", captureContainerScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", captureWindowScroll);
      el?.removeEventListener("scroll", captureContainerScroll);
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, scrollPosRef.current.window);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPosRef.current.container;
    }
  }, [rightPanelOpen, selectedStoryId, selectedTaskId, selectedSprintId, panelMode]);

  const toggleStoryExpand = (storyId) => {
    setExpandedBacklogStories((prev) =>
      prev.includes(storyId)
        ? prev.filter((id) => id !== storyId)
        : [...prev, storyId],
    );
  };

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const { user } = useAuth();
  const userRole = user?.roles?.includes("Project_Manager")
    ? "MANAGER"
    : user?.roles?.includes("Admin")
      ? "ADMIN"
      : "EMPLOYEE";
  const canManageProjects = userRole === "MANAGER" || userRole === "ADMIN";

  // =======================================
  // Fetch a single story
  // =======================================
  const fetchStoryById = async (storyId) => {
    const res = await api.get(
      `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
      { headers },
    );
    return res.data;
  };

  const buildUpdatedStoryBody = (story, sprintId) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    acceptanceCriteria: story.acceptanceCriteria,
    storyPoints: story.storyPoints,
    assigneeId: story.assigneeId || story.assignee?.id || null,
    reporterId: story.reporterId || story.reporter?.id || null,
    projectId: projectId,
    epicId: story.epicId || story.epic?.id || null,
    sprintId: sprintId,
    startDate: story.startDate,
    statusId: story.statusId || story.status?.id,
    priority: story.priority,
    dueDate: story.dueDate,
  });
  const isManager = (() => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      return decoded?.roles?.includes("Project_Manager");
    } catch (e) {
      return false;
    }
  })();

  // =======================================
  // Move Story (Sprint <-> Backlog)
  // =======================================
  const handleDropStory = async (storyId, sprintId) => {
    // Optimistic: move the story
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, sprintId } : s)),
    );
    setBacklogStories((prev) =>
      sprintId ? prev.filter((s) => s.id !== storyId) : prev,
    );

    // Optimistic: also move all tasks that belong to this story
    setTasks((prev) =>
      prev.map((t) => (t.storyId === storyId ? { ...t, sprintId } : t)),
    );
    setBacklogTasks((prev) =>
      sprintId ? prev.filter((t) => t.storyId !== storyId) : prev,
    );

    try {
      const fullStory = await fetchStoryById(storyId);
      const body = buildUpdatedStoryBody(fullStory, sprintId);

      await api.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
        body,
        { headers },
      );

      showStatusToast(
        sprintId ? "Story moved successfully!" : "Moved to backlog",
        "success",
      );
      fetchStories();
      fetchTasks();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to move story";

      showStatusToast(errorMessage, "error");

      // Rollback both stories and tasks to server truth
      fetchStories();
      fetchTasks();
    }
  };

  // =======================================
  // Sprint Start / Complete
  // =======================================
const handleSprintStatus = async (sprintId, action) => {
    try {
        await api.put(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/${action}`,
            {},
            { headers },
        );

        showStatusToast(
            action === "start" ? "Sprint started" : "Sprint completed",
            "success",
        );
        fetchSprints();
        fetchStories();

    } catch (err) {
        const data = err.response?.data || {};

        // Check 1 — completion validation
        if (action === "complete" && data.code === "SPRINT_COMPLETION_VALIDATION_ERROR") {
            setPendingData({
                sprintId,
                tasks: data.data?.pendingTasks || [],
                stories: data.data?.pendingStories || [],
            });
            setShowPendingModal(true);
            return;
        }

        // Check 2 — another active sprint
        if (data.message?.toLowerCase().includes("another active sprint")) {
            showStatusToast(
                "Cannot start sprint: Another active sprint already exists in this project.",
                "warn",
            );
            fetchSprints();
            return;
        }

        // ✅ Check 3 — empty sprint
        if (
            data.message?.toLowerCase().includes("empty sprint") ||
            data.message?.toLowerCase().includes("at least one task or story")
        ) {
            showStatusToast(data.message, "warn");
            return;
        }

        // ✅ Check 4 — epic not assigned (Story must belong to an Epic)
        if (data.message?.toLowerCase().includes("epic")) {
            showStatusToast(data.message, "warn");
            return;
        }

        // Fallback — all other errors
        showStatusToast(data.message || "Failed to update sprint status", "error");
    }
};

  // =======================================
  // Assign Epic to Story
  // =======================================
  const handleAssignEpicToStory = async (storyId, epicId) => {
    try {
      await api.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}/assign-epic/${epicId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      showStatusToast("Epic assigned successfully!", "success");
      fetchStories(); // Refresh the list
    } catch (err) {
      showStatusToast("Failed to assign epic", "error");
    }
  };

  // =======================================
  // Move Task
  // =======================================
  const handleDropTask = async (taskId, sprintId) => {
    // console.log("handleDropTask called with:", sprintId);
    try {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, sprintId } : t)),
      );

      await api.patch(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}/assign-sprint/${sprintId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      showStatusToast("Task moved!", "success");
      fetchTasks();
    } catch (err) {
      showStatusToast("Failed to move task", "error");
    }
  };

  // =======================================
  // Assign Task to Story
  // =======================================
  const handleAssignTaskToStory = async (taskId, storyId) => {
    try {
      await api.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}/assign-story/${storyId}`,
        {},
        { headers },
      );
      showStatusToast("Task successfully assigned to story!", "success");
      fetchTasks(); // Refresh to update the UI hierarchy
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to assign story", "error");
    }
  };
  // =======================================
  // Fetch Data
  // =======================================
  const fetchStories = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const list = Array.isArray(res.data) ? res.data : res.data.content || [];
      setStories(list);
      setBacklogStories(list.filter((s) => !s.sprintId));
      saveBacklogCache(projectId, { stories: list });
    } catch {
      if (!silent) showStatusToast("Failed to fetch stories", "error");
    }
  };

  const fetchPermissions = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/permissions`,
        { headers },
      );

      setPermissions(res.data);
      saveBacklogCache(projectId, { permissions: res.data });
    } catch (error) {
      console.error("Failed to fetch permissions", error);
    }
  };


  const fetchTasks = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/tasks`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const list = Array.isArray(res.data) ? res.data : res.data.content || [];
      setTasks(list);
      setBacklogTasks(list.filter((t) => !t.sprintId));
      saveBacklogCache(projectId, { tasks: list });
    } catch {
      if (!silent) showStatusToast("Failed to fetch tasks", "error");
    }
  };

  const fetchEpics = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const list = Array.isArray(res.data) ? res.data : res.data.content || [];
      setEpics(list);
      saveBacklogCache(projectId, { epics: list });
    } catch {
      if (!silent) showStatusToast("Failed to fetch epics", "error");
    }
  };

  const fetchSprints = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const list = Array.isArray(res.data) ? res.data : res.data.content || [];
      setSprints(list);
      saveBacklogCache(projectId, { sprints: list });
    } catch {
      if (!silent) showStatusToast("Failed to fetch sprints", "error");
    }
  };
  // =======================================
  // Delete Sprint
  // =======================================
  const executeDeleteSprint = async () => {
    const sprintId = sprintIdToDelete;
    setDeleteSprintConfirmOpen(false);
    setSprintIdToDelete(null);
    try {
      await api.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      showStatusToast("Sprint deleted successfully", "success");
      fetchSprints();
      fetchStories();
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (message.includes("foreign key constraint")) {
        showStatusToast(
          "Cannot delete sprint because tasks are still assigned to it. Move them to backlog first.",
          "error",
        );
      } else {
        showStatusToast("Failed to delete sprint", "error");
      }
    }
  };

  const handleDeleteSprint = (sprintId) => {
    setSprintIdToDelete(sprintId);
    setDeleteSprintConfirmOpen(true);
  };

  const fetchRiskMap = async ({ silent = false } = {}) => {
    const numId = Number(projectId);
    if (!numId || isNaN(numId)) return;
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${numId}/risks/issues`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, params: { page: 0, size: 5000 } },
      );
      const items = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data) ? res.data : [];
      const map = {};
      items.forEach((r) => {
        if (r.linkedType && r.linkedId) map[`${r.linkedType}-${r.linkedId}`] = r.riskCount ?? 1;
      });
      setRiskMap(map);
      saveBacklogCache(projectId, { riskMap: map });
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (!projectId) return;
    const cached = getCachedBacklogSnapshot(projectId);
    const isFresh = cached && Date.now() - cached.timestamp < BACKLOG_CACHE_TTL_MS;

    if (cached) {
      setStories(cached.stories || []);
      setBacklogStories((cached.stories || []).filter((s) => !s.sprintId));
      setTasks(cached.tasks || []);
      setBacklogTasks((cached.tasks || []).filter((t) => !t.sprintId));
      setSprints(cached.sprints || []);
      setEpics(cached.epics || []);
      setPermissions(cached.permissions || null);
      setRiskMap(cached.riskMap || {});
    }

    const opts = { silent: !!cached };
    if (!isFresh) {
      fetchStories(opts);
      fetchTasks(opts);
      fetchSprints(opts);
      fetchEpics(opts);
      fetchPermissions(opts);
      fetchRiskMap(opts);
    }
  }, [projectId]);

  // =======================================
  // Backlog Drop Zone
  // =======================================// =======================================
  // Backlog Drop Zone (UPDATED)
  // =======================================
  const BacklogDropWrapper = ({ children }) => {
    const [{ isOver }, dropRef] = useDrop(() => ({
      accept: ["STORY", "TASK"], // 👈 accept BOTH
      drop: (item) => {
        if (item.type === "TASK") {
          handleDropTask(item.id, null); // move TASK to backlog
        } else {
          handleDropStory(item.id, null); // move STORY to backlog
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }));

    return (
      <div
        ref={dropRef}
        className={`transition border rounded p-4 shadow-sm ${
          isOver ? "bg-green-100 border-green-500" : "bg-white"
        }`}
      >
        {children}
      </div>
    );
  };

  const activeAndPlanningSprints = sprints.filter(
    (s) => s.status === "ACTIVE" || s.status === "PLANNING",
  );
  const completedSprints = sprints.filter((s) => s.status === "COMPLETED");

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">

        {/* ── Enterprise Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              size="small"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() =>
                navigate(`/projects/${projectId}/issuetracker`, {
                  state: { projectId, projectName },
                })
              }
            >
              <List size={16} /> Issue Tracker
            </Button>

            <Button
              size="small"
              className={`flex items-center gap-2 ${
                !permissions?.canEdit ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!permissions?.canEdit}
              onClick={() => {
                if (permissions?.canEdit) {
                  setShowSprintModal(true);
                }
              }}
            >
              <Plus size={16} /> Create Sprint
            </Button>

            <Button
              size="small"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setShowIssueForm(true)}
            >
              <Plus size={16} /> Create Issue
            </Button>

            <ExcelImportPanel
              projectId={projectId}
              projectName={projectName}
              disabled={!permissions?.canEdit}
              onImported={() => {
                fetchStories();
                fetchTasks();
                fetchEpics();
              }}
            />
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Sprints */}
        <div className="space-y-4">
          {activeAndPlanningSprints.map((sprint) => {
            const sprintStories = stories.filter(
              (s) => s.sprintId === sprint.id || s.sprint?.id === sprint.id,
            );
            const sprintTasks = tasks.filter(
              (t) => t.sprintId === sprint.id || t.sprint?.id === sprint.id,
            );

            // 👇 1. Check if it's active
            const isActive = sprint.status === "ACTIVE";

            return (
              // 👇 2. Add the highlight wrapper and badge
              <div
                key={sprint.id}
                className={`relative transition-all rounded-xl ${
                  isActive
                    ? "ring-2 ring-emerald-500 shadow-md bg-emerald-50/20 pt-1 pb-1 px-1 mt-4"
                    : ""
                }`}
              >
                {isActive && (
                  <div className="absolute -top-3 left-6 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10 flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Active Sprint
                  </div>
                )}

                <SprintColumn
                  sprint={sprint}
                  stories={sprintStories}
                  tasks={sprintTasks}
                  epics={epics}
                  allStories={stories}
                  sprints={activeAndPlanningSprints}
                  permissions={permissions}
                  projectId={projectId}
                  navigate={navigate}
                  onSelectParentStory={handleAssignTaskToStory}
                  onSelectEpic={handleAssignEpicToStory}
                  onDropStory={handleDropStory}
                  onDropTask={handleDropTask}
                  onChangeStatus={handleSprintStatus}
                  onDeleteSprint={handleDeleteSprint}
                  onEditSprint={(s) => {
                    setSelectedSprintId(s.id);
                    setPanelMode("sprint");
                    setRightPanelOpen(true);
                  }}
                  // onSelectEpic={() => {

                  // }}
                  onStoryClick={(id) => {
                    setPanelMode("story");
                    setSelectedStoryId(id);
                    setRightPanelOpen(true);
                  }}
                  onTaskClick={(id) => {
                    setPanelMode("task");
                    setSelectedTaskId(id);
                    setRightPanelOpen(true);
                  }}
                />
              </div>
            );
          })}
          {/* Completed Sprints Section */}
          {completedSprints.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowCompletedSprints(!showCompletedSprints)}
                className="flex items-center gap-2 w-full text-left pb-2 border-b border-slate-200 group focus:outline-none"
              >
                <div className="p-1 rounded-md bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 transition-colors">
                  {showCompletedSprints ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
                <h2 className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                  Completed Sprints ({completedSprints.length})
                </h2>
              </button>

              {showCompletedSprints && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {completedSprints.map((sprint) => {
                    const sprintStories = stories.filter(
                      (s) =>
                        s.sprintId === sprint.id || s.sprint?.id === sprint.id,
                    );

                    const sprintTasks = tasks.filter(
                      (t) =>
                        t.sprintId === sprint.id || t.sprint?.id === sprint.id,
                    );

                    return (
                      <div key={sprint.id} className="opacity-80">
                        <SprintColumn
                          sprint={sprint}
                          stories={sprintStories}
                          tasks={sprintTasks}
                          epics={epics}
                          allStories={stories}
                          sprints={sprints}
                          permissions={permissions}
                          projectId={projectId}
                          navigate={navigate}
                          onDropStory={handleDropStory}
                          onSelectParentStory={handleAssignTaskToStory}
                          onSelectEpic={handleAssignEpicToStory}
                          onDropTask={handleDropTask}
                          onChangeStatus={handleSprintStatus}
                          onStoryClick={(id) => {
                            setPanelMode("story");
                            setSelectedStoryId(id);
                            setRightPanelOpen(true);
                          }}
                          onTaskClick={(id) => {
                            setPanelMode("task");
                            setSelectedTaskId(id);
                            setRightPanelOpen(true);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Backlog */}
        <BacklogDropWrapper>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">
              Product Backlog
            </h2>
            <span className="text-xs text-slate-400">
              {backlogStories.length} {backlogStories.length === 1 ? "story" : "stories"}
              {backlogTasks.filter(t => !t.storyId).length > 0 &&
                ` · ${backlogTasks.filter(t => !t.storyId).length} independent task${backlogTasks.filter(t => !t.storyId).length > 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-250px)] pr-1 space-y-4">
            {/* 1. STORIES AND THEIR NESTED TASKS */}
            {backlogStories.map((story) => {
              // Find tasks that belong to this story
              const childTasks = backlogTasks.filter(
                (t) => t.storyId === story.id,
              );
              // Check if this specific story is expanded
              const isExpanded = expandedBacklogStories.includes(story.id);

              return (
                <div key={story.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {/* Expand/Collapse Button (Only shows if story has tasks) */}
                    {childTasks.length > 0 ? (
                      <button
                        onClick={() => toggleStoryExpand(story.id)}
                        className="p-1 rounded-md bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors shadow-sm"
                        title={isExpanded ? "Collapse tasks" : "Expand tasks"}
                      >
                        {isExpanded ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    ) : (
                      <span className="w-[26px]"></span> // Invisible spacer for alignment
                    )}

                    {/* The Parent Story */}
                    <div className="flex-1">
                      <StoryCard
                        story={story}
                        sprints={activeAndPlanningSprints}
                        epics={epics}
                        onAddToSprint={handleDropStory}
                        onSelectEpic={handleAssignEpicToStory}
                        onClick={() => {
                          setPanelMode("story");
                          setSelectedStoryId(story.id);
                          setRightPanelOpen(true);
                        }}
                        riskCount={riskMap[`Story-${story.id}`] ?? 0}
                        projectId={projectId}
                        navigate={navigate}
                      />
                    </div>
                  </div>

                  {/* Nested Tasks (ONLY visible if isExpanded is true) */}
                  {isExpanded && childTasks.length > 0 && (
                    <div className="pl-10 border-l-2 border-indigo-100 ml-3 flex flex-col gap-2 py-1 mt-1">
                      {childTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          stories={stories}
                          sprints={activeAndPlanningSprints}
                          onSelectParentStory={handleAssignTaskToStory}
                          onAddToSprint={handleDropTask}
                          onClick={() => {
                            setPanelMode("task");
                            setSelectedTaskId(task.id);
                            setRightPanelOpen(true);
                          }}
                          riskCount={riskMap[`Task-${task.id}`] ?? 0}
                          projectId={projectId}
                          navigate={navigate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. INDEPENDENT / ORPHAN TASKS */}
            {(() => {
              const orphanTasks = backlogTasks.filter((t) => !t.storyId);
              if (orphanTasks.length === 0) return null;

              return (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Independent Tasks
                  </h3>
                  <div className="flex flex-col gap-2">
                    {orphanTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        stories={stories}
                        sprints={activeAndPlanningSprints}
                        onSelectParentStory={handleAssignTaskToStory}
                        onAddToSprint={handleDropTask}
                        onClick={() => {
                          setPanelMode("task");
                          setSelectedTaskId(task.id);
                          setRightPanelOpen(true);
                        }}
                        riskCount={riskMap[`Task-${task.id}`] ?? 0}
                        projectId={projectId}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </BacklogDropWrapper>
        </div>{/* end scrollable content */}
      </div>{/* end h-full flex-col */}

      {/* Modals */}
      {showIssueForm && (
        <CreateIssueForm
          onClose={() => setShowIssueForm(false)}
          onCreated={() => {
            fetchStories();
            fetchTasks();
          }}
          projectId={projectId}
        />
      )}

      <CreateSprintModal
        isOpen={showSprintModal}
        projectId={projectId}
        onClose={() => setShowSprintModal(false)}
        onCreated={(newSprint) => setSprints((prev) => [...prev, newSprint])}
      />

      <RightSidePanel
        isOpen={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      >
        {panelMode === "story" && selectedStoryId && (
          <EditStoryForm
            storyId={selectedStoryId}
            projectId={projectId}
            mode="drawer"
            onClose={() => setRightPanelOpen(false)}
            onUpdated={() => {
              fetchStories();
              setRightPanelOpen(false);
            }}
          />
        )}

        {panelMode === "task" && selectedTaskId && (
          <EditTaskForm
            taskId={selectedTaskId}
            projectId={projectId}
            mode="drawer"
            onClose={() => setRightPanelOpen(false)}
            onUpdated={() => {
              fetchTasks();
              setRightPanelOpen(false);
            }}
          />
        )}

        {panelMode === "sprint" && selectedSprintId && (
          <SprintDetailsPanel
            sprintId={selectedSprintId}
            projectId={projectId}
            onClose={() => setRightPanelOpen(false)}
            onUpdated={() => {
              fetchSprints();
              setRightPanelOpen(false);
            }}
          />
        )}
      </RightSidePanel>

      <SprintPendingModal
        isOpen={showPendingModal}
        pendingData={pendingData}
        sprints={sprints}
        onClose={() => setShowPendingModal(false)}
        refresh={() => {
          fetchSprints();
          fetchStories();
        }}
      />

      <ConfirmationModal
        isOpen={deleteSprintConfirmOpen}
        title="Delete Sprint"
        message="Are you sure you want to delete this sprint? Tasks assigned to it must be moved to backlog first."
        onConfirm={executeDeleteSprint}
        onCancel={() => { setDeleteSprintConfirmOpen(false); setSprintIdToDelete(null); }}
        confirmText="Delete"
        variant="danger"
      />
    </DndProvider>
  );
};

export default BacklogAndSprints;
