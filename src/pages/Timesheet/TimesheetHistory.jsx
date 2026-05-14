import React, { useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { showStatusToast } from "../../components/toastfy/toast";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TimesheetHistoryGroup } from "./TimesheetHistoryGroup";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/Button/Button";

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

// helpers for grouping
const getMonthName = (dateStr) => {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "long" });
};

// ISO‑like week number (same as in TimesheetGroup)
// const getWeekNumber = (dateStr) => {
//   const d = parseLocalDate(dateStr);
//   d.setHours(0, 0, 0, 0);
//   d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
//   const week1 = new Date(d.getFullYear(), 0, 4);
//   return (
//     1 +
//     Math.round(
//       ((d.getTime() - week1.getTime()) / 86400000 -
//         3 +
//         ((week1.getDay() + 6) % 7)) /
//         7
//     )
//   );
// };

const TimesheetHistory = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [error, setError] = useState(null);

  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [openWeeks, setOpenWeeks] = useState({});
  const [projectInfo, setProjectInfo] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    oneMonthAgo.setDate(1);
    const oneMonthAgoEndDate = new Date(
      oneMonthAgo.getFullYear(),
      oneMonthAgo.getMonth() + 1,
      0,
    );
    setStartDate(oneMonthAgo);
    setEndDate(oneMonthAgoEndDate);
  }, []);

  useEffect(() => {
    const fetchAndStoreProjectTaskInfo = async () => {
      try {
        const response = await fetch(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/project-info`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json(); // 💡 FIX: Set the project info here once the data is fetched successfully
        setProjectInfo(data);
      } catch (error) {
        console.log("project info fetch error :", error);
        showStatusToast(
          error.response?.data || "Failed fetching projects info",
          "error",
        );
      }
    };
    fetchAndStoreProjectTaskInfo();
  }, []);

  const fetchHistory = async (start, end) => {
    if (!start || !end) return;
    try {
      setLoading(true);
      setError(null);

      const startStr = toLocalISODate(start);
      const endStr = toLocalISODate(end);

      const baseUrl = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;
      const url = `${baseUrl}/api/timesheet/historyRange?startDate=${startStr}&endDate=${endStr}`;

      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = res.data;
      setHistoryData(data?.weeklySummary || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error loading timesheet history");
      showStatusToast(
        err?.response?.data || "Error loading timesheet history",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchHistory(startDate, endDate);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!Array.isArray(historyData) || historyData.length === 0) {
      setGroupedData({});
      return;
    }

    const grouped = {};

    historyData.forEach((rawWeek) => {
      const year = parseLocalDate(rawWeek.startDate).getFullYear();
      const monthName = getMonthName(rawWeek.startDate);
      // const weekNumber = getWeekNumber(rawWeek.startDate);
      const weekRange = `${rawWeek.startDate} to ${rawWeek.endDate}`;

      const weekGroup = {
        weekId: rawWeek.weekId,
        weekStart: rawWeek.startDate,
        weekEnd: rawWeek.endDate,
        // weekNumber,
        weekRange,
        year,
        monthName,
        totalHours: rawWeek.totalHours,
        status: rawWeek.weeklyStatus,
        timesheets: rawWeek.timesheets || [],
        hoursDifference: 0,
        differenceType: "none",
      };

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][monthName]) grouped[year][monthName] = [];
      grouped[year][monthName].push(weekGroup);
    }); // Sort weeks by weekNumber

    // Object.keys(grouped).forEach((year) => {
    //   Object.keys(grouped[year]).forEach((month) => {
    //     grouped[year][month].sort((a, b) => a.weekNumber - b.weekNumber);
    //   });
    // });

    setGroupedData(grouped);
  }, [historyData]);

  const handleToggleYear = (year) => {
    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const handleToggleMonth = (year, month) => {
    const key = `${year}-${month}`;
    setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleWeek = (year, month, weekKey) => {
    const key = `${year}-${month}-${weekKey}`;
    setOpenWeeks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const yearKeys = useMemo(
    () => Object.keys(groupedData).sort((a, b) => Number(b) - Number(a)),
    [groupedData],
  ); // Helper function (mocked or full implementation)

  const mapWorkType = (type) => {
    // Implement logic from the other file if needed, e.g.,
    return type;
  }; // --- RENDER ---

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
      >
        <ArrowLeft size={20} /> Back
      </button>
      <h1 className="text-xl font-semibold mb-4">Timesheet History</h1>
      <div className="mb-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(d) => setStartDate(d)}
            dateFormat="yyyy-MM-dd"
            className="border rounded px-2 py-1 text-sm w-full md:w-40"
            maxDate={endDate || new Date()}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(d) => setEndDate(d)}
            dateFormat="yyyy-MM-dd"
            className="border rounded px-2 py-1 text-sm w-full md:w-40"
            minDate={startDate}
            maxDate={new Date()}
          />
        </div>
        <Button
          // type="button"
          variant="primary"
          size="small"
          onClick={() => fetchHistory(startDate, endDate)}
          disabled={!startDate || !endDate || loading}
          loading={loading}
          loadingText={loading ? "Loading..." : ""}
        // className={`px-4 py-2 rounded text-sm font-medium ${
        //   !startDate || !endDate || loading
        //     ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        //     : "bg-blue-600 text-white hover:bg-blue-700"
        // }`}
        >
          Apply
        </Button>
      </div>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {loading && (
        <div className="flex justify-center items-center h-[300px]">
          <LoadingSpinner text="Loading..." />
        </div>
      )}
      {!loading && yearKeys.length === 0 && (
        <div className="text-sm text-gray-500 italic font-semibold">
          No timesheet history available for the selected range.
        </div>
      )}
      <div className="space-y-3">
        {yearKeys.map((year) => {
          const monthsObj = groupedData[year] || {};
          const monthKeys = Object.keys(monthsObj);

          return (
            <div key={year} className="border rounded-lg bg-white shadow-sm">
              <button
                type="button"
                onClick={() => handleToggleYear(year)}
                className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-gray-50"
              >
                <span className="text-xl font-semibold text-gray-800">
                  {year}
                </span>
                <span className="text-xs text-gray-500">
                  {openYears[year] ? "Hide months" : "Show months"}
                </span>
              </button>
              {openYears[year] && (
                <div className="border-t">
                  {monthKeys.map((month) => {
                    const weeks = monthsObj[month] || [];
                    const monthKey = `${year}-${month}`;

                    return (
                      <div key={monthKey} className="border-t last:border-b">
                        <button
                          type="button"
                          onClick={() => handleToggleMonth(year, month)}
                          className="w-full flex justify-between items-center px-4 py-2 text-left bg-gray-50 hover:bg-gray-100"
                        >
                          <span className="text-xl font-medium text-gray-700">
                            {month}
                          </span>
                          <span className="text-sm text-gray-500">
                            {openMonths[monthKey] ? "Hide weeks" : "Show weeks"}
                          </span>
                        </button>
                        {openMonths[monthKey] && (
                          <div className="border-t bg-gray-50">
                            {weeks.map((weekGroup, idx) => {
                              const weekKey = `${weekGroup.weekId}-${idx}`;
                              const openKey = `${year}-${month}-${weekKey}`;

                              return (
                                <div
                                  key={openKey}
                                  className="border-t bg-gray-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleWeek(year, month, weekKey)
                                    }
                                    className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-gray-200"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-lg font-semibold text-gray-800">
                                        Week {weekGroup.weekId}
                                      </span>

                                      <span className="text-sm text-gray-600">
                                        {weekGroup.weekRange}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {openWeeks[openKey]
                                        ? "Hide details"
                                        : "Show details"}
                                    </span>
                                  </button>
                                  {openWeeks[openKey] && (
                                    <div className="p-5">
                                      <TimesheetHistoryGroup
                                        weekGroup={weekGroup}
                                        refreshData={() =>
                                          fetchHistory(startDate, endDate)
                                        }
                                        mapWorkType={mapWorkType}
                                        projectInfo={projectInfo}
                                        holidaysMap={{}}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimesheetHistory;
