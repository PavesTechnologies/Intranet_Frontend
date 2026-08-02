import React, { useState, useEffect } from "react";
import Pagination from "../../components/Pagination/pagination";
import { TimesheetGroup } from "./TimesheetGroup";
import Button from "../../components/Button/Button";
import LoadingSpinner from "../../components/LoadingSpinner";
import { fetchCalendarHolidays } from "./api";
import { showStatusToast } from "../../components/toastfy/toast";

const TimesheetTable = ({
  loading,
  data,
  totalPages,
  currentPage,
  setCurrentPage,
  mapWorkType,
  refreshData,
  projectInfo,
  getWeeklyStatusColor,
}) => {
  const [addingNewTimesheet, setAddingNewTimesheet] = useState(false);
  const [holidaysMap, setHolidaysMap] = useState({});
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [newTimesheetDate, setNewTimesheetDate] = useState(null);

  const toggleWeek = (key) =>
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));

  // Default date for a new timesheet: today if it's an allowed working day,
  // otherwise step back to the most recent allowed day within the current month.
  // "Allowed" mirrors the date-picker rule: weekends are blocked unless a holiday
  // overrides with submitTimesheet === true; any holiday with submitTimesheet === false
  // is blocked. Returns a "YYYY-MM-DD" string, or null when no day qualifies.
  const getDefaultWorkDate = () => {
    const toISO = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    const isAllowed = (d) => {
      const holiday = holidaysMap[toISO(d)];
      const dow = d.getDay(); // 0 = Sunday, 6 = Saturday
      if ((dow === 0 || dow === 6) && (!holiday || holiday.submitTimesheet === false))
        return false;
      if (holiday && holiday.submitTimesheet === false) return false;
      return true;
    };
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const d = new Date(today);
    while (d >= firstOfMonth && !isAllowed(d)) d.setDate(d.getDate() - 1);
    return d >= firstOfMonth ? toISO(d) : null;
  };

  // Toggle the new-timesheet panel. When opening, pick a submittable default date;
  // if none is available in the current month, show a toast and keep it closed.
  const handleToggleNewTimesheet = () => {
    if (addingNewTimesheet) {
      setAddingNewTimesheet(false);
      return;
    }
    const def = getDefaultWorkDate();
    if (!def) {
      showStatusToast("No dates available for timesheet entry", "error");
      return;
    }
    setNewTimesheetDate(def);
    setAddingNewTimesheet(true);
  };

  useEffect(() => {
    setHolidayLoading(true);
    const loadHolidays = async () => {
      try {
        const data = await fetchCalendarHolidays();
        if (!data) return;
        const map = {};
        data.forEach((h) => {
          const [year, month, day] = h.holidayDate.split("-").map(Number);
          const localDate = new Date(year, month - 1, day, 0, 0, 0);
          const key = `${localDate.getFullYear()}-${String(
            localDate.getMonth() + 1
          ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
          map[key] = h;
        });
        setHolidaysMap(map);

      } catch (err) {
        console.error("❌ Failed to load holidays:", err);
      } finally {
        setHolidayLoading(false);
      }
    };
    loadHolidays();
  }, []);

  return (
    <div
      style={{
        background: "#fff",
        padding: "24px",
        margin: "32px 0",
        borderRadius: 10,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      <Button
        size="small"
        variant={addingNewTimesheet ? "secondary" : "primary"}
        className={`mb-4 ${holidayLoading ? "opacity-15 cursor-not-allowed" : ""}`}
        onClick={handleToggleNewTimesheet}
        disabled={holidayLoading}
      >
        {addingNewTimesheet ? "Cancel Timesheet" : "+ New Timesheet"}
      </Button>

      {addingNewTimesheet && (
        <div style={{ marginBottom: "20px" }}>
          <TimesheetGroup
            emptyTimesheet={true}
            workDate={newTimesheetDate}
            entries={[]}
            status="Pending"
            mapWorkType={mapWorkType}
            refreshData={() => {
              refreshData?.();
              setAddingNewTimesheet(false);
            }}
            addingNewTimesheet={addingNewTimesheet}
            setAddingNewTimesheet={setAddingNewTimesheet}
            projectInfo={projectInfo}
            holidaysMap={holidaysMap} // ✅ Pass holidays map here
          />
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading timesheet entries..." />
      ) : data.length === 0 ? (
        <div className="text-center text-gray-500">
          No timesheet entries found.
        </div>
      ) : (
        <>
          {data.map((weekGroup) => {
            if (weekGroup.timesheets.length === 0) return null;
            const weekKey = weekGroup.weekStart;
            const isCollapsed = !expandedWeeks[weekKey];
            return (
              <TimesheetGroup
                weekGroup={weekGroup}
                key={weekKey}
                mapWorkType={mapWorkType}
                refreshData={refreshData}
                projectInfo={projectInfo}
                approvers={weekGroup.actionStatus}
                getWeeklyStatusColor={getWeeklyStatusColor}
                holidaysMap={holidaysMap}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleWeek(weekKey)}
              />
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onNext={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          />
        </>
      )}
    </div>
  );
};

export { TimesheetTable };
