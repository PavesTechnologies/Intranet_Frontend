import React, { useEffect, useState, useRef } from "react";
// import ManagerApprovalTable from "../ManagerApproval/ManagerApprovalTable";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";
// import ManagerDashboard from "../ManagerDashboard";
import AdminApprovalTable from "./AdminApprovalTable";
import TimesheetHeader from "../TimesheetHeader";
// import { getManagerDashboardData } from "../api";
import { useMemo } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import { CheckCircle, XCircle } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminApprovalPage = () => {
  const navigate = useNavigate();
  const [groupedTimesheets, setGroupedTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [emailData, setEmailData] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [emailOptions, setEmailOptions] = useState([]);

  // ✅ Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All Users");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const entriesTableRef = useRef(null);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleScroll = () => {
    entriesTableRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Fetch Timesheets
  const fetchGroupedTimesheets = async () => {
    try {
      const response = await api.get(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT
        }/api/timesheets/internal/summary`,
      );

      const data = response.data;
      setGroupedTimesheets(data);
      setFilteredTimesheets(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      setLoading(false);
    }
  };
  // const fetchDashboardData = async () => {
  //   setLoadingDashboard(true);
  //   try {
  //     const data = await getManagerDashboardData(); // ✅ imported from api.js
  //     setDashboardData(data);
  //   } catch (error) {
  //     console.error("Error loading dashboard:", error);
  //   } finally {
  //     setLoadingDashboard(false);
  //   }
  // };

  const fetchEmailUsers = async () => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/users`,
      );
      setEmailOptions(res.data);
    } catch (err) {
      console.log("failed to fetch users email: ", err);
      toast.error(err?.response?.data || "Failed to fetch users email.");
    }
  };

  const fetchEmail = async () => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/emailSettings`,
      );
      console.log(res);
      setEmailData(res.data[0]);
    } catch (err) {
      console.log(err);
      toast.error(err?.response?.data || "Failed to fetch email address.");
    }
  };

  useEffect(() => {
    fetchEmail();
    fetchEmailUsers();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchGroupedTimesheets()]); //, fetchDashboardData()]);
    };
    loadInitialData();
  }, []);

  // ✅ Apply filters for deeply nested structureimport { useMemo } from "react";

  // ✅ Shared predicate: does a user pass the active filters?
  //    `applyUserFilter` is skipped when building the user dropdown, so the
  //    dropdown lists every user visible in the table (not the full user list).
  const passesFilters = (user, applyUserFilter) => {
    // 🔹 0️⃣ Hide users with no actionable weeks — every week is APPROVED
    const hasActionableWeek = user.weeklySummary?.some(
      (w) => w.weeklyStatus?.toUpperCase() !== "APPROVED",
    );
    if (!hasActionableWeek) return false;

    // 🔹 1️⃣ User Filter — show all users if "All Users" selected
    if (
      applyUserFilter &&
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
  };

  const filteredTimesheets = useMemo(() => {
    if (!groupedTimesheets.length) return [];
    return groupedTimesheets.filter((user) => passesFilters(user, true));
  }, [statusFilter, userFilter, selectedDate, searchTerm, groupedTimesheets]);

  // ✅ User dropdown options — only users actually shown in the table below.
  const userOptions = useMemo(() => {
    const names = groupedTimesheets
      .filter((user) => passesFilters(user, false))
      .map((user) => user.userName?.trim());
    return [...new Set(names)].filter(Boolean);
  }, [statusFilter, selectedDate, searchTerm, groupedTimesheets]);

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

  const handleSaveEmail = async () => {
    if (!isValidEmail(editValue)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      if (emailData?.id) {
        const res = await api.put(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/emailSettings/${emailData.id
          }`,
          { email: editValue },
        );
        setEmailData(res.data);
        toast.success("Email updated successfully!");
      } else {
        const res = await api.post(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/emailSettings`,
          { email: editValue },
        );
        setEmailData(res.data);
        toast.success("Email added successfully!");
      }
      setIsEditing(false);
    } catch (err) {
      toast.error("Failed to update email.");
    }
  };

  // ✅ Add this function inside ManagerApprovalPage component, before return()
  const handleTableRefresh = async () => {
    fetchGroupedTimesheets(); // refresh approval table
    //fetchDashboardData(); // refresh dashboard summary
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <LoadingSpinner text="Loading Admin View..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* <TimesheetHeader /> */}
      {/* <ManagerDashboard
        data={dashboardData}
        loading={loadingDashboard}
        setStatusFilter={setStatusFilter}
        handleScroll={handleScroll}
      /> 
       {!loadingDashboard && !dashboardData && (
        <div className="text-center text-red-600 my-4">
          Failed to load dashboard summary. Please refresh the page.
        </div>
      )} */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Approvals
          </h1>
        </div>
        <h3 className="flex items-center text-lg text-gray-500 font-semibold">
          Finance Report Email:&nbsp;
          {!isEditing && emailData?.email ? (
            <button
              className="text-blue-600 font-semibold text-[15px]"
              onClick={() => {
                setEditValue(emailData?.email || "");
                setIsEditing(true);
              }}
            >
              {emailData?.email}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* <input
                type="email"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                autoFocus
              /> */}
              <FilterListbox
                options={emailOptions.map((m) => ({ value: m.email, label: m.name }))}
                value={selectedEmail}
                onChange={(val) => { setSelectedEmail(val); setEditValue(val); }}
              />

              <CheckCircle
                className="text-green-600 hover:text-green-800 w-5 h-5 cursor-pointer"
                onClick={handleSaveEmail}
              />

              {emailData?.email && (
                <XCircle
                  className="text-red-500 hover:text-red-800 w-5 h-5 cursor-pointer"
                  onClick={() => setIsEditing(false)}
                />
              )}
            </div>
          )}
        </h3>
      </div>

      {/* ✅ Filter Header */}
      {/* <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by user,description,location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
        />

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        />

        <FilterListbox
          options={[
            { value: "All", label: "All" },
            { value: "Submitted", label: "Submitted" },
            { value: "Approved", label: "Approved" },
            { value: "Rejected", label: "Rejected" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <FilterListbox
          options={[
            { value: "All Users", label: "All Users" },
            ...[...new Set(groupedTimesheets.map((item) => item.userName?.trim()))].filter(Boolean).map((user) => ({ value: user, label: user })),
          ]}
          value={userFilter}
          onChange={setUserFilter}
        />

        <Button
          variant="destructive"
          size="medium"
          onClick={handleResetFilters}
        // className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2.5 rounded-full transition-colors"
        >
          Reset
        </Button>
      </div> */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-row items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by user, description, location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[100px] px-2 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
        />

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="shrink-0 px-2 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        />

        {/* Status Dropdown - Set a fixed or minimum width */}
        <div className="shrink-0 min-w-[120px]">
          <FilterListbox
            options={[
              { value: "All", label: "All Statuses" },
              { value: "Submitted", label: "Submitted" },
              { value: "Approved", label: "Approved" },
              { value: "Rejected", label: "Rejected" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {/* User Dropdown - Set a larger minimum width for names */}
        <div className="shrink-0 min-w-[150px]">
          <FilterListbox
            options={[
              { value: "All Users", label: "All Users" },
              ...userOptions.map((user) => ({ value: user, label: user })),
            ]}
            value={userFilter}
            onChange={setUserFilter}
          />
        </div>

        <Button
          variant="destructive"
          size="medium"
          onClick={handleResetFilters}
          className="shrink-0"
        >
          Reset
        </Button>
      </div>

      {/* ✅ Timesheet Table */}
      <AdminApprovalTable
        loading={loading}
        groupedData={filteredTimesheets}
        statusFilter={statusFilter}
        ref={entriesTableRef}
        onRefresh={handleTableRefresh}
      />
    </div>
  );
};

export default AdminApprovalPage;
