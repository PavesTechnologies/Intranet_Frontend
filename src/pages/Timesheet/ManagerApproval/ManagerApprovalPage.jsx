import React, { useEffect, useState, useRef } from "react";
import ManagerApprovalTable from "./ManagerApprovalTable";
import Button from "../../../components/Button/Button";
import ManagerDashboard from "../ManagerDashboard";
import TimesheetHeader from "../TimesheetHeader";
import { getManagerDashboardData } from "../api";
import { useMemo } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";

const ManagerApprovalPage = () => {
  const [groupedTimesheets, setGroupedTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // ✅ Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All Users");

  const entriesTableRef = useRef(null);

  const handleScroll = () => {
    entriesTableRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Fetch Timesheets
  const fetchGroupedTimesheets = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/timesheets/manager`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch timesheets");

      const data = await response.json();
      setGroupedTimesheets(data);
      setFilteredTimesheets(data);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      const data = await getManagerDashboardData(); // ✅ imported from api.js
      setDashboardData(data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchGroupedTimesheets(), fetchDashboardData()]);
    };
    loadInitialData();
  }, []);

  // ✅ Apply filters for deeply nested structureimport { useMemo } from "react";

  const filteredTimesheets = useMemo(() => {
    if (!groupedTimesheets.length) return [];

    // Start with all users' timesheets
    let filtered = [...groupedTimesheets];

    filtered = filtered.filter((user) => {
      // 🔹 1️⃣ User Filter — show all users if "All Users" selected
      if (
        userFilter &&
        userFilter !== "All Users" &&
        user.userName.trim().toLowerCase() !== userFilter.trim().toLowerCase()
      ) {
        return false;
      }

      // 🔹 2️⃣ Search Filter — search across username and nested entries
      if (searchTerm.trim()) {
        const lowerSearch = searchTerm.toLowerCase();

        const userMatch = user.userName.toLowerCase().includes(lowerSearch);

        const nestedMatch = user.weeklySummary?.some((week) =>
          week.timesheets?.some((ts) =>
            ts.entries?.some(
              (entry) =>
                entry.description?.toLowerCase().includes(lowerSearch) ||
                entry.otherDescription?.toLowerCase().includes(lowerSearch) ||
                entry.workLocation?.toLowerCase().includes(lowerSearch) ||
                entry.projectName?.toLowerCase().includes(lowerSearch) ||
                entry.taskName?.toLowerCase().includes(lowerSearch),
            ),
          ),
        );

        if (!userMatch && !nestedMatch) return false;
      }

      // 🔹 3️⃣ Date Filter — match selected date exactly
      if (selectedDate) {
        const hasDate = user.weeklySummary?.some((week) =>
          week.timesheets?.some((ts) => ts.workDate === selectedDate),
        );
        if (!hasDate) return false;
      }

      // 🔹 4️⃣ Status Filter — match weekly or timesheet statuses
      if (statusFilter !== "All") {
        const hasStatus = user.weeklySummary?.some(
          (week) =>
            week.weeklyStatus?.toLowerCase() === statusFilter.toLowerCase() ||
            week.timesheets?.some(
              (ts) =>
                ts.status?.toLowerCase() === statusFilter.toLowerCase() ||
                ts.actionStatus?.some(
                  (a) => a.status?.toLowerCase() === statusFilter.toLowerCase(),
                ),
            ),
        );
        if (!hasStatus) return false;
      }

      return true; // ✅ include this user
    });

    return filtered;
  }, [statusFilter, userFilter, selectedDate, searchTerm, groupedTimesheets]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedDate("");
    setUserFilter("All Users");
    setStatusFilter("All");

    // Smoothly scroll down to the timesheet table after resetting filters
    if (entriesTableRef.current) {
      entriesTableRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ✅ Add this function inside ManagerApprovalPage component, before return()
  const handleTableRefresh = async () => {
    fetchGroupedTimesheets(); // refresh approval table
    fetchDashboardData(); // refresh dashboard summary
  };

  if (loading && loadingDashboard) {
    return (
      <div className="flex justify-center mt-10">
        <LoadingSpinner text="Loading Manager View..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <TimesheetHeader />
      <ManagerDashboard
        data={dashboardData}
        loading={loadingDashboard}
        setStatusFilter={setStatusFilter}
        handleScroll={handleScroll}
      />
      {!loadingDashboard && !dashboardData && (
        <div className="text-center text-red-600 my-4">
          Failed to load dashboard summary. Please refresh the page.
        </div>
      )}

      {/* ✅ Filter Header */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by user,description,location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
        />

        {/* Date */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        />

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option>All</option>
          <option>Submitted</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>

        {/* User Dropdown */}
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="All Users">All Users</option>
          {[...new Set(groupedTimesheets.map((item) => item.userName?.trim()))]
            .filter(Boolean)
            .map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
        </select>

        {/* Reset Button */}
        <Button
          variant="destructive"
          size="medium"
          onClick={handleResetFilters}
        // className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2.5 rounded-full transition-colors"
        >
          Reset
        </Button>
      </div>

      {/* ✅ Timesheet Table */}
      <ManagerApprovalTable
        loading={loading}
        groupedData={filteredTimesheets}
        statusFilter={statusFilter}
        ref={entriesTableRef}
        onRefresh={handleTableRefresh}
      />
    </div>
  );
};

export default ManagerApprovalPage;
