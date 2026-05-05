// src/pages/Projects/manager/BacklogAndSprints.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plus, List, ChevronRight, ChevronDown } from "lucide-react";
// Use the global ToastContainer mounted in App.jsx to avoid duplicate containers
import { showStatusToast } from "../../../components/toastfy/toast";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../../../contexts/AuthContext";

import Button from "../../../components/Button/Button";
import StoryCard from "./Sprint/StoryCard";
import SprintColumn from "./Sprint/SprintColumn";
import CreateSprintModal from "./Sprint/CreateSprintModal";
import CreateIssueForm from "./CreateIssue/CreateIssueForm";
import TaskCard from "./Sprint/TaskCard";
import EditTaskForm from "./Backlog/EditTaskForm";
import EditStoryForm from "./Backlog/EditStoryForm";
import RightSidePanel from "./Sprint/RightSidePanel";
import SprintDetailsPanel from "./Sprint/SprintDetailsPanel";
import SprintPendingModal from "./Sprint/SprintPendingModal";
import { ca } from "date-fns/locale";
import { useLocation } from "react-router-dom";

const BacklogAndSprints = ({ projectId, projectName }) => {
  const navigate = useNavigate();

  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [backlogStories, setBacklogStories] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
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
  const [permissions, setPermissions] = useState(null);
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
  const userRole = user?.roles?.includes("Manager")
    ? "MANAGER"
    : user?.roles?.includes("Admin")
      ? "ADMIN"
      : "EMPLOYEE";
  const canManageProjects = userRole === "MANAGER" || userRole === "ADMIN";

  // =======================================
  // Fetch a single story
  // =======================================
  const fetchStoryById = async (storyId) => {
    const res = await axios.get(
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
      return decoded?.roles?.includes("Manager");
    } catch (e) {
      return false;
    }
  })();

  // =======================================
  // Move Story (Sprint <-> Backlog)
  // =======================================
  const handleDropStory = async (storyId, sprintId) => {
    // Optimistic UI update
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, sprintId } : s)),
    );

    try {
      const fullStory = await fetchStoryById(storyId);
      const body = buildUpdatedStoryBody(fullStory, sprintId);

      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
        body,
        { headers },
      );

      toast.success(
        sprintId ? "Story moved successfully!" : "Moved to backlog",
        { autoClose: 1500 },
      );
      fetchStories();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || // backend message
        err?.message || // axios/network message
        "Failed to move story"; // fallback

      toast.error(errorMessage, { autoClose: 2000 });

      fetchStories(); // rollback to server truth
    }
  };

  // =======================================
  // Sprint Start / Complete
  // =======================================
const handleSprintStatus = async (sprintId, action) => {
    try {
        await axios.put(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/${action}`,
            {},
            { headers },
        );

        toast.success(
            action === "start" ? "Sprint started" : "Sprint completed",
            { autoClose: 1500 }  // ← no containerId
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
            toast.warn(
                "Cannot start sprint: Another active sprint already exists in this project.",
                { autoClose: 3000 }  // ← no containerId
            );
            fetchSprints();
            return;
        }

        // ✅ Check 3 — empty sprint
        if (
            data.message?.toLowerCase().includes("empty sprint") ||
            data.message?.toLowerCase().includes("at least one task or story")
        ) {
            toast.warn(
                data.message,  // show exact backend message
                { autoClose: 3000 }
            );
            return;
        }

        // ✅ Check 4 — epic not assigned (Story must belong to an Epic)
        if (data.message?.toLowerCase().includes("epic")) {
            toast.warn(
                data.message,  // show exact backend message
                { autoClose: 3000 }
            );
            return;
        }

        // Fallback — all other errors
        toast.error(data.message || "Failed to update sprint status", {
            autoClose: 2000   // ← no containerId
        });
    }
};

  // =======================================
  // Assign Epic to Story
  // =======================================
  const handleAssignEpicToStory = async (storyId, epicId) => {
    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}/assign-epic/${epicId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Epic assigned successfully!", { autoClose: 1500 });
      fetchStories(); // Refresh the list
    } catch (err) {
      toast.error("Failed to assign epic", { autoClose: 2000 });
    }
  };

  // =======================================
  // Move Task
  // =======================================
  const handleDropTask = async (taskId, sprintId) => {
    console.log("handleDropTask called with:", sprintId);
    try {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, sprintId } : t)),
      );

      await axios.patch(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}/assign-sprint/${sprintId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success("Task moved!", { autoClose: 1500 });
      fetchTasks();
    } catch (err) {
      toast.error("Failed to move task", { autoClose: 2000 });
    }
  };

  // =======================================
  // Assign Task to Story
  // =======================================
  const handleAssignTaskToStory = async (taskId, storyId) => {
    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/tasks/${taskId}/assign-story/${storyId}`,
        {},
        { headers },
      );
      toast.success("Task successfully assigned to story!", {
        autoClose: 1500,
      });
      fetchTasks(); // Refresh to update the UI hierarchy
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign story", {
        autoClose: 2000,
      });
    }
  };
  // =======================================
  // Fetch Data
  // =======================================
  const fetchStories = async () => {
    try {
      const res = await axios.get(
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
    } catch {
      toast.error("Failed to fetch stories", { autoClose: 2000 });
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/permissions`,
        { headers },
      );

      setPermissions(res.data);
    } catch (error) {
      console.error("Failed to fetch permissions", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(
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
    } catch {
      toast.error("Failed to fetch tasks", { autoClose: 2000 });
    }
  };

  const fetchEpics = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setEpics(Array.isArray(res.data) ? res.data : res.data.content || []);
    } catch {
      toast.error("Failed to fetch epics", { autoClose: 2000 });
    }
  };

  const fetchSprints = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setSprints(Array.isArray(res.data) ? res.data : res.data.content || []);
    } catch {
      toast.error("Failed to fetch sprints", { autoClose: 2000 });
    }
  };
  // =======================================
  // Delete Sprint
  // =======================================
  // =======================================
  // Delete Sprint
  // =======================================
  const handleDeleteSprint = (sprintId) => {
    toast(
      ({ closeToast }) => (
        <div className="p-1">
          <h3 className="font-semibold text-gray-900 mb-1">Delete Sprint?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete this sprint?
          </p>
          <div className="flex justify-between gap-2">
            <button
              onClick={closeToast}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                closeToast(); // Close the confirmation toast immediately

                // Execute the deletion logic
                try {
                  await axios.delete(
                    `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    },
                  );

                  toast.success("Sprint deleted successfully", {
                    autoClose: 1500,
                  });
                  fetchSprints();
                  fetchStories();
                } catch (err) {
                  const message = err.response?.data?.message || "";

                  if (message.includes("foreign key constraint")) {
                    toast.error(
                      "Cannot delete sprint because tasks are still assigned to it. Move them to backlog first.",
                      { autoClose: 4000 },
                    );
                  } else {
                    toast.error("Failed to delete sprint", { autoClose: 2000 });
                  }
                }
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false, // Keep open until user interacts
        closeButton: false, // Hide default close 'x'
        closeOnClick: false, // Don't close if they click the background of the toast
        draggable: false, // Disable dragging to dismiss
        toastId: `delete-sprint-${sprintId}`, // Prevent opening multiple duplicate toasts
        className: "border border-gray-100 shadow-xl rounded-xl",
      },
    );
  };

  useEffect(() => {
    fetchStories();
    fetchTasks();
    fetchSprints();
    fetchEpics();
    fetchPermissions();
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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
  {/* Use the global ToastContainer mounted in App.jsx */}
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-indigo-900">
            Backlog & Sprint Planning {projectName}
          </h1>

          <div className="flex gap-3">
            <Button
              size="medium"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() =>
                navigate(`/projects/${projectId}/issuetracker`, {
                  state: { projectId, projectName },
                })
              }
            >
              <List size={18} /> Issue Tracker
            </Button>

            <Button
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
              <Plus size={18} /> Create Sprint
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setShowIssueForm(true)}
            >
              <Plus size={18} /> Create Issue
            </Button>
          </div>
        </div>
        {/* Sprints */}
        <div className="space-y-6">
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
                className="flex items-center gap-2 w-full text-left pb-2 border-b border-gray-200 group focus:outline-none"
              >
                <div className="p-1 rounded-md bg-gray-100 group-hover:bg-indigo-100 text-gray-500 group-hover:text-indigo-600 transition-colors">
                  {showCompletedSprints ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
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
        {/* Backlog */}
        {/* Backlog */}
        <BacklogDropWrapper>
          <h2 className="text-lg font-semibold text-indigo-900 mb-4 pb-2 border-b">
            Product Backlog
          </h2>

          <div className="space-y-4">
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
                        className="p-1 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 transition-colors shadow-sm"
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
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
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
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </BacklogDropWrapper>
      </div>

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
    </DndProvider>
  );
};

export default BacklogAndSprints;
