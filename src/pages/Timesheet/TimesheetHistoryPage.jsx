import React, { useState, useEffect } from "react";
import TimesheetHeader from "./TimesheetHeader";
import { TimesheetFilters } from "./TimesheetFilters";
import { TimesheetTable } from "./TimesheetTable";
import { fetchTimesheetHistory, fetchProjectTaskInfo } from "./api";
import DashboardPage from "./DashboardPage";
import api from "../../api/axiosInstance";

const TimesheetHistoryPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Status");

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [user, setUser] = useState(null);
  const [projectInfo, setProjectInfo] = useState([]);
  const [projectTaskMap, setProjectTaskMap] = useState({
    projects: {},
    tasks: {},
  });

  // Function to get the start of the week (Monday) for a given date
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Function to get the end of the week (Sunday) for a given date
  const getWeekEnd = (date) => {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  };

  // Function to format week range
  const formatWeekRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    const endStr = end.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  };

  // Function to map API response to our expected format
  const mapApiResponseToEntries = (apiResponse, projectTaskMapping) => {
    if (!apiResponse || !apiResponse.weeklySummary) {
      return [];
    }

    return apiResponse.weeklySummary.map((week) => {
      // Map the week data to our expected format
      const weekGroup = {
        weekStart: week.startDate,
        weekEnd: week.endDate,
        weekRange: formatWeekRange(week.startDate, week.endDate),
        timesheets: week.timesheets || [],
        totalHours: week.totalHours || 0,
        status: mapWeeklyStatus(week.weeklyStatus),
        actionStatus: [], // Will be populated from individual timesheets
        weekNumber: week.weekId, // Map weekId to weekNumber
        monthName: new Date(week.startDate).toLocaleDateString("en-US", {
          month: "long",
        }),
        year: new Date(week.startDate).getFullYear(),
      };

      // Process individual timesheets and merge action status
      if (week.timesheets && week.timesheets.length > 0) {
        week.timesheets.forEach((timesheet) => {
          // Map entry field names to match expected format and add project/task names
          if (timesheet.entries) {
            timesheet.entries = timesheet.entries.map((entry) => ({
              ...entry,
              timesheetEntryId:
                entry.timesheetEntryid || entry.timesheetEntryId, // Handle both field names
              workType: entry.workLocation || entry.workType, // Map workLocation to workType
              // Add project and task names for display using the passed mapping
              projectName:
                projectTaskMapping.projects[entry.projectId] ||
                `Project-${entry.projectId}`,
              taskName:
                projectTaskMapping.tasks[entry.taskId] ||
                `Task-${entry.taskId}`,
              // Ensure isBillable is properly set
              isBillable:
                entry.isBillable !== undefined ? entry.isBillable : true,
            }));
          }
          //map holiday flag from API response
          timesheet.isHoliday = !!timesheet.isHolidayTimesheet;
          // Merge action status from individual timesheets
          if (timesheet.actionStatus) {
            weekGroup.actionStatus = [
              ...weekGroup.actionStatus,
              ...timesheet.actionStatus,
            ];
          }
        });
      }

      return weekGroup;
    });
  };

  // Function to map weekly status to our expected format (case-insensitive)
  const mapWeeklyStatus = (weeklyStatus) => {
    const status = weeklyStatus?.toUpperCase();
    switch (status) {
      case "DRAFT":
        return "Draft";
      case "SUBMITTED":
        return "Submitted";
      case "DRAFT/SUBMITTED":
        return "Submitted"; // Treat mixed status as Submitted
      case "APPROVED":
        return "Approved";
      case "REJECTED":
        return "Rejected";
      case "PARTIALLY APPROVED":
        return "Partially Approved";
      case "NO TIMESHEETS":
        return "No Timesheets";
      default:
        return "Draft";
    }
  };

  // Function to get status color for weekly status badge
  const getWeeklyStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "draft":
      case "submitted":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "approved":
      case "partially approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "no timesheets":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Function to fetch and store project/task information
  const fetchAndStoreProjectTaskInfo = async () => {
    try {
      const response = await api.get(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/project-info`,
      );

      const data = response.data;
      // console.log("Fetched project/task info:", data);

      // Create mapping objects for quick lookup
      const projectsMap = {};
      const tasksMap = {};

      data.forEach((project) => {
        // Map project ID to project name
        projectsMap[project.projectId] = project.project;

        // Map task IDs to task names
        if (project.tasks && project.tasks.length > 0) {
          project.tasks.forEach((task) => {
            tasksMap[task.taskId] = task.task;
          });
        }
      });

      // Store the mapping
      const mappingData = {
        projects: projectsMap,
        tasks: tasksMap,
      };

      setProjectTaskMap(mappingData);

      // Also store the original data for compatibility
      setProjectInfo(data);

      return mappingData;
    } catch (error) {
      console.error("Error fetching project/task info:", error);
      return [];
    }
  };
  // Function to calculate total hours for entries
  const calculateTotalHours = (entries) => {
    let totalMinutes = 0;
    entries.forEach((entry) => {
      const start = new Date(entry.fromTime);
      const end = new Date(entry.toTime);
      totalMinutes += (end - start) / (1000 * 60);
    });
    return (totalMinutes / 60).toFixed(2);
  };

  // Fetch user info
  // useEffect(() => {
  //   fetch(`${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/me`)
  //     .then((res) => {
  //       if (!res.ok) throw new Error("Failed to fetch user");
  //       return res.json();
  //     })
  //     .then((userData) => setUser({ name: userData.name, email: userData.email }))
  //     .catch((err) => console.error("Error fetching user:", err));
  // }, []);

  const projectIdToName = Object.fromEntries(
    projectInfo.map((p) => [p.projectId, p.projectName]),
  );

  useEffect(() => {
    const loadTimesheetHistory = async () => {
      try {
        setLoading(true);

        // First, fetch and store project/task information
        const projectTaskMapping = await fetchAndStoreProjectTaskInfo();
        // console.log("Project/Task mapping:", projectTaskMapping);

        // Then fetch timesheet history
        const data = await fetchTimesheetHistory(user?.user_id || 1);
        // console.log("Fetched timesheet history:", data);

        // Map API response to our expected format using the mapping data
        const weeklyEntries = mapApiResponseToEntries(data, projectTaskMapping);

        // Calculate week-to-week differences
        const entriesWithDifferences = weeklyEntries.map((week, index) => {
          const previousWeek = weeklyEntries[index + 1];
          let hoursDifference = 0;
          let differenceType = "neutral"; // "increase", "decrease", "neutral"

          if (previousWeek) {
            hoursDifference = week.totalHours - previousWeek.totalHours;
            if (hoursDifference > 0) {
              differenceType = "increase";
            } else if (hoursDifference < 0) {
              differenceType = "decrease";
            }
          }

          return {
            ...week,
            hoursDifference: Math.abs(hoursDifference),
            differenceType,
            isFirstWeek: index === 0,
            isLastWeek: index === weeklyEntries.length - 1,
          };
        });

        setEntries(entriesWithDifferences);
      } catch (err) {
        console.error("Failed to fetch timesheet history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTimesheetHistory();
  }, [user]);

  const mapWorkType = (type) => {
    switch (type) {
      case "WFO":
        return "Office";
      case "WFH":
        return "Home";
      case "HYBRID":
        return "Hybrid";
      default:
        return type;
    }
  };

  // Filter entries
  const filteredEntries = entries.filter((weekGroup) => {
    const matchesSearch = weekGroup.timesheets.map((timesheet) => {
      return timesheet?.entries.map((entry) => {
        // Use the mapped project name instead of looking up by ID
        const projectName =
          entry?.projectName || projectIdToName[entry.projectId] || "";
        return projectName.toLowerCase().includes(searchText.toLowerCase());
      });
    });

    // ✅ Include a week when at least one of its days has a logged entry
    //    whose workDate falls inside the selected [start, end] range.
    //    Compare as YYYY-MM-DD strings to avoid timezone drift.
    const toYMD = (d) => {
      if (!d) return "";
      if (typeof d === "string") return d.slice(0, 10);
      const dt = new Date(d);
      return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
    };

    const matchesDate =
      (!filterStartDate && !filterEndDate) ||
      (Array.isArray(weekGroup.timesheets) &&
        weekGroup.timesheets.some((ts) => {
          const ymd = toYMD(ts.workDate);
          if (!ymd) return false;
          if (filterStartDate && ymd < filterStartDate) return false;
          if (filterEndDate && ymd > filterEndDate) return false;
          return Array.isArray(ts.entries) && ts.entries.length > 0;
        }));

    const matchesStatus =
      filterStatus === "All Status" || weekGroup.status === filterStatus;

    return matchesSearch && matchesDate && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / rowsPerPage);
  const paginatedData = filteredEntries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f9fb" }}>
      <main style={{ flex: 1, padding: 36 }}>
        <TimesheetHeader />
        {/*<DashboardPage />*/}
        <TimesheetFilters
          searchText={searchText}
          setSearchText={setSearchText}
          filterStartDate={filterStartDate}
          setFilterStartDate={setFilterStartDate}
          filterEndDate={filterEndDate}
          setFilterEndDate={setFilterEndDate}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />

        <TimesheetTable
          loading={loading}
          data={paginatedData}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          mapWorkType={mapWorkType}
          projectInfo={projectInfo}
          getWeeklyStatusColor={getWeeklyStatusColor}
          refreshData={async () => {
            // Callback to refresh data after save
            setLoading(true);
            try {
              // First, fetch and store project/task information
              const projectTaskMapping = await fetchAndStoreProjectTaskInfo();

              // Then fetch timesheet history
              const response = await api.get(
                `${
                  window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
                }/api/timesheet/history`,
              );

              const data = response.data;

              // Map API response to our expected format using the mapping data
              const weeklyEntries = mapApiResponseToEntries(
                data,
                projectTaskMapping,
              );

              // Calculate week-to-week differences
              const entriesWithDifferences = weeklyEntries.map(
                (week, index) => {
                  const previousWeek = weeklyEntries[index + 1];
                  let hoursDifference = 0;
                  let differenceType = "neutral";

                  if (previousWeek) {
                    hoursDifference = week.totalHours - previousWeek.totalHours;
                    if (hoursDifference > 0) {
                      differenceType = "increase";
                    } else if (hoursDifference < 0) {
                      differenceType = "decrease";
                    }
                  }

                  return {
                    ...week,
                    hoursDifference: Math.abs(hoursDifference),
                    differenceType,
                    isFirstWeek: index === 0,
                    isLastWeek: index === weeklyEntries.length - 1,
                  };
                },
              );

              setEntries(entriesWithDifferences);
            } catch (err) {
              console.error("Failed to fetch timesheets:", err);
            } finally {
              setLoading(false);
            }
          }}
        />
      </main>
    </div>
  );
};

// Named export for fetchAndStoreProjectTaskInfo
export default TimesheetHistoryPage;
