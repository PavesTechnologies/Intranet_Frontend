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
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import EditTaskForm from "./Backlog/EditTaskForm";
import RightSidePanel from "./Sprint/RightSidePanel";
import CreateTaskForm from "./Backlog/CreateTask";
import { BASE, WIP_WARNING_THRESHOLD, PALETTE, headersWithToken, stableColorClass } from "./Board/constants";
import { CreateTaskModal } from "./Board/CreateTaskModal";
import { DeleteStatusModal } from "./Board/DeleteStatusModal";
import Avatar from "./Board/Avatar";
import StoryRowHeader from "./SwimlaneBoard/StoryRowHeader";
import TaskCard, { Avatar as TaskAvatar } from "./Board/TaskCard";
import UnassignedRowHeader from "./SwimlaneBoard/UnassignedRowHeader";

const STORY_HEX = [
  "#6366f1","#0ea5e9","#10b981","#f59e0b",
  "#ef4444","#8b5cf6","#ec4899","#14b8a6",
];
const storyHex = (id) =>
  STORY_HEX[Math.abs(Number(id ?? 0) * 7) % STORY_HEX.length];

const SwimlaneBoard = ({ projectId, projectName, hideHeader = false }) => {
  const [statuses,    setStatuses]    = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [stories,     setStories]     = useState([]);
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeSprintId, setActiveSprintId] = useState(null);

  const [showAddInput,    setShowAddInput]    = useState(false);
  const [newStatusName,   setNewStatusName]   = useState("");
  const [creatingStatus,  setCreatingStatus]  = useState(false);
  const [editingStatusId,   setEditingStatusId]   = useState(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusToDelete,    setStatusToDelete]    = useState(null);
  const [deleteModalOtherStatuses, setDeleteModalOtherStatuses] = useState([]);
  const [collapsedRows, setCollapsedRows] = useState({});
  const [openCreateTaskModal, setOpenCreateTaskModal] = useState(null);
  const [isCreateOpen,        setIsCreateOpen]        = useState(false);
  const [createDefaultStatusId, setCreateDefaultStatusId] = useState(null);
  const [selectedTask,    setSelectedTask]    = useState(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [sprintPopup,       setSprintPopup]       = useState(null);
  const [isFinishingSprint, setIsFinishingSprint] = useState(false);
  const [highlightPulse,    setHighlightPulse]    = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);
  const [assigneeQuery,          setAssigneeQuery]          = useState("");
  const [selectedAssignees,      setSelectedAssignees]      = useState(new Set());
  const [selectedPriorities,     setSelectedPriorities]     = useState(new Set());
  const [selectedStatusesFilter, setSelectedStatusesFilter] = useState(new Set());

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      // 1) active sprint
      let sprintId = null;
      try {
        const res = await axios.get(
          `${BASE}/api/sprints/active/project/${projectId}`,
          { headers: headersWithToken() }
        );
        sprintId = res.data[0]?.id ?? null;
        setActiveSprintId(sprintId);
        console.log("[Swimlane] activeSprintId:", sprintId);
      } catch (err) {
        console.error("Sprint fetch error:", err?.response?.data || err?.message);
      }

      const statusReq = axios.get(
        `${BASE}/api/projects/${projectId}/statuses`,
        { headers: headersWithToken() }
      );
      const tasksUrl = sprintId
        ? `${BASE}/api/projects/sprint/${sprintId}/tasks`
        : `${BASE}/api/projects/${projectId}/tasks`;
      const tasksReq = axios.get(tasksUrl, { headers: headersWithToken() });

      // FIX 2: Always fetch stories — don't skip when sprintId is null.
      // Primary: /api/stories/sprint/{sprintId}
      // Fallback: /api/stories/project/{projectId} (when no sprint or sprint call fails)
      const storiesReq = sprintId
        ? axios
            .get(`${BASE}/api/stories/sprint/${sprintId}`, { headers: headersWithToken() })
            .catch(() =>
              axios
                .get(`${BASE}/api/stories/project/${projectId}`, { headers: headersWithToken() })
                .catch(() => ({ data: [] }))
            )
        : axios
            .get(`${BASE}/api/stories/project/${projectId}`, { headers: headersWithToken() })
            .catch(() => ({ data: [] }));

      const membersReq = axios
        .get(`${BASE}/api/projects/${projectId}/members`, { headers: headersWithToken() })
        .catch(() => ({ data: [] }));

      const [sRes, tRes, stRes, mRes] = await Promise.all([
        statusReq, tasksReq, storiesReq, membersReq,
      ]);

      const statusData = Array.isArray(sRes.data) ? sRes.data : sRes.data?.content ?? [];
      setStatuses(statusData.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));

      let tasksData = [];
      if (Array.isArray(tRes.data))               tasksData = tRes.data;
      else if (Array.isArray(tRes.data?.content))  tasksData = tRes.data.content;
      else if (Array.isArray(tRes.data?.tasks))    tasksData = tRes.data.tasks;
      setTasks(tasksData);

      // FIX 3: Filter nulls from stories immediately
      let storiesData = [];
      if (Array.isArray(stRes.data))               storiesData = stRes.data;
      else if (Array.isArray(stRes.data?.content))  storiesData = stRes.data.content;
      const validStories = storiesData.filter((s) => s != null && s.id != null);
      setStories(validStories);
      console.log("[Swimlane] stories loaded:", validStories.length, validStories.map(s => s.id));

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
      toast.error("Failed to load board");
      setStatuses([]); setTasks([]); setStories([]); setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  useEffect(() => {
    if (!activeSprintId) return;
    const pulse = () => { setHighlightPulse(true); setTimeout(() => setHighlightPulse(false), 3500); };
    pulse();
    const id = setInterval(pulse, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [activeSprintId]);

  const safeTasks   = Array.isArray(tasks)   ? tasks   : [];
  const safeStories = Array.isArray(stories) ? stories : [];

  const storyRows = useMemo(() => {
    const validStories = safeStories.filter((s) => s != null && s.id != null);
    const rows = validStories.map((s) => ({ ...s, _type: "story" }));
    const storyIdSet = new Set(validStories.map((s) => s.id));
    // surface stories referenced by tasks but missing from stories API
    safeTasks.forEach((t) => {
      if (t.storyId != null && !storyIdSet.has(t.storyId)) {
        rows.push({
          id: t.storyId,
          title: t.storyTitle ?? `Story ${t.storyId}`,
          _type: "story",
          _derived: true,
        });
        storyIdSet.add(t.storyId);
      }
    });
    return rows;
  }, [safeStories, safeTasks]);

  const unassignedTasks = useMemo(
    () => safeTasks.filter((t) => !t.storyId),
    [safeTasks]
  );

  const filterCount = useMemo(
    () => selectedAssignees.size + selectedPriorities.size + selectedStatusesFilter.size,
    [selectedAssignees, selectedPriorities, selectedStatusesFilter]
  );

  const applyFilters = useCallback((taskList) => {
    if (filterCount === 0) return taskList;
    return taskList.filter((t) => {
      if (selectedAssignees.size > 0 && !selectedAssignees.has(String(t.assigneeId ?? ""))) return false;
      if (selectedPriorities.size > 0 && !selectedPriorities.has(t.priority ?? "")) return false;
      if (selectedStatusesFilter.size > 0 && !selectedStatusesFilter.has(String(t.statusId ?? ""))) return false;
      return true;
    });
  }, [selectedAssignees, selectedPriorities, selectedStatusesFilter, filterCount]);

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

  const doneStatusId = useMemo(
    () => statuses.length ? statuses[statuses.length - 1].id : null,
    [statuses]
  );

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
        await axios.post(`${BASE}/api/statuses/reorder`, mapping, { headers: headersWithToken() });
        toast.success("Columns reordered");
        return;
      }
      if (String(draggableId).startsWith("task-")) {
        const taskId       = Number(draggableId.replace("task-", ""));
        const destStatusId = Number(destination.droppableId.split("__")[0]);
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, statusId: destStatusId } : t));
        await axios.patch(`${BASE}/api/tasks/${taskId}/status`, { statusId: destStatusId }, { headers: headersWithToken() });
        toast.success("Task moved");
      }
    } catch (err) {
      console.error(err); toast.error("Move failed, reloading"); await loadBoard();
    }
  };

  const handleCreateStatus = async () => {
    const name = (newStatusName || "").trim();
    if (!name) { toast.error("Column name required"); return; }
    setCreatingStatus(true);
    try {
      const res = await axios.post(`${BASE}/api/projects/${projectId}/statuses`, { name }, { headers: headersWithToken() });
      setStatuses((prev) => [...prev, res.data].slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setNewStatusName(""); setShowAddInput(false); toast.success("Column added");
    } catch (err) { console.error(err); toast.error("Failed to add column"); }
    finally { setCreatingStatus(false); }
  };

  const handleDeleteClick = (status) => {
    const assigned = safeTasks.filter((t) => t.statusId === Number(status.id));
    if (assigned.length === 0) { doDirectDelete(status.id); return; }
    setDeleteModalOtherStatuses(statuses.filter((s) => s.id !== status.id));
    setStatusToDelete(status); setIsDeleteModalOpen(true);
  };
  const doDirectDelete = async (statusId) => {
    try {
      await axios.delete(`${BASE}/api/statuses/${statusId}`, { headers: headersWithToken() });
      toast.success("Column deleted"); setStatuses((prev) => prev.filter((s) => s.id !== statusId)); await loadBoard();
    } catch (err) { console.error(err); toast.error("Delete failed"); await loadBoard(); }
  };
  const confirmDeleteWithMigration = async (newStatusId) => {
    if (!statusToDelete) return;
    try {
      await axios.delete(`${BASE}/api/statuses/${statusToDelete.id}`, { params: { newStatusId }, headers: headersWithToken() });
      toast.success("Column deleted and tasks moved");
      setStatuses((prev) => prev.filter((s) => s.id !== statusToDelete.id));
      setIsDeleteModalOpen(false); setStatusToDelete(null); await loadBoard();
    } catch (err) { console.error(err); toast.error("Delete/migrate failed"); await loadBoard(); }
  };
  const startRename  = (s) => { setEditingStatusId(s.id); setEditingStatusName(s.name ?? ""); };
  const cancelRename = ()  => { setEditingStatusId(null); setEditingStatusName(""); };
  const saveRename   = async (statusId) => {
    const name = (editingStatusName || "").trim();
    if (!name) { toast.error("Name required"); return; }
    try {
      const payload = statuses.map((s) => (s.id === statusId ? { ...s, name } : s));
      await axios.put(`${BASE}/api/projects/${projectId}/statuses`, payload, { headers: headersWithToken() });
      setStatuses((prev) => prev.map((s) => (s.id === statusId ? { ...s, name } : s)));
      toast.success("Renamed");
    } catch (err) { console.error(err); toast.error("Rename failed"); await loadBoard(); }
    finally { cancelRename(); }
  };

  const fetchSprintPopup = async (sprintId) => {
    try {
      const res = await axios.get(`${BASE}/api/sprints/${sprintId}/popup-status`, { headers: headersWithToken() });
      if (res.data?.endingSoon === true) setSprintPopup(res.data);
    } catch (err) { console.error(err); toast.error("Failed to fetch sprint info"); }
  };
  const finishSprint = async (option) => {
    if (!activeSprintId) return;
    setIsFinishingSprint(true);
    try {
      await axios.post(`${BASE}/api/sprints/${activeSprintId}/finish`, null, { params: { option }, headers: headersWithToken() });
      toast.success("Sprint finished"); setSprintPopup(null); await loadBoard();
    } catch (err) { console.error(err); toast.error("Failed to finish sprint"); }
    finally { setIsFinishingSprint(false); }
  };

  const toggleSet = (setFn, val) =>
    setFn((prev) => { const next = new Set(prev); next.has(val) ? next.delete(val) : next.add(val); return next; });
  const openTaskPanel = (task) => { setSelectedTask(task); setIsTaskPanelOpen(true); };
  const toggleCollapse = (rowKey) =>
    setCollapsedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));

  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    if (filterOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [filterOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await loadBoard(); toast.info("Board refreshed"); }
    finally { setIsRefreshing(false); }
  };

  if (loading)
    return <div className="flex justify-center items-center min-h-[200px]"><LoadingSpinner text="Loading board..." /></div>;

  const colCount = statuses.length + 1;

  return (
    <div className={hideHeader ? "" : "p-6"}>
      {/* Header — hidden when rendered inside Board.jsx */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{projectName ?? "Project Board"}</h2>
          <div className="flex items-center gap-3">
            {activeSprintId && (
              <div className="relative">
                <div
                  role="button" tabIndex={0}
                  onClick={() => fetchSprintPopup(activeSprintId)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fetchSprintPopup(activeSprintId); }}
                  className={`cursor-pointer px-3 py-2 rounded border bg-yellow-50 text-yellow-800 hover:bg-yellow-100 flex items-center gap-2 transform transition-all duration-300 ${highlightPulse ? "scale-105 shadow-2xl ring-4 ring-yellow-300 z-50" : ""}`}
                >
                  <span className="font-medium">Sprint ending — check tasks?</span>
                  {sprintPopup?.unfinishedCount != null && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">{sprintPopup.unfinishedCount}</span>
                  )}
                </div>
                {highlightPulse && (
                  <div className="absolute right-0 mt-3 w-[300px] z-50">
                    <div className="bg-white border rounded-lg shadow-2xl p-3">
                      <div className="flex items-start gap-3">
                        <div className="text-yellow-600 text-2xl">⚠️</div>
                        <div className="flex-1">
                          <div className="font-semibold">Sprint ending soon</div>
                          <div className="text-sm text-gray-600">There are unfinished tasks — review or move them now.</div>
                          <div className="mt-3 flex gap-2 justify-end">
                            <button onClick={() => fetchSprintPopup(activeSprintId)} className="px-3 py-1 rounded bg-yellow-500 text-white text-sm">Review</button>
                            <button onClick={() => setHighlightPulse(false)} className="px-3 py-1 rounded border text-sm">Dismiss</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="relative" ref={filterRef}>
              <button onClick={() => setFilterOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 rounded border text-sm bg-white hover:bg-slate-50">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-medium">Filter</span>
                {filterCount > 0 && <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">{filterCount}</span>}
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-[480px] bg-white shadow-lg rounded border z-50 p-4">
                  <div className="flex gap-6">
                    <div className="w-1/3 border-r pr-3">
                      <ul className="space-y-2 text-sm">
                        {["Assignee","Priority","Status"].map((l) => <li key={l} className="py-1 px-2 rounded bg-slate-50">{l}</li>)}
                      </ul>
                    </div>
                    <div className="w-2/3 pl-3 space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1 font-medium">Assignee</div>
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <input placeholder="Search assignee" value={assigneeQuery} onChange={(e) => setAssigneeQuery(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                        </div>
                        <div className="max-h-36 overflow-y-auto border rounded p-2 space-y-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectedAssignees.size === 0} onChange={() => { setSelectedAssignees(new Set()); setAssigneeQuery(""); }} />
                            <span className="text-sm text-gray-500">All assignees</span>
                          </label>
                          {members.filter((m) => (m.name || "").toLowerCase().includes(assigneeQuery.toLowerCase())).map((m) => (
                            <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={selectedAssignees.has(String(m.id))} onChange={() => toggleSet(setSelectedAssignees, String(m.id))} />
                              <Avatar name={m.name} /><span className="text-sm">{m.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1 font-medium">Priority</div>
                        <div className="flex gap-2 flex-wrap">
                          {["LOW","MEDIUM","HIGH","CRITICAL"].map((p) => (
                            <button key={p} onClick={() => toggleSet(setSelectedPriorities, p)}
                              className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${selectedPriorities.has(p) ? "bg-indigo-600 text-white border-indigo-600" : "hover:bg-slate-50"}`}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1 font-medium">Status</div>
                        <div className="flex gap-2 flex-wrap">
                          {statuses.map((s) => (
                            <button key={s.id} onClick={() => toggleSet(setSelectedStatusesFilter, String(s.id))}
                              className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${selectedStatusesFilter.has(String(s.id)) ? "bg-indigo-600 text-white border-indigo-600" : "hover:bg-slate-50"}`}>{s.name}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => { setSelectedAssignees(new Set()); setSelectedPriorities(new Set()); setSelectedStatusesFilter(new Set()); setAssigneeQuery(""); toast.info("Filters cleared"); }} className="px-3 py-1.5 border rounded text-sm">Clear</button>
                        <button onClick={() => setFilterOpen(false)} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm">Apply</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              {showAddInput ? (
                <div className="flex items-center gap-2">
                  <input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="Column name" className="px-3 py-2 border rounded text-sm" onKeyDown={(e) => { if (e.key === "Enter") handleCreateStatus(); }} />
                  <button onClick={handleCreateStatus} disabled={creatingStatus} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">{creatingStatus ? "Adding…" : "Save"}</button>
                  <button onClick={() => { setShowAddInput(false); setNewStatusName(""); }} className="px-3 py-2 border rounded text-sm">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAddInput(true)} className="flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-slate-50 text-sm">
                  <Plus className="w-4 h-4 text-indigo-600" /> Add Column
                </button>
              )}
            </div>
            <button onClick={handleRefresh} className="px-3 py-2 rounded border bg-white hover:bg-slate-50">
              <Loader2 className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* FIX 4: Swimlane grid — borderSpacing adds visible gap between columns */}
      <div className="overflow-x-auto pb-4 w-full">
        <DragDropContext onDragEnd={handleDragEnd}>
          <table
            className="border-separate w-full"
            style={{ borderSpacing: "8px 0", minWidth: statuses.length * 260 + 200 }}
          >
            {/* Column headers */}
            <thead>
              <Droppable droppableId="status-headers" direction="horizontal" type="STATUS">
                {(provided) => (
                  <tr ref={provided.innerRef} {...provided.droppableProps}>
                    <th
                      className="sticky left-0 z-20 bg-slate-50 border border-slate-200 rounded-t text-left px-3 py-3"
                      style={{ width: 200, minWidth: 200 }}
                    >
                      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Story</span>
                    </th>
                    {statuses.map((status, idx) => {
                      const colorCls   = stableColorClass(status.id ?? status.name);
                      const totalInCol = safeTasks.filter((t) => t.statusId === status.id).length;
                      return (
                        <Draggable key={String(status.id)} draggableId={`status-${status.id}`} index={idx} type="STATUS">
                          {(dragProv) => (
                            <th
                              ref={dragProv.innerRef}
                              {...dragProv.draggableProps}
                              className="bg-white border border-slate-200 rounded-t text-left px-3 py-3"
                              style={{ minWidth: 240, ...dragProv.draggableProps.style }}
                            >
                              <div {...dragProv.dragHandleProps} className="flex items-center justify-between">
                                <div className={`flex items-center gap-2 px-2 py-1 rounded ${colorCls}`}>
                                  {editingStatusId === status.id ? (
                                    <input autoFocus value={editingStatusName}
                                      onChange={(e) => setEditingStatusName(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") saveRename(status.id); if (e.key === "Escape") cancelRename(); }}
                                      className="px-2 py-0.5 rounded border text-sm w-28" onClick={(e) => e.stopPropagation()} />
                                  ) : (
                                    <span className="font-semibold text-sm truncate">{status.name ?? status.statusName}</span>
                                  )}
                                  <span className="text-xs font-bold bg-white/60 px-1.5 py-0.5 rounded-full">{totalInCol}</span>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  {editingStatusId === status.id ? (
                                    <>
                                      <button onClick={() => saveRename(status.id)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Save</button>
                                      <button onClick={cancelRename} className="px-2 py-1 text-xs border rounded">Cancel</button>
                                    </>
                                  ) : (
                                    <>
                                      <button title="Rename" onClick={() => startRename(status)} className="p-1 rounded hover:bg-slate-100"><Edit3 className="w-3.5 h-3.5 text-gray-500" /></button>
                                      <button title="Delete" onClick={() => handleDeleteClick(status)} className="p-1 rounded hover:bg-slate-100 text-red-500"><Trash className="w-3.5 h-3.5" /></button>
                                    </>
                                  )}
                                </div>
                              </div>
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

            {/* Story rows */}
            <tbody>
              {storyRows.map((story) => {
                // Guard: skip invalid story objects
                if (!story || story.id == null) return null;

                const isCollapsed        = !!collapsedRows[story.id];
                const storyTasksFiltered = applyFilters(safeTasks.filter((t) => t.storyId === story.id));
                const totalCount         = storyTasksFiltered.length;
                const doneCount          = storyTasksFiltered.filter((t) => t.statusId === doneStatusId).length;
                const hex                = storyHex(story.id);

                return (
                  <React.Fragment key={`story-${story.id}`}>
                    {/* Story header — full-width spanning row */}
                    <tr>
                      <td
                        colSpan={colCount}
                        className="p-0"
                        style={{ borderLeft: `4px solid ${hex}` }}
                      >
                        <div
                          onClick={() => totalCount > 0 && toggleCollapse(story.id)}
                          className={`flex items-center gap-2 px-3 py-2 select-none transition-colors border-t border-slate-100
                            ${totalCount > 0 ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}`}
                          style={{ background: `linear-gradient(90deg, ${hex}10 0%, transparent 60%)` }}
                        >
                          <span className="text-slate-400 w-4 flex-shrink-0 flex items-center justify-center">
                            {totalCount > 0 ? (isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                          </span>
                          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hex }} />
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${hex}18`, color: hex }}>
                            {story.epicTitle ? `${story.epicTitle} · ` : ""}STR-{story.id}
                          </span>
                          <span className="text-sm font-semibold text-gray-800 truncate">{story.title}</span>
                          {/* FIX 5: stories with no tasks — always visible, shows "No tasks yet" badge */}
                          {totalCount === 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border ml-2"
                              style={{ color: hex, background: `${hex}12`, borderColor: `${hex}30` }}>
                              No tasks yet
                            </span>
                          )}
                          <div className="flex-1" />
                          {totalCount > 0 && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((doneCount / totalCount) * 100)}%`, background: hex }} />
                              </div>
                              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{doneCount}/{totalCount}</span>
                            </div>
                          )}
                          {story.priority && <span className="text-xs text-gray-400 flex-shrink-0">{story.priority}</span>}
                          {story.assigneeName && <Avatar name={story.assigneeName} />}
                        </div>
                      </td>
                    </tr>

                    {/* Task cells — shown when not collapsed and story has tasks */}
                    {!isCollapsed && totalCount > 0 && (
                      <tr>
                        <td className="sticky left-0 z-10 bg-white p-0" style={{ width: 200, minWidth: 200 }}>
                          <div style={{ borderLeft: `3px solid ${hex}30`, minHeight: 80, marginLeft: 4, height: "100%" }} />
                        </td>
                        {statuses.map((status) => {
                          const droppableId = `${status.id}__${story.id}`;
                          const cellTasks   = grid[String(story.id)]?.[String(status.id)] ?? [];
                          const wipWarn     = cellTasks.length > WIP_WARNING_THRESHOLD;
                          return (
                            <td key={status.id} className="align-top bg-white border border-slate-100 rounded" style={{ verticalAlign: "top" }}>
                              <Droppable droppableId={droppableId} type="ITEM">
                                {(dropProv, dropSnap) => (
                                  <div ref={dropProv.innerRef} {...dropProv.droppableProps}
                                    className={`p-2 min-h-[80px] transition-colors rounded ${dropSnap.isDraggingOver ? "bg-indigo-50" : ""}`}>
                                    {wipWarn && <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded mb-1">⚠️ {cellTasks.length} items</div>}
                                    {cellTasks.map((task, tIdx) => (
                                      <Draggable key={`task-${task.id}`} draggableId={`task-${task.id}`} index={tIdx} type="ITEM">
                                        {(taskProv, taskSnap) => (
                                          <TaskCard task={task} taskProvided={taskProv} taskSnapshot={taskSnap} openTaskPanel={openTaskPanel} />
                                        )}
                                      </Draggable>
                                    ))}
                                    {dropProv.placeholder}
                                    {cellTasks.length === 0 && !dropSnap.isDraggingOver && (
                                      <div className="h-10 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-xs">Drop here</div>
                                    )}
                                    <button
                                      onClick={() => setOpenCreateTaskModal({ projectId, statusId: status.id, activeSprintId, storyId: story.id })}
                                      style={{ opacity: 0 }}
                                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                                      className="mt-1 w-full text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 py-1 px-1 rounded hover:bg-indigo-50 transition-colors"
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

                    {/* Story with no tasks — show droppable empty row with Create Task */}
                    {!isCollapsed && totalCount === 0 && (
                      <tr>
                        <td className="sticky left-0 z-10 bg-white p-0" style={{ width: 200 }}>
                          <div style={{ borderLeft: `3px solid ${hex}30`, minHeight: 48, marginLeft: 4, height: "100%" }} />
                        </td>
                        {statuses.map((status, si) => (
                          <td key={status.id} className="align-top bg-white border border-slate-100 rounded">
                            <Droppable droppableId={`${status.id}__${story.id}`} type="ITEM">
                              {(dropProv, dropSnap) => (
                                <div ref={dropProv.innerRef} {...dropProv.droppableProps}
                                  className={`p-2 min-h-[48px] transition-colors ${dropSnap.isDraggingOver ? "bg-indigo-50 rounded" : ""}`}>
                                  {si === 0 && !dropSnap.isDraggingOver && (
                                    <button onClick={() => setOpenCreateTaskModal({ projectId, statusId: status.id, activeSprintId, storyId: story.id })}
                                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
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
                      <td className="sticky left-0 z-10 bg-white p-0" style={{ width: 200 }}>
                        <div style={{ borderLeft: "3px solid #94a3b830", minHeight: 80, marginLeft: 4, height: "100%" }} />
                      </td>
                      {statuses.map((status) => {
                        const cellTasks = grid["__unassigned__"]?.[String(status.id)] ?? [];
                        return (
                          <td key={status.id} className="align-top bg-white border border-slate-100 rounded">
                            <Droppable droppableId={`${status.id}____unassigned__`} type="ITEM">
                              {(dropProv, dropSnap) => (
                                <div ref={dropProv.innerRef} {...dropProv.droppableProps}
                                  className={`p-2 min-h-[80px] transition-colors rounded ${dropSnap.isDraggingOver ? "bg-indigo-50" : ""}`}>
                                  {cellTasks.map((task, tIdx) => (
                                    <Draggable key={`task-${task.id}`} draggableId={`task-${task.id}`} index={tIdx} type="ITEM">
                                      {(taskProv, taskSnap) => (
                                        <TaskCard task={task} taskProvided={taskProv} taskSnapshot={taskSnap} openTaskPanel={openTaskPanel} />
                                      )}
                                    </Draggable>
                                  ))}
                                  {dropProv.placeholder}
                                  {cellTasks.length === 0 && !dropSnap.isDraggingOver && (
                                    <div className="h-10 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-xs">Drop here</div>
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

      {/* Modals */}
      <CreateTaskModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} defaultStatusId={createDefaultStatusId} projectId={projectId}
        onCreated={async (created) => { setTasks((prev) => [...prev, created]); await loadBoard(); }} />
      <RightSidePanel isOpen={isTaskPanelOpen} onClose={() => { setIsTaskPanelOpen(false); setSelectedTask(null); }} panelMode="board">
        {isTaskPanelOpen && selectedTask && (
          <EditTaskForm taskId={selectedTask.id} projectId={projectId}
            onClose={() => { setIsTaskPanelOpen(false); setSelectedTask(null); }}
            onUpdated={async () => { await loadBoard(); setIsTaskPanelOpen(false); }} />
        )}
      </RightSidePanel>
      <DeleteStatusModal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}
        statusToDelete={statusToDelete} otherStatuses={deleteModalOtherStatuses} onConfirm={confirmDeleteWithMigration} />
      {sprintPopup && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[500px] max-w-full relative">
            <button onClick={() => setSprintPopup(null)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-900">✕</button>
            <h3 className="text-lg font-semibold mb-2">{sprintPopup.sprintName}</h3>
            {sprintPopup.hasUnfinishedTasks && <p className="text-sm text-red-600 mb-4">There are unfinished tasks in this sprint.</p>}
            {sprintPopup.endingSoon && <p className="text-sm text-yellow-600 mb-4">Sprint is ending soon.</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => finishSprint("NEXT_SPRINT")} disabled={isFinishingSprint} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">Move to Next Sprint</button>
              <button onClick={() => finishSprint("BACKLOG")} disabled={isFinishingSprint} className="px-3 py-2 rounded border disabled:opacity-60">Move to Backlog</button>
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