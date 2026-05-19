import React, { useState, useEffect } from "react";
import Pagination from "../../components/Pagination/pagination";
import { TimesheetGroup } from "./TimesheetGroup";
import Button from "../../components/Button/Button";
import LoadingSpinner from "../../components/LoadingSpinner";
import { fetchCalendarHolidays } from "./api";

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

  const toggleWeek = (key) =>
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));

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
        onClick={() => setAddingNewTimesheet((s) => !s) }
        disabled={holidayLoading}
      >
        {addingNewTimesheet ? "Cancel Timesheet" : "+ New Timesheet"}
      </Button>

      {addingNewTimesheet && (
        <div style={{ marginBottom: "20px" }}>
          <TimesheetGroup
            emptyTimesheet={true}
            workDate={new Date().toISOString().split("T")[0]}
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
