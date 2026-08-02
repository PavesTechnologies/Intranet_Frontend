import React, { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingSpinner from "../../../components/LoadingSpinner";
import api from "../../../api/axiosInstance";
import { reviewTimesheet, handleBulkReview, handleMixedReview } from "../api";
import { TimesheetGroup } from "../TimesheetGroup";
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";
import { MoreVertical, X, ChevronDown, ChevronUp, CheckCircle2, Plus, Minus } from "lucide-react";
import CancellationModal from "../../leave_management/models/CancellationModal";
import ConfirmationModal from "../../leave_management/models/ConfirmationModal";
import RejectWithSelectionModal from "../RejectWithSelectionModal";
import BulkApprovalBar from "../components/BulkApprovalBar";
import { set } from "date-fns";

const ManagerApprovalTable = ({
  loading,
  groupedData = [],
  statusFilter = "All",
  onRefresh,
}) => {
  const [rejectionComments, setRejectionComments] = useState({});
  const [showCommentBox, setShowCommentBox] = useState({});
  const [projectInfo, setProjectInfo] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayData, setHolidayData] = useState([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancellationModal, setCancellationModal] = useState(false);
  const [rejectAllCancellationModal, setRejectAllCancellationModal] =
    useState(false);
  const [approveAll, setApproveAll] = useState(false);
  const [approveAllWeeks, setApproveAllWeeks] = useState(false);

  // 🆕 Remove-confirmation modal (replaces native window.confirm)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  // 🆕 Update User feature hooks — moved here to fix undefined error
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [selectedUpdateRecord, setSelectedUpdateRecord] = useState(null);
  const [updateHoliday, setUpdateHoliday] = useState("");
  const [updateReason, setUpdateReason] = useState("");
  const updateSectionRef = React.useRef(null);

  const [actionLoadingUser, setActionLoadingUser] = useState(null);
  const [userLevelLoading, setUserLevelLoading] = useState(null); // for Approve/Reject All Weeks
  const [weekLevelLoading, setWeekLevelLoading] = useState({}); // for per-week Approve/Reject

  // ✅ Per-user expand/collapse state — collapsed by default
  const [expandedUsers, setExpandedUsers] = useState({});
  // UI-only: track which weeks are collapsed inside an employee (default expanded).
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const toggleWeekCollapse = (key) =>
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));
  const setAllWeeksExpanded = (user, expanded) =>
    setExpandedWeeks((prev) => {
      const next = { ...prev };
      (user.weeklySummary || []).forEach((w) => {
        next[`${user.userId}-${w.weekId}`] = expanded;
      });
      return next;
    });
  const toggleUser = (userId) =>
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }));

  // -----------------------------
  // Fetch project info
  // -----------------------------
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        const res = await api.get(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/project-info/all`,
        );
        const data = res.data;

        const normalized = data.map((p) => ({
          projectId: p.projectId,
          projectName: p.project,
          tasks: p.tasks.map((t) => ({
            taskId: t.taskId,
            taskName: t.task,
          })),
        }));
        setProjectInfo(normalized);
      } catch (err) {
        console.error("Error fetching project info:", err);
      }
    };
    fetchProjectInfo();
  }, []);

  // -----------------------------
  // Fetch Holiday Excluded Users
  // -----------------------------
  const fetchHolidayExcludedUsers = async () => {
    setHolidayLoading(true);
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/holiday-exclude-users`,
      );
      setHolidayData(res.data);
    } catch (err) {
      console.error("Error fetching holiday users:", err);
      showStatusToast("Failed to load holiday data", "error");
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleShowHolidayModal = () => {
    setShowHolidayModal(true);
    fetchHolidayExcludedUsers();
  };

  const handleRejectAllCancelModal = () => {
    setCancellationModal(!cancellationModal);
  };
  const handleCancelModal = () => {
    setRejectAllCancellationModal(!rejectAllCancellationModal);
  };
  const handleApproveAll = () => {
    setApproveAll(!approveAll);
  };
  const handleApproveAllWeeks = () => {
    setApproveAllWeeks(!approveAllWeeks);
  };

  // -----------------------------
  // Lookup maps for fast access
  // -----------------------------
  const projectIdToName = useMemo(
    () =>
      Object.fromEntries(projectInfo.map((p) => [p.projectId, p.projectName])),
    [projectInfo],
  );

  const taskIdToName = useMemo(
    () =>
      Object.fromEntries(
        projectInfo.flatMap((p) => p.tasks.map((t) => [t.taskId, t.taskName])),
      ),
    [projectInfo],
  );

  // -----------------------------
  // Enrich timesheet entries
  // -----------------------------
  const enrichedGroupedData = useMemo(
    () =>
      groupedData.map((user) => ({
        ...user,
        weeklySummary: user.weeklySummary.map((week) => ({
          ...week,
          timesheets: week.timesheets.map((t) => ({
            ...t,
            entries: t.entries.map((entry) => ({
              ...entry,
              projectName:
                projectIdToName[entry.projectId] ||
                `Project-${entry.projectId}`,
              taskName: taskIdToName[entry.taskId] || `Task-${entry.taskId}`,
            })),
          })),
        })),
      })),
    [groupedData, projectIdToName, taskIdToName],
  );

  // -----------------------------
  // Bulk multi-employee select + Approve/Reject
  // -----------------------------
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const shownEmployeeIds = enrichedGroupedData.map((u) => u.userId);
  const allSelected =
    shownEmployeeIds.length > 0 &&
    selectedEmployeeIds.length === shownEmployeeIds.length;
  const someSelected = selectedEmployeeIds.length > 0 && !allSelected;

  const toggleEmployeeSelect = (userId) =>
    setSelectedEmployeeIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  const toggleSelectAll = () =>
    setSelectedEmployeeIds(allSelected ? [] : shownEmployeeIds);
  const clearSelection = () => setSelectedEmployeeIds([]);

  // Flatten each selected employee's actionable weeks into the array the
  // multi-user review endpoint expects: [{ userId, timesheetIds, status, comments }].
  // UI-only loading flag for overturn (re-approve rejected) actions.
  const [overturnBusy, setOverturnBusy] = useState(false);
  // Re-approve (overturn) rejected timesheets directly by id. Reuses the view's
  // approve endpoint; the backend permits only the reviewer who rejected to overturn.
  const approveIds = async (userId, ids) => {
    const list = (ids || []).filter(Boolean);
    if (list.length === 0) return;
    setOverturnBusy(true);
    try {
      await handleBulkReview(userId, list, "APPROVED", "approved");
      onRefresh?.();
    } finally {
      setOverturnBusy(false);
    }
  };

  const buildBulkPayload = (status, comments) => {
    const norm = (s) => (s || "").toUpperCase().replace(/\s+/g, "_");
    const rows = [];
    enrichedGroupedData
      .filter((u) => selectedEmployeeIds.includes(u.userId))
      .forEach((u) =>
        (u.weeklySummary || []).forEach((w) => {
          const ws = norm(w.weeklyStatus);
          let ids;
          if (status === "APPROVED") {
            // Approve submitted/partial weeks AND overturn rejected weeks in one pass.
            if (ws !== "SUBMITTED" && ws !== "PARTIALLY_APPROVED" && ws !== "REJECTED")
              return;
            ids = (w.timesheets || [])
              .filter((t) => norm(t.status) !== "APPROVED")
              .map((t) => t.timesheetId);
          } else {
            // Reject: only actionable weeks; leave already-rejected weeks as-is.
            if (ws !== "SUBMITTED" && ws !== "PARTIALLY_APPROVED") return;
            ids = (w.timesheets || []).map((t) => t.timesheetId);
          }
          if (ids.length)
            rows.push({ userId: u.userId, timesheetIds: ids, status, comments });
        }),
      );
    return rows;
  };

  const submitBulkReview = async (status, comments) => {
    const payload = buildBulkPayload(status, comments);
    if (payload.length === 0) {
      showStatusToast(
        `Nothing to ${status === "APPROVED" ? "approve" : "reject"} for the selected employees`,
        "info",
      );
      return;
    }
    setBulkLoading(true);
    try {
      await api.post(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/timesheets/review_multiple_users`,
        payload,
      );
      showStatusToast(
        `Selected timesheets ${status === "APPROVED" ? "approved" : "rejected"} successfully`,
        "success",
      );
      clearSelection();
      onRefresh?.();
    } catch (err) {
      console.error("Bulk review failed:", err);
      showStatusToast(
        err.response?.data?.message || "Failed to update selected timesheets",
        "error",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkApprove = () => submitBulkReview("APPROVED", "Approved");
  const handleBulkReject = (reason) => submitBulkReview("REJECTED", reason);

  // -----------------------------
  // Approve / Reject Logic
  // -----------------------------
  const handleStatusChange = async (timesheetId, status, comment = "") => {
    try {
      await reviewTimesheet(timesheetId, comment, status);
      showStatusToast(
        `Timesheet ${status.toLowerCase()} successfully`,
        "success",
      );
      onRefresh?.();
    } catch (err) {
      console.error("Error updating status:", err);
      showStatusToast("Failed to update timesheet status", "error");
    }
  };

  const disableButton = (user) => {
    const submittedWeeks = user.weeklySummary.filter((week) => {
      const status = week.weeklyStatus?.toUpperCase();
      return status === "SUBMITTED" || status === "PARTIALLY APPROVED";
    });

    return submittedWeeks.length === 0;
  };

  // -----------------------------
  // Bulk Approve/Reject All Weeks for a User
  // -----------------------------
  const handleSelectAllWeeks = async (user, status, reason) => {
    try {
      // // 🧠 Filter only SUBMITTED weeks and Pattially Approved
      const submittedWeeks = user.weeklySummary.filter((week) => {
        const status = week.weeklyStatus?.toUpperCase();
        return status === "SUBMITTED" || status === "PARTIALLY_APPROVED";
      });

      // if (submittedWeeks.length === 0) {
      //   showStatusToast(
      //     `No submitted weeks found to ${status.toLowerCase()} for ${
      //       user.userName
      //     }`,
      //     "info"
      //   );
      //   return;
      // }

      // 🧩 Build request payload with only submitted weeks
      const requestPayload = submittedWeeks.map((week) => ({
        userId: user.userId,
        timesheetIds: week.timesheets.map((t) => t.timesheetId),
        status,
        comments: reason || "Approved by manager",
      }));

      await api.post(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/timesheets/review_multiple_users`,
        requestPayload,
      );

      showStatusToast(
        `All submitted weeks ${status.toLowerCase()} successfully for ${user.userName
        }`,
        "success",
      );

      onRefresh?.();
    } catch (err) {
      console.error("Error approving all weeks:", err);
      showStatusToast(`Failed to ${status.toLowerCase()} all weeks`, "error");
    }
  };

  // -----------------------------
  // Export Logic (CSV / PDF)
  // -----------------------------

  // 🧮 Helper: Get month-wise week and date range
  const getMonthWeekRange = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    const weeks = [];
    let start = new Date(firstOfMonth);
    while (start <= lastOfMonth) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (end > lastOfMonth) end.setDate(lastOfMonth.getDate());
      weeks.push({ start: new Date(start), end: new Date(end) });
      start.setDate(start.getDate() + 7);
    }

    for (let i = 0; i < weeks.length; i++) {
      if (d >= weeks[i].start && d <= weeks[i].end) {
        return {
          weekNumber: i + 1,
          dateRange: `${weeks[i].start.toLocaleDateString()} - ${weeks[
            i
          ].end.toLocaleDateString()}`,
        };
      }
    }
    return { weekNumber: "-", dateRange: "-" };
  };

  const exportCSV = () => {
    const rows = [
      [
        "User ID",
        "User Name",
        "Week",
        "Date Range",
        "Total Hours",
        "Billable Hours",
        "Date",
        "Project",
        "Task",
        "Start Time",
        "End Time",
        "Hours Worked",
        "Work Type",
        "Description",
        "Status",
      ],
    ];

    enrichedGroupedData.forEach((user) => {
      let userPrinted = false;

      user.weeklySummary.forEach((week) => {
        // Get week details based on calendar month
        const allDates = week.timesheets.flatMap((t) =>
          t.entries.map((e) => new Date(t.workDate)),
        );
        const firstEntryDate = allDates[0];
        const { weekNumber, dateRange } = getMonthWeekRange(firstEntryDate);

        // Calculate total hours for the week
        const totalHours = week.timesheets.reduce(
          (sum, sheet) =>
            sum + sheet.entries.reduce((s, e) => s + (e.hoursWorked || 0), 0),
          0,
        );

        // 🧮 Calculate Billable Hours based on `billable === "Yes"` (or true)
        const billableHours = week.timesheets.reduce(
          (sum, sheet) =>
            sum +
            sheet.entries
              .filter((e) => e.billable === "Yes" || e.billable === true)
              .reduce((s, e) => s + (e.hoursWorked || 0), 0),
          0,
        );

        let weekPrinted = false;

        week.timesheets.forEach((sheet) =>
          sheet.entries.forEach((entry) => {
            const userId = !userPrinted ? user.userId : "";
            const userName = !userPrinted ? user.userName : "";
            const weekLabel = !weekPrinted ? `Week ${weekNumber}` : "";
            const dateRangeValue = !weekPrinted ? dateRange : "";
            const totalHoursValue = !weekPrinted ? totalHours.toFixed(2) : "";
            const billableHoursValue = !weekPrinted
              ? billableHours.toFixed(2)
              : "";

            rows.push([
              userId,
              userName,
              weekLabel,
              dateRangeValue,
              totalHoursValue,
              billableHoursValue,
              new Date(sheet.workDate).toLocaleDateString(),
              entry.projectName,
              entry.taskName,
              new Date(entry.fromTime).toLocaleTimeString(),
              new Date(entry.toTime).toLocaleTimeString(),
              entry.hoursWorked?.toFixed(2) || 0,
              entry.workLocation || "-",
              entry.description || "",
              sheet.status,
            ]);

            userPrinted = true;
            weekPrinted = true;
          }),
        );
      });
    });

    // Download CSV
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "manager_timesheets_with_billable_hours.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Manager Timesheet Report", 14, 10);
    const body = [];

    enrichedGroupedData.forEach((user) =>
      user.weeklySummary.forEach((week) =>
        week.timesheets.forEach((sheet) =>
          sheet.entries.forEach((entry) =>
            body.push([
              user.userId,
              user.userName,
              entry.projectName,
              entry.taskName,
              new Date(entry.fromTime).toLocaleTimeString(),
              new Date(entry.toTime).toLocaleTimeString(),
              entry.workLocation || "-",
              entry.description || "",
              entry.hoursWorked?.toFixed(2) || 0,
              new Date(sheet.workDate).toLocaleDateString(),
              sheet.status,
            ]),
          ),
        ),
      ),
    );

    autoTable(doc, {
      head: [
        [
          "User ID",
          "User Name",
          "Project",
          "Task",
          "Start",
          "End",
          "Work Type",
          "Description",
          "Hours",
          "Date",
          "Status",
        ],
      ],
      body,
      startY: 20,
    });
    doc.save("manager_timesheets.pdf");
  };

  const renderUserWeeks = (user) =>
    user.weeklySummary
      .filter(
        (week) =>
          statusFilter === "All" ||
          week.weeklyStatus?.toUpperCase() === statusFilter.toUpperCase(),
      )
      .map((week) => {
        // Hide individual timesheets that are already APPROVED — the manager
        // only needs to see what still needs action. If nothing is left in the
        // week, skip the week card entirely.
        const pendingTimesheets = (week.timesheets || []).filter(
          (ts) => ts.status?.toUpperCase() !== "APPROVED",
        );
        if (pendingTimesheets.length === 0) return null;

        return (
        <div
          key={week.weekId}
          className="mb-5"
        >
          {/* Manager actions */}
          {(week.weeklyStatus === "SUBMITTED" ||
            week.weeklyStatus === "PARTIALLY_APPROVED") && (
              <div className="px-1 pb-3 flex gap-3 justify-end items-center">
                {weekLevelLoading?.[`${user.userId}-${week.weekId}`] ? (
                  <LoadingSpinner text="Processing..." />
                ) : (
                  <>
                    <Button
                      variant="success"
                      size="medium"
                      disabled={Object.values(weekLevelLoading || {}).some(
                        Boolean,
                      )}
                      onClick={handleApproveAll}
                    >
                      Approve All
                    </Button>

                    <Button
                      variant="danger"
                      size="medium"
                      disabled={Object.values(weekLevelLoading || {}).some(
                        Boolean,
                      )}
                      onClick={handleRejectAllCancelModal}
                    //   async() => {
                    //   setShowCommentBox({ [user.userId]: week.weekId });
                    //   setRejectionComments((prev) => ({
                    //     ...prev,
                    //     [week.weekId]: "",
                    //   }));
                    // }
                    >
                      Reject All
                    </Button>
                  </>
                )}
              </div>
            )}
          {/* {showCommentBox[user.userId] === week.weekId && (
            <div className="p-4 bg-red-50 border-t">
              <textarea
                className="border p-2 w-full rounded"
                rows="2"
                placeholder="Enter rejection reason"
                value={rejectionComments[week.weekId] || ""}
                onChange={(e) =>
                  setRejectionComments((prev) => ({
                    ...prev,
                    [week.weekId]: e.target.value,
                  }))
                }
              />
              <div className="flex gap-2 mt-2 justify-end">
                <Button
                  variant="danger"
                  size="small"
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      const timesheetIds = week.timesheets.map(
                        (t) => t.timesheetId
                      );
                      const comment = rejectionComments[week.weekId] || "";
                      await handleBulkReview(
                        user.userId,
                        timesheetIds,
                        "REJECTED",
                        comment
                      );
                      // showStatusToast(
                      //   "Timesheets rejected successfully!",
                      //   "success"
                      // );
                      setShowCommentBox((prev) => ({
                        ...prev,
                        [user.userId]: null,
                      }));
                      onRefresh?.();
                    } catch (err) {
                      console.error("Error rejecting timesheets:", err);
                      showStatusToast("Failed to reject timesheets", "error");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Confirm Reject
                </Button>

                <Button
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // 🧩 prevent click from bubbling up
                    setShowCommentBox((prev) => ({
                      ...prev,
                      [user.userId]: null, // ✅ fixed line
                    }));
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )} */}
          <RejectWithSelectionModal
            isOpen={cancellationModal}
            week={{
              startDate: week.startDate,
              endDate: week.endDate,
              timesheets: pendingTimesheets,
            }}
            isLoading={actionLoading}
            onCancel={handleRejectAllCancelModal}
            onConfirm={async ({ approvedIds, rejectedIds, comment }) => {
              setWeekLevelLoading((prev) => ({
                ...prev,
                [`${user.userId}-${week.weekId}`]: true,
              }));
              setActionLoading(true);
              try {
                const ok = await handleMixedReview({
                  path: "/timesheets/review",
                  userId: user.userId,
                  approvedIds,
                  rejectedIds,
                  comments: comment,
                });
                if (ok) onRefresh?.();
              } finally {
                setActionLoading(false);
                setWeekLevelLoading((prev) => ({
                  ...prev,
                  [`${user.userId}-${week.weekId}`]: false,
                }));
                handleRejectAllCancelModal();
              }
            }}
          />
          <ConfirmationModal
            title="Approve All"
            message="Are you sure you want to Approve all Timesheets?"
            isOpen={approveAll}
            onCancel={handleApproveAll}
            isLoading={actionLoading}
            onConfirm={async () => {
              setWeekLevelLoading((prev) => ({
                ...prev,
                [`${user.userId}-${week.weekId}`]: true,
              }));
              setActionLoading(true);
              try {
                const timesheetIds = pendingTimesheets.map((t) => t.timesheetId);
                await handleBulkReview(
                  user.userId,
                  timesheetIds,
                  "APPROVED",
                  "approved",
                );
                showStatusToast("Timesheets Approved succesfully!", "success");
                onRefresh?.();
              } catch (err) {
                showStatusToast("Failed to approve timesheets", "error");
              } finally {
                setWeekLevelLoading((prev) => ({
                  ...prev,
                  [`${user.userId}-${week.weekId}`]: false,
                }));
                setApproveAll(false);
              }
            }}
          />
          {week.weeklyStatus?.toUpperCase() === "REJECTED" && (
            <div className="px-1 pb-3 flex gap-3 justify-end items-center">
              <Button
                variant="success"
                size="medium"
                disabled={overturnBusy}
                title="Re-approve this rejected week"
                onClick={() =>
                  approveIds(
                    user.userId,
                    (week.timesheets || [])
                      .filter(
                        (t) => (t.status || "").toUpperCase() === "REJECTED",
                      )
                      .map((t) => t.timesheetId),
                  )
                }
              >
                Approve (Overturn)
              </Button>
            </div>
          )}
          <TimesheetGroup
            weekGroup={{
              weekStart: week.startDate,
              weekEnd: week.endDate,
              timesheets: pendingTimesheets,
              weekRange: `${new Date(
                week.startDate,
              ).toLocaleDateString()} - ${new Date(
                week.endDate,
              ).toLocaleDateString()}`,
              totalHours: week.totalHours,
              status: week.weeklyStatus,
              weekNumber: week.weekId,
              monthName: new Date(week.startDate).toLocaleString("en-US", {
                month: "long",
              }),
              year: new Date(week.startDate).getFullYear(),
            }}
            refreshData={onRefresh}
            mapWorkType={(type) => type}
            projectInfo={projectInfo}
            isCollapsed={!expandedWeeks[`${user.userId}-${week.weekId}`]}
            onToggleCollapse={() =>
              toggleWeekCollapse(`${user.userId}-${week.weekId}`)
            }
            onApproveDay={(id) => approveIds(user.userId, [id])}
          />
        </div>
        );
      });
  // Track selection mode and selected users
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Toggle remove mode
  const toggleRemoveMode = () => {
    if (isRemoveMode) {
      // Leaving remove mode — clear selections
      setIsRemoveMode(false);
      setSelectedUsers([]);
    } else {
      // Enter remove mode
      setIsRemoveMode(true);
    }
  };

  // Select / Deselect single user (only in remove mode)
  const handleSelectUser = (record) => {
    // 🟥 Case 1: Remove mode (multi-select)
    if (isRemoveMode) {
      setSelectedUsers((prev) =>
        prev.includes(record.id)
          ? prev.filter((id) => id !== record.id)
          : [...prev, record.id],
      );
      return;
    }

    // 🟦 Case 2: Update mode (select one record)
    if (isUpdateMode) {
      setSelectedUpdateRecord(record);
      setUpdateHoliday(record.holidayDate);
      setUpdateReason(record.reason || "");

      // Smooth scroll into view
      setTimeout(() => {
        updateSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    }
  };

  // Select or deselect all users
  const handleToggleSelectAll = () => {
    if (selectedUsers.length === holidayData.length) {
      setSelectedUsers([]); // Deselect all
    } else {
      setSelectedUsers(holidayData.map((u) => u.id)); // Select all
    }
  };

  // Handle remove selected users
  const handleRemoveSelectedUsers = async () => {
    if (selectedUsers.length === 0) return;

    setRemoveLoading(true);
    try {
      for (const id of selectedUsers) {
        await api.delete(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
          }/api/holiday-exclude-users/${id}`,
        );
      }

      showStatusToast("Selected user(s) removed successfully!", "success");
      fetchHolidayExcludedUsers();
      setSelectedUsers([]);
      setIsRemoveMode(false); // Exit remove mode after success
      setShowRemoveConfirm(false); // Close confirmation modal
    } catch (err) {
      console.error("Error removing users:", err);
      const serverMsg =
        typeof err?.response?.data === "string"
          ? err.response.data
          : err?.response?.data?.message;
      showStatusToast(serverMsg || "Error while removing users", "error");
    } finally {
      setRemoveLoading(false);
    }
  };

  const [showAddUserSection, setShowAddUserSection] = useState(false);
  const [managerUsers, setManagerUsers] = useState([]);
  const [monthlyHolidays, setMonthlyHolidays] = useState([]);
  const [selectedAddUser, setSelectedAddUser] = useState("");
  const [selectedHoliday, setSelectedHoliday] = useState("");
  const [reason, setReason] = useState("");
  const [addUserLoading, setAddUserLoading] = useState(false);

  const handleConfirmAddUser = async () => {
    if (!selectedAddUser || !selectedHoliday || !reason.trim()) {
      showStatusToast("Please fill all fields before confirming.", "warning");
      return;
    }

    try {
      await api.post(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/holiday-exclude-users/create`,
        {
          userId: parseInt(selectedAddUser, 10),
          holidayDate: selectedHoliday,
          reason,
        },
      );

      showStatusToast(
        "User added to holiday exclusion successfully!",
        "success",
      );
      fetchHolidayExcludedUsers();
      setShowAddUserSection(false);
      setSelectedAddUser("");
      setSelectedHoliday("");
      setReason("");
    } catch (err) {
      console.error("Error adding holiday exclude user:", err);
      const serverMsg =
        typeof err?.response?.data === "string"
          ? err.response.data
          : err?.response?.data?.message;
      showStatusToast(serverMsg || "Failed to add employee", "error");
    }
  };

  const handleAddUserClick = async () => {
    setShowAddUserSection(true);
    setAddUserLoading(true);
    try {
      const currentMonth = new Date().getMonth() + 1;

      // Run both API calls in parallel and wait for both to finish
      const [usersRes, holidaysRes] = await Promise.all([
        api.get(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/manager/users`,
        ),
        api.get(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
          }/api/holidays/currentMonth`,
        ),
      ]);

      setManagerUsers(usersRes.data);
      setMonthlyHolidays(holidaysRes.data);
    } catch (err) {
      console.error("Error loading add-user data:", err);
      showStatusToast("Failed to load user or holiday data", "error");
    } finally {
      setAddUserLoading(false);
    }
  };

  // 🆕 Confirm Update (PUT) API call
  const handleConfirmUpdateUser = async () => {
    if (!selectedUpdateRecord) {
      showStatusToast("Please select a record to update.", "warning");
      return;
    }
    if (!updateHoliday || !updateReason.trim()) {
      showStatusToast("Please fill all fields before confirming.", "warning");
      return;
    }

    try {
      await api.put(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/holiday-exclude-users/${selectedUpdateRecord.id}`,
        {
          userId: selectedUpdateRecord.userId,
          holidayDate: updateHoliday,
          reason: updateReason,
        },
      );

      showStatusToast("Holiday exclusion updated successfully!", "success");
      fetchHolidayExcludedUsers(); // refresh list
      setIsUpdateMode(false);
      setSelectedUpdateRecord(null);
      setUpdateHoliday("");
      setUpdateReason("");
    } catch (err) {
      console.error("Error updating record:", err);
      const serverMsg =
        typeof err?.response?.data === "string"
          ? err.response.data
          : err?.response?.data?.message;
      showStatusToast(serverMsg || "Failed to update employee", "error");
    }
  };

  // -----------------------------
  // Main Render
  // -----------------------------
  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingSpinner text="Loading Approval Table..." />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            {enrichedGroupedData.length > 0 ? (
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-600">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleSelectAll}
                className="h-4 w-4 cursor-pointer accent-[#263383]"
              />
              Select all
            </label>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-3">
            <Button variant="primary" size="medium" onClick={exportCSV}>
              Export CSV
            </Button>
            <Button variant="secondary" size="medium" onClick={exportPDF}>
              Export PDF
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={handleShowHolidayModal}
            >
              <MoreVertical size={15} />
            </Button>
            </div>
          </div>

          <BulkApprovalBar
            count={selectedEmployeeIds.length}
            loading={bulkLoading}
            onApprove={handleBulkApprove}
            onReject={() => setBulkRejectOpen(true)}
            onClear={clearSelection}
          />
          <CancellationModal
            title="Reject Selected Employees"
            subtitle="Enter a reason to reject the selected employees' timesheets."
            isOpen={bulkRejectOpen}
            onCancel={() => setBulkRejectOpen(false)}
            onConfirm={async (reason) => {
              await handleBulkReject(reason);
              setBulkRejectOpen(false);
            }}
            isLoading={bulkLoading}
            confirmText="Reject"
          />

          {enrichedGroupedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-500">
                <CheckCircle2 size={30} />
              </div>
              <p className="text-lg font-semibold text-gray-700">All caught up</p>
              <p className="text-sm text-gray-400">
                No timesheets are waiting for your approval.
              </p>
            </div>
          ) : (
            enrichedGroupedData.map((user) => {
              const isExpanded = !!expandedUsers[user.userId];
              const totalWeeks = user.weeklySummary?.length || 0;
              const anyWeekExpanded = (user.weeklySummary || []).some(
                (w) => expandedWeeks[`${user.userId}-${w.weekId}`]
              );
              const pendingWeeks =
                user.weeklySummary?.filter((w) => {
                  const s = w.weeklyStatus?.toUpperCase();
                  return (
                    s === "SUBMITTED" ||
                    s === "PARTIALLY APPROVED" ||
                    s === "PARTIALLY_APPROVED"
                  );
                }).length || 0;
              const pendingHours =
                user.weeklySummary?.reduce((sum, w) => {
                  const s = w.weeklyStatus?.toUpperCase();
                  const isPending =
                    s === "SUBMITTED" ||
                    s === "PARTIALLY APPROVED" ||
                    s === "PARTIALLY_APPROVED";
                  return isPending ? sum + (Number(w.totalHours) || 0) : sum;
                }, 0) || 0;

              return (
                <div
                  key={user.userId}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-[#263383] p-4 transition-shadow hover:shadow-md"
                >
                  {/* ✅ Collapsible user header */}
                  <div className="flex items-center justify-between">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(user.userId)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleEmployeeSelect(user.userId);
                      }}
                      className="mr-3 h-4 w-4 shrink-0 cursor-pointer accent-[#263383]"
                      title="Select employee"
                    />
                    <button
                      type="button"
                      onClick={() => toggleUser(user.userId)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0 py-1 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-500 shrink-0" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-500 shrink-0" />
                      )}
                      <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#263383] to-[#4f46e5] text-white text-sm font-bold">
                        {(user.userName || "")
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w.charAt(0).toUpperCase())
                          .join("") || "U"}
                      </span>
                      <h2 className="text-lg font-bold text-gray-800 truncate">
                        {user.userName}{" "}
                        <span className="text-sm font-medium text-gray-400">
                          (ID: {user.userId})
                        </span>
                      </h2>
                      <span className="hidden md:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                        {totalWeeks} {totalWeeks === 1 ? "week" : "weeks"}
                      </span>
                      {pendingWeeks > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          {pendingWeeks} pending
                        </span>
                      )}
                      {pendingWeeks > 0 && pendingHours > 0 && (
                        <span className="hidden lg:inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                          {pendingHours.toFixed(1)} hrs
                        </span>
                      )}
                    </button>

                    <div className="flex gap-3 shrink-0">
                      {userLevelLoading === user.userId ? (
                        <LoadingSpinner text="Processing..." />
                      ) : (
                        <>
                          <Button
                            variant="success"
                            size="small"
                            disabled={
                              userLevelLoading !== null || disableButton(user)
                            }
                            onClick={handleApproveAllWeeks}
                            className={`disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Approve All Weeks
                          </Button>

                          <Button
                            variant="danger"
                            size="small"
                            disabled={
                              userLevelLoading !== null || disableButton(user)
                            }
                            className={`disabled:opacity-50 disabled:cursor-not-allowed`}
                            onClick={handleCancelModal}
                          >
                            Reject All Weeks
                          </Button>
                          {isExpanded && (
                            <button
                              type="button"
                              onClick={() =>
                                setAllWeeksExpanded(user, !anyWeekExpanded)
                              }
                              title={
                                anyWeekExpanded
                                  ? "Collapse all weeks"
                                  : "Expand all weeks"
                              }
                              aria-label={
                                anyWeekExpanded
                                  ? "Collapse all weeks"
                                  : "Expand all weeks"
                              }
                              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                anyWeekExpanded
                                  ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 focus:ring-amber-300"
                                  : "bg-indigo-50 border-indigo-200 text-[#4f46e5] hover:bg-indigo-100 focus:ring-indigo-300"
                              }`}
                            >
                              {anyWeekExpanded ? (
                                <Minus size={16} />
                              ) : (
                                <Plus size={16} />
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <CancellationModal
                    title="Reject All Weeks"
                    subtitle="Are you sure you want to Reject All Weeks Timesheets?"
                    isOpen={rejectAllCancellationModal}
                    onCancel={handleCancelModal}
                    onConfirm={async (reason) => {
                      setUserLevelLoading(user.userId);
                      setActionLoading(true);
                      try {
                        await handleSelectAllWeeks(user, "REJECTED", reason);
                      } finally {
                        setUserLevelLoading(null);
                        setActionLoading(false);
                        handleCancelModal();
                      }
                    }}
                    isLoading={actionLoading}
                    confirmText="Confirm"
                  />
                  <ConfirmationModal
                    title="Approve All Weeks"
                    message="Are you sure you want to Approve All Weeks Timesheets?"
                    isOpen={approveAllWeeks}
                    onCancel={handleApproveAllWeeks}
                    onConfirm={async () => {
                      setUserLevelLoading(user.userId);
                      setActionLoading(true);
                      try {
                        await handleSelectAllWeeks(user, "APPROVED");
                      } finally {
                        setUserLevelLoading(null);
                        setActionLoading(false);
                      }
                    }}
                    isLoading={actionLoading}
                  />

                  {isExpanded && (
                    <div className="ts-reveal">
                      <hr className="my-4 border-gray-100" />
                      {renderUserWeeks(user)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* ----------------------------- */}
      {/* Holiday Modal */}
      {/* ----------------------------- */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowHolidayModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Holiday Excluded Users
            </h2>

            {holidayLoading ? (
              <LoadingSpinner text="Loading holiday data..." />
            ) : holidayData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No users found who worked on holidays.
              </p>
            ) : (
              <>
                {/* --- Select All / Deselect All --- */}
                {isRemoveMode && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">
                      {selectedUsers.length === holidayData.length
                        ? "All users selected"
                        : `${selectedUsers.length} selected`}
                    </span>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleToggleSelectAll}
                    >
                      {selectedUsers.length === holidayData.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                )}

                {/* --- User List --- */}
                <div className="overflow-y-auto max-h-80 space-y-3">
                  {holidayData.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectUser(item)}
                      className={`border rounded-lg p-4 transition-all ${isRemoveMode ? "cursor-pointer" : "cursor-default"
                        } ${isRemoveMode && selectedUsers.includes(item.id)
                          ? "bg-red-100 border-red-400"
                          : "bg-gray-50 hover:bg-gray-100"
                        }`}
                    >
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {item.userName} (User ID: {item.userId})
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Holiday Date:</span>{" "}
                        {new Date(item.holidayDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Reason:</span>{" "}
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 space-y-4">
              <div className="flex justify-between gap-3">
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleAddUserClick}
                >
                  Add Employee
                </Button>

                <Button
                  variant="primary"
                  size="small"
                  onClick={() => {
                    // 🆕 Check if holiday data exists first
                    if (!holidayData || holidayData.length === 0) {
                      showStatusToast(
                        "No holiday excluded users found. Please create one first.",
                        "info",
                      );
                      return;
                    }

                    setIsUpdateMode(true);
                    setShowAddUserSection(false);
                    setIsRemoveMode(false);
                    setSelectedUsers([]);
                    setSelectedAddUser(null);
                    setSelectedHoliday("");
                    setReason("");
                    showStatusToast("Select a record above to update.", "info");
                  }}
                >
                  Update Employee
                </Button>

                {!isRemoveMode ? (
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => {
                      // 🆕 Check if holiday data exists first
                      if (!holidayData || holidayData.length === 0) {
                        showStatusToast(
                          "No holiday excluded users found. Please create one first.",
                          "info",
                        );
                        return;
                      }
                      toggleRemoveMode();
                    }}
                  >
                    Remove Employee
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="small"
                    disabled={selectedUsers.length === 0}
                    onClick={() => setShowRemoveConfirm(true)}
                  >
                    {selectedUsers.length > 0
                      ? `Confirm Remove (${selectedUsers.length})`
                      : "Confirm Remove"}
                  </Button>
                )}
              </div>

              {/* ---------- Add User Section ---------- */}
              {showAddUserSection && (
                <div className="mt-6 border-t pt-4 transition-all space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Add Holiday Excluded Employee
                  </h3>

                  {addUserLoading ? (
                    <LoadingSpinner text="Loading user & holiday data..." />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Employee
                        </label>
                        <FilterListbox
                          options={[
                            { value: "", label: "-- Select Employee --" },
                            ...managerUsers.map((u) => ({ value: u.id, label: `${u.id} - ${u.fullName}` })),
                          ]}
                          value={selectedAddUser}
                          onChange={setSelectedAddUser}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Holiday
                        </label>
                        <FilterListbox
                          options={[
                            { value: "", label: "-- Select Holiday --" },
                            ...monthlyHolidays.map((h) => ({ value: h.holidayDate, label: `${h.holidayDate} - ${h.holidayName}` })),
                          ]}
                          value={selectedHoliday}
                          onChange={setSelectedHoliday}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason
                        </label>
                        <textarea
                          className="w-full border rounded-lg p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="Enter reason for exclusion..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={handleConfirmAddUser}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setShowAddUserSection(false);
                            setReason("");
                            setSelectedAddUser("");
                            setSelectedHoliday("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 🆕 Update User Section */}
              {isUpdateMode && selectedUpdateRecord && (
                <div
                  ref={updateSectionRef}
                  className="mt-6 border-t pt-4 transition-all space-y-4 bg-blue-50 p-4 rounded-lg"
                >
                  <h3 className="text-lg font-semibold text-gray-800">
                    Update Holiday Excluded Employee
                  </h3>

                  {/* 🆕 User Info (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee
                    </label>
                    <input
                      type="text"
                      value={`${selectedUpdateRecord.userName} (Employee ID: ${selectedUpdateRecord.userId})`}
                      readOnly
                      className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>

                  {/* 🆕 Holiday Dropdown (for changing holiday date) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Holiday
                    </label>
                    <FilterListbox
                      options={[
                        { value: "", label: "-- Select Holiday --" },
                        ...monthlyHolidays.map((h) => ({ value: h.holidayDate, label: `${h.holidayDate} - ${h.holidayDescription}` })),
                      ]}
                      value={updateHoliday}
                      onChange={setUpdateHoliday}
                    />
                  </div>

                  {/* 🆕 Editable Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      className="w-full border rounded-lg p-2 h-20 resize-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Enter reason for exclusion..."
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                    />
                  </div>

                  {/* 🆕 Confirm / Cancel Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="primary"
                      size="small"
                      disabled={!updateHoliday || !updateReason.trim()}
                      onClick={handleConfirmUpdateUser}
                    >
                      Confirm Update
                    </Button>

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setIsUpdateMode(false);
                        setSelectedUpdateRecord(null);
                        setUpdateHoliday("");
                        setUpdateReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setIsRemoveMode(false);
                    setSelectedUsers([]);
                    setIsUpdateMode(false);
                    setShowAddUserSection(false);
                    setSelectedUpdateRecord(null);
                    setShowHolidayModal(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Remove confirmation (Confirm → delete, Cancel → close) */}
      <ConfirmationModal
        isOpen={showRemoveConfirm}
        title="Remove Employee"
        message={`Are you sure you want to remove ${selectedUsers.length} user(s) from holiday exclusion?`}
        confirmText="Remove"
        isLoading={removeLoading}
        onConfirm={handleRemoveSelectedUsers}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </div>
  );
};

export default ManagerApprovalTable;
