import React, { useState } from "react";
import Pagination from "../../components/Pagination/pagination";
import { TimesheetGroup } from "./TimesheetGroup";
import Button from "../../components/Button/Button";
import LoadingSpinner from "../../components/LoadingSpinner";
import WeeklyEntryModal from "./WeeklyEntry/WeeklyEntryModal";
import { showStatusToast } from "../../components/toastfy/toast";
import { useHolidays } from "./hooks/useHolidays";
import { useExpandedWeeks } from "./hooks/useExpandedWeeks";
import { useAllowedDayCheck } from "./hooks/useAllowedDayCheck";

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
  const { holidaysMap, loading: holidayLoading } = useHolidays();
  const { expandedWeeks, toggleWeek } = useExpandedWeeks();
  const { hasAnyAllowedDay } = useAllowedDayCheck(holidaysMap);

  const handleOpenWeeklyEntry = () => {
    if (!hasAnyAllowedDay()) {
      showStatusToast("No dates available for timesheet entry", "error");
      return;
    }
    setWeeklyEntryOpen(true);
  };

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
