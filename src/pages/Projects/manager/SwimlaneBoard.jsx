import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import api from "../../../api/axiosInstance";
import Button from "../../../components/Button/Button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  FilterIcon,
  SearchIcon,
} from "../../../components/icons";
import {
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast";
import EditTaskForm from "../../../components/Backlog/EditTaskForm";
import RightSidePanel from "./Sprint/RightSidePanel";
import CreateTaskForm from "../../../components/Backlog/CreateTask";
import {
  BASE,
  WIP_WARNING_THRESHOLD,
  headersWithToken,
  getStatusColors,
} from "../../../components/Board/constants";
import { CreateTaskModal } from "../../../components/Board/CreateTaskModal";
import { DeleteStatusModal } from "../../../components/Board/DeleteStatusModal";
import Avatar from "../../../components/Board/Avatar";
import StoryRowHeader from "./SwimlaneBoard/StoryRowHeader";
import TaskCard from "../../../components/Board/TaskCard";
import UnassignedRowHeader from "./SwimlaneBoard/UnassignedRowHeader";

const STORY_HEX = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];
const storyHex = (id) =>
  STORY_HEX[Math.abs(Number(id ?? 0) * 7) % STORY_HEX.length];

// ── Column header sub-component — same style as Board.jsx columns ──────────
const StatusColHeader = ({
  status,
  idx,
  totalInCol,
  editingStatusId,
  editingStatusName,
  setEditingStatusName,
  saveRename,
  cancelRename,
  startRename,
  openColumnMenu,
  setOpenColumnMenu,
  handleDeleteClick,
  dragHandleProps,
  searchOpen,
  searchQuery,
  hasSearchQuery,
  onToggleSearch,
  onSearchChange,
}) => {
  const { accent, badge } = getStatusColors(status.name ?? status.statusName, idx);
  return (
    <div {...dragHandleProps}>
      {/* Accent bar */}
      <div className={`h-[3px] w-full ${accent}`} />
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {editingStatusId === status.id ? (
            <input
              autoFocus
              value={editingStatusName}
              onChange={(e) => setEditingStatusName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename(status.id);
                if (e.key === "Escape") cancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-0.5 rounded border w-full text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          ) : (
            <>
              <span className="text-[13px] font-semibold text-gray-800 truncate">
                {status.name ?? status.statusName}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded-full shrink-0 ${badge}`}>
                {totalInCol}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center shrink-0 ml-1">
          {editingStatusId === status.id ? (
            <div className="flex gap-1">
              <Button variant="primary" size="small" onClick={() => saveRename(status.id)}>Save</Button>
              <Button variant="secondary" size="small" onClick={cancelRename}>Cancel</Button>
            </div>
          ) : (
            <>
              <button
                title="Search tasks in this column"
                onClick={(e) => { e.stopPropagation(); onToggleSearch(status.id); }}
                className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                  searchOpen || hasSearchQuery ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <SearchIcon className="w-3 h-3" />
              </button>
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
      {/* Per-column search by name */}
      {searchOpen && (
        <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 border rounded-md px-2 py-1 bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-300">
            <SearchIcon className="w-3 h-3 text-gray-400 shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(status.id, e.target.value)}
              placeholder="Search by name..."
              className="w-full text-[11px] bg-transparent outline-none"
            />
            {searchQuery && (
              <button
                title="Clear search"
                onClick={() => onSearchChange(status.id, "")}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-[11px] leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const SwimlaneBoard = ({
  projectId,
  projectName,
  hideHeader = false,
  // Filter state forwarded from Board.jsx when hideHeader=true
  externalAssignees,
  externalPriorities,
  externalStatusesFilter,
}) => {
  const [statuses,       setStatuses]       = useState([]);
  const [tasks,          setTasks]          = useState([]);
  const [stories,        setStories]        = useState([]);
  const [members,        setMembers]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeSprintId, setActiveSprintId] = useState(null);

  // column management
  const [showAddInput,    setShowAddInput]    = useState(false);
  const [newStatusName,   setNewStatusName]   = useState("");
  const [creatingStatus,  setCreatingStatus]  = useState(false);
  const [editingStatusId,   setEditingStatusId]   = useState(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusToDelete,    setStatusToDelete]    = useState(null);
  const [deleteModalOtherStatuses, setDeleteModalOtherStatuses] = useState([]);
  const [openColumnMenu, setOpenColumnMenu] = useState(null);

  // per-column "search by name" (Kanban swimlane columns)
  const [columnSearchOpen, setColumnSearchOpen] = useState(null);
  const [columnSearchQueries, setColumnSearchQueries] = useState({});

  // row collapse
  const [collapsedRows, setCollapsedRows] = useState({});

  // modals
  const [openCreateTaskModal,    setOpenCreateTaskModal]    = useState(null);
  const [isCreateOpen,           setIsCreateOpen]           = useState(false);
  const [createDefaultStatusId,  setCreateDefaultStatusId]  = useState(null);
  const [selectedTask,    setSelectedTask]    = useState(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);

  // sprint popup (standalone only)
  const [sprintPopup,       setSprintPopup]       = useState(null);
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);
  const [highlightPulse,    setHighlightPulse]    = useState(false);

  // UI
  const [isRefreshing, setIsRefreshing] = useState(false);

  // internal filter state — used only in standalone mode (hideHeader=false)
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);
  const [assigneeQuery,          setAssigneeQuery]          = useState("");
  const [selectedAssignees,      setSelectedAssignees]      = useState(new Set());
  const [selectedPriorities,     setSelectedPriorities]     = useState(new Set());
  const [selectedStatusesFilter, setSelectedStatusesFilter] = useState(new Set());

  // ── Resolve active filter: external (from Board.jsx) or internal ─────────
  const activeAssignees       = (hideHeader && externalAssignees)       ? externalAssignees       : selectedAssignees;
  const activePriorities      = (hideHeader && externalPriorities)      ? externalPriorities      : selectedPriorities;
  const activeStatusesFilter  = (hideHeader && externalStatusesFilter)  ? externalStatusesFilter  : selectedStatusesFilter;

  const filterCount = useMemo(
    () => activeAssignees.size + activePriorities.size + activeStatusesFilter.size,
    [activeAssignees, activePriorities, activeStatusesFilter]
  );

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      let sprintId = null;
      try {
        const res = await api.get(
          `${BASE}/api/sprints/active/project/${projectId}`,
          { headers: headersWithToken() }
        );
        sprintId = res.data[0]?.id ?? null;
        setActiveSprintId(sprintId);
      } catch (err) {
        console.error("Sprint fetch:", err?.response?.data || err?.message);
      }

      const statusReq = api.get(
        `${BASE}/api/projects/${projectId}/statuses`,
        { headers: headersWithToken() }
      );
      const tasksUrl = sprintId
        ? `${BASE}/api/projects/sprint/${sprintId}/tasks`
        : `${BASE}/api/projects/${projectId}/tasks`;
      const tasksReq = api.get(tasksUrl, { headers: headersWithToken() });

      const storiesReq = sprintId
        ? api
            .get(`${BASE}/api/stories/sprint/${sprintId}`, { headers: headersWithToken() })
            .catch(() =>
              api
                .get(`${BASE}/api/stories/project/${projectId}`, { headers: headersWithToken() })
                .catch(() => ({ data: [] }))
            )
        : api
            .get(`${BASE}/api/stories/project/${projectId}`, { headers: headersWithToken() })
            .catch(() => ({ data: [] }));

      const membersReq = api
        .get(`${BASE}/api/projects/${projectId}/members`, { headers: headersWithToken() })
        .catch(() => ({ data: [] }));

      const [sRes, tRes, stRes, mRes] = await Promise.all([
        statusReq, tasksReq, storiesReq, membersReq,
      ]);

      const statusData = Array.isArray(sRes.data) ? sRes.data : sRes.data?.content ?? [];
      setStatuses(statusData.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));

      let tasksData = [];
      if (Array.isArray(tRes.data))              tasksData = tRes.data;
      else if (Array.isArray(tRes.data?.content)) tasksData = tRes.data.content;
      else if (Array.isArray(tRes.data?.tasks))   tasksData = tRes.data.tasks;
      setTasks(tasksData);

      let storiesData = [];
      if (Array.isArray(stRes.data))              storiesData = stRes.data;
      else if (Array.isArray(stRes.data?.content)) storiesData = stRes.data.content;
      setStories(storiesData.filter((s) => s != null && s.id != null));

      if (Array.isArray(mRes.data) && mRes.data.length > 0) {
        setMembers(mRes.data.map((m) => ({ id: m.id, name: m.name ?? m.fullName })));
      } else {
        const map = {};
        tasksData.forEach((t) => {
          if (t.assigneeId != null)
            map[t.assigneeId] = t.assigneeName ?? `User ${t.assigneeId}`;
        });
        setMembers(Object.entries(map).map(([id, name]) => ({ id: Number(id), name })));
      }
    } catch (err) {
      console.error("Load swimlane failed", err);
      showStatusToast("Failed to load board", "error");
      setStatuses([]); setTasks([]); setStories([]); setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Close column kebab menu on outside click
  useEffect(() => {
    const close = () => setOpenColumnMenu(null);
    if (openColumnMenu != null) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openColumnMenu]);

  // Close column search box on outside click (keeps the query active)
  useEffect(() => {
    const close = () => setColumnSearchOpen(null);
    if (columnSearchOpen != null) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [columnSearchOpen]);

  // Close filter panel on outside click (standalone only)
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    if (filterOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [filterOpen]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const safeTasks   = Array.isArray(tasks)   ? tasks   : [];
  const safeStories = Array.isArray(stories) ? stories : [];

  const storyRows = useMemo(() => {
    const validStories = safeStories.filter((s) => s != null && s.id != null);
    const rows = validStories.map((s) => ({ ...s, _type: "story" }));
    const storyIdSet = new Set(validStories.map((s) => s.id));
    safeTasks.forEach((t) => {
      if (t.storyId != null && !storyIdSet.has(t.storyId)) {
        rows.push({ id: t.storyId, title: t.storyTitle ?? `Story ${t.storyId}`, _type: "story", _derived: true });
        storyIdSet.add(t.storyId);
      }
    });
    return rows;
  }, [safeStories, safeTasks]);

  const unassignedTasks = useMemo(
    () => safeTasks.filter((t) => !t.storyId),
    [safeTasks]
  );

  const applyFilters = useCallback((taskList) => {
    if (activeAssignees.size === 0 && activePriorities.size === 0 && activeStatusesFilter.size === 0)
      return taskList;
    return taskList.filter((t) => {
      if (activeAssignees.size > 0 && !activeAssignees.has(String(t.assigneeId ?? ""))) return false;
      if (activePriorities.size > 0 && !activePriorities.has(t.priority ?? "")) return false;
      if (activeStatusesFilter.size > 0 && !activeStatusesFilter.has(String(t.status?.id ?? t.statusId ?? ""))) return false;
      return true;
    });
  }, [activeAssignees, activePriorities, activeStatusesFilter]);

  const grid = useMemo(() => {
    const g = {};
    const allRows = [...storyRows.map((s) => s.id), "__unassigned__"];
    allRows.forEach((sid) => {
      g[String(sid)] = {};
      statuses.forEach((st) => { g[String(sid)][String(st.id)] = []; });
    });
    applyFilters(safeTasks).forEach((t) => {
      const rowKey = t.storyId ? String(t.storyId) : "__unassigned__";
      const colKey = String(t.statusId);
      if (g[rowKey] && g[rowKey][colKey] !== undefined) g[rowKey][colKey].push(t);
    });
    return g;
  }, [safeTasks, storyRows, statuses, applyFilters]);

  const matchesColumnSearch = useCallback(
    (task, statusId) => {
      const q = (columnSearchQueries[statusId] || "").trim().toLowerCase();
      if (!q) return true;
      const name = (task.title ?? task.name ?? "").toLowerCase();
      return name.includes(q);
    },
    [columnSearchQueries]
  );

  const toggleColumnSearch = (statusId) => {
    setColumnSearchOpen((prev) => (prev === statusId ? null : statusId));
  };
  const setColumnSearchQuery = (statusId, value) => {
    setColumnSearchQueries((prev) => ({ ...prev, [statusId]: value }));
  };

  const doneStatusId = useMemo(
    () => (statuses.length ? statuses[statuses.length - 1].id : null),
    [statuses]
  );

  // ── Handlers (business logic unchanged) ──────────────────────────────────
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    try {
      if (type === "STATUS") {
        const newOrder = Array.from(statuses);
        const [moved] = newOrder.splice(source.index, 1);
        newOrder.splice(destination.index, 0, moved);
        setStatuses(newOrder);
        const mapping = {};
        newOrder.forEach((s, i) => (mapping[String(s.id)] = i + 1));
        await api.post(`${BASE}/api/statuses/reorder`, mapping, { headers: headersWithToken() });
        showStatusToast("Columns reordered", "success");
        return;
      }
      if (String(draggableId).startsWith("task-")) {
        const taskId       = Number(draggableId.replace("task-", ""));
        const destStatusId = Number(destination.droppableId.split("__")[0]);
        setTasks((prev) =>
          prev.map((t) => t.id === taskId ? { ...t, statusId: destStatusId } : t)
        );
        await api.patch(
          `${BASE}/api/tasks/${taskId}/status`,
          { statusId: destStatusId },
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

  const handleCreateStatus = async () => {
    const name = (newStatusName || "").trim();
    if (!name) { showStatusToast("Column name required", "error"); return; }
    setCreatingStatus(true);
    try {
      const res = await api.post(
        `${BASE}/api/projects/${projectId}/statuses`,
        { name },
        { headers: headersWithToken() }
      );
      setStatuses((prev) =>
        [...prev, res.data].slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      );
      setNewStatusName(""); setShowAddInput(false);
      showStatusToast("Column added", "success");
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to add column", "error");
    } finally {
      setCreatingStatus(false);
    }
  };

  const handleDeleteClick = (status) => {
    const assigned = safeTasks.filter((t) => t.statusId === Number(status.id));
    if (assigned.length === 0) { doDirectDelete(status.id); return; }
    setDeleteModalOtherStatuses(statuses.filter((s) => s.id !== status.id));
    setStatusToDelete(status);
    setIsDeleteModalOpen(true);
  };
  const doDirectDelete = async (statusId) => {
    try {
      await api.delete(`${BASE}/api/statuses/${statusId}`, { headers: headersWithToken() });
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
      await api.delete(`${BASE}/api/statuses/${statusToDelete.id}`, {
        params: { newStatusId },
        headers: headersWithToken(),
      });
      showStatusToast("Column deleted and tasks moved", "success");
      setStatuses((prev) => prev.filter((s) => s.id !== statusToDelete.id));
      setIsDeleteModalOpen(false); setStatusToDelete(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
      showStatusToast("Delete/migrate failed", "error");
      await loadBoard();
    }
  };
  const startRename  = (s) => { setEditingStatusId(s.id); setEditingStatusName(s.name ?? ""); };
  const cancelRename = ()  => { setEditingStatusId(null); setEditingStatusName(""); };
  const saveRename   = async (statusId) => {
    const name = (editingStatusName || "").trim();
    if (!name) { showStatusToast("Name required", "error"); return; }
    try {
      const payload = statuses.map((s) => (s.id === statusId ? { ...s, name } : s));
      await api.put(
        `${BASE}/api/projects/${projectId}/statuses`,
        payload,
        { headers: headersWithToken() }
      );
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

  const finishSprint = async (option) => {
    if (!activeSprintId) return;
    setIsFinishingSprint(true);
    try {
      await api.post(
        `${BASE}/api/sprints/${activeSprintId}/finish`,
        null,
        { params: { option }, headers: headersWithToken() }
      );
      showStatusToast("Sprint finished", "success");
      setSprintPopup(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to finish sprint", "error");
    } finally {
      setIsFinishingSprint(false);
    }
  };

  const toggleSet = (setFn, val) =>
    setFn((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  const openTaskPanel  = (task) => { setSelectedTask(task); setIsTaskPanelOpen(true); };
  const toggleCollapse = (rowKey) =>
    setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await loadBoard(); showStatusToast("Board refreshed", "info"); }
    finally { setIsRefreshing(false); }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoadingSpinner text="Loading board..." />
      </div>
    );

  const colCount = statuses.length + 1;

  // ── Standalone header (only when hideHeader=false) ────────────────────────
  const standaloneHeader = !hideHeader && (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-gray-900">{projectName ?? "Swimlane Board"}</h2>
      <div className="flex items-center gap-2">
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
                        onChange={() => toggleSet(setSelectedAssignees, String(m.id))}
                      />
                      <Avatar name={m.name} />
                      <span>{m.name}</span>
                    </label>
                  ))}
              </div>
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Priority</div>
                <div className="flex gap-2 flex-wrap">
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleSet(setSelectedPriorities, p)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        selectedPriorities.has(p)
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
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Status</div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleSet(setSelectedStatusesFilter, String(s.id))}
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
            <Button variant="primary" size="small" onClick={handleCreateStatus} disabled={creatingStatus} loading={creatingStatus} loadingText="Adding...">Save</Button>
            <Button variant="secondary" size="small" onClick={() => { setShowAddInput(false); setNewStatusName(""); }}>Cancel</Button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium text-gray-600 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Column
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
  );

  // ── Grid ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {standaloneHeader}

      <div
        className="overflow-x-auto overflow-y-auto pb-4 w-full"
        style={{ maxHeight: "calc(100vh - 170px)" }}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <table
            className="border-separate w-full"
            style={{ borderSpacing: "6px 0", minWidth: statuses.length * 240 + 180 }}
          >
            {/* ── Column headers — sticky so they stay visible while scrolling ── */}
            <thead className="sticky top-0 z-30">
              <Droppable droppableId="status-headers" direction="horizontal" type="STATUS">
                {(provided) => (
                  <tr ref={provided.innerRef} {...provided.droppableProps}>
                    {/* Story label column — sticky both left & top (intersection corner) */}
                    <th
                      className="sticky left-0 z-40 bg-slate-50 border border-slate-200 rounded-t text-left p-0"
                      style={{ width: 180, minWidth: 180 }}
                    >
                      {/* Spacer bar to align height with status headers */}
                      <div className="h-[3px] w-full bg-transparent" />
                      <div className="px-3 py-2">
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                          Story
                        </span>
                      </div>
                    </th>

                    {statuses.map((status, idx) => {
                      const totalInCol = safeTasks.filter(
                        (t) => t.statusId === status.id && matchesColumnSearch(t, status.id)
                      ).length;
                      return (
                        <Draggable
                          key={String(status.id)}
                          draggableId={`status-${status.id}`}
                          index={idx}
                          type="STATUS"
                        >
                          {(dragProv) => (
                            <th
                              ref={dragProv.innerRef}
                              {...dragProv.draggableProps}
                              className="bg-white border border-slate-200 rounded-t text-left p-0 align-top shadow-sm"
                              style={{ minWidth: 220, ...dragProv.draggableProps.style }}
                            >
                              <StatusColHeader
                                status={status}
                                idx={idx}
                                totalInCol={totalInCol}
                                editingStatusId={editingStatusId}
                                editingStatusName={editingStatusName}
                                setEditingStatusName={setEditingStatusName}
                                saveRename={saveRename}
                                cancelRename={cancelRename}
                                startRename={startRename}
                                openColumnMenu={openColumnMenu}
                                setOpenColumnMenu={setOpenColumnMenu}
                                handleDeleteClick={handleDeleteClick}
                                dragHandleProps={dragProv.dragHandleProps}
                                searchOpen={columnSearchOpen === status.id}
                                searchQuery={columnSearchQueries[status.id] || ""}
                                hasSearchQuery={!!(columnSearchQueries[status.id] || "").trim()}
                                onToggleSearch={toggleColumnSearch}
                                onSearchChange={setColumnSearchQuery}
                              />
                            </th>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </tr>
                )}
              </Droppable>
            </thead>

            {/* ── Story rows ── */}
            <tbody>
              {storyRows.map((story) => {
                if (!story || story.id == null) return null;
                const isCollapsed        = !!collapsedRows[story.id];
                const storyTasksFiltered = applyFilters(safeTasks.filter((t) => t.storyId === story.id));
                const totalCount         = storyTasksFiltered.length;
                const doneCount          = storyTasksFiltered.filter((t) => t.statusId === doneStatusId).length;
                const hex                = storyHex(story.id);

                return (
                  <React.Fragment key={`story-${story.id}`}>
                    <StoryRowHeader
                      story={story}
                      taskCount={totalCount}
                      doneCount={doneCount}
                      collapsed={isCollapsed}
                      onToggle={toggleCollapse}
                      colSpan={colCount}
                    />

                    {/* Task cells — visible when not collapsed */}
                    {!isCollapsed && totalCount > 0 && (
                      <tr>
                        <td className="sticky left-0 z-10 bg-white p-0" style={{ width: 180, minWidth: 180 }}>
                          <div style={{ borderLeft: `3px solid ${hex}30`, minHeight: 72, marginLeft: 4, height: "100%" }} />
                        </td>
                        {statuses.map((status) => {
                          const cellTasks = (grid[String(story.id)]?.[String(status.id)] ?? []).filter((t) =>
                            matchesColumnSearch(t, status.id)
                          );
                          const wipWarn   = cellTasks.length > WIP_WARNING_THRESHOLD;
                          return (
                            <td key={status.id} className="align-top bg-white border border-slate-100 rounded" style={{ verticalAlign: "top" }}>
                              <Droppable droppableId={`${status.id}__${story.id}`} type="ITEM">
                                {(dropProv, dropSnap) => (
                                  <div
                                    ref={dropProv.innerRef}
                                    {...dropProv.droppableProps}
                                    className={`p-2 min-h-[72px] transition-colors rounded ${dropSnap.isDraggingOver ? "bg-indigo-50/60" : ""}`}
                                  >
                                    {wipWarn && (
                                      <div className="text-[10px] text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded mb-1">
                                        ⚠️ {cellTasks.length} items
                                      </div>
                                    )}
                                    {cellTasks.map((task, tIdx) => (
                                      <Draggable
                                        key={`task-${task.id}`}
                                        draggableId={`task-${task.id}`}
                                        index={tIdx}
                                        type="ITEM"
                                      >
                                        {(taskProv, taskSnap) => (
                                          <TaskCard
                                            task={task}
                                            taskProvided={taskProv}
                                            taskSnapshot={taskSnap}
                                            openTaskPanel={openTaskPanel}
                                          />
                                        )}
                                      </Draggable>
                                    ))}
                                    {dropProv.placeholder}
                                    {cellTasks.length === 0 && !dropSnap.isDraggingOver && (
                                      <div className="h-8 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-[10px]">
                                        Drop here
                                      </div>
                                    )}
                                    <button
                                      onClick={() =>
                                        setOpenCreateTaskModal({ projectId, statusId: status.id, activeSprintId, storyId: story.id })
                                      }
                                      style={{ opacity: 0 }}
                                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                                      className="mt-1 w-full text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 py-0.5 px-1 rounded hover:bg-indigo-50 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> Add task
                                    </button>
                                  </div>
                                )}
                              </Droppable>
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Empty story row — droppable + Create Task */}
                    {!isCollapsed && totalCount === 0 && (
                      <tr>
                        <td className="sticky left-0 z-10 bg-white p-0" style={{ width: 180 }}>
                          <div style={{ borderLeft: `3px solid ${hex}30`, minHeight: 44, marginLeft: 4, height: "100%" }} />
                        </td>
                        {statuses.map((status, si) => (
                          <td key={status.id} className="align-top bg-white border border-slate-100 rounded">
                            <Droppable droppableId={`${status.id}__${story.id}`} type="ITEM">
                              {(dropProv, dropSnap) => (
                                <div
                                  ref={dropProv.innerRef}
                                  {...dropProv.droppableProps}
                                  className={`p-2 min-h-[44px] transition-colors ${dropSnap.isDraggingOver ? "bg-indigo-50/60 rounded" : ""}`}
                                >
                                  {si === 0 && !dropSnap.isDraggingOver && (
                                    <button
                                      onClick={() =>
                                        setOpenCreateTaskModal({ projectId, statusId: status.id, activeSprintId, storyId: story.id })
                                      }
                                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Create Task
                                    </button>
                                  )}
                                  {dropProv.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        ))}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Unassigned row */}
              {unassignedTasks.length > 0 && (
                <React.Fragment key="unassigned">
                  <UnassignedRowHeader
                    taskCount={applyFilters(unassignedTasks).length}
                    collapsed={!!collapsedRows["__unassigned__"]}
                    onToggle={toggleCollapse}
                    colSpan={colCount}
                  />
                  {!collapsedRows["__unassigned__"] && (
                    <tr>
                      <td className="sticky left-0 z-10 bg-white p-0" style={{ width: 180 }}>
                        <div style={{ borderLeft: "3px solid #94a3b830", minHeight: 72, marginLeft: 4, height: "100%" }} />
                      </td>
                      {statuses.map((status) => {
                        const cellTasks = (grid["__unassigned__"]?.[String(status.id)] ?? []).filter((t) =>
                          matchesColumnSearch(t, status.id)
                        );
                        return (
                          <td key={status.id} className="align-top bg-white border border-slate-100 rounded">
                            <Droppable droppableId={`${status.id}____unassigned__`} type="ITEM">
                              {(dropProv, dropSnap) => (
                                <div
                                  ref={dropProv.innerRef}
                                  {...dropProv.droppableProps}
                                  className={`p-2 min-h-[72px] transition-colors rounded ${dropSnap.isDraggingOver ? "bg-indigo-50/60" : ""}`}
                                >
                                  {cellTasks.map((task, tIdx) => (
                                    <Draggable
                                      key={`task-${task.id}`}
                                      draggableId={`task-${task.id}`}
                                      index={tIdx}
                                      type="ITEM"
                                    >
                                      {(taskProv, taskSnap) => (
                                        <TaskCard
                                          task={task}
                                          taskProvided={taskProv}
                                          taskSnapshot={taskSnap}
                                          openTaskPanel={openTaskPanel}
                                        />
                                      )}
                                    </Draggable>
                                  ))}
                                  {dropProv.placeholder}
                                  {cellTasks.length === 0 && !dropSnap.isDraggingOver && (
                                    <div className="h-8 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-[10px]">
                                      Drop here
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </React.Fragment>
              )}
            </tbody>
          </table>
        </DragDropContext>
      </div>

      {/* ── Modals ── */}
      <CreateTaskModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultStatusId={createDefaultStatusId}
        projectId={projectId}
        onCreated={async (created) => { setTasks((prev) => [...prev, created]); await loadBoard(); }}
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
      {sprintPopup && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[480px] max-w-full relative">
            <button
              onClick={() => setSprintPopup(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-900 text-lg"
            >
              ✕
            </button>
            <h3 className="text-base font-semibold mb-2">{sprintPopup.sprintName}</h3>
            {sprintPopup.hasUnfinishedTasks && (
              <p className="text-sm text-red-600 mb-3">There are unfinished tasks in this sprint.</p>
            )}
            {sprintPopup.endingSoon && (
              <p className="text-sm text-yellow-600 mb-3">Sprint is ending soon.</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="primary" disabled={isFinishingSprint} onClick={() => finishSprint("NEXT_SPRINT")}>
                Move to Next Sprint
              </Button>
              <Button variant="secondary" disabled={isFinishingSprint} onClick={() => finishSprint("BACKLOG")}>
                Move to Backlog
              </Button>
            </div>
          </div>
        </div>
      )}
      {openCreateTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <CreateTaskForm
            projectId={openCreateTaskModal.projectId}
            defaultStatusId={openCreateTaskModal.statusId}
            defaultSprintId={openCreateTaskModal.activeSprintId}
            defaultStoryId={openCreateTaskModal.storyId}
            onClose={() => setOpenCreateTaskModal(null)}
            onCreated={async (created) => {
              setOpenCreateTaskModal(null);
              setTasks((prev) => [...prev, created]);
              try { await loadBoard(); } catch (e) { console.error(e); }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SwimlaneBoard;
