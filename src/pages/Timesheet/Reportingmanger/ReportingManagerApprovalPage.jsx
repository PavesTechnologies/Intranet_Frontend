import React, { useEffect, useState, useRef } from "react";
import ReportingManagerApprovalTable from "./ReportingManagerApprovalTable";
import { useMemo } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";

const ReportingManagerApprovalPage = () => {
  const [groupedTimesheets, setGroupedTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);

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
    try {
      const response = await fetch(
        `${
          window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/timesheets/internal/summary/reportingManager`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch timesheets");

      const data = await response.json();
      setGroupedTimesheets(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchGroupedTimesheets()]);
    };
    loadInitialData();
  }, []);

  const filteredTimesheets = useMemo(() => {
    if (!groupedTimesheets.length) return [];

    let filtered = [...groupedTimesheets];

    filtered = filtered.filter((user) => {
      // 🔹 1️⃣ User Filter
      if (
        userFilter &&
        userFilter !== "All Users" &&
        user.userName.trim().toLowerCase() !== userFilter.trim().toLowerCase()
      ) {
        return false;
      }

      // 🔹 2️⃣ Search Filter
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

      // 🔹 3️⃣ Date Filter
      if (selectedDate) {
        const hasDate = user.weeklySummary?.some((week) =>
          week.timesheets?.some((ts) => ts.workDate === selectedDate),
        );
        if (!hasDate) return false;
      }

      // 🔹 4️⃣ Status Filter
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

      return true;
    });

    return filtered;
  }, [statusFilter, userFilter, selectedDate, searchTerm, groupedTimesheets]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedDate("");
    setUserFilter("All Users");
    setStatusFilter("All");

    if (entriesTableRef.current) {
      entriesTableRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTableRefresh = async () => {
    fetchGroupedTimesheets();
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <LoadingSpinner text="Loading Reporting Manager View..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reporting Manager Approvals
        </h1>
      </div>

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
        <button
          onClick={handleResetFilters}
          className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2.5 rounded-full transition-colors"
        >
          Reset
        </button>
      </div>

      {/* ✅ Timesheet Table */}
      <ReportingManagerApprovalTable
        loading={loading}
        groupedData={filteredTimesheets}
        statusFilter={statusFilter}
        ref={entriesTableRef}
        onRefresh={handleTableRefresh}
      />
    </div>
  );
};

export default ReportingManagerApprovalPage;
