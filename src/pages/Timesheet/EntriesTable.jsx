import React, { useState, useEffect } from "react";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormTime from "../../components/forms/FormTime";
import { addEntryToTimesheet, updateTimesheet } from "./api";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { showStatusToast } from "../../components/toastfy/toast";
import Button from "../../components/Button/Button";
import { add } from "date-fns";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { ConfirmDialog } from "./TimesheetGroup";
import { getEntryRowId } from "./entrySelection";

const TS_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;

// ✅ Robust time formatter for both UTC and local ISO strings
const prettyTime = (time) => {
  if (!time) return "";

  try {
    // Case 1: raw "HH:mm" strings (local form inputs)
    if (/^\d{2}:\d{2}$/.test(time)) {
      const [h, m] = time.split(":");
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } // Case 2: ISO datetime from backend ("2025-10-31T23:30:00" or "2025-10-31T23:30:00Z")

    const date = new Date(time.endsWith("Z") ? time : time + "Z"); // Convert UTC -> Local automatically (Date object does this inherently)

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (err) {
    console.error("prettyTime error:", time, err);
    return "";
  }
};

// **Helper function to check for overlap between two time ranges**
const checkOverlap = (start1, end1, start2, end2) => {
  // Overlap occurs if one interval starts before the other ends AND the other starts before the first one ends.
  return start1 < end2 && start2 < end1;
};

// **Helper function to create a comparable Date object from a time string (HH:mm)**
const createComparableTime = (timeStr) => {
  // We use a dummy date (1970-01-01) just for time comparison on the same work date.
  const [h, m] = timeStr.split(":");
  return new Date(1970, 0, 1, parseInt(h), parseInt(m));
};

const EntriesTable = ({
  entries, // Existing saved entries (may contain full ISO strings)
  mapWorkType,
  timesheetId,
  workDate,
  status,
  addingNewEntry,
  setAddingNewEntry,
  refreshData,
  projectInfo,
  selectedEntryIds,
  setSelectedEntryIds,
  selectionMode,
  pendingEntries = [],
  setPendingEntries = () => {},
}) => {
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState({});
  const [addData, setAddData] = useState({
    workType: "Office",
    isBillable: false,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [entryIdToDelete, setEntryIdToDelete] = useState(null); // ✅ Converts a backend UTC datetime string (e.g. "2025-11-10T04:30:00Z")
  //    to a local "HH:mm" string that will show correctly in <input type="time">

  const toLocalTimeString = (utcString) => {
    if (!utcString) return "";
    try {
      // If the string is already just time (HH:MM:SS), return HH:MM
      if (/^\d{2}:\d{2}:\d{2}/.test(utcString)) {
        return utcString.substring(0, 5);
      } // Ensure it's treated as UTC — even if backend sends without "Z"

      const utcDate = utcString.endsWith("Z")
        ? new Date(utcString)
        : new Date(utcString + "Z");

      const localHours = utcDate.getHours().toString().padStart(2, "0");
      const localMinutes = utcDate.getMinutes().toString().padStart(2, "0");
      return `${localHours}:${localMinutes}`;
    } catch (err) {
      console.error("Error converting UTC to local:", utcString, err);
      return "";
    }
  };

  useEffect(() => {
    if (!addingNewEntry) setEditIndex(null);
  }, [addingNewEntry]);

  const handleDelete = (entryId) => {
    setEntryIdToDelete(entryId);
    setIsConfirmOpen(true);
  };
  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
  };
  const handleLocalDelete = (tsId) => {
    setPendingEntries((prev) =>
      prev.filter((entry) => entry.timesheetEntryId !== tsId),
    );
    setIsConfirmOpen(false);
    toast.success("Entry deleted successfully!");
  };

  const handleDeleteClick = async (tsId) => {
    setIsConfirmOpen(false);
    if (tsId && tsId.toString().startsWith("pending-")) {
      handleLocalDelete(tsId);
      return;
    }

    if (!tsId) {
      toast.error("Error: Entry ID is missing.");
      return;
    }

    setDeleteLoading(true);
    try {
      const deleteEntry = await api.delete(
        `${TS_BASE_URL}/api/timesheet/deleteEntries/${timesheetId}`,
        {
          data: {
            entryIds: [tsId],
          },
        },
      );
      refreshData();
      toast.success(deleteEntry?.data || "Entry deleted successfully");
    } catch (err) {
      toast.error(err?.response?.data || "Failed to delete entry");
    } finally {
      setDeleteLoading(false);
    }
  };

  const workTypeOptions = [
    { label: "Office", value: "Office" },
    {label: "Remote", value: "Remote" },
    { label: "Home", value: "Home" },
    { label: "Client Location", value: "Client Location" },
    { label: "Hybrid", value: "Hybrid" },
  ];

  const projectOptions = projectInfo.map((p) => ({
    label: p.project,
    value: p.projectId,
  }));

  const projectIdToName = Object.fromEntries(
    projectInfo.map((p) => [p.projectId, p.project]),
  );
  const taskIdToName = Object.fromEntries(
    projectInfo.flatMap((p) => p.tasks.map((t) => [t.taskId, t.task])),
  );

  const taskIdToBillablity = Object.fromEntries(
    projectInfo.flatMap((p) => p.tasks.map((t) => [t.taskId, t.billable])),
  );

  const getTaskOptions = (projectId) => {
    const proj = projectInfo.find((p) => p.projectId === parseInt(projectId));
    return proj
      ? proj.tasks.map((t) => ({ label: t.task, value: t.taskId }))
      : [];
  };

  const toggleCheckbox = (entryId, checked) => {
    if (checked) setSelectedEntryIds((prev) => [...prev, entryId]);
    else setSelectedEntryIds((prev) => prev.filter((id) => id !== entryId));
  };

  const handleEditClick = (idx) => {
    // console.log("Attempting to edit index:", idx);
    if (addingNewEntry || status?.toLowerCase() === "approved") return;
    const entry = [...entries, ...pendingEntries][idx];

    setEditIndex(idx);
    setAddingNewEntry(false);
    setEditData({
      timesheetEntryId: entry.timesheetEntryId,
      projectId: entry.projectId,
      taskId: entry.taskId,
      fromTime: entry.fromTime || toLocalTimeString(entry.fromTime),
      toTime: entry.toTime || toLocalTimeString(entry.toTime),
      workType: entry.workType,
      description: entry.description,
      isBillable: entry.billable,
    });
  };

  // const handleDeleteClick = async (tsId) => {
  //   setIsConfirmOpen(false);
  //   setDeleteLoading(true);
  //   try {
  //     const deleteEntry = await axios.delete(`${TS_BASE_URL}/api/timesheet/deleteEntries/${timesheetId}`, {
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem("token")}`
  //       },
  //       data: {
  //         entryIds: [tsId]
  //       }
  //     });
  //     refreshData();
  //     toast.success(deleteEntry?.data  || "Entry deleted successfully");
  //   } catch (err) {
  //     toast.error( err?.response?.data || "Failed to delete entry");
  //   } finally {
  //     setDeleteLoading(false);
  //   }
  // };

  const handleCancel = () => {
    setEditIndex(null);
    setEditData({});
    setAddingNewEntry(false);
    setAddData({ workType: "Office", isBillable: "Yes" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (editIndex === null) return;

    let updated = { ...editData, [name]: value };

    if (name === "taskId" && editData.projectId) {
      const project = projectInfo.find(
        (p) => p.projectId === parseInt(editData.projectId),
      );
      const task = project?.tasks.find((t) => t.taskId === parseInt(value));
      if (task) updated.isBillable = task.billable;
    }

    setEditData(updated);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...addData, [name]: value };

    if (name === "taskId" && addData.projectId) {
      const project = projectInfo.find(
        (p) => p.projectId === parseInt(addData.projectId),
      );
      const task = project?.tasks.find((t) => t.taskId === parseInt(value));
      if (task) updated.isBillable = task.billable;
    }

    setAddData(updated);
  }; // 🛑 FIX 2: Corrected Overlap Validation Logic

  const isValid = (data, isEditMode = false) => {
    const { projectId, taskId, fromTime, toTime, workType } = data || {};
    const entryIdToIgnore = isEditMode ? data.timesheetEntryId : null; // --- 1. Basic Field Validation ---

    if (!projectId)
      return (showStatusToast("Please select a project", "error"), false);
    if (!taskId)
      return (showStatusToast("Please select a task", "error"), false);
    if (!fromTime)
      return (showStatusToast("Please select a start time", "error"), false);
    if (!toTime)
      return (showStatusToast("Please select an end time", "error"), false);
    if (!workType)
      return (showStatusToast("Please select a work type", "error"), false); // --- 2. New Entry Time Validity ---

    const newStart = createComparableTime(fromTime);
    const newEnd = createComparableTime(toTime);

    if (newStart >= newEnd) {
      showStatusToast("Start time must be before End time", "error");
      return false;
    }

    // --- 3. Overlap Check: Against EXISTING (ISO String) Entries ---
    for (let entry of entries) {
      // Only ignore if we are editing an already saved entry
      if (isEditMode && entry.timesheetEntryId === entryIdToIgnore) continue;

      // Convert existing ISO string to just the time component (HH:mm)
      const existingFromTimeStr = toLocalTimeString(entry.fromTime);
      const existingToTimeStr = toLocalTimeString(entry.toTime);

      // Convert time part to comparable Date objects
      const existStart = createComparableTime(existingFromTimeStr);
      const existEnd = createComparableTime(existingToTimeStr);

      if (checkOverlap(newStart, newEnd, existStart, existEnd)) {
        showStatusToast("Time overlaps with an existing saved entry", "error");
        return false;
      }
    }

    // --- 4. Overlap Check: Against PENDING (HH:mm String) Entries ---
    for (let entry of pendingEntries) {
      // If we are editing a pending entry, ignore it (though IDs are just timestamps here)
      if (isEditMode && entry.timesheetEntryId === entryIdToIgnore) continue;

      // Pending entries already have HH:mm strings
      const existStart = createComparableTime(entry.fromTime);
      const existEnd = createComparableTime(entry.toTime);

      if (checkOverlap(newStart, newEnd, existStart, existEnd)) {
        showStatusToast("Time overlaps with another unsaved entry", "error");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!isValid(editData, true)) return;
    const currentEntry = [...entries, ...pendingEntries][editIndex];

    if (currentEntry.timesheetEntryId.toString().startsWith("pending-")) {
      const updatedPendingEntry = {
        timesheetEntryId: currentEntry.timesheetEntryId,
        projectId: parseInt(editData.projectId),
        taskId: parseInt(editData.taskId),
        fromTime: editData.fromTime,
        toTime: editData.toTime,
        workType: editData.workType,
        description: editData.description,
        billable: taskIdToBillablity[editData.taskId],
        workLocation: editData.workType,
      };
      setPendingEntries((prev) =>
        prev.map((e) =>
          e.timesheetEntryId === currentEntry.timesheetEntryId
            ? updatedPendingEntry
            : e,
        ),
      );
      handleCancel();
      showStatusToast("Entry updated successfully!", "success");
      return;
    }
    // 3. LOGIC FOR UPDATING SAVED ENTRY (BACKEND API CALL)
    try {
      const newStart = new Date(
        `${workDate}T${editData.fromTime}:00`,
      ).toISOString();
      const newEnd = new Date(
        `${workDate}T${editData.toTime}:00`,
      ).toISOString();

      // The API call logic remains largely the same
      await updateTimesheet(timesheetId, {
        workDate,
        status,
        entries: [
          {
            ...editData,
            projectId: parseInt(editData.projectId),
            taskId: parseInt(editData.taskId),
            fromTime: newStart,
            toTime: newEnd,
            billable: editData.isBillable,
            workLocation: editData.workType,
            description: editData.description,
            id: editData.timesheetEntryId,
          },
        ],
      });

      // Close the inline edit mode and clear data, and refresh data from backend
      setEditIndex(null);
      setEditData({});
      refreshData();
      showStatusToast("Entry updated successfully", "success");
    } catch (err) {
      showStatusToast("Failed to update entry", "error");
    }
  }; // Add-entry: validate and push to pendingEntries

  const handleAddEntry = async () => {
    if (!isValid(addData, false)) return;

    const baseEntry = {
      ...addData,
      projectId: parseInt(addData.projectId),
      taskId: parseInt(addData.taskId),
      fromTime: addData.fromTime,
      toTime: addData.toTime,
      billable: !!addData.isBillable,
      workLocation: addData.workType,
    };

    // Existing timesheet → POST immediately; no pending buffer.
    if (timesheetId) {
      try {
        await addEntryToTimesheet(timesheetId, workDate, [
          {
            ...baseEntry,
            fromTime: new Date(
              `${workDate}T${baseEntry.fromTime}:00`,
            ).toISOString(),
            toTime: new Date(
              `${workDate}T${baseEntry.toTime}:00`,
            ).toISOString(),
          },
        ]);
        setAddingNewEntry(false);
        setAddData({ workType: "Office", isBillable: "Yes" });
        if (refreshData) await refreshData();
      } catch (err) {
        // addEntryToTimesheet already raises a toast; keep the row open so the user can retry.
      }
      return;
    }

    // New (uncreated) timesheet → keep batching locally.
    setPendingEntries((prev) => [
      ...prev,
      {
        ...baseEntry,
        timesheetEntryId: `pending-${Date.now()}`,
      },
    ]);
    setAddingNewEntry(false);
    setAddData({ workType: "Office", isBillable: "Yes" });
  };

  const showActions = window.location.pathname === "/timesheets";
  
  // Per-column classes. The table stays table-auto on purpose: in edit mode the
  // cells hold inputs (FormTime alone has a 130px min-width), so letting the browser
  // size columns to their content is what keeps both modes usable. The fix for the
  // ragged layout is not fixed widths but stopping short values from wrapping.
  const headerBase =
    "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap";
  const headerCellClass = `${headerBase} text-left`;
  const headerCenterClass = `${headerBase} text-center`;

  const bodyBase = "px-3 py-2.5 align-middle";
  // Long free text — allowed to wrap; these columns absorb the spare width.
  const bodyCellClass = `${bodyBase} text-left break-words whitespace-normal`;
  // Short values that must never break across lines (this is what made the rows ragged).
  const bodyNoWrapClass = `${bodyBase} text-left whitespace-nowrap`;
  // Times: centred and tabular so digits line up column-wise down the table.
  const bodyTimeClass = `${bodyBase} text-center whitespace-nowrap tabular-nums font-medium text-gray-900`;
  const bodyCenterClass = `${bodyBase} text-center whitespace-nowrap`;
  const actionCellClass = `${bodyBase} text-center whitespace-nowrap`;
  const compactSelectProps = {
    className: "min-w-0",
    buttonClassName: "px-3 text-sm",
    maxVisibleOptions: 4,
    // The grid scrolls horizontally, which would clip an absolutely positioned
    // dropdown; anchor it so the panel escapes the overflow container.
    anchorOptions: true,
  };
  // Project and task lists grow with the catalogue — show 3 rows, then scroll.
  const listSelectProps = { ...compactSelectProps, maxVisibleOptions: 3 };
  const compactTimeProps = {
    className: "min-w-0",
    inputClassName: "min-w-0 text-sm",
  };

  return (
    <>
    {/* Horizontal scroll instead of crushing the columns on a narrow viewport.
        The selects inside already anchor their panels for exactly this reason. */}
    <div className="w-full overflow-x-auto pb-1">
      <table className="w-full min-w-[860px] table-auto border-collapse overflow-hidden rounded-lg border border-gray-200 text-sm">
        <thead>
          <tr className="bg-indigo-900 text-white">
            {/* Select-all lives on the day header now — this cell only keeps the
                column aligned with the per-row checkboxes below. */}
            {selectionMode && <th className="w-10 px-3 py-2.5" aria-hidden="true" />}
            <th className={headerCellClass}>Project</th>
            <th className={headerCellClass}>Task</th>
            <th className={headerCenterClass}>Start</th>
            <th className={headerCenterClass}>End</th>
            <th className={headerCellClass}>Work Location</th>
            <th className={headerCellClass}>Description</th>
            <th className={headerCenterClass}>Billable</th>
            {showActions && <th className={headerCenterClass}>Actions</th>}
          </tr>
        </thead>
           
      {/* ----------------- tbody: mapped rows + add-row (if any) ----------------- */}
           
      <tbody>
               
        {[...entries, ...pendingEntries].map((entry, idx) => (
          <tr
            key={getEntryRowId(entry, idx)}
            className={`border-b border-gray-100 text-sm last:border-b-0 ${
              idx % 2 === 0 ? "bg-white" : "bg-gray-50/70"
            } transition-colors hover:bg-blue-50/70`}
          >

            {selectionMode && (
              <td className="px-3 py-2 text-center">

                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[#263383]"
                  checked={selectedEntryIds.includes(
                    getEntryRowId(entry, idx),
                  )}
                  onChange={(e) =>
                    toggleCheckbox(getEntryRowId(entry, idx), e.target.checked)
                  }
                />

              </td>
            )}
                       
            {editIndex === idx ? (
              <>
                               
                <td className={bodyCellClass}>
                                   
                  <FormSelect
                    name="projectId"
                    value={editData.projectId}
                    options={projectOptions}
                    onChange={handleChange}
                    {...listSelectProps}
                  />
                                 
                </td>
                               
                <td className={bodyCellClass}>
                                   
                  <FormSelect
                    name="taskId"
                    value={editData.taskId}
                    options={getTaskOptions(editData.projectId)}
                    onChange={handleChange}
                    {...listSelectProps}
                  />
                                 
                </td>
                               
                <td className={bodyCellClass}>
                                   
                  <FormTime
                    name="fromTime"
                    value={editData.fromTime}
                    onChange={handleChange}
                    {...compactTimeProps}
                  />
                                 
                </td>
                               
                <td className={bodyCellClass}>
                                   
                  <FormTime
                    name="toTime"
                    value={editData.toTime}
                    onChange={handleChange}
                    {...compactTimeProps}
                  />
                                 
                </td>
                               
                <td className={bodyCellClass}>
                                   
                  <FormSelect
                    name="workType"
                    value={editData.workType}
                    options={workTypeOptions}
                    onChange={handleChange}
                    {...compactSelectProps}
                  />
                                 
                </td>
                               
                <td className={bodyCellClass}>
                                   
                  <FormInput
                    name="description"
                    value={editData.description}
                    onChange={handleChange}
                  />
                                 
                </td>
                               
                <td className={bodyCenterClass}>
                  {(() => {
                    const billable =
                      editData.isBillable !== undefined
                        ? editData.isBillable
                        : entry.isBillable;
                    return (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          billable
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
                        }`}
                      >
                        {billable ? "Yes" : "No"}
                      </span>
                    );
                  })()}
                </td>
                               
                {showActions && (
                  <td className={actionCellClass}>
                                       
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                        onClick={handleSave}
                        title="Save changes"
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <button
                        className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
                        onClick={handleCancel}
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                                     
                  </td>
                )}
                             
              </>
            ) : (
              <>
                               
                <td className={`${bodyNoWrapClass} font-medium text-gray-900`}>
                  <span
                    className="block max-w-[160px] truncate"
                    title={entry.projectName || projectIdToName[entry.projectId] || "N/A"}
                  >
                    {entry.projectName || projectIdToName[entry.projectId] || "N/A"}
                  </span>
                </td>

                <td className={bodyCellClass}>
                  {/* max-width sits on the span, not the td: browsers largely ignore
                      max-width on a cell under table-auto. */}
                  <span
                    className="line-clamp-2 max-w-[420px]"
                    title={entry.taskName || taskIdToName[entry.taskId] || "N/A"}
                  >
                    {entry.taskName || taskIdToName[entry.taskId] || "N/A"}
                  </span>
                </td>

                <td className={bodyTimeClass}>{prettyTime(entry.fromTime)}</td>

                <td className={bodyTimeClass}>{prettyTime(entry.toTime)}</td>

                <td className={`${bodyNoWrapClass} text-gray-600`}>
                  {mapWorkType(entry.workLocation)}
                </td>

                <td className={`${bodyCellClass} text-gray-600`}>
                  {/* An empty cell read as a rendering fault; a dash reads as "nothing logged". */}
                  {entry.description?.trim() ? (
                    <span
                      className="line-clamp-2 max-w-[280px]"
                      title={entry.description}
                    >
                      {entry.description}
                    </span>
                  ) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>

                <td className={bodyCenterClass}>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      entry.isBillable
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
                    }`}
                  >
                    {entry.isBillable ? "Yes" : "No"}
                  </span>
                </td>
                               
                {showActions && (
                  <td className={actionCellClass}>
                    {/* console.log("Status from entries table: ", status) */}
                               
                    {(status?.toLowerCase() === "draft" ||
                      status?.toLowerCase() === "submitted" ||
                      status?.toLowerCase() === "rejected") && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                          onClick={() => handleEditClick(idx)}
                          title="Edit entry"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          className={`rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 ${
                            deleteLoading ? "cursor-not-allowed opacity-50" : ""
                          }`}
                          onClick={() => handleDelete(entry.timesheetEntryId)}
                          title="Delete entry"
                          disabled={deleteLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                                     
                  </td>
                )}
                             
              </>
            )}
                     
          </tr>
        ))}
                {/* ←──────── Add-row for new entry ───────→ */}       
        {addingNewEntry && (
          <tr
            key="add-new"
            className="text-sm bg-white hover:bg-blue-50 transition"
          >
                        {selectionMode && <td className={bodyCellClass}></td>}     
                 
            <td className={bodyCellClass}>
                            
              <FormSelect
                name="projectId"
                value={addData.projectId || ""}
                options={projectOptions}
                onChange={handleAddChange}
                {...listSelectProps}
              />
                         
            </td>
                       
            <td className={bodyCellClass}>
                            
              <FormSelect
                name="taskId"
                value={addData.taskId || ""}
                options={getTaskOptions(addData.projectId)}
                onChange={handleAddChange}
                {...listSelectProps}
              />
                         
            </td>
                       
            <td className={bodyCellClass}>
                            
              <FormTime
                name="fromTime"
                value={addData.fromTime || ""}
                onChange={handleAddChange}
                {...compactTimeProps}
              />
                         
            </td>
                       
            <td className={bodyCellClass}>
                            
              <FormTime
                name="toTime"
                value={addData.toTime || ""}
                onChange={handleAddChange}
                {...compactTimeProps}
              />
                         
            </td>
                       
            <td className={bodyCellClass}>
                            
              <FormSelect
                name="workType"
                value={addData.workType}
                options={workTypeOptions}
                onChange={handleAddChange}
                {...compactSelectProps}
              />
                         
            </td>
                       
            <td className={bodyCellClass}>
                            
              <FormInput
                name="description"
                value={addData.description || ""}
                onChange={handleAddChange}
              />
                         
            </td>
                       
            <td className={bodyCenterClass}>
              {addData.projectId &&
              taskIdToBillablity[addData.taskId] !== undefined ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    taskIdToBillablity[addData.taskId]
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                      : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
                  }`}
                >
                  {taskIdToBillablity[addData.taskId] ? "Yes" : "No"}
                </span>
              ) : (
                <span className="text-xs text-gray-400">N/A</span>
              )}
            </td>
                       
            {showActions && (
            <td className={actionCellClass}>
                            
              <div className="flex items-center justify-center gap-1">
                <button
                  className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                  onClick={handleAddEntry}
                  title="Save entry"
                >
                  <Check className="h-4 w-4" />
                </button>
                               
                <button
                  className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
                             
              </div>
                         
            </td>
            )}
                     
          </tr>
        )}
             
      </tbody>
           
      {pendingEntries.length > 0 && (
        <tfoot>
                   
          <tr>
                       
            <td
  colSpan={selectionMode ? (showActions ? 9 : 8) : (showActions ? 8 : 7)}
  className="px-4 py-1"
>
                           
              <div className="flex justify-end py-1">
                               
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      await addEntryToTimesheet(
                        timesheetId,
                        workDate,
                        pendingEntries.map((entry) => ({
                          ...entry,
                          // Convert HH:mm to ISO datetime using the correct workDate
                          fromTime: new Date(
                            `${workDate}T${entry.fromTime}:00`,
                          ).toISOString(),
                          toTime: new Date(
                            `${workDate}T${entry.toTime}:00`,
                          ).toISOString(),
                        })),
                      );
                      setPendingEntries([]);
                      refreshData();
                      showStatusToast("Timesheet submitted!", "success");
                    } catch (err) {
                      showStatusToast("Failed to submit timesheet", "error");
                    }
                  }}
                >
                                    Submit Timesheet                
                </Button>
                             
              </div>
                         
            </td>
                     
          </tr>
                 
        </tfoot>
      )}
         
    </table>
    </div>
    <ConfirmDialog
      open={isConfirmOpen}
      title="Confirm Delete"
      message={`Are you sure you want to delete this entry? This action cannot be undone.`}
      onConfirm={() => handleDeleteClick(entryIdToDelete)}
      onCancel={handleCancelDelete}
    />
    </>
  );
};

export default EntriesTable;
