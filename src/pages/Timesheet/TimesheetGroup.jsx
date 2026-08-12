import React, { useState, useEffect } from "react";
import StatusBadge from "../../components/status/statusbadge";
import EntriesTable from "./EntriesTable";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import Tooltip from "../../components/status/Tooltip";
import { showStatusToast } from "../../components/toastfy/toast";
import api from "../../api/axiosInstance";
import { submitWeeklyTimesheet } from "./api";
import SelectedEntriesMenu from "./SelectedEntriesMenu";
import {
  dayKeyFor,
  getEntryRowIds,
  isDeletableRowId,
  isPendingRowId,
} from "./entrySelection";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { addDays, startOfMonth } from "date-fns";

// Converts a "YYYY-MM-DD" string safely to a Date object in local Indian time
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number); // month is 0-based
  return new Date(year, month - 1, day, 0, 0, 0);
};

// Formats a Date to "YYYY-MM-DD" in local (India) time
const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
           {" "}
      <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
               {" "}
        <h2 className="text-lg font-semibold mb-4 text-left">{title}</h2>       {" "}
        <p className="mb-6 text-left">{message}</p>       {" "}
        <div className="flex justify-end space-x-3">
                   {" "}
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
                        Cancel          {" "}
          </button>
                   {" "}
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
                        Confirm          {" "}
          </button>
                 {" "}
        </div>
             {" "}
      </div>
         {" "}
    </div>
  );
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  return {
    // The original formatted string
    text: date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }), // Check if day is Sunday (0) or Saturday (6)
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
};

const formatWeekRange = (weekRange) => {
  return weekRange;
};

// Function to get week number of the year
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
};

// Function to get month name
const getMonthName = (date) => {
  return new Date(date).toLocaleDateString("en-US", { month: "long" });
};

const calculateTotalHours = (entries) => {
  let totalMinutes = 0;
  entries.forEach((entry) => {
    try {
      let start, end; // Handle time-only strings (HH:MM:SS or HH:MM:SS.mmm)

      if (/^\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(entry.fromTime)) {
        const [startHours, startMinutes, startSeconds] =
          entry.fromTime.split(":");
        start = new Date(
          0,
          0,
          0,
          parseInt(startHours),
          parseInt(startMinutes),
          parseInt(startSeconds.split(".")[0]),
        );
      } else {
        start = new Date(entry.fromTime);
      }
      if (/^\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(entry.toTime)) {
        const [endHours, endMinutes, endSeconds] = entry.toTime.split(":");
        end = new Date(
          0,
          0,
          0,
          parseInt(endHours),
          parseInt(endMinutes),
          parseInt(endSeconds.split(".")[0]),
        );
      } else {
        end = new Date(entry.toTime);
      }

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        totalMinutes += (end - start) / (1000 * 60);
      }
    } catch (error) {
      console.error("Error calculating hours for entry:", entry, error);
    }
  });
  return (totalMinutes / 60).toFixed(2);
};

const TimesheetGroup = ({
  weekGroup,
  timesheetId,
  workDate,
  entries,
  status,
  mapWorkType,
  emptyTimesheet,
  refreshData,
  projectInfo,
  getWeeklyStatusColor,
  holidaysMap = {},
  approvers = [
    { approverName: "Dummy Approver1", status: "Pending" },
    { approverName: "Dummy Approver2", status: "Approved" },
  ],
  isCollapsed,
  onToggleCollapse,
  onApproveDay,
}) => {
  const collapsible = typeof onToggleCollapse === "function";
  const showBody = !collapsible || !isCollapsed;
  // Editing affordances (select, add entry, delete) belong to the employee's
  // own timesheet page only. The Manager / Reporting-Manager / Admin approval
  // views mount this same component from /managerapproval and must stay
  // read-only — matches EntriesTable's `showActions` guard.
  const isEmployeeView = window.location.pathname === "/timesheets";
  const isWeeklyFormat = weekGroup && weekGroup.timesheets;
  const weekData = isWeeklyFormat ? weekGroup : null;
  const dailyData = !isWeeklyFormat
    ? { timesheetId, workDate, entries, status }
    : null;

  const [entriesState, setEntriesState] = useState(
    isWeeklyFormat ? [] : entries,
  );
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [timesheetIdAdding, setTimesheetIdAdding] = useState(null);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [date, setDate] = useState(
    isWeeklyFormat ? weekData.weekStart : workDate,
  );
  const [editDateIndex, setEditDateIndex] = useState(null);
  const [approvingDay, setApprovingDay] = useState(null); // per-day overturn (re-approve) in flight
  // Which day's entries are currently selectable, namespaced so the draft
  // panel (timesheetId === undefined) can't collide with a real day.
  const [selection, setSelection] = useState({ key: null, timesheetId: null });
  // Employee view: each day of the week starts collapsed behind a chevron.
  // Approver views are unaffected — their days are always open.
  const [openDays, setOpenDays] = useState({});
  const toggleDayOpen = (id) =>
    setOpenDays((prev) => ({ ...prev, [id]: !prev[id] }));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Timesheet-level (whole day) delete — separate from the entry-level delete above.
  const [timesheetToDelete, setTimesheetToDelete] = useState(null);
  const [deletingTimesheet, setDeletingTimesheet] = useState(false);
  const [isSubmittingWeek, setIsSubmittingWeek] = useState(false);

  // Check if submit button should be disabled
  const isSubmitDisabled = () => {
    if (!isWeeklyFormat || !weekData) return true;

    const weeklyStatus = weekData.status?.toUpperCase();

    if (
      weeklyStatus === "SUBMITTED" ||
      weeklyStatus === "PARTIALLY APPROVED" ||
      weeklyStatus === "APPROVED"
    ) {
      const allSubmitted = weekData.timesheets.every(
        (ts) => ts.status?.toUpperCase() !== "DRAFT",
      );
      return allSubmitted;
    }

    return false; // Enabled for DRAFT or other statuses
  }; // Get the button text based on status

  const getSubmitButtonText = () => {
    if (!isWeeklyFormat || !weekData) return "SUBMIT WEEK";

    const weeklyStatus = weekData.status?.toUpperCase();

    if (weeklyStatus === "APPROVED") {
      return "Week Already Approved";
    }
    if (weeklyStatus === "PARTIALLY APPROVED") {
      return "Week Partially Approved";
    }
    if (weeklyStatus === "SUBMITTED") {
      return "Week Already Submitted";
    }

    return "SUBMIT WEEK";
  }; // Handle weekly submission

  const handleSubmitWeek = async () => {
    if (!isWeeklyFormat) return; // Get all timesheet IDs for the week

    const timesheetIds = weekData.timesheets.map((ts) => ts.timesheetId);

    if (timesheetIds.length === 0) {
      showStatusToast("No timesheets to submit", "error");
      return;
    }

    try {
      setIsSubmittingWeek(true);
      await submitWeeklyTimesheet(timesheetIds);
      if (refreshData) await refreshData();
    } catch (error) {
      showStatusToast("Failed to submit weekly timesheet", "error");
    } finally {
      setIsSubmittingWeek(false);
    }
  };

  // Calculate total hours based on format
  const totalHours = isWeeklyFormat
    ? weekData.totalHours.toFixed(2)
    : calculateTotalHours(entriesState);

  const handleAddEntryDaily = () => {
    setTimesheetIdAdding(timesheetId);
  };

  const handleAddEntryWeekly = (id) => {
    setTimesheetIdAdding(id);
    setOpenDays((prev) => ({ ...prev, [id]: true })); // reveal a collapsed day
  };

  const handleDeleteClick = () => {
    if (selectedEntryIds.length === 0) {
      showStatusToast("No entries selected for deletion.", "error");
      return;
    }

    setIsConfirmOpen(true);
  };

  const toggleDateChange = (e) => {
    if (status?.toLowerCase() === "approved") return; // prevent date change if approved
    setEditDateIndex((prev) => (prev === null ? 0 : null));
  };

  const handleConfirmDelete = async () => {
    setIsConfirmOpen(false);

    const pendingIds = selectedEntryIds.filter(isPendingRowId);
    // `new-<idx>` placeholders are render-time fallbacks, not real entry ids —
    // isDeletableRowId keeps them out of the delete request.
    const realIds = selectedEntryIds.filter(
      (id) => !isPendingRowId(id) && isDeletableRowId(id),
    );

    // 1. Local-only removal for pending (draft) entries — no backend call.
    if (pendingIds.length > 0) {
      setPendingEntries((prev) =>
        prev.filter((e) => !pendingIds.includes(e.timesheetEntryId)),
      );
    }

    // 2. Backend call only when there are persisted ids AND a valid target timesheet.
    //    Selection is scoped to one timesheet at a time, so we only ever delete
    //    from that timesheet's URL — never fan out across the week.
    const targetTimesheetId = selection.timesheetId ?? timesheetId;

    try {
      let responseText = "";

      if (realIds.length > 0 && targetTimesheetId) {
        const response = await api.delete(
          `${
            window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
          }/api/timesheet/deleteEntries/${targetTimesheetId}`,
          {
            data: { entryIds: realIds },
          },
        );

        const data = response.data;
        responseText = typeof data === "string" ? data : data?.message || "";

        if (responseText) showStatusToast(responseText, "success");
        if (refreshData) await refreshData();
      } else if (pendingIds.length > 0) {
        showStatusToast("Entry deleted successfully", "success");
      }

      setSelectedEntryIds([]);
      setSelection({ key: null, timesheetId: null });
    } catch (error) {
      const respData = error.response?.data;
      const message =
        (typeof respData === "string" ? respData : respData?.message) ||
        error.message ||
        "Error deleting entries";
      showStatusToast(message, "error");
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
  };

  // ---- Timesheet-level delete (removes the whole day, not single entries) ----
  // The backend has no "delete timesheet" route: deleteEntries drops the timesheet
  // itself once its last entry is gone, so we send every entry id for that day.
  const getEntryIds = (timesheet) =>
    (timesheet?.entries || [])
      .map((e) => e.timesheetEntryId ?? e.timesheetEntryid ?? e.id)
      .filter((id) => id != null);

  // Locked = already reviewed. Both spellings of "partially approved" are in
  // circulation (the API sends the underscore form in places).
  const isStatusLocked = (value) => {
    const s = value?.toLowerCase().replace(/_/g, " ");
    return s === "approved" || s === "partially approved";
  };

  const isDayLocked = (timesheet) => isStatusLocked(timesheet?.status);

  // ---- Entry selection (day-scoped) ----
  // Counts are derived by intersecting with this day's row ids, never by
  // comparing lengths: after a refresh the ids change, and stale ids must
  // contribute 0 rather than corrupt the "all selected" state.
  const getDaySelection = (rowIds) => {
    const selectedForDay = rowIds.filter((id) => selectedEntryIds.includes(id));
    return {
      selectedForDay,
      allSelected:
        rowIds.length > 0 && selectedForDay.length === rowIds.length,
      someSelected:
        selectedForDay.length > 0 && selectedForDay.length < rowIds.length,
    };
  };

  // What a Delete would actually remove — `new-<idx>` placeholders are dropped,
  // so the confirmation copy can never promise more than the request sends.
  const deletableSelectedCount =
    selectedEntryIds.filter(isDeletableRowId).length;

  // Ticking a day replaces the selection wholesale, so ticking day B clears
  // day A in the same commit. Unticking individual rows leaves `selection.key`
  // alone, which is what keeps cherry-picking possible.
  const toggleDaySelectAll = (targetTimesheetId, checked, rowIds) => {
    if (!checked) {
      setSelectedEntryIds([]);
      setSelection({ key: null, timesheetId: null });
      return;
    }
    setSelection({
      key: dayKeyFor(targetTimesheetId),
      timesheetId: targetTimesheetId ?? null,
    });
    setSelectedEntryIds(rowIds);
    if (targetTimesheetId != null)
      setOpenDays((prev) => ({ ...prev, [targetTimesheetId]: true }));
  };

  const handleDeleteTimesheetClick = (timesheet) => {
    if (getEntryIds(timesheet).length === 0) {
      showStatusToast("This day has no entries to delete.", "error");
      return;
    }
    setTimesheetToDelete(timesheet);
  };

  const handleConfirmDeleteTimesheet = async () => {
    const target = timesheetToDelete;
    if (!target || deletingTimesheet) return;

    const entryIds = getEntryIds(target);
    if (entryIds.length === 0) {
      showStatusToast("This day has no entries to delete.", "error");
      setTimesheetToDelete(null);
      return;
    }

    setDeletingTimesheet(true);
    try {
      const response = await api.delete(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/timesheet/deleteEntries/${target.timesheetId}`,
        { data: { entryIds } },
      );

      const data = response.data;
      const message =
        (typeof data === "string" ? data : data?.message) ||
        "Timesheet deleted successfully";
      showStatusToast(message, "success");

      // Drop any UI state that pointed at the timesheet we just removed,
      // otherwise selection/add-entry stay bound to a dead id after refresh.
      if (selection.key === dayKeyFor(target.timesheetId)) {
        setSelection({ key: null, timesheetId: null });
        setSelectedEntryIds([]);
      }
      if (timesheetIdAdding === target.timesheetId) setTimesheetIdAdding(null);

      setTimesheetToDelete(null);
      if (refreshData) await refreshData();
    } catch (error) {
      const respData = error.response?.data;
      const message =
        (typeof respData === "string" ? respData : respData?.message) ||
        error.message ||
        "Failed to delete timesheet";
      showStatusToast(message, "error");
    } finally {
      setDeletingTimesheet(false);
    }
  };

  const approveStatus = approvers.every(
    (a) => a.status?.toUpperCase() === "APPROVED",
  ); // Get current status and date display

  const currentStatus = isWeeklyFormat ? weekData.status : status;
  const currentDate = isWeeklyFormat
    ? weekData.weekRange
    : formatDate(date).text; // Get week number and month for weekly format

  const weekNumber = isWeeklyFormat ? weekData.weekNumber : null;
  const monthName = isWeeklyFormat ? weekData.monthName : null;
  const year = isWeeklyFormat ? weekData.year : null; // Custom status badge with correct colors

  const CustomStatusBadge = ({ label, size = "sm" }) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case "leave day":
          return "bg-red-100 text-violet-800 border-red-300";
        case "holiday":
          return "bg-red-100 text-violet-800 border-red-300";
        case "draft":
        case "submitted":
          return "bg-yellow-100 text-yellow-800 border-yellow-300";
        case "approved":
        case "partially_approved":
          return "bg-green-100 text-green-800 border-green-300";
        case "partially approved":
          return "bg-green-100 text-green-800 border-green-300";
        case "rejected":
          return "bg-red-100 text-red-800 border-red-300";
        case "weekend":
          return "bg-yellow-100 text-yellow-800 border-yellow-300";
        default:
          return "bg-gray-100 text-gray-800 border-gray-300";
      }
    };

    const sizeStyles = {
      sm: "text-xs px-2 py-0.5",
      md: "text-sm px-3 py-1",
      lg: "text-base px-4 py-1.5",
    };

    return (
      <span
        className={`inline-block rounded-full font-medium border text-center ${getStatusColor(
          label,
        )} ${sizeStyles[size]}`}
      >
        {label}
      </span>
    );
  };

  const formatApproverTooltip = (approvers) => {
    if (!approvers || approvers.length === 0) {
      return <p className="text-gray-400">No approver data</p>;
    }
    const approved = approvers.filter(
      (a) => a.status?.toUpperCase() === "APPROVED",
    );
    const rejected = approvers.filter(
      (a) => a.status?.toUpperCase() === "REJECTED",
    );
    const pending = approvers.filter(
      (a) =>
        a.status?.toUpperCase() === "PENDING" ||
        a.status?.toUpperCase() === "SUBMITTED",
    );

    return (
      <div className="space-y-2 text-xs">
               {" "}
        {approved.length > 0 && (
          <div>
                       {" "}
            <div className="flex items-center gap-1 font-medium text-green-400">
                            <CheckCircle size={14} /> Approved by:          
               {" "}
            </div>
                       {" "}
            <ul className="list-disc list-inside text-gray-200 ml-4">
                           {" "}
              {approved.map((a) => (
                <li key={a.approverName}>{a.approverName}</li>
              ))}
                         {" "}
            </ul>
                     {" "}
          </div>
        )}
               {" "}
        {pending.length > 0 && (
          <div>
                       {" "}
            <div className="flex items-center gap-1 font-medium text-yellow-400">
                            <Clock size={14} /> Yet to be approved by:          
               {" "}
            </div>
                       {" "}
            <ul className="list-disc list-inside text-gray-200 ml-4">
                           {" "}
              {pending.map((a) => (
                <li key={a.approverName}>{a.approverName}</li>
              ))}
                         {" "}
            </ul>
                     {" "}
          </div>
        )}
               {" "}
        {rejected.length > 0 && (
          <div>
                       {" "}
            <div className="flex items-center gap-1 font-medium text-red-400">
                            <XCircle size={14} /> Rejected by:            {" "}
            </div>
                       {" "}
            <ul className="list-disc list-inside text-gray-200 ml-4">
                           {" "}
              {rejected.map((a) => (
                <li key={a.approverName}>
                  <span>{a.approverName}</span>
                  {a.comments && a.comments.trim() !== "" && (
                    <div className="text-[11px] text-gray-300 italic mt-0.5 ml-1">
                      Reason : {a.comments}
                    </div>
                  )}
                </li>
              ))}
                         {" "}
            </ul>
                     {" "}
          </div>
        )}
             {" "}
      </div>
    );
  }; // Determine border color based on status

  const getBorderColor = () => {
    if (isWeeklyFormat) {
      const status = currentStatus?.toLowerCase();
      if (
        status === "approved" ||
        status === "partially approved" ||
        status === "partially_approved"
      )
        return "border-green-500";
      if (status === "rejected") return "border-red-500";
      if (status === "draft" || status === "submitted")
        return "border-yellow-500";
      return "border-gray-500";
    }
    return "border-gray-300";
  }; // Determine background color for week header based on status

  const getWeekHeaderBgColor = () => {
    if (isWeeklyFormat) {
      const status = currentStatus?.toLowerCase();
      if (
        status === "approved" ||
        status === "partially approved" ||
        status === "partially_approved"
      )
        return "bg-green-50 border-b-green-200";
      if (status === "rejected") return "bg-red-50 border-b-red-200";
      if (status === "draft" || status === "submitted")
        return "bg-yellow-50 border-b-yellow-200";
      return "bg-gray-50 border-b-gray-200";
    }
    return "bg-blue-50 border-b-blue-200";
  }; // Determine week badge color based on status

  const getWeekBadgeColor = () => {
    if (isWeeklyFormat) {
      const status = currentStatus?.toLowerCase();
      if (
        status === "approved" ||
        status === "partially approved" ||
        status === "partially_approved"
      )
        return "bg-green-600";
      if (status === "rejected") return "bg-red-600";
      if (status === "draft" || status === "submitted") return "bg-yellow-600";
      return "bg-gray-600";
    }
    return "bg-blue-600";
  }; // Determine total hours text color based on status

  const getTotalHoursColor = () => {
    if (isWeeklyFormat) {
      const status = currentStatus?.toLowerCase();
      if (status === "approved" || status === "partially approved")
        return "text-green-700";
      if (status === "rejected") return "text-red-700";
      if (status === "draft" || status === "submitted")
        return "text-yellow-700";
      return "text-gray-700";
    }
    return "text-blue-700";
  }; // Calculate the first and last date of the current month

  const today = new Date();
  const firstDateOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDateOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const todaysDate = today.toISOString().split("T")[0]; // helper to normalize date string to yyyy-mm-dd

  const normalize = (d) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  // Daily ("+ New Timesheet") panel: its rows live in pendingEntries until the
  // timesheet is created, so they are selectable exactly like persisted ones.
  const draftRowIds = getEntryRowIds(entriesState, pendingEntries);
  const draftSelection = getDaySelection(draftRowIds);
  const canSelectDraft =
    !isWeeklyFormat &&
    isEmployeeView &&
    !isStatusLocked(currentStatus) &&
    draftRowIds.length > 0;

  return (
    <div
      className={`mb-6 bg-white rounded-xl shadow-lg border-2 ${getBorderColor()} hover:border-opacity-80 transition-colors duration-200 text-xs`}
    >
            {/* Week Header */}     {" "}
      {isWeeklyFormat && (
        <div
          className={`${getWeekHeaderBgColor()} border-b px-4 py-2 ${showBody ? "mb-1" : ""} ${collapsible ? "cursor-pointer hover:brightness-95 transition" : ""}`}
          onClick={collapsible ? () => onToggleCollapse() : undefined}
          role={collapsible ? "button" : undefined}
          aria-expanded={collapsible ? !isCollapsed : undefined}
        >
                   {" "}
          <div className="flex justify-between items-center">
                       {" "}
            <div className="flex items-center gap-3">
                           {" "}
              {collapsible &&
                (isCollapsed ? (
                  <ChevronDown size={16} className="text-gray-600 shrink-0" />
                ) : (
                  <ChevronUp size={16} className="text-gray-600 shrink-0" />
                ))}
              <div
                className={`${getWeekBadgeColor()} text-white px-2.5 py-0.5 rounded-full text-xs font-bold`}
              >
                Week {weekGroup.weekId || weekNumber}
              </div>
                           {" "}
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-gray-800">
                  {monthName} {year}
                </div>
                <div className="text-xs text-gray-600">
                  {weekData.weekRange}
                </div>
              </div>
                       {" "}
            </div>
                       {" "}
            <div className="flex items-center gap-4">
                            {/* Week Difference Display */}             {" "}
              {weekData.hoursDifference !== undefined &&
                weekData.hoursDifference > 0 && (
                  <div className="text-right">
                                       {" "}
                    <div
                      className={`text-sm font-semibold ${
                        weekData.differenceType === "increase"
                          ? "text-green-600"
                          : weekData.differenceType === "decrease"
                            ? "text-red-600"
                            : "text-gray-600"
                      }`}
                    >
                                           {" "}
                      {weekData.differenceType === "increase"
                        ? "↗"
                        : weekData.differenceType === "decrease"
                          ? "↘"
                          : "→"}{" "}
                                           {" "}
                      {weekData.hoursDifference.toFixed(1)} hrs                
                         {" "}
                    </div>
                                       {" "}
                    <div className="text-xs text-gray-500">
                                            vs previous week                  
                       {" "}
                    </div>
                                     {" "}
                  </div>
                )}
                           {" "}
              <div className="flex flex-col items-center leading-tight">
                               {" "}
                <div className={`text-sm font-bold ${getTotalHoursColor()}`}>
                  {totalHours} hrs
                </div>
                               {" "}
                <div className="text-[10px] text-gray-500">Total Hours</div>       
                     {" "}
              </div>
                           {" "}
              <CustomStatusBadge label={currentStatus} size="sm" />         
               {" "}
            </div>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {showBody && (
        <>
      <div
        className={
          !isWeeklyFormat
            ? "relative flex items-center mb-1 mx-4 min-h-12"
            : "flex justify-between items-center mb-1 mx-4"
        }
      >
                {/* Daily format header */}       {" "}
        {!isWeeklyFormat && (
          <>
                       {" "}
            <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-3">
            {canSelectDraft && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[#263383]"
                  aria-label="Select all entries for this timesheet"
                  checked={draftSelection.allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = draftSelection.someSelected;
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    toggleDaySelectAll(timesheetId, e.target.checked, draftRowIds)
                  }
                />
                {draftSelection.selectedForDay.length > 0 ? (
                  <SelectedEntriesMenu
                    count={draftSelection.selectedForDay.length}
                    onDelete={handleDeleteClick}
                    disabled={deletingTimesheet}
                    label="Actions for the selected entries"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDaySelectAll(timesheetId, true, draftRowIds);
                    }}
                    className="whitespace-nowrap text-xs font-medium text-gray-500 transition-colors hover:text-[#263383] focus:outline-none"
                  >
                    Select all
                  </button>
                )}
              </div>
            )}
            {editDateIndex === timesheetId &&
            emptyTimesheet &&
            status?.toLowerCase() !== "approved" ? (
              <div className="relative">
                               {" "}
                <DatePicker
                  selected={date ? parseLocalDate(date) : null}
                  onChange={(selectedDate) => {
                    if (!selectedDate) return;

                    const iso = toLocalISODate(selectedDate);
                    // 🧩 Future date guard (defensive — maxDate already blocks the click)
                    if (iso > toLocalISODate(new Date())) {
                      showStatusToast(
                        "Future date — Timesheet not allowed",
                        "error",
                      );
                      return;
                    }
                    const holiday = holidaysMap[iso];
                    const day = selectedDate.getDay(); // 0=Sunday, 6=Saturday
                    // 🧩 Weekend check (Saturday/Sunday)

                    if (day === 0 || day === 6) {
                      // Weekend, but check if allowed in holiday list
                      if (!holiday || holiday.submitTimesheet === false) {
                        showStatusToast(
                          "Weekend — Timesheet not allowed",
                          "error",
                        );
                        return;
                      }
                    } // 🧩 Regular holiday check

                    if (holiday && holiday.submitTimesheet === false) {
                      showStatusToast(
                        `Holiday: ${holiday.holidayName} — timesheet not allowed`,
                        "error",
                      );
                      return;
                    } // ✅ If allowed, set date

                    setDate(iso);
                    setEditDateIndex(null);
                  }}
                  open
                  onClickOutside={() => setEditDateIndex(null)}
                  calendarClassName="timesheet-datepicker shadow-lg rounded-xl border border-gray-200 p-2 z-[9999]"
                  popperClassName="z-[9999]"
                  shouldCloseOnSelect={true}
                  showPopperArrow={false}
                  popperPlacement="top-start"
                  minDate={startOfMonth(
                    parseLocalDate(toLocalISODate(new Date())),
                  )}
                  // Future dates are not allowed: cap at today (current month only).
                  maxDate={parseLocalDate(toLocalISODate(new Date()))}
                  calendarStartDay={1} // Monday first (Indian style)
                  renderCustomHeader={({ date }) => (
                    <div className="text-center font-semibold text-indigo-600 mb-1">
                                           {" "}
                      {date.toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                                         {" "}
                    </div>
                  )} // ✅ Determine background color dynamically
                  dayClassName={(dateObj) => {
                    const iso = toLocalISODate(dateObj);
                    const holiday = holidaysMap[iso];
                    const day = dateObj.getDay(); // 0=Sunday, 6=Saturday
                    // --- 0️⃣ Out-of-range days (previous month + future): low-color ---
                    const todayIso = toLocalISODate(new Date());
                    const monthStartIso = toLocalISODate(
                      startOfMonth(parseLocalDate(todayIso)),
                    );
                    if (iso < monthStartIso || iso > todayIso) {
                      return "text-gray-300 cursor-not-allowed opacity-50";
                    }
                    // --- 1️⃣ Weekends ---

                    if (day === 0 || day === 6) {
                      // Check if weekend has holiday override
                      if (holiday && holiday.submitTimesheet === true) {
                        return "bg-green-200 text-green-800 rounded-full font-semibold hover:bg-green-300 transition-all";
                      } else {
                        return "bg-yellow-100 text-yellow-800 rounded-full font-semibold hover:bg-yellow-200 transition-all cursor-not-allowed";
                      }
                    } // --- 2️⃣ Holidays ---

                    if (holiday && holiday.submitTimesheet === false) {
                      return "bg-red-200 text-red-800 rounded-full font-semibold hover:bg-red-300 transition-all cursor-not-allowed";
                    }
                    if (holiday && holiday.submitTimesheet === true) {
                      return "bg-green-200 text-green-800 rounded-full font-semibold hover:bg-green-300 transition-all";
                    } // --- 3️⃣ Default ---

                    return "hover:bg-blue-100 text-gray-700 transition-all";
                  }} // ✅ Tooltip (hover)
                  renderDayContents={(day, dateObj) => {
                    const iso = toLocalISODate(dateObj);
                    const holiday = holidaysMap[iso];
                    const dayName = dateObj.toLocaleDateString("en-IN", {
                      weekday: "long",
                    });
                    const isWeekend =
                      dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    let tooltipText = "";
                    if (holiday) {
                      tooltipText =
                        holiday.holidayDescription || holiday.holidayName;
                    } else if (isWeekend) {
                      tooltipText = `${dayName} — Weekend`;
                    }

                    return (
                      <div
                        className="relative group flex h-full w-full items-center justify-center cursor-pointer"
                        title={tooltipText}
                      >
                        {day}
                        {tooltipText && (
                          <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[9999]">
                            {tooltipText}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                                {/* ✅ Legend */}               {" "}
                <div className="mt-2 flex gap-4 text-xs justify-center">
                                   {" "}
                  <div className="flex items-center gap-1">
                                       {" "}
                    <span className="w-3 h-3 rounded-full bg-green-400"></span> 
                                      <span>Allowed</span>                 {" "}
                  </div>
                                   {" "}
                  <div className="flex items-center gap-1">
                                       {" "}
                    <span className="w-3 h-3 rounded-full bg-red-400"></span>   
                                    <span>Blocked</span>                 {" "}
                  </div>
                                   {" "}
                  <div className="flex items-center gap-1">
                                       {" "}
                    <span className="w-3 h-3 rounded-full bg-yellow-300"></span>
                                        <span>Weekend</span>               
                     {" "}
                  </div>
                                 {" "}
                </div>
                             {" "}
              </div>
            ) : (
              <div
                onClick={() =>
                  status?.toLowerCase() !== "approved" &&
                  setEditDateIndex(timesheetId)
                }
                className={`whitespace-nowrap text-gray-500 font-semibold ${
                  status?.toLowerCase() !== "approved"
                    ? "cursor-pointer hover:text-blue-600"
                    : "cursor-not-allowed"
                }`}
              >
                {currentDate}
              </div>
            )}
            </div>
                       {" "}
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
                           {" "}
              <span className="font-medium text-gray-700">
                Total hours : {totalHours} hrs
              </span>
                           {" "}
              <CustomStatusBadge label={currentStatus} size="sm" />         
               {" "}
            </div>
                     {" "}
          </>
        )}
        {/* Daily format actions */}
        {!isWeeklyFormat &&
          isEmployeeView && (
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <button
                onClick={handleAddEntryDaily}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#263383] transition-colors hover:bg-[#f4f6fc] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                disabled={isStatusLocked(currentStatus)}
                title={
                  isStatusLocked(currentStatus)
                    ? "Cannot edit approved timesheet"
                    : "Add Entry"
                }
              >
                <Plus size={16} className="flex-shrink-0" /> Add Entry
              </button>
            </div>
          )}
             {" "}
      </div>
           {" "}
      {isWeeklyFormat ? (
        // Render weekly timesheets
        <div className="space-y-3 p-4">
                   {" "}
          {weekData.timesheets
            .sort((a, b) => new Date(a.workDate) - new Date(b.workDate))
            .map((timesheet, index) => {
              const rowIds = getEntryRowIds(timesheet.entries, pendingEntries);
              const daySelection = getDaySelection(rowIds);
              // Holiday / leave days render no EntriesTable at all, so a
              // checkbox there would toggle a table that doesn't exist.
              const canSelectDay =
                isEmployeeView &&
                !(
                  timesheet.defaultHolidayTimesheet ||
                  timesheet.isLeaveTimesheet
                ) &&
                !isDayLocked(timesheet) &&
                rowIds.length > 0;
              // Collapsible only on the employee page, and collapsed by default.
              const dayCollapsible = isEmployeeView;
              const dayOpen = dayCollapsible
                ? !!openDays[timesheet.timesheetId]
                : true;

              return (
              <div
                key={timesheet.timesheetId}
                className="bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200 shadow-sm overflow-visible"
              >
                                {/* Individual Day Header */}               {" "}
                <div
                  className={`${formatDate(timesheet.workDate).isWeekend ? "bg-yellow-100 cursor-not-allowed" : timesheet.defaultHolidayTimesheet || timesheet.isLeaveTimesheet ? "bg-red-200 cursor-not-allowed" : ""} border-b-2 border-gray-300 px-4 py-2.5 flex justify-between items-center rounded-t-lg overflow-visible`}
                >
                                   {" "}
                  {/* Selector first, then the date + hours it applies to */}
                  <div className="flex items-center gap-3">
                    {dayCollapsible && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDayOpen(timesheet.timesheetId);
                        }}
                        aria-expanded={dayOpen}
                        aria-label={`${dayOpen ? "Collapse" : "Expand"} ${
                          formatDate(timesheet.workDate).text
                        }`}
                        className="shrink-0 rounded p-0.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-[#263383]"
                      >
                        {dayOpen ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    )}
                    {canSelectDay && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 cursor-pointer accent-[#263383]"
                          aria-label={`Select all entries for ${
                            formatDate(timesheet.workDate).text
                          }`}
                          checked={daySelection.allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = daySelection.someSelected;
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            toggleDaySelectAll(
                              timesheet.timesheetId,
                              e.target.checked,
                              rowIds,
                            )
                          }
                        />
                        {daySelection.selectedForDay.length > 0 ? (
                          <SelectedEntriesMenu
                            count={daySelection.selectedForDay.length}
                            onDelete={handleDeleteClick}
                            disabled={deletingTimesheet}
                            label={`Actions for the entries selected on ${
                              formatDate(timesheet.workDate).text
                            }`}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDaySelectAll(
                                timesheet.timesheetId,
                                true,
                                rowIds,
                              );
                            }}
                            className="whitespace-nowrap text-xs font-medium text-gray-500 transition-colors hover:text-[#263383] focus:outline-none"
                          >
                            Select all
                          </button>
                        )}
                      </div>
                    )}
                    <span className="inline-flex items-center whitespace-nowrap rounded-md bg-[#f4f6fc] px-2.5 py-1 text-sm font-semibold text-[#263383] ring-1 ring-[#263383]/15">
                      {formatDate(timesheet.workDate).text}
                    </span>
                    <span className="whitespace-nowrap text-sm text-gray-500">
                      {timesheet.hoursWorked} hrs
                    </span>
                  </div>
                                   {" "}
                  {!(
                    timesheet.defaultHolidayTimesheet ||
                    timesheet.isLeaveTimesheet
                  ) ? (
                    <div className="flex items-center gap-2 relative overflow-visible">
                                                             {" "}
                      <CustomStatusBadge label={timesheet.status} size="sm" />
                      {typeof onApproveDay === "function" &&
                        (timesheet.status || "").toUpperCase() === "REJECTED" && (
                          <button
                            type="button"
                            disabled={approvingDay === timesheet.timesheetId}
                            title="Re-approve this rejected day"
                            onClick={() => {
                              setApprovingDay(timesheet.timesheetId);
                              Promise.resolve(
                                onApproveDay(timesheet.timesheetId),
                              ).finally(() => setApprovingDay(null));
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )} 
                                       {" "}
                      {/* Show approval status tooltip if available */}         
                               {" "}
                      {timesheet.actionStatus &&
                        timesheet.actionStatus.length > 0 && (
                          <div
                            style={{
                              position: "relative",
                              display: "inline-block",
                            }}
                          >
                                                     {" "}
                            <Tooltip
                              content={formatApproverTooltip(
                                timesheet.actionStatus,
                              )}
                            >
                                                         {" "}
                              <span className="text-xs text-gray-500 cursor-help px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 whitespace-nowrap">
                                                             {" "}
                                {timesheet.actionStatus.length} approver        
                                                     {" "}
                                {timesheet.actionStatus.length > 1 ? "s" : ""} 
                                                         {" "}
                              </span>
                                                       {" "}
                            </Tooltip>
                                                   {" "}
                          </div>
                        )}
                                         {" "}
                      {/* Add Entry — available on draft/submitted/rejected days,
                          disabled once the day is approved */}
                      {isEmployeeView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddEntryWeekly(timesheet.timesheetId);
                            setOpenMenuId(null);
                          }}
                          disabled={isDayLocked(timesheet)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#263383] transition-colors hover:bg-[#f4f6fc] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            isDayLocked(timesheet)
                              ? "Cannot edit approved timesheet"
                              : "Add Entry"
                          }
                        >
                          <Plus size={14} className="flex-shrink-0" /> Add Entry
                        </button>
                      )}
                      {/* Timesheet-level delete — removes the whole day */}
                      {isEmployeeView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTimesheetClick(timesheet);
                          }}
                          disabled={
                            isDayLocked(timesheet) ||
                            getEntryIds(timesheet).length === 0 ||
                            deletingTimesheet
                          }
                          className="p-1 rounded-full text-red-500 hover:bg-red-50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            isDayLocked(timesheet)
                              ? "Cannot delete approved timesheet"
                              : getEntryIds(timesheet).length === 0
                                ? "No entries to delete"
                                : "Delete this timesheet"
                          }
                          aria-label="Delete this timesheet"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                                       {" "}
                    </div>
                  ) : formatDate(timesheet.workDate).isWeekend ? (
                    <CustomStatusBadge label="WeekEnd" size="sm" />
                  ) : timesheet.defaultHolidayTimesheet ? (
                    <CustomStatusBadge label="Holiday" size="sm" />
                  ) : (
                    <CustomStatusBadge label="Leave Day" size="sm" />
                  )}
                                 {" "}
                </div>
                                {/* Entries Table */}               {" "}
                {dayOpen &&
                  !(
                  timesheet.defaultHolidayTimesheet ||
                  timesheet.isLeaveTimesheet
                  ) && (
                  <div className="p-2">
                                     {" "}
                    <EntriesTable
                      entries={timesheet.entries}
                      selectedEntryIds={selectedEntryIds}
                      setSelectedEntryIds={setSelectedEntryIds}
                      pendingEntries={pendingEntries}
                      setPendingEntries={setPendingEntries}
                      timesheetId={timesheet.timesheetId}
                      workDate={timesheet.workDate}
                      status={timesheet.status}
                      mapWorkType={mapWorkType}
                      addingNewEntry={
                        timesheetIdAdding === timesheet.timesheetId
                      }
                      setAddingNewEntry={(isAdding) =>
                        setTimesheetIdAdding(
                          isAdding ? timesheet.timesheetId : null,
                        )
                      }
                      refreshData={refreshData}
                      projectInfo={projectInfo}
                      selectionMode={
                        selection.key === dayKeyFor(timesheet.timesheetId)
                      }
                    />
                                   {" "}
                  </div>
                )}
                                {" "}
              </div>
            );
            })}
                    {/* Submit Week Button */}         {" "}
          {isEmployeeView &&
            isWeeklyFormat &&
            weekData && (
              <div className="mt-4 px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg">
                               {" "}
                <button
                  onClick={handleSubmitWeek}
                  disabled={isSubmittingWeek || isSubmitDisabled()}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                    isSubmitDisabled()
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isSubmittingWeek
                        ? "bg-blue-400 text-white cursor-wait"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                                   {" "}
                  {isSubmittingWeek
                    ? "Submitting..."
                    : isSubmitDisabled()
                      ? getSubmitButtonText()
                      : "SUBMIT WEEK"}
                                 {" "}
                </button>
                             {" "}
              </div>
            )}
                 {" "}
        </div>
      ) : (
        <EntriesTable
          entries={entriesState}
          selectedEntryIds={selectedEntryIds}
          setSelectedEntryIds={setSelectedEntryIds}
          pendingEntries={pendingEntries}
          setPendingEntries={setPendingEntries}
          timesheetId={timesheetId}
          workDate={date}
          status={status}
          mapWorkType={mapWorkType}
          addingNewEntry={timesheetIdAdding === timesheetId}
          setAddingNewEntry={(isAdding) =>
            setTimesheetIdAdding(isAdding ? timesheetId : null)
          }
          refreshData={refreshData}
          projectInfo={projectInfo}
          selectionMode={selection.key === dayKeyFor(timesheetId)}
        />
      )}
           {" "}
        </>
      )}
      <ConfirmDialog
        open={isConfirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${
          deletableSelectedCount
        } selected entr${deletableSelectedCount > 1 ? "ies" : "y"}?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      <ConfirmDialog
        open={!!timesheetToDelete}
        title="Delete Timesheet"
        message={`This will delete the timesheet for ${
          timesheetToDelete ? formatDate(timesheetToDelete.workDate).text : ""
        } along with all ${
          timesheetToDelete ? getEntryIds(timesheetToDelete).length : 0
        } of its entries. This action cannot be undone.`}
        onConfirm={handleConfirmDeleteTimesheet}
        onCancel={() => {
          if (!deletingTimesheet) setTimesheetToDelete(null);
        }}
      />
         {" "}
    </div>
  );
};

export { TimesheetGroup };
