"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  Trash,
  Edit3,
  Loader2,
  Filter,
  Search,
  User,
  LayoutGrid,
  Rows,
} from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast";
import EditTaskForm from "./Backlog/EditTaskForm";
import EditStoryForm from "./Backlog/EditStoryForm";
import RightSidePanel from "./Sprint/RightSidePanel";
import CreateTaskForm from "./Backlog/CreateTask";
import CreateStoryForm from "./Backlog/CreateStory";
import { BASE, WIP_WARNING_THRESHOLD, PALETTE } from "./Board/constants";
import { CreateTaskModal } from "./Board/CreateTaskModal";
import { DeleteStatusModal } from "./Board/DeleteStatusModal";
import TaskCard from "./Board/TaskCard";
import { Avatar } from "./Board/TaskCard";

// ── NEW: Swimlane view ────────────────────────────────────────
import SwimlaneBoard from "./SwimlaneBoard";
import Button from "../../../components/Button/Button";

const headersWithToken = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  };
};
const stableColorClass = (k) => {
  const s = String(k ?? "");
  let h = 216;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 1000;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
};

// ── NEW: View toggle component ────────────────────────────────
const ViewToggle = ({ view, onChange }) => (
  <div className="flex items-center rounded border bg-white overflow-hidden text-sm">
    <button
      onClick={() => onChange("board")}
      className={`flex items-center gap-1.5 px-3 py-2 transition-colors border-r
        ${view === "board"
          ? "bg-indigo-50 text-indigo-600 font-semibold"
          : "text-gray-500 hover:bg-slate-50"
        }`}
    >
      <LayoutGrid className="w-4 h-4" />
      Board
    </button>
    <button
      onClick={() => onChange("swimlane")}
      className={`flex items-center gap-1.5 px-3 py-2 transition-colors
        ${view === "swimlane"
          ? "bg-indigo-50 text-indigo-600 font-semibold"
          : "text-gray-500 hover:bg-slate-50"
        }`}
    >
      <Rows className="w-4 h-4" />
      Swim
    </button>
  </div>
);

const Board = ({ projectId, sprintId, projectName }) => {
  // ── NEW: view mode state ──────────────────────────────────
  const [viewMode, setViewMode] = useState("board");

  // data
  const [statuses, setStatuses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  // add column ui
  const [showAddInput, setShowAddInput] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [creatingStatus, setCreatingStatus] = useState(false);
  // modals & create menu
  const [createMenuFor, setCreateMenuFor] = useState(null);
  const [openCreateTaskModal, setOpenCreateTaskModal] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultStatusId, setCreateDefaultStatusId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  // delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [deleteModalOtherStatuses, setDeleteModalOtherStatuses] = useState([]);
  // rename
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  // UI: refreshing
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Filter UI
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState(new Set());
  const [selectedStatusesFilter, setSelectedStatusesFilter] = useState(new Set());
  const [selectedSprints, setSelectedSprints] = useState(new Set());
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState(null);
  const [activeSprintId, setActiveSprintId] = useState(null);
  const [sprintPopup, setSprintPopup] = useState(null);
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);
  const [activeSprintName, setActiveSprintName] = useState("");
 
  // load data
  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      let activeSprintId = null;
      // --- GET ACTIVE SPRINT ---------------------------------------------------
      try {
        const res = await axios.get(
          `${BASE}/api/sprints/active/project/${projectId}`,
          { headers: headersWithToken() }
        );
        activeSprintId = res.data[0]?.id;
        setActiveSprintName(res.data[0]?.name ?? "");
        console.log("Sprint ID:", activeSprintId);
        setActiveSprintId(activeSprintId);
      } catch (err) {
        console.error("API error:", err?.response?.data || err?.message || err);
      }
      // --- FETCH STATUSES + TASKS + MEMBERS IN PARALLEL -----------------------
      const statusReq = axios.get(
        `${BASE}/api/projects/${projectId}/statuses`,
        { headers: headersWithToken() }
      );
      const tasksUrl = activeSprintId
        ? `${BASE}/api/projects/sprint/${activeSprintId}/tasks`
        : `${BASE}/api/projects/${projectId}/tasks`;
      const tasksReq = axios.get(tasksUrl, { headers: headersWithToken() });
      const membersReq = axios
        .get(`${BASE}/api/projects/${projectId}/members`, {
          headers: headersWithToken(),
        })
        .catch(() => ({ data: [] }));
      const [sRes, tRes, mRes] = await Promise.all([statusReq, tasksReq, membersReq]);
      // --- PROCESS STATUSES -----------------------------------------------------
      const statusData = Array.isArray(sRes.data)
        ? sRes.data
        : sRes.data?.content ?? [];
      const ordered = statusData
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setStatuses(ordered);
      // --- PROCESS TASKS --------------------------------------------------------
      let tasksData = [];
      if (Array.isArray(tRes.data)) tasksData = tRes.data;
      else if (Array.isArray(tRes.data?.content)) tasksData = tRes.data.content;
      else if (Array.isArray(tRes.data?.tasks)) tasksData = tRes.data.tasks;
      setTasks(tasksData);
      // --- PROCESS MEMBERS ------------------------------------------------------
      if (Array.isArray(mRes.data) && mRes.data.length > 0) {
        setMembers(
          mRes.data.map((m) => ({ id: m.id, name: m.fullName ?? m.name }))
        );
      } else {
        const map = {};
        tasksData.forEach((t) => {
          const aid = t.assigneeId ?? t.assignee?.id;
          const aname =
            t.assigneeName ?? t.assignee?.name ?? t.assignee?.fullName;
          if (aid != null) map[aid] = aname ?? `User ${aid}`;
        });
        setMembers(
          Object.entries(map).map(([id, name]) => ({ id: Number(id), name }))
        );
      }
    } catch (err) {
      console.error("Load board failed", err);
      showStatusToast("Failed to load board", "error");
      setStatuses([]);
      setTasks([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  console.log("sprintId in board:", activeSprintId);
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);
  // Auto-check popup-status on sprint load; re-check every 30 min
  useEffect(() => {
    if (!activeSprintId) return;
    fetchSprintPopup(activeSprintId);
    const intervalId = setInterval(() => fetchSprintPopup(activeSprintId), 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [activeSprintId]);

  // Pulse the pill only when sprintPopup is set (i.e. shouldShowPopup/endingSoon is true)
  useEffect(() => {
    if (!sprintPopup) return;
    setHighlightPulse(true);
    const t = setTimeout(() => setHighlightPulse(false), 3500);
    return () => clearTimeout(t);
  }, [sprintPopup]);
  // safe arrays & grouping
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const tasksByStatusId = useMemo(() => {
    const acc = {};
    statuses.forEach((s) => (acc[String(s.id)] = []));
    safeTasks.forEach((t) => {
      const sid = t?.status?.id ?? t?.statusId ?? null;
      const key = sid !== null ? String(sid) : null;
      if (key && acc[key]) acc[key].push(t);
      else if (statuses.length) acc[String(statuses[0].id)].push(t);
    });
    return acc;
  }, [safeTasks, statuses]);
  // ---------- Filtering logic ----------
  const filterCount = useMemo(() => {
    return (
      (selectedAssignees.size ? selectedAssignees.size : 0) +
      (selectedPriorities.size ? selectedPriorities.size : 0) +
      (selectedStatusesFilter.size ? selectedStatusesFilter.size : 0) +
      (selectedSprints.size ? selectedSprints.size : 0)
    );
  }, [selectedAssignees, selectedPriorities, selectedStatusesFilter, selectedSprints]);
  const filteredTasksByStatusId = useMemo(() => {
    const active = filterCount > 0;
    if (!active) return tasksByStatusId;
    const res = {};
    Object.keys(tasksByStatusId).forEach((statusId) => {
      res[statusId] = tasksByStatusId[statusId].filter((t) => {
        if (selectedAssignees.size > 0) {
          const aid = t.assigneeId ?? t.assignee?.id;
          if (!selectedAssignees.has(String(aid))) return false;
        }
        if (selectedPriorities.size > 0) {
          const pr = (t.priority ?? "").toString();
          if (!selectedPriorities.has(pr)) return false;
        }
        if (selectedStatusesFilter.size > 0) {
          const sId = t.status?.id ?? t.statusId;
          if (!selectedStatusesFilter.has(String(sId))) return false;
        }
        if (selectedSprints.size > 0) {
          const sp = t.sprintId ?? t.sprint?.id;
          if (!selectedSprints.has(String(sp))) return false;
        }
        return true;
      });
    });
    return res;
  }, [tasksByStatusId, selectedAssignees, selectedPriorities, selectedStatusesFilter, selectedSprints, filterCount]);
  // add status flow
  const handleAddColumnClick = () => setShowAddInput(true);
  const handleCreateStatus = async () => {
    const name = (newStatusName || "").trim();
    if (!name) {
      showStatusToast("Column name required", "error");
      return;
    }
    setCreatingStatus(true);
    try {
      const res = await axios.post(
        `${BASE}/api/projects/${projectId}/statuses`,
        { name },
        { headers: headersWithToken() }
      );
      setStatuses((prev) =>
        [...prev, res.data]
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      );
      setNewStatusName("");
      setShowAddInput(false);
      showStatusToast("Column added", "success");
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to add column", "error");
    } finally {
      setCreatingStatus(false);
    }
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadBoard();
      showStatusToast("Board refreshed", "info");
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleDeleteClick = (status) => {
    const assignedTasks = safeTasks.filter(
      (t) => (t?.status?.id ?? t?.statusId) === Number(status.id)
    );
    if (assignedTasks.length === 0) {
      doDirectDelete(status.id);
      return;
    }
    setDeleteModalOtherStatuses(statuses.filter((s) => s.id !== status.id));
    setStatusToDelete(status);
    setIsDeleteModalOpen(true);
  };
  const doDirectDelete = async (statusId) => {
    try {
      await axios.delete(`${BASE}/api/statuses/${statusId}`, {
        headers: headersWithToken(),
      });
      showStatusToast("Column deleted", "success");
      setStatuses((prev) => prev.filter((s) => s.id !== statusId));
      await loadBoard();
    } catch (err) {
      console.error(err);
      showStatusToast("Delete failed", "error");
      await loadBoard();
    }
  };
  const confirmDeleteWithMigration = async (newStatusId) => {
    if (!statusToDelete) return;
    try {
      await axios.delete(`${BASE}/api/statuses/${statusToDelete.id}`, {
        params: { newStatusId },
        headers: headersWithToken(),
      });
      showStatusToast("Column deleted and tasks moved", "success");
      setStatuses((prev) => prev.filter((s) => s.id !== statusToDelete.id));
      setIsDeleteModalOpen(false);
      setStatusToDelete(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
      showStatusToast("Delete/migrate failed", "error");
      await loadBoard();
    }
  };
  const fetchSprintPopup = async (sprintId) => {
    try {
      const res = await axios.get(
        `${BASE}/api/sprints/${sprintId}/popup-status`,
        { headers: headersWithToken() }
      );
      console.log("Sprint popup data:", res.data);
      // Only show the popup/pill when the backend says shouldShowPopup OR endingSoon
      if (res.data?.shouldShowPopup === true || res.data?.endingSoon === true) {
        setSprintPopup(res.data);
      } else {
        // Sprint exists but not ending soon — clear any stale popup
        setSprintPopup(null);
      }
    } catch (err) {
      console.error(err);
      // Silent fail — don't toast on background auto-check
    }
  };
  const finishSprint = async (option) => {
    if (!activeSprintId) return;
    setIsFinishingSprint(true);
    try {
      await axios.post(`${BASE}/api/sprints/${activeSprintId}/finish`, null, {
        params: { option },
        headers: headersWithToken(),
      });
      showStatusToast("Sprint finished successfully", "success");
      setSprintPopup(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to finish sprint", "error");
    } finally {
      setIsFinishingSprint(false);
    }
  };
  // rename flow
  const startRename = (status) => {
    setEditingStatusId(status.id);
    setEditingStatusName(status.name ?? status.statusName ?? "");
  };
  const cancelRename = () => {
    setEditingStatusId(null);
    setEditingStatusName("");
  };
  const saveRename = async (statusId) => {
    const name = (editingStatusName || "").trim();
    if (!name) {
      showStatusToast("Name required", "error");
      return;
    }
    try {
      const payload = statuses.map((s) =>
        s.id === statusId ? { ...s, name } : s
      );
      await axios.put(`${BASE}/api/projects/${projectId}/statuses`, payload, {
        headers: headersWithToken(),
      });
      setStatuses((prev) =>
        prev.map((s) => (s.id === statusId ? { ...s, name } : s))
      );
      showStatusToast("Renamed", "success");
    } catch (err) {
      console.error(err);
      showStatusToast("Rename failed", "error");
      await loadBoard();
    } finally {
      cancelRename();
    }
  };
  // DnD handlers
  const makeReorderPayload = (ordered) => {
    const mapping = {};
    ordered.forEach((s, i) => (mapping[String(s.id)] = i + 1));
    return mapping;
  };
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    try {
      if (type === "STATUS") {
        const newOrder = Array.from(statuses);
        const [moved] = newOrder.splice(source.index, 1);
        newOrder.splice(destination.index, 0, moved);
        setStatuses(newOrder);
        const payload = makeReorderPayload(newOrder);
        await axios.post(`${BASE}/api/statuses/reorder`, payload, {
          headers: headersWithToken(),
        });
        showStatusToast("Columns reordered", "success");
        return;
      }
      const srcStatusId = source.droppableId;
      const destStatusId = destination.droppableId;
      if (srcStatusId === destStatusId && source.index === destination.index) return;
      if (String(draggableId).startsWith("task-")) {
        const taskId = Number(String(draggableId).replace("task-", ""));
        const srcList = Array.from(filteredTasksByStatusId[String(srcStatusId)] || []);
        const taskIndex = srcList.findIndex((t) => String(t.id) === String(taskId));
        let moved = null;
        if (taskIndex !== -1) moved = srcList.splice(taskIndex, 1)[0];
        else {
          const fallbackIdx = safeTasks.findIndex((t) => String(t.id) === String(taskId));
          if (fallbackIdx !== -1) moved = safeTasks[fallbackIdx];
        }
        if (!moved) return;
        setTasks((prev) =>
          prev.map((t) =>
            String(t.id) === String(taskId)
              ? { ...t, status: { id: Number(destStatusId) } }
              : t
          )
        );
        await axios.patch(
          `${BASE}/api/tasks/${taskId}/status`,
          { statusId: Number(destStatusId) },
          { headers: headersWithToken() }
        );
        showStatusToast("Task moved", "success");
        return;
      }
    } catch (err) {
      console.error(err);
      showStatusToast("Move failed, reloading", "error");
      await loadBoard();
    }
  };
  // filter toggle helpers
  const toggleAssignee = (id) => {
    setSelectedAssignees((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const togglePriority = (p) => {
    const key = String(p);
    setSelectedPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleStatusFilter = (sId) => {
    const key = String(sId);
    setSelectedStatusesFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleSprint = (id) => {
    const key = String(id);
    setSelectedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const openCreateForStatus = (statusId) => {
    setSelectedStatusId(statusId);
    setOpenCreateModal(true);
  };
  const closeCreateModal = () => {
    setSelectedStatusId(null);
    setOpenCreateModal(false);
  };
  const handleTaskCreated = async (created) => {
    setTasks((prev) => [...prev, created]);
    try {
      await loadBoard();
    } catch (e) {
      console.error(e);
    }
  };
  const openTaskPanel = (task) => {
    setSelectedTask(task);
    setIsTaskPanelOpen(true);
  };
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const handleTaskSaved = (updated) =>
    setTasks((prev) =>
      prev.map((t) =>
        String(t.id) === String(updated.id) ? { ...t, ...updated } : t
      )
    );
  useEffect(() => {
    const onDocClick = (e) => {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    if (filterOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [filterOpen]);
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoadingSpinner text="Loading board..." />
      </div>
    );

  /* ── NEW: shared header — rendered for both board and swimlane views ── */
  const sharedHeader = (
    <div className="flex items-center justify-between mb-4">
      {/* <h2 className="text-xl font-semibold">
        {projectName ?? "Project Board"}
      </h2> */}
      <h2 className="text-xl font-semibold">
  {/* {projectName ?? "Project Board"} */}
  {activeSprintName ? "Active Sprint" : "No Active Sprint"}
  {activeSprintName && (
    <span className="ml-3 text-sm font-normal text-gray-500 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
      {activeSprintName}
    </span>
  )}
</h2>
      <div className="flex items-center gap-3">
        {/* Sprint ending pill — only shown when shouldShowPopup or endingSoon is true */}
        {sprintPopup && (
          <div className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setHighlightPulse((v) => !v)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setHighlightPulse((v) => !v); }}
              className={`cursor-pointer px-3 py-2 rounded border bg-yellow-50 text-yellow-800 hover:bg-yellow-100 flex items-center gap-2 transform transition-all duration-300 ${
                highlightPulse ? "scale-105 shadow-2xl ring-4 ring-yellow-300 z-50" : ""
              }`}
            >
              <span className="text-base">⚠️</span>
              <span className="font-medium text-sm">
                {sprintPopup.endingSoon ? "Sprint ending soon" : "Sprint has unfinished tasks"}
              </span>
              {sprintPopup.hasUnfinishedTasks && (
                <span className="bg-yellow-200 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  !
                </span>
              )}
            </div>
            {highlightPulse && (
              <div className="absolute right-0 mt-3 w-[320px] z-50">
                <div className="bg-white border border-yellow-200 rounded-xl shadow-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">⚠️</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 mb-1">
                        {sprintPopup.sprintName}
                      </div>
                      {sprintPopup.endingSoon && (
                        <p className="text-sm text-yellow-700 mb-1">This sprint is ending soon.</p>
                      )}
                      {sprintPopup.hasUnfinishedTasks && (
                        <p className="text-sm text-red-600 mb-2">There are unfinished tasks remaining.</p>
                      )}
                      <p className="text-sm text-gray-500 mb-3">
                        Would you like to move unfinished tasks to the next sprint or backlog?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setHighlightPulse(false); finishSprint("NEXT_SPRINT"); }}
                          disabled={isFinishingSprint}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                          Next Sprint
                        </button>
                        <button
                          onClick={() => { setHighlightPulse(false); finishSprint("BACKLOG"); }}
                          disabled={isFinishingSprint}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors"
                        >
                          Backlog
                        </button>
                        <button
                          onClick={() => setHighlightPulse(false)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-slate-50 transition-colors"
                        >
                          Later
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NEW: View toggle — sits between sprint pill and Filter ── */}
        <ViewToggle view={viewMode} onChange={setViewMode} />

        {/* Filter button */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded border text-sm bg-white hover:bg-slate-50"
          >
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-medium">Filter</span>
            {filterCount > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">
                {filterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 mt-2 w-[560px] bg-white shadow-lg rounded border z-50 p-4">
              <div className="flex gap-6">
                {/* <div className="w-1/3 border-r pr-3">
                  <ul className="space-y-2 text-sm">
                    <li className="py-1 px-2 rounded bg-slate-50">Parent</li>
                    <li className="py-1 px-2 rounded bg-slate-50">Sprint</li>
                    <li className="py-1 px-2 rounded bg-blue-50 font-medium">Assignee</li>
                    <li className="py-1 px-2 rounded bg-slate-50">Work type</li>
                    <li className="py-1 px-2 rounded bg-slate-50">Labels</li>
                    <li className="py-1 px-2 rounded bg-slate-50">Status</li>
                    <li className="py-1 px-2 rounded bg-slate-50">Priority</li>
                  </ul>
                </div> */}
                <div className="w-2/3 pl-3">
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <input
                        placeholder="Search assignee"
                        value={assigneeQuery}
                        onChange={(e) => setAssigneeQuery(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto mb-3 border rounded p-2">
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.size === 0}
                        onChange={() => {
                          setSelectedAssignees(new Set());
                          setAssigneeQuery("");
                        }}
                      />
                      <span className="text-sm">Unassigned (clear selection to show all)</span>
                    </label>
                    {members
                      .filter((m) =>
                        (m.name || "").toLowerCase().includes(assigneeQuery.toLowerCase())
                      )
                      .map((m) => (
                        <label key={m.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAssignees.has(String(m.id))}
                            onChange={() => toggleAssignee(m.id)}
                          />
                          <div className="flex items-center gap-2">
                            <Avatar name={m.name} />
                            <span className="text-sm">{m.name}</span>
                          </div>
                        </label>
                      ))}
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Priority</div>
                    <div className="flex gap-2">
                      {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                        <button
                          key={p}
                          onClick={() => togglePriority(p)}
                          className={`px-3 py-1 rounded border text-sm ${
                            selectedPriorities.has(String(p)) ? "bg-blue-600 text-white" : ""
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleStatusFilter(s.id)}
                          className={`px-3 py-1 rounded border text-sm ${
                            selectedStatusesFilter.has(String(s.id)) ? "bg-blue-600 text-white" : ""
                          }`}
                        >
                          {s.name ?? s.statusName}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    {/* <div className="text-xs text-gray-500 mb-1">Sprint</div> */}
                    {/* <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(
                          safeTasks
                            .map((t) => t.sprintId ?? t.sprint?.id)
                            .filter((id) => id != null)
                        )
                      ).map((id) => (
                        <button
                          key={id}
                          onClick={() => toggleSprint(id)}
                          className={`px-3 py-1 rounded border text-sm ${
                            selectedSprints.has(String(id)) ? "bg-blue-600 text-white" : ""
                          }`}
                        >
                          Sprint {id}
                        </button>
                      ))}
                      {!safeTasks.some((t) => t.sprintId || t.sprint) && (
                        <div className="text-sm text-gray-400">No sprints found</div>
                      )}
                    </div> */}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setSelectedAssignees(new Set());
                        setSelectedPriorities(new Set());
                        setSelectedStatusesFilter(new Set());
                        setSelectedSprints(new Set());
                        setAssigneeQuery("");
                        showStatusToast("Filters cleared", "info");
                      }}
                    >
                      Clear
                    </Button>
                    <Button variant="primary" size="small" onClick={() => setFilterOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* add column */}
        <div>
          {showAddInput ? (
            <div className="flex items-center gap-2">
              <input
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="Column name"
                className="px-3 py-2 border rounded"
              />
              <Button
                variant="primary"
                size="small"
                onClick={handleCreateStatus}
                disabled={creatingStatus}
                loading={creatingStatus}
                loadingText="Adding..."
              >
                Save
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => { setShowAddInput(false); setNewStatusName(""); }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={handleAddColumnClick}
              className="flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-slate-50 text-sm"
            >
              <Plus className="w-4 h-4 text-indigo-600" /> Add Column
            </button>
          )}
        </div>
        {/* refresh */}
        <button
          onClick={handleRefresh}
          className="px-3 py-2 rounded border bg-white hover:bg-slate-50"
        >
          <Loader2 className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );

  /* ── NEW: shared modals — same for both views ── */
  const sharedModals = (
    <>
      <CreateTaskModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultStatusId={createDefaultStatusId}
        projectId={projectId}
        onCreated={handleTaskCreated}
      />
      <RightSidePanel
        isOpen={isTaskPanelOpen}
        onClose={() => { setIsTaskPanelOpen(false); setSelectedTask(null); }}
        panelMode="board"
      >
        {isTaskPanelOpen && selectedTask && (
          <EditTaskForm
            taskId={selectedTask.id}
            projectId={projectId}
            onClose={() => { setIsTaskPanelOpen(false); setSelectedTask(null); }}
            onUpdated={async () => { await loadBoard(); setIsTaskPanelOpen(false); }}
          />
        )}
      </RightSidePanel>
      <DeleteStatusModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        statusToDelete={statusToDelete}
        otherStatuses={deleteModalOtherStatuses}
        onConfirm={confirmDeleteWithMigration}
      />
      {/* Sprint finish modal removed — handled inline by the pill dropdown */}
      {openCreateTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <CreateTaskForm
            projectId={openCreateTaskModal.projectId}
            defaultStatusId={openCreateTaskModal.statusId}
            defaultSprintId={openCreateTaskModal.activeSprintId}
            onClose={() => setOpenCreateTaskModal(null)}
            onCreated={async (created) => {
              setOpenCreateTaskModal(null);
              setTasks((prev) => [...prev, created]);
              try { await loadBoard(); } catch (e) { console.error(e); }
            }}
          />
        </div>
      )}
    </>
  );

  /* ── NEW: Swimlane view render path ── */
  if (viewMode === "swimlane") {
    return (
      <div className="p-6">
        {sharedHeader}
        <SwimlaneBoard
          projectId={projectId}
          projectName={projectName}
          hideHeader
        />
        {sharedModals}
      </div>
    );
  }

  /* ── Default: Board view (unchanged) ── */
  return (
    <div className="p-6">
      {sharedHeader}
      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-statuses" direction="horizontal" type="STATUS">
          {(provided) => (
            <div className="overflow-x-auto pb-4 w-full">
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 items-start min-w-max"
              >
                {statuses.map((status, idx) => {
                  const taskItems = filteredTasksByStatusId[String(status.id)] || [];
                  const itemsCount = taskItems.length;
                  const showWipWarn = itemsCount > WIP_WARNING_THRESHOLD;
                  const colorCls = stableColorClass(status.id ?? status.name);
                  return (
                    <Draggable
                      key={String(status.id)}
                      draggableId={String(status.id)}
                      index={idx}
                      type="STATUS"
                    >
                      {(draggableProvided) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className="bg-white rounded p-4 w-80 flex-shrink-0 border"
                        >
                          <div
                            className="flex items-center justify-between mb-2"
                            {...draggableProvided.dragHandleProps}
                          >
                            <div className={`flex items-center gap-2 px-2 py-1 rounded max-w-[60%] ${colorCls}`}>
                              {editingStatusId === status.id ? (
                                <input
                                  value={editingStatusName}
                                  onChange={(e) => setEditingStatusName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveRename(status.id);
                                    if (e.key === "Escape") cancelRename();
                                  }}
                                  className="px-2 py-1 rounded border w-full"
                                />
                              ) : (
                                <div className="font-semibold truncate">
                                  {status.name ?? status.statusName}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {editingStatusId === status.id ? (
                                <>
                                  <Button variant="primary" size="small" onClick={() => saveRename(status.id)}>
                                    Save
                                  </Button>
                                  <Button variant="secondary" size="small" onClick={cancelRename}>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <button
                                    title="Rename"
                                    onClick={() => startRename(status)}
                                    className="p-1 rounded hover:bg-slate-100"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    title="Delete"
                                    onClick={() => handleDeleteClick(status)}
                                    className="p-1 rounded hover:bg-slate-100 text-red-600"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {showWipWarn && (
                            <div className="text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded mb-2">
                              ⚠️ Column has {itemsCount} items (over {WIP_WARNING_THRESHOLD})
                            </div>
                          )}
                          <Droppable droppableId={String(status.id)} type="ITEM">
                            {(dropProvided, snapshot) => (
                              <div
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                                className={`min-h-[120px] p-1 rounded ${
                                  snapshot.isDraggingOver ? "bg-indigo-50" : ""
                                }`}
                              >
                                {taskItems.length === 0 && activeSprintId && safeTasks.length === 0 ? (
                                  <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-gray-500 italic">
                                    No tasks available
                                  </div>
                                ) : (
                                  taskItems.map((task, tIdx) => (
                                    <Draggable
                                      key={`task-${task.id}`}
                                      draggableId={`task-${task.id}`}
                                      index={tIdx}
                                      type="ITEM"
                                    >
                                      {(taskProvided, taskSnapshot) => (
                                        <TaskCard
                                          task={task}
                                          taskProvided={taskProvided}
                                          taskSnapshot={taskSnapshot}
                                          openTaskPanel={openTaskPanel}
                                        />
                                      )}
                                    </Draggable>
                                  ))
                                )}
                                {dropProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                          {/* Create Task button */}
                          {activeSprintId && (
                            <div className="mt-3">
                              <button
                                onClick={() =>
                                  setOpenCreateTaskModal({
                                    projectId,
                                    statusId: status.id,
                                    activeSprintId,
                                  })
                                }
                                className="text-indigo-600 hover:underline text-sm flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" /> Create Task
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {sharedModals}
    </div>
  );
};
export default Board;