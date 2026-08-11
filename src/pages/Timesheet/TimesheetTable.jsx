import React, { useState, useEffect } from "react";
import Pagination from "../../components/Pagination/pagination";
import { TimesheetGroup } from "./TimesheetGroup";
import Button from "../../components/Button/Button";
import LoadingSpinner from "../../components/LoadingSpinner";
import { fetchCalendarHolidays } from "./api";
import WeeklyEntryModal from "./WeeklyEntry/WeeklyEntryModal";
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
  const [weeklyEntryOpen, setWeeklyEntryOpen] = useState(false);
  const [holidaysMap, setHolidaysMap] = useState({});
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState({});

  const toggleWeek = (key) =>
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));

  // Only the current month accepts entries, so the weekly editor needs at least
  // one allowed day in it. "Allowed" mirrors the existing rule: weekends are
  // blocked unless a holiday overrides with submitTimesheet === true, and any
  // holiday with submitTimesheet === false is blocked.
  const hasAnyAllowedDay = () => {
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
    while (d >= firstOfMonth) {
      if (isAllowed(d)) return true;
      d.setDate(d.getDate() - 1);
    }
    return false;
  };

  const handleOpenWeeklyEntry = () => {
    if (!hasAnyAllowedDay()) {
      showStatusToast("No dates available for timesheet entry", "error");
      return;
    }
    setWeeklyEntryOpen(true);
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
        variant="primary"
        className={`mb-4 ${holidayLoading ? "opacity-15 cursor-not-allowed" : ""}`}
        onClick={handleOpenWeeklyEntry}
        disabled={holidayLoading}
      >
        + New Timesheet
      </Button>

      <WeeklyEntryModal
        isOpen={weeklyEntryOpen}
        onClose={() => setWeeklyEntryOpen(false)}
        projectInfo={projectInfo}
        holidaysMap={holidaysMap}
        onSaved={async () => {
          await refreshData?.();
        }}
      />

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
