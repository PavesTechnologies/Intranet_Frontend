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
  FilterIcon,
  SearchIcon,
  LayoutGridIcon,
  RowsIcon,
} from "../../../components/icons";
import {
  MoreVertical,
  Calendar,
  Info,
  Pencil,
  Trash2,
  Plus,
  RotateCcw,
  CheckSquare,
} from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast";
import EditTaskForm from "./Backlog/EditTaskForm";
import RightSidePanel from "./Sprint/RightSidePanel";
import CreateTaskForm from "./Backlog/CreateTask";
import { BASE, WIP_WARNING_THRESHOLD, PALETTE, STATUS_PALETTES, getStatusColors } from "./Board/constants";
import { CreateTaskModal } from "./Board/CreateTaskModal";
import { DeleteStatusModal } from "./Board/DeleteStatusModal";
import TaskCard from "./Board/TaskCard";
import { Avatar } from "./Board/TaskCard";
import SwimlaneBoard from "./SwimlaneBoard";
import Button from "../../../components/Button/Button";

const headersWithToken = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  };
};


const formatSprintDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// View toggle — Board | Swimlane
const ViewToggle = ({ view, onChange }) => (
  <div className="flex items-center rounded-lg border bg-white overflow-hidden text-sm shadow-sm">
    <button
      onClick={() => onChange("board")}
      className={`flex items-center gap-1.5 px-3 py-2 transition-colors border-r ${
        view === "board"
          ? "bg-indigo-50 text-indigo-600 font-semibold"
          : "text-gray-500 hover:bg-slate-50"
      }`}
    >
      <LayoutGridIcon className="w-4 h-4" />
      Board
    </button>
    <button
      onClick={() => onChange("swimlane")}
      className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
        view === "swimlane"
          ? "bg-indigo-50 text-indigo-600 font-semibold"
          : "text-gray-500 hover:bg-slate-50"
      }`}
    >
      <RowsIcon className="w-4 h-4" />
      Swimlane
    </button>
  </div>
);

const Board = ({ projectId, sprintId, projectName }) => {
  const [viewMode, setViewMode] = useState("board");

  // data
  const [statuses, setStatuses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sprintStartDate, setSprintStartDate] = useState(null);
  const [sprintEndDate, setSprintEndDate] = useState(null);

  // add column
  const [showAddInput, setShowAddInput] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [creatingStatus, setCreatingStatus] = useState(false);

  // modals
  const [openCreateTaskModal, setOpenCreateTaskModal] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultStatusId, setCreateDefaultStatusId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [deleteModalOtherStatuses, setDeleteModalOtherStatuses] = useState([]);

  // rename
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingStatusName, setEditingStatusName] = useState("");

  // UI
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [openColumnMenu, setOpenColumnMenu] = useState(null);

  // filters
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState(new Set());
  const [selectedStatusesFilter, setSelectedStatusesFilter] = useState(new Set());
  const [selectedSprints, setSelectedSprints] = useState(new Set());

  // sprint
  const [activeSprintId, setActiveSprintId] = useState(null);
  const [activeSprintName, setActiveSprintName] = useState("");
  const [sprintPopup, setSprintPopup] = useState(null);
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);

  // ── Data loading ──────────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      let fetchedSprintId = null;
      try {
        const res = await axios.get(
          `${BASE}/api/sprints/active/project/${projectId}`,
          { headers: headersWithToken() }
        );
        fetchedSprintId = res.data[0]?.id;
        setActiveSprintName(res.data[0]?.name ?? "");
        setSprintStartDate(res.data[0]?.startDate ?? null);
        setSprintEndDate(res.data[0]?.endDate ?? null);
        setActiveSprintId(fetchedSprintId);
      } catch (err) {
        console.error("Sprint fetch:", err?.response?.data || err?.message);
      }

      const statusReq = axios.get(
        `${BASE}/api/projects/${projectId}/statuses`,
        { headers: headersWithToken() }
      );
      const tasksUrl = fetchedSprintId
        ? `${BASE}/api/projects/sprint/${fetchedSprintId}/tasks`
        : `${BASE}/api/projects/${projectId}/tasks`;
      const tasksReq = axios.get(tasksUrl, { headers: headersWithToken() });
      const membersReq = axios
        .get(`${BASE}/api/projects/${projectId}/members`, { headers: headersWithToken() })
        .catch(() => ({ data: [] }));

      const [sRes, tRes, mRes] = await Promise.all([statusReq, tasksReq, membersReq]);

      const statusData = Array.isArray(sRes.data) ? sRes.data : sRes.data?.content ?? [];
      setStatuses(statusData.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));

      let tasksData = [];
      if (Array.isArray(tRes.data)) tasksData = tRes.data;
      else if (Array.isArray(tRes.data?.content)) tasksData = tRes.data.content;
      else if (Array.isArray(tRes.data?.tasks)) tasksData = tRes.data.tasks;
      setTasks(tasksData);

      if (Array.isArray(mRes.data) && mRes.data.length > 0) {
        setMembers(mRes.data.map((m) => ({ id: m.id, name: m.fullName ?? m.name })));
      } else {
        const map = {};
        tasksData.forEach((t) => {
          const aid = t.assigneeId ?? t.assignee?.id;
          const aname = t.assigneeName ?? t.assignee?.name ?? t.assignee?.fullName;
          if (aid != null) map[aid] = aname ?? `User ${aid}`;
        });
        setMembers(Object.entries(map).map(([id, name]) => ({ id: Number(id), name })));
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

  useEffect(() => { loadBoard(); }, [loadBoard]);

  useEffect(() => {
    if (!activeSprintId) return;
    fetchSprintPopup(activeSprintId);
    const id = setInterval(() => fetchSprintPopup(activeSprintId), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [activeSprintId]);

  useEffect(() => {
    if (!sprintPopup) return;
    setHighlightPulse(true);
    const t = setTimeout(() => setHighlightPulse(false), 3500);
    return () => clearTimeout(t);
  }, [sprintPopup]);

  // Close column kebab menu on outside click
  useEffect(() => {
    const close = () => setOpenColumnMenu(null);
    if (openColumnMenu != null) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openColumnMenu]);

  // Close filter on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!filterRef.current?.contains(e.target)) setFilterOpen(false);
    };
    if (filterOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [filterOpen]);

  // ── Derived data ──────────────────────────────────────────────
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

  const filterCount = useMemo(
    () => selectedAssignees.size + selectedPriorities.size + selectedStatusesFilter.size + selectedSprints.size,
    [selectedAssignees, selectedPriorities, selectedStatusesFilter, selectedSprints]
  );

  const filteredTasksByStatusId = useMemo(() => {
    if (filterCount === 0) return tasksByStatusId;
    const res = {};
    Object.keys(tasksByStatusId).forEach((statusId) => {
      res[statusId] = tasksByStatusId[statusId].filter((t) => {
        if (selectedAssignees.size > 0) {
          const aid = t.assigneeId ?? t.assignee?.id;
          if (!selectedAssignees.has(String(aid))) return false;
        }
        if (selectedPriorities.size > 0) {
          if (!selectedPriorities.has(String(t.priority ?? ""))) return false;
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

  // Bottom bar summary — derived from real task data
  const statusSummary = useMemo(() => {
    const blockedCount = safeTasks.filter((t) =>
      (t.status?.name ?? t.statusName ?? "").toLowerCase().includes("block")
    ).length;
    return {
      total: safeTasks.length,
      perStatus: statuses.map((s, idx) => ({
        id: s.id,
        name: s.name ?? s.statusName ?? "",
        count: (tasksByStatusId[String(s.id)] || []).length,
        colors: getStatusColors(s.name ?? s.statusName, idx),
      })),
      blocked: blockedCount,
    };
  }, [safeTasks, statuses, tasksByStatusId]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleCreateStatus = async () => {
    const name = (newStatusName || "").trim();
    if (!name) { showStatusToast("Column name required", "error"); return; }
    setCreatingStatus(true);
    try {
      const res = await axios.post(
        `${BASE}/api/projects/${projectId}/statuses`,
        { name },
        { headers: headersWithToken() }
      );
      setStatuses((prev) =>
        [...prev, res.data].slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
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
    if (assignedTasks.length === 0) { doDirectDelete(status.id); return; }
    setDeleteModalOtherStatuses(statuses.filter((s) => s.id !== status.id));
    setStatusToDelete(status);
    setIsDeleteModalOpen(true);
  };

  const doDirectDelete = async (statusId) => {
    try {
      await axios.delete(`${BASE}/api/statuses/${statusId}`, { headers: headersWithToken() });
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

  const fetchSprintPopup = async (sid) => {
    try {
      const res = await axios.get(
        `${BASE}/api/sprints/${sid}/popup-status`,
        { headers: headersWithToken() }
      );
      if (res.data?.shouldShowPopup === true || res.data?.endingSoon === true) {
        setSprintPopup(res.data);
      } else {
        setSprintPopup(null);
      }
    } catch (err) {
      console.error(err);
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

  const startRename = (status) => {
    setEditingStatusId(status.id);
    setEditingStatusName(status.name ?? status.statusName ?? "");
  };
  const cancelRename = () => { setEditingStatusId(null); setEditingStatusName(""); };
  const saveRename = async (statusId) => {
    const name = (editingStatusName || "").trim();
    if (!name) { showStatusToast("Name required", "error"); return; }
    try {
      const payload = statuses.map((s) => (s.id === statusId ? { ...s, name } : s));
      await axios.put(`${BASE}/api/projects/${projectId}/statuses`, payload, {
        headers: headersWithToken(),
      });
      setStatuses((prev) => prev.map((s) => (s.id === statusId ? { ...s, name } : s)));
      showStatusToast("Renamed", "success");
    } catch (err) {
      console.error(err);
      showStatusToast("Rename failed", "error");
      await loadBoard();
    } finally {
      cancelRename();
    }
  };

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
        await axios.post(`${BASE}/api/statuses/reorder`, makeReorderPayload(newOrder), {
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
      }
    } catch (err) {
      console.error(err);
      showStatusToast("Move failed, reloading", "error");
      await loadBoard();
    }
  };

  // filter helpers
  const toggleAssignee = (id) =>
    setSelectedAssignees((prev) => {
      const next = new Set(prev);
      const key = String(id);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const togglePriority = (p) =>
    setSelectedPriorities((prev) => {
      const next = new Set(prev);
      next.has(String(p)) ? next.delete(String(p)) : next.add(String(p));
      return next;
    });
  const toggleStatusFilter = (sId) =>
    setSelectedStatusesFilter((prev) => {
      const next = new Set(prev);
      next.has(String(sId)) ? next.delete(String(sId)) : next.add(String(sId));
      return next;
    });

  const openTaskPanel = (task) => {
    setSelectedTask(task);
    setIsTaskPanelOpen(true);
  };
  const handleTaskCreated = async (created) => {
    setTasks((prev) => [...prev, created]);
    try { await loadBoard(); } catch (e) { console.error(e); }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoadingSpinner text="Loading board..." />
      </div>
    );

  // ── Shared header (board + swimlane) ─────────────────────────
  const header = (
    <div className="mb-4">
      {/* Single row — Title + sprint meta + Toolbar */}
      <div className="flex items-center justify-between">
        {/* Left: sprint title + name badge + meta + ending pill */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-900">
            {activeSprintName ? "Active Sprint" : "No Active Sprint"}
          </h2>
          {activeSprintName && (
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
              {activeSprintName}
            </span>
          )}

          {/* Sprint meta — inline with title */}
          {(sprintStartDate || sprintEndDate) && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {formatSprintDate(sprintStartDate)}
              {sprintStartDate && sprintEndDate && " – "}
              {formatSprintDate(sprintEndDate)}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <CheckSquare className="w-3.5 h-3.5" />
            {safeTasks.length} work items
            <Info className="w-3 h-3 text-gray-400 cursor-help" title="Tasks in the active sprint" />
          </span>

          {sprintPopup && (
            <div className="relative">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setHighlightPulse((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setHighlightPulse((v) => !v);
                }}
                className={`cursor-pointer px-3 py-1.5 rounded-full border bg-yellow-50 text-yellow-800 hover:bg-yellow-100 flex items-center gap-2 text-sm transition-all duration-300 ${
                  highlightPulse ? "scale-105 shadow-lg ring-2 ring-yellow-300" : ""
                }`}
              >
                <span>⚠️</span>
                <span className="font-medium">
                  {sprintPopup.endingSoon ? "Sprint ending soon" : "Unfinished tasks"}
                </span>
                {sprintPopup.hasUnfinishedTasks && (
                  <span className="bg-yellow-200 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full font-bold">!</span>
                )}
              </div>
              {highlightPulse && (
                <div className="absolute left-0 mt-2 w-[300px] z-50 bg-white border border-yellow-200 rounded-xl shadow-2xl p-4">
                  <div className="font-semibold text-gray-800 mb-1">{sprintPopup.sprintName}</div>
                  {sprintPopup.endingSoon && (
                    <p className="text-sm text-yellow-700 mb-1">This sprint is ending soon.</p>
                  )}
                  {sprintPopup.hasUnfinishedTasks && (
                    <p className="text-sm text-red-600 mb-2">There are unfinished tasks remaining.</p>
                  )}
                  <p className="text-sm text-gray-500 mb-3">
                    Move unfinished tasks to the next sprint or backlog?
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
              )}
            </div>
          )}
        </div>

        {/* Right: toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <ViewToggle view={viewMode} onChange={setViewMode} />

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm bg-white hover:bg-slate-50 shadow-sm"
            >
              <FilterIcon className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 font-medium">Filter</span>
              {filterCount > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {filterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-2 w-[480px] bg-white shadow-xl rounded-xl border z-50 p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <SearchIcon className="w-4 h-4 text-gray-400" />
                    <input
                      placeholder="Search assignee"
                      value={assigneeQuery}
                      onChange={(e) => setAssigneeQuery(e.target.value)}
                      className="w-full text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto mb-3 border rounded-lg p-2">
                  <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAssignees.size === 0}
                      onChange={() => { setSelectedAssignees(new Set()); setAssigneeQuery(""); }}
                    />
                    <span>Show all assignees</span>
                  </label>
                  {members
                    .filter((m) => (m.name || "").toLowerCase().includes(assigneeQuery.toLowerCase()))
                    .map((m) => (
                      <label key={m.id} className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedAssignees.has(String(m.id))}
                          onChange={() => toggleAssignee(m.id)}
                        />
                        <Avatar name={m.name} />
                        <span>{m.name}</span>
                      </label>
                    ))}
                </div>
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Priority
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                      <button
                        key={p}
                        onClick={() => togglePriority(p)}
                        className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                          selectedPriorities.has(String(p))
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Status
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleStatusFilter(s.id)}
                        className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                          selectedStatusesFilter.has(String(s.id))
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {s.name ?? s.statusName}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t">
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
            )}
          </div>

          {/* Add Column */}
          {showAddInput ? (
            <div className="flex items-center gap-2">
              <input
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="Column name"
                className="px-3 py-2 border rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateStatus();
                  if (e.key === "Escape") { setShowAddInput(false); setNewStatusName(""); }
                }}
                autoFocus
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
              onClick={() => setShowAddInput(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium text-gray-600 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            title="Refresh board"
            className="p-2 rounded-lg border bg-white hover:bg-slate-50 shadow-sm"
          >
            <RotateCcw className={`w-4 h-4 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

    </div>
  );

  // ── Shared modals ─────────────────────────────────────────────
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

  // ── Swimlane path ─────────────────────────────────────────────
  if (viewMode === "swimlane") {
    return (
      <div className="p-4 pt-5">
        {header}
        <SwimlaneBoard
          projectId={projectId}
          projectName={projectName}
          hideHeader
          externalAssignees={selectedAssignees}
          externalPriorities={selectedPriorities}
          externalStatusesFilter={selectedStatusesFilter}
        />
        {sharedModals}
      </div>
    );
  }

  // ── Board path ────────────────────────────────────────────────
  return (
    <div className="p-4 pt-5 relative">
      {header}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-statuses" direction="horizontal" type="STATUS">
          {(provided) => (
            <div className="overflow-x-auto pb-4 w-full">
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 items-start min-w-max"
              >
                {statuses.map((status, idx) => {
                  const taskItems = filteredTasksByStatusId[String(status.id)] || [];
                  const itemsCount = taskItems.length;
                  const showWipWarn = itemsCount > WIP_WARNING_THRESHOLD;
                  const { accent, badge } = getStatusColors(status.name ?? status.statusName, idx);

                  return (
                    <Draggable
                      key={String(status.id)}
                      draggableId={String(status.id)}
                      index={idx}
                      type="STATUS"
                    >
                      {(draggableProvided) => (
                        // No overflow-hidden so kebab dropdown isn't clipped
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className="bg-white rounded-xl w-72 flex-shrink-0 border border-gray-200 shadow-sm flex flex-col"
                        >
                          {/* ── Drag handle: accent bar + column header ── */}
                          <div {...draggableProvided.dragHandleProps}>
                            {/* Top accent bar — rounded-t-xl so column outer div needs no overflow-hidden */}
                            <div className={`h-[3px] w-full ${accent} rounded-t-xl`} />

                            {/* Column header */}
                            <div className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {editingStatusId === status.id ? (
                                  <input
                                    value={editingStatusName}
                                    onChange={(e) => setEditingStatusName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveRename(status.id);
                                      if (e.key === "Escape") cancelRename();
                                    }}
                                    className="px-2 py-0.5 rounded border w-full text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <>
                                    <span className="text-[13px] font-semibold text-gray-800 truncate">
                                      {status.name ?? status.statusName}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded-full shrink-0 ${badge}`}>
                                      {itemsCount}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center shrink-0 ml-1">
                                {editingStatusId === status.id ? (
                                  <div className="flex gap-1">
                                    <Button variant="primary" size="small" onClick={() => saveRename(status.id)}>
                                      Save
                                    </Button>
                                    <Button variant="secondary" size="small" onClick={cancelRename}>
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      title="Rename column"
                                      onClick={(e) => { e.stopPropagation(); startRename(status); }}
                                      className="p-1 rounded hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <div className="relative">
                                      <button
                                        title="More options"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenColumnMenu(openColumnMenu === status.id ? null : status.id);
                                        }}
                                        className="p-1 rounded hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition-colors"
                                      >
                                        <MoreVertical className="w-3 h-3" />
                                      </button>
                                      {openColumnMenu === status.id && (
                                        <div
                                          className="absolute right-0 mt-1 w-36 bg-white rounded-lg border border-gray-200 shadow-lg z-50 py-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={() => { setOpenColumnMenu(null); handleDeleteClick(status); }}
                                            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            Delete column
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {showWipWarn && (
                            <div className="text-[10px] text-yellow-700 bg-yellow-50 px-3 py-1 border-y border-yellow-100">
                              ⚠️ {itemsCount} items — over WIP limit ({WIP_WARNING_THRESHOLD})
                            </div>
                          )}

                          {/* ── Scrollable task area: fixed height, ~2 cards visible ── */}
                          <Droppable droppableId={String(status.id)} type="ITEM">
                            {(dropProvided, snapshot) => (
                              <div
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                                className={`overflow-y-auto p-2 transition-colors ${
                                  snapshot.isDraggingOver ? "bg-indigo-50/60" : ""
                                }`}
                                style={{ minHeight: 80, maxHeight: 196 }}
                              >
                                {taskItems.map((task, tIdx) => (
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
                                ))}
                                {dropProvided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          {/* ── Create Task footer — always pinned below scroll area ── */}
                          {activeSprintId && (
                            <div className="border-t border-gray-100 px-2 py-1.5">
                              <button
                                onClick={() =>
                                  setOpenCreateTaskModal({ projectId, statusId: status.id, activeSprintId })
                                }
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium w-full py-1 px-1.5 rounded hover:bg-indigo-50 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Create Task
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

      {/* ── Bottom Status Summary Bar ── */}
      <div className="sticky bottom-3 flex justify-center pointer-events-none mt-4">
        <div className="pointer-events-auto bg-white border border-gray-200 rounded-xl shadow-md px-4 py-2 flex items-center gap-4 text-xs">
          {/* Total */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">
              <CheckSquare className="w-3 h-3 text-blue-500" />
            </div>
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-800">{statusSummary.total}</span>
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Per-status counts */}
          {statusSummary.perStatus.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${s.colors.dot}`} />
                <span className="text-gray-500">{s.name}</span>
                <span className={`font-bold text-[10px] px-1.5 py-[1px] rounded-full ${s.colors.badge}`}>
                  {s.count}
                </span>
              </div>
              {idx < statusSummary.perStatus.length - 1 && (
                <div className="w-px h-4 bg-gray-200" />
              )}
            </React.Fragment>
          ))}

          {/* Blocked */}
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${statusSummary.blocked > 0 ? "text-red-500" : "text-gray-400"}`}>
              {statusSummary.blocked}
            </span>
            <span className="text-gray-500">Blocked</span>
          </div>
        </div>
      </div>

      {sharedModals}
    </div>
  );
};

export default Board;
