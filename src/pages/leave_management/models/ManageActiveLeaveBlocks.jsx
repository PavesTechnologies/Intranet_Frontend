import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ArrowLeftCircleIcon,
  XMarkIcon,
  PencilSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import DateRangePicker from "./DateRangePicker";
import { format } from "date-fns";
import EditBlockLeaveModal from "./EditBlockLeaveModal";

// Tailwind tokens
const skeleton = "animate-pulse bg-gray-400 rounded hover:cursor-wait";
const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const PMS_BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

// Toggle
const Toggle = ({ checked, onChange, label, hint, id }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-labelledby={`${id}-label`}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
    <div className="flex flex-col">
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      {hint ? (
        <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
      ) : null}
    </div>
  </div>
);

const Pill = ({ active, children, onRemove }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${
      active
        ? "bg-blue-500 text-white ring-1 ring-inset ring-indigo-600/20"
        : "text-blue-700"
    }`}
  >
    {children}
    {onRemove && (
      <button type="button">
        <XMarkIcon className="ml-1 h-4 w-5 text-white" onClick={onRemove} />
      </button>
    )}
  </span>
);

// MultiSelect
const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchable = true,
  selectAll = true,
  label,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const safe = Array.isArray(options) ? options : [];
    if (!q.trim()) return safe;
    const k = q.toLowerCase();
    return safe.filter((o) => (o.label || "").toLowerCase().includes(k));
  }, [q, options]);

  const ids = new Set((value || []).map((v) => String(v)));

  const toggleOption = (idVal) => {
    const next = new Set(ids);
    const key = String(idVal);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  const allVisibleIds = filtered.map((o) => String(o.value));
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((oid) => ids.has(oid));

  const handleToggleAll = () => {
    const next = new Set(ids);
    if (allSelected) {
      allVisibleIds.forEach((oid) => next.delete(oid));
    } else {
      allVisibleIds.forEach((oid) => next.add(oid));
    }
    onChange(Array.from(next));
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      const dropdown = document.getElementById(id);
      if (dropdown && !dropdown.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, id]);

  return (
    <div className="w-full" id={id}>
      {label ? (
        <label className="block text-sm font-medium mb-1">{label}</label>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full justify-between inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="truncate">
          {value?.length > 0 ? `${value.length} selected` : placeholder}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>

      {open && (
        <div className="relative mt-2">
          <div className="absolute z-20 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              {searchable && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
                    placeholder="Search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              )}
              {selectAll && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {allSelected ? "Clear visible" : "Select all visible"}
                  </button>
                </div>
              )}
            </div>

            <ul
              role="listbox"
              className="max-h-60 overflow-auto py-1"
              aria-multiselectable="true"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
              ) : (
                filtered.map((opt) => {
                  const key = String(opt.value);
                  const active = ids.has(key);
                  return (
                    <li
                      key={key}
                      role="option"
                      aria-selected={active}
                      onClick={() => toggleOption(key)}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-blue-100 ${
                        active ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleOption(key)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{opt.label}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}

      {value?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.slice(0, 5).map((v) => {
            const key = String(v);
            const found = (options || []).find((o) => String(o.value) === key);
            return (
              <Pill
                key={key}
                active
                onRemove={() =>
                  onChange(value.filter((id) => String(id) !== key))
                }
              >
                {found ? found.label : key}
              </Pill>
            );
          })}
          {value.length > 5 && <Pill>+{value.length - 5} more</Pill>}
        </div>
      )}
    </div>
  );
};

// Inline date range (fix timezone with local midnight)
function DateRangeInline({ start, end, setStart, setEnd, holidays }) {
  const handleStartChange = (date) => {
    if (end && date && new Date(end) < new Date(date)) {
      toast.warn("End date cannot be before start date.");
      setEnd("");
    }
    setStart(format(date, "yyyy-MM-dd"));
  };

  const handleEndChange = (date) => {
    if (start && date && new Date(date) < new Date(start)) {
      toast.error("End date cannot be before start date.");
      return;
    }
    setEnd(format(date, "yyyy-MM-dd"));
  };

  const localStartDate = start ? new Date(start + "T00:00:00") : undefined;
  const localEndDate = end ? new Date(end + "T00:00:00") : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <DateRangePicker
        label={<>Start</>}
        defaultDate={localStartDate}
        onChange={handleStartChange}
        disabledDays={[{ dayOfWeek: [0, 6] }, ...(holidays || [])]}
      />
      <DateRangePicker
        label={<>End</>}
        defaultDate={localEndDate}
        onChange={handleEndChange}
        disabledDays={[
          { dayOfWeek: [0, 6] },
          { before: localStartDate },
          ...(holidays || []),
        ]}
        align="right"
      />
    </div>
  );
}

export default function ManageActiveLeaveBlocks({ employeeId }) {
  const navigate = useNavigate();

  // Data state
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState([]); // normalized blocks
  const [projects, setProjects] = useState([]);
  const [membersMap, setMembersMap] = useState(new Map()); // projectId(string) -> [{value,label}]
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Inline edit state
  //   const [editingId, setEditingId] = useState(null);
  //   const [editDrafts, setEditDrafts] = useState({}); // id -> draft
  //   const [submittingId, setSubmittingId] = useState(null);
  const [unblockingId, setUnblockingId] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const projectOptions = (Array.isArray(projects) ? projects : []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const fetchInitial = async () => {
    try {
      setLoading(true);

      const [projRes, ltRes, ltIdsRes, blocksRes] = await Promise.all([
        api.get(`${PMS_BASE_URL}/api/projects/owner/${employeeId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api.get(`${BASE_URL}/api/leave/types`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api.get(`${BASE_URL}/api/leave/get-all-leave-type-ids`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api.get(`${BASE_URL}/api/leave-block/blocked-leaves/${employeeId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      // Normalize projects and leave types
      const projJson = Array.isArray(projRes.data)
        ? projRes.data
        : Array.isArray(projRes.data?.data)
          ? projRes.data.data
          : [];
      setProjects(projJson);

      const ltJson = Array.isArray(ltRes.data)
        ? ltRes.data
        : Array.isArray(ltRes.data?.data)
          ? ltRes.data.data
          : [];

      const ltIdsJson = Array.isArray(ltIdsRes.data)
        ? ltIdsRes.data
        : Array.isArray(ltIdsRes.data?.data)
          ? ltIdsRes.data.data
          : [];

      const leaveIdMap = new Map(
        (ltIdsJson || []).map((item) => [
          item.leaveName,
          String(item.leaveTypeId),
        ]),
      );

      const mergedLeaveTypes = (ltJson || []).map((lt) => ({
        label: lt.label,
        value: String(leaveIdMap.get(lt.name) || lt.name),
      }));
      setLeaveTypes(mergedLeaveTypes);

      // Pull blocks from { data: [...] }
      const rawBlocks = Array.isArray(blocksRes?.data?.data)
        ? blocksRes.data.data
        : [];
      console.log("Fetched raw blocks:", rawBlocks);

      // Preload members for all projects in blocks
      const uniqueProjectIds = Array.from(
        new Set(rawBlocks.map((b) => String(b.projectId))),
      );
      const memberEntries = await Promise.all(
        uniqueProjectIds.map(async (pid) => {
          try {
            const res = await api.get(
              `${PMS_BASE_URL}/api/projects/${pid}/members`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              },
            );
            const memsRaw = Array.isArray(res.data)
              ? res.data
              : Array.isArray(res.data?.data)
                ? res.data.data
                : [];
            const mems = memsRaw.map((m) => ({
              value: String(m.id),
              label: `${m.name}`,
            }));
            return [String(pid), mems];
          } catch (err) {
            console.error(`Failed to load members for project ${pid}`, err);
            return [String(pid), []];
          }
        }),
      );
      const newMembersMap = new Map(memberEntries);
      setMembersMap(newMembersMap);

      // Normalize blocks to UI shape
      // const normalizedBlocks = rawBlocks.map((block) => {
      //   const projectIdStr = String(block.projectId);
      //   const project = (projJson || []).find((p) => String(p.id) === projectIdStr);

      //   const allProjectMembers = newMembersMap.get(projectIdStr) || [];
      //   const allMemberIds = new Set(allProjectMembers.map((m) => String(m.value)));

      //   const blockMemberIds = (Array.isArray(block.members) ? block.members : []).map((m) =>
      //     String(m.employeeId)
      //   );
      //   const blockLeaveTypeIds = (Array.isArray(block.leaveTypes) ? block.leaveTypes : []).map(
      //     (lt) => String(lt.leaveTypeId)
      //   );

      //   const isScopeAll =
      //     allMemberIds.size > 0 &&
      //     blockMemberIds.length === allMemberIds.size &&
      //     blockMemberIds.every((id) => allMemberIds.has(String(id)));

      //   const memberNames = blockMemberIds.map((id) => {
      //     const found = allProjectMembers.find((m) => String(m.value) === String(id));
      //     return found ? found.label : id;
      //   });

      //   const leaveTypeNames = blockLeaveTypeIds.map((id) => {
      //     const found = mergedLeaveTypes.find((lt) => String(lt.value) === String(id));
      //     return found ? found.label : id;
      //   });

      //   return {
      //     id: String(block.id),
      //     managerId: String(block.managerId),
      //     projectId: projectIdStr,
      //     projectName: project ? project.name : projectIdStr,
      //     startDate: block.startDate,
      //     endDate: block.endDate,
      //     reason: block.reason,
      //     status: block.status,
      //     scopeAll: isScopeAll,
      //     memberIds: blockMemberIds,
      //     memberNames,
      //     leaveTypeIds: blockLeaveTypeIds,
      //     leaveTypeNames,
      //   };
      // });

      const normalizedBlocks = rawBlocks.map((block) => {
        const projectIdStr = String(block.projectId);
        const project = (projJson || []).find(
          (p) => String(p.id) === projectIdStr,
        );

        const allProjectMembers = newMembersMap.get(projectIdStr) || [];
        const allMemberIds = new Set(
          allProjectMembers.map((m) => String(m.value)),
        );

        // Extract block-level data
        const blockMemberIds = (block.members || []).map((m) =>
          String(m.employeeId),
        );
        const blockLeaveTypeIds = (block.leaveTypes || []).map((lt) =>
          String(lt.leaveTypeId),
        );

        // Extract mappings (these represent blocked leaves)
        const blockedMappings = (block.mappings || []).map((map) => ({
          employeeId: String(map.employeeId),
          leaveTypeId: String(map.leaveTypeId),
          status: map.status,
        }));

        // Resolve names
        const memberNames = blockMemberIds.map((id) => {
          const found = allProjectMembers.find(
            (m) => String(m.value) === String(id),
          );
          return found ? found.label : id;
        });

        const leaveTypeNames = blockLeaveTypeIds.map((id) => {
          const found = mergedLeaveTypes.find(
            (lt) => String(lt.value) === String(id),
          );
          return found ? found.label : id;
        });

        return {
          id: String(block.id),
          managerId: String(block.managerId),
          projectId: projectIdStr,
          projectName: project ? project.name : projectIdStr,
          startDate: block.startDate,
          endDate: block.endDate,
          reason: block.reason,
          status: block.status,
          memberIds: blockMemberIds,
          memberNames,
          leaveTypeIds: blockLeaveTypeIds,
          leaveTypeNames,
          blockedMappings, // 👈 Added this new property
        };
      });

      setBlocks(normalizedBlocks);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load active leave blocks.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const year = new Date().getFullYear();
      const res = await api.get(
        `${BASE_URL}/api/holidays/by-location/${year}`,
        {
          params: { state: "All", country: "India" },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const holidayDates = (Array.isArray(res.data) ? res.data : []).map(
        (holiday) => new Date(holiday.holidayDate + "T00:00:00"),
      );
      setHolidays(holidayDates);
    } catch (err) {
      toast.error("Could not load company holidays.");
    }
  };

  useEffect(() => {
    fetchInitial();
    fetchHolidays();
  }, [employeeId]);

  const ensureMembersLoaded = async (pid) => {
    const key = String(pid);
    if (membersMap.has(key)) return;
    try {
      const res = await api.get(
        `${PMS_BASE_URL}/api/projects/${key}/members`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const memsRaw = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      const mems = memsRaw.map((m) => ({
        value: String(m.id),
        label: `${m.name}`,
      }));
      setMembersMap((prev) => new Map(prev).set(key, mems));
    } catch (e) {
      toast.error("Failed to fetch project members");
    }
  };

  //   const startEdit = async (b) => {
  //     setEditingId(b.id);
  //     await ensureMembersLoaded(b.projectId);
  //     setEditDrafts((prev) => ({
  //       ...prev,
  //       [b.id]: {
  //         projectId: String(b.projectId),
  //         scopeAll: !!b.scopeAll,
  //         memberIds: Array.isArray(b.memberIds) ? b.memberIds.map(String) : [],
  //         leaveTypeIds: Array.isArray(b.leaveTypeIds) ? b.leaveTypeIds.map(String) : [],
  //         startDate: b.startDate,
  //         endDate: b.endDate,
  //       },
  //     }));
  //   };

  //   const cancelEdit = (id) => {
  //     setEditingId(null);
  //     setEditDrafts((prev) => {
  //       const next = { ...prev };
  //       delete next[id];
  //       return next;
  //     });
  //   };

  //   const saveEdit = async (id) => {
  //     const draft = editDrafts[id];
  //     if (!draft) return;

  //     if (!draft.projectId) return toast.error("Project is required.");
  //     if (!draft.scopeAll && (!Array.isArray(draft.memberIds) || draft.memberIds.length === 0)) {
  //       return toast.error("Select at least one employee or enable All members.");
  //     }
  //     if (!Array.isArray(draft.leaveTypeIds) || draft.leaveTypeIds.length === 0) {
  //       return toast.error("Select at least one leave type.");
  //     }
  //     if (!draft.startDate || !draft.endDate) {
  //       return toast.error("Select a valid date range.");
  //     }
  //     if (new Date(draft.endDate) < new Date(draft.startDate)) {
  //       return toast.error("End date cannot be before start date.");
  //     }

  //     setSubmittingId(id);
  //     try {
  //       const allMembersForProject = membersMap.get(String(draft.projectId)) || [];
  //       const payload = {
  //         blockId: id,
  //         projectId: String(draft.projectId),
  //         members: draft.scopeAll ? allMembersForProject.map((m) => String(m.value)) : draft.memberIds.map(String),
  //         leaveTypeIds: draft.leaveTypeIds.map(String),
  //         startDate: draft.startDate,
  //         endDate: draft.endDate,
  //         managerId: String(employeeId),
  //         year: new Date().getFullYear()
  //       };

  //       // Adjust method/URL to your backend
  //       const res = await api.post(`${BASE_URL}/api/leave-block/unblock`, payload, {
  //         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  //       });
  //       if (!res.data?.success) {
  //         throw new Error(res.data?.message || "Failed to update leave block");
  //       }
  //       toast.success("Leave block updated.");
  //       await fetchInitial();
  //       cancelEdit(id);
  //     } catch (err) {
  //       console.error(err);
  //       toast.error("Update failed. Please try again.");
  //     } finally {
  //       setSubmittingId(null);
  //     }
  //   };

  const handleOpenEditModal = async (block) => {
    // We must load members before opening the modal
    await ensureMembersLoaded(block.projectId);
    setSelectedBlock(block);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedBlock(null);
  };

  // *** UPDATED SAVE LOGIC ***
  // *** UPDATED SAVE LOGIC ***
  // const handleSaveModal = async (data) => {
  //   const {
  //     blockId,
  //     updates = {},
  //     unblockRequests = data.unblockRequests || data.unblockedRequests || [], // ✅ supports both
  //   } = data || {};

  //   console.log("Handling save for block ID:", data);
  //   console.log("Resolved unblockRequests:", unblockRequests);

  //   const originalBlock = selectedBlock;
  //   if (!originalBlock) {
  //     toast.error("Error: Could not retrieve original block data.");
  //     return;
  //   }

  //   const year = new Date().getFullYear();

  //   try {
  //     // ✅ If there are unblock requests → call unblock API
  //     if (unblockRequests.length > 0) {
  //       const payload = {
  //         blockId,
  //         unblockRequests,
  //         year,
  //       };

  //       console.log("🔹 Unblock Payload:", payload);

  //       await api.post(`${BASE_URL}/api/leave-block/unblock`, payload, {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //       });

  //       toast.success("Selected leave types successfully unblocked.");
  //     }

  //     // ✅ If user updated dates or reason → call update API
  //     if (updates && (updates.startDate || updates.endDate || updates.reason)) {
  //       const updatePayload = {
  //         blockId,
  //         ...updates,
  //         year,
  //       };

  //       console.log("🟦 Update Block Payload:", updatePayload);

  //       await api.put(
  //         `${BASE_URL}/api/leave-block/update/${blockId}`,
  //         updatePayload,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${localStorage.getItem("token")}`,
  //           },
  //         }
  //       );

  //       toast.success("Block details updated successfully.");
  //     }

  //     await fetchInitial();
  //     handleCloseEditModal();
  //   } catch (err) {
  //     console.error("Failed to save modal data:", err);
  //     toast.error(
  //       err.response?.data?.message ||
  //         "Failed to save update. Please try again."
  //     );
  //   }
  // };

  //   const handleSaveModal = async (payload) => {
  //   // payload expected:
  //   // {
  //   //   blockId,
  //   //   reason,
  //   //   startDate,
  //   //   endDate,
  //   //   status,
  //   //   mappingUpdates: [ { employeeId, leaveTypeId, status }, ... ]
  //   // }
  //   if (!payload || !payload.blockId) {
  //     toast.error("Invalid payload from modal.");
  //     return;
  //   }

  //   const blockId = payload.blockId;
  //   const year = new Date().getFullYear();

  //   try {
  //     console.log("🟦 Update Block Payload:", payload);

  //     // PUT update call (single API)
  //     await api.put(`${BASE_URL}/api/leave-block/update/${blockId}`, payload, {
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem("token")}`,
  //       },
  //     });

  //     toast.success("Block details updated successfully.");

  //     // refresh list and close modal
  //     await fetchInitial();
  //     handleCloseEditModal();
  //   } catch (err) {
  //     console.error("Failed to save modal data:", err);
  //     toast.error(
  //       err.response?.data?.message || "Failed to save update. Please try again."
  //     );
  //   }
  // };

  //new one

  const handleSaveModal = async (data) => {
    const { blockId, type, updates, mappingUpdates, unblockedRequests } =
      data || {};

    if (!blockId) {
      toast.error("Error: Block ID missing in request.");
      return;
    }

    const payload = {
      type, // ✅ <-- REQUIRED NOW
      blockId,
      year: new Date().getFullYear(),
    };

    if (updates) payload.updates = updates;
    if (mappingUpdates?.length) payload.mappingUpdates = mappingUpdates;
    if (unblockedRequests?.length)
      payload.unblockedRequests = unblockedRequests;

    // console.log("📌 Final API Payload →", payload);

    try {
      await api.patch(
        `${BASE_URL}/api/leave-block/update/${blockId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      toast.success("Leave block updated successfully.");
      await fetchInitial();
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to save modal data:", err);
      toast.error(
        err.response?.data?.message || "Failed to update leave block",
      );
    }
  };

  const unblock = async (id) => {
    setUnblockingId(id);
    try {
      // Using provided deactivate endpoint
      const res = await api.post(
        `${BASE_URL}/api/leave-block/deactivate/${id}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to unblock");
      }
      toast.success("Leave block removed.");
      setBlocks((prev) => prev.filter((b) => String(b.id) !== String(id)));
      //   if (editingId === id) cancelEdit(id);
    } catch (err) {
      console.error(err);
      toast.error("Could not unblock. Please try again.");
    } finally {
      setUnblockingId(null);
    }
  };

  const filteredBlocks = useMemo(() => {
    const list = Array.isArray(blocks) ? blocks : [];
    const q = filterText.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) => {
      const project = (
        projects.find((p) => String(p.id) === String(b.projectId))?.name || ""
      ).toLowerCase();
      const members = (Array.isArray(b.memberNames) ? b.memberNames : [])
        .join(", ")
        .toLowerCase();
      const types = (Array.isArray(b.leaveTypeNames) ? b.leaveTypeNames : [])
        .join(", ")
        .toLowerCase();
      const mappings = (Array.isArray(b.mappings) ? b.mappings : [])
        .join(", ")
        .toLowerCase();

      return (
        project.includes(q) ||
        members.includes(q) ||
        types.includes(q) ||
        mappings.includes(q) ||
        (b.startDate || "").toLowerCase().includes(q) ||
        (b.endDate || "").toLowerCase().includes(q)
      );
    });
  }, [blocks, projects, filterText]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Manage Blocked Leave</h1>
            <p className="mt-1 text-xs">
              View, edit, or unblock existing leave blocks set by the manager.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-800"
            >
              <ArrowLeftCircleIcon className="mr-2 h-10 w-9" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Active blocks</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Search and manage current blocked date ranges.
              </p>
            </div>
            <div className="w-full sm:w-80">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search by project, employee, type, or date"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="p-4 overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                    Project
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                    Scope
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                    Employees
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                    Leave types
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                    Dates
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-4">
                      <div className={`${skeleton} h-10 w-full`} />
                    </td>
                  </tr>
                ) : filteredBlocks.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-3 py-8 text-center text-sm text-gray-500"
                    >
                      No active blocks
                    </td>
                  </tr>
                ) : (
                  filteredBlocks.map((b) => {
                    console.log("Rendering block:", b);
                    const projectLabel =
                      projects.find((p) => String(p.id) === String(b.projectId))
                        ?.name || b.projectName;

                    return (
                      <tr key={b.id} className="align-top">
                        {/* Project */}
                        <td className="px-3 py-3 w-48">
                          <div className="text-sm font-medium">
                            {projectLabel}
                          </div>
                        </td>

                        {/* Scope toggle */}
                        <td className="px-3 py-3 w-44">
                          <span className="text-sm">
                            {b.scopeAll ? "All members" : "Selected"}
                          </span>
                        </td>

                        {/* Employees */}
                        <td className="px-3 py-3 min-w-[280px]">
                          <div className="flex flex-wrap gap-2">
                            {(b.memberNames || [])
                              .slice(0, 4)
                              .map((name, i) => (
                                <Pill key={i}>{name}</Pill>
                              ))}
                            {(b.memberNames || []).length > 4 ? (
                              <Pill>
                                +{(b.memberNames || []).length - 4} more
                              </Pill>
                            ) : null}
                            {b.scopeAll && <Pill active>All</Pill>}
                          </div>
                        </td>

                        {/* Leave types (fixed: compute inline for read-only) */}
                        <td className="px-3 py-3 min-w-[260px]">
                          <div className="flex flex-wrap gap-2">
                            {(b.leaveTypeIds || []).slice(0, 4).map((id, i) => {
                              const found = (leaveTypes || []).find(
                                (lt) => String(lt.value) === String(id),
                              );
                              return (
                                <Pill key={i}>{found ? found.label : id}</Pill>
                              );
                            })}
                            {(b.leaveTypeIds || []).length > 4 ? (
                              <Pill>
                                +{(b.leaveTypeIds || []).length - 4} more
                              </Pill>
                            ) : null}
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="px-3 py-3 w-[360px]">
                          <div className="text-sm">
                            {new Date(b.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            →{" "}
                            {new Date(b.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 w-40 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(b)}
                              className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <PencilSquareIcon className="h-4 w-4 mr-1" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => unblock(b.id)}
                              disabled={unblockingId === b.id}
                              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                unblockingId === b.id
                                  ? "bg-red-400 cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700"
                              }`}
                            >
                              {unblockingId === b.id
                                ? "Unblocking..."
                                : "Unblock"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {selectedBlock && (
        <EditBlockLeaveModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          block={selectedBlock}
          allLeaveTypes={leaveTypes}
          allProjectMembers={
            membersMap.get(String(selectedBlock.projectId)) || []
          }
          holidays={holidays}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}
