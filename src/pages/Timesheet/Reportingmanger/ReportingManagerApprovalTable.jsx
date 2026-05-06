import React, { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { reviewTimesheet, handleBulkReviewAdmin } from "../api";
import { TimesheetGroup } from "../TimesheetGroup";
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import CancellationModal from "../../leave_management/models/CancellationModal";
import { ChevronDown, ChevronUp } from "lucide-react";

const ReportingManagerApprovalTable = ({
  loading,
  groupedData = [],
  statusFilter = "All",
  onRefresh,
}) => {
  const [rejectionComments, setRejectionComments] = useState({});
  const [showCommentBox, setShowCommentBox] = useState({});
  const [projectInfo, setProjectInfo] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectAllCancellationModal, setRejectAllCancellationModal] =
    useState(false);

  const [userLevelLoading, setUserLevelLoading] = useState(null);
  const [weekLevelLoading, setWeekLevelLoading] = useState({});

  // ✅ Per-user expand/collapse state — collapsed by default
  const [expandedUsers, setExpandedUsers] = useState({});
  const toggleUser = (userId) =>
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }));

  // -----------------------------
  // Fetch project info
  // -----------------------------
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        const res = await fetch(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/project-info/all`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch project info");
        const data = await res.json();

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

  const handleCancelModal = () => {
    setRejectAllCancellationModal(!rejectAllCancellationModal);
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
      const submittedWeeks = user.weeklySummary.filter((week) => {
        const s = week.weeklyStatus?.toUpperCase();
        return s === "SUBMITTED" || s === "PARTIALLY APPROVED";
      });

      const requestPayload = submittedWeeks.map((week) => ({
        userId: user.userId,
        timesheetIds: week.timesheets.map((t) => t.timesheetId),
        status,
        comments: reason || "Approved by manager",
      }));

      const res = await fetch(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/timesheets/review/internal/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(requestPayload),
        },
      );

      if (!res.ok) throw new Error("Bulk review failed");

      showStatusToast(
        `All submitted weeks ${status.toLowerCase()} successfully for ${
          user.userName
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
        const allDates = week.timesheets.flatMap((t) =>
          t.entries.map((e) => new Date(t.workDate)),
        );
        const firstEntryDate = allDates[0];
        const { weekNumber, dateRange } = getMonthWeekRange(firstEntryDate);

        const totalHours = week.timesheets.reduce(
          (sum, sheet) =>
            sum + sheet.entries.reduce((s, e) => s + (e.hoursWorked || 0), 0),
          0,
        );

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

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "reporting_manager_timesheets_with_billable_hours.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporting Manager Timesheet Report", 14, 10);
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
    doc.save("reporting_manager_timesheets.pdf");
  };

  const renderUserWeeks = (user) =>
    user.weeklySummary
      .filter(
        (week) =>
          statusFilter === "All" ||
          week.weeklyStatus?.toUpperCase() === statusFilter.toUpperCase(),
      )
      .map((week) => (
        <div
          key={week.weekId}
          className="bg-white border rounded-xl shadow-sm mb-6 overflow-hidden"
        >
          {/* Manager actions */}
          {week.weeklyStatus === "SUBMITTED" && (
            <div className="p-4 border-t flex gap-3 justify-end items-center">
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
                    onClick={async () => {
                      setWeekLevelLoading((prev) => ({
                        ...prev,
                        [`${user.userId}-${week.weekId}`]: true,
                      }));
                      try {
                        const timesheetIds = week.timesheets.map(
                          (t) => t.timesheetId,
                        );
                        await handleBulkReviewAdmin(
                          user.userId,
                          timesheetIds,
                          "APPROVED",
                          "approved",
                        );
                        onRefresh?.();
                      } catch (err) {
                        showStatusToast(
                          "Failed to approve timesheets",
                          "error",
                        );
                      } finally {
                        setWeekLevelLoading((prev) => ({
                          ...prev,
                          [`${user.userId}-${week.weekId}`]: false,
                        }));
                      }
                    }}
                  >
                    Approve All
                  </Button>

                  <Button
                    variant="danger"
                    size="medium"
                    disabled={Object.values(weekLevelLoading || {}).some(
                      Boolean,
                    )}
                    onClick={() => {
                      setShowCommentBox({ [user.userId]: week.weekId });
                      setRejectionComments((prev) => ({
                        ...prev,
                        [week.weekId]: "",
                      }));
                    }}
                  >
                    Reject All
                  </Button>
                </>
              )}
            </div>
          )}
          <TimesheetGroup
            weekGroup={{
              weekStart: week.startDate,
              weekEnd: week.endDate,
              timesheets: week.timesheets,
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
          />

          {showCommentBox[user.userId] === week.weekId && (
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
                        (t) => t.timesheetId,
                      );
                      const comment = rejectionComments[week.weekId] || "";
                      await handleBulkReviewAdmin(
                        user.userId,
                        timesheetIds,
                        "REJECTED",
                        comment,
                      );
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
                    e.stopPropagation();
                    setShowCommentBox((prev) => ({
                      ...prev,
                      [user.userId]: null,
                    }));
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ));

  // -----------------------------
  // Main Render
  // -----------------------------
  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingSpinner text="Loading Reporting Manager view..." />
      ) : (
        <>
          <div className="flex justify-end gap-3 mb-4">
            <Button variant="primary" size="small" onClick={exportCSV}>
              Export CSV
            </Button>
            <Button variant="primary" size="small" onClick={exportPDF}>
              Export PDF
            </Button>
          </div>

          {enrichedGroupedData.length === 0 ? (
            <div className="text-center text-gray-500 py-10 text-lg font-medium">
              No Approvals
            </div>
          ) : (
            enrichedGroupedData.map((user) => {
              const isExpanded = !!expandedUsers[user.userId];
              const totalWeeks = user.weeklySummary?.length || 0;
              const pendingWeeks =
                user.weeklySummary?.filter((w) => {
                  const s = w.weeklyStatus?.toUpperCase();
                  return s === "SUBMITTED" || s === "PARTIALLY APPROVED";
                }).length || 0;

              return (
                <div
                  key={user.userId}
                  className="bg-white rounded-xl shadow-md border p-4"
                >
                  {/* ✅ Collapsible user header */}
                  <div className="flex items-center justify-between">
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
                      <h2 className="text-xl font-bold text-gray-800 truncate">
                        {user.userName} (ID: {user.userId})
                      </h2>
                      <span className="text-sm text-gray-500 shrink-0">
                        • {totalWeeks} {totalWeeks === 1 ? "week" : "weeks"}
                      </span>
                      {pendingWeeks > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 shrink-0">
                          {pendingWeeks} pending
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
                            className={`disabled:opacity-50 disabled:cursor-not-allowed`}
                            onClick={async () => {
                              setUserLevelLoading(user.userId);
                              try {
                                await handleSelectAllWeeks(user, "APPROVED");
                              } finally {
                                setUserLevelLoading(null);
                              }
                            }}
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

                  {isExpanded && (
                    <>
                      <hr className="my-3 border-gray-200" />
                      {renderUserWeeks(user)}
                    </>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
};

export default ReportingManagerApprovalTable;
