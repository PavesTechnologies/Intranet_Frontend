import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { forwardRef, useImperativeHandle } from "react";
import { Check, X, Search, Pencil, XCircle } from "lucide-react";
import api from "../../../api/axiosInstance";
import Pagination from "../../../components/Pagination/pagination";
import LeaveDashboard from "../charts/LeaveDashboard";
import { toast } from "react-toastify";
import ManagerEditLeaveRequest from "./ManagerEditLeaveRequest";
import LeaveSection from "./LeaveSection";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { useAuth } from "../../../contexts/AuthContext";
import { useLeaveWebSocket } from "../websockets/useLeaveWebSocket";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const RMS_BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

const formatted = new Date().toISOString().slice(0, 7);

// function countWeekdays(startDateStr, endDateStr) {
//   const start = new Date(startDateStr.split("T")[0] + "T00:00:00");
//   const end = new Date(endDateStr.split("T")[0] + "T00:00:00");

//   if (end < start) return 0;

//   let count = 0;
//   let current = new Date(start);

//   while (current <= end) {
//     const day = current.getDay();
//     if (day !== 0 && day !== 6) {
//       count++;
//     }
//     current.setDate(current.getDate() + 1);
//   }
//   return count;
// }
const STATUS_OPTIONS = [
  { value: "All", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const MONTHS = [
  { value: "", label: "All Months" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// function FilterListbox({ options, value, onChange }) {
//   const selected = options.find((o) => o.value === value) ?? options[0];
//   return (
//     <Listbox value={selected} onChange={(opt) => onChange(opt.value)}>
//       <div className="relative w-full lg:min-w-[150px]">
//         <Listbox.Button className="w-full cursor-default rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-left text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
//           <span className="block truncate">{selected?.label}</span>
//           <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
//             <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
//           </span>
//         </Listbox.Button>
//         <Transition
//           as={Fragment}
//           leave="transition ease-in duration-100"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <Listbox.Options className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-2xl ring-1 ring-black/5 border border-gray-100 focus:outline-none text-sm">
//             {options.map((option, idx) => (
//               <Listbox.Option
//                 key={idx}
//                 value={option}
//                 className={({ active }) =>
//                   `relative cursor-default select-none py-2 pl-4 pr-9 ${
//                     active ? "bg-indigo-50 text-indigo-900" : "text-gray-900"
//                   }`
//                 }
//               >
//                 {({ selected }) => (
//                   <>
//                     <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
//                       {option.label}
//                     </span>
//                     {selected && (
//                       <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600">
//                         <CheckIcon className="h-4 w-4" />
//                       </span>
//                     )}
//                   </>
//                 )}
//               </Listbox.Option>
//             ))}
//           </Listbox.Options>
//         </Transition>
//       </div>
//     </Listbox>
//   );
// }

const MANAGER_WS_EVENTS = ["LEAVE_APPLIED", "LEAVE_CANCELLED", "LEAVE_UPDATED"];

const HandleLeaveRequestAndApprovals = forwardRef(({ employeeId }, ref) => {
  const [adminLeaveRequests, setAdminLeaveRequests] = useState([]);
  const [allLeaveTypes, setAllLeaveTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState([]);
  const [confirmation, setConfirmation] = useState(null); // { action, leaveId }
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState({}); // manager comments keyed by leaveId
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [leaveBalanceModal, setLeaveBalaceModel] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const itemsPerPage = 8;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i); // current + 3 past years
  const yearOptions = [{ value: "", label: "All Years" }, ...years.map((y) => ({ value: y, label: String(y) }))];
  const isMountedRef = useRef(false);

  // const { user } = useAuth();
  // const permissions = user?.permissions || [];
  const managerId = employeeId;
  // const canApprove = permissions.includes("Approve_LeaveRequest");
  // const canReject = permissions.includes("Reject_LeaveRequest");
  // const canEdit = permissions.includes("Edit_LeaveRequest");

  // const toLeaveRequest = (raw) => ({
  //   leaveId: raw.leaveId,
  //   employee: {
  //     fullName: raw.employee.fullName,
  //     jobTitle: raw.employee.jobTitle,
  //   },
  //   leaveType: {
  //     leaveName: raw.leaveType.leaveName,
  //   },
  //   startDate: raw.startDate,
  //   endDate: raw.endDate,
  //   daysRequested: raw.daysRequested,
  //   status: raw.status,
  //   approvedBy: raw.approvedBy,
  //   reason: raw.reason,
  //   managerComment: raw.managerComment,
  //   requestDate: raw.requestDate,
  //   driveLink: raw.driveLink || undefined,
  // });

  // const refreshData = useCallback(() => {
  //   fetchData();
  // }, []);

  // const fetchData = async () => {
  //   setLoading(true);
  //   try {
  //     const payload = {
  //       managerId,
  //       status: selectedStatus !== "All" ? selectedStatus : null,
  //       year: selectedYear || null, // from your year dropdown
  //       month: selectedMonth || null, // from your month dropdown
  //     };

  //     const res = await api.post(
  //       `${BASE_URL}/api/leave-requests/manager/history`,
  //       payload,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //       }
  //     );

  //     const types = await api.get(
  //       `${BASE_URL}/api/leave/get-all-leave-types`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //       }
  //     );

  //     const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
  //     setAdminLeaveRequests(arr);
  //     setAllLeaveTypes(types.data || []);
  //   } catch (err) {
  //     toast.error("Error fetching leave data:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Component to handle long reason text with "View More"/"View Less"

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        managerId,
        status: selectedStatus !== "All" ? selectedStatus : null,
        year: Number(selectedYear) || null,
        month: selectedMonth || null,
      };

      const [res, types] = await Promise.all([
        api.post(`${BASE_URL}/api/leave-requests/manager/history`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAdminLeaveRequests(arr);

      const regular = types.data?.regualar || [];
      const genderBased = types.data?.genderBasedLeaves || [];
      setAllLeaveTypes([...regular, ...genderBased]);
    } catch (err) {
      toast.error("Error fetching leave data");
    } finally {
      setLoading(false);
    }
  }, [managerId, selectedStatus, selectedYear, selectedMonth]);

  useEffect(() => {
    if (managerId) fetchData();
  }, [fetchData, managerId]);

  // useEffect(() => {
  //   if (isMountedRef.current) {
  //     if (managerId) fetchData();
  //     return;
  //   }
  //   if (managerId) {
  //     fetchData();
  //     isMountedRef.current = true;
  //   }
  // }, [fetchData, managerId]); // Still include the dependencies

  useLeaveWebSocket("manager-update", MANAGER_WS_EVENTS, fetchData);

  useImperativeHandle(ref, () => ({ refreshData: fetchData }), [fetchData]);
  const LeaveReasonCell = ({ reason }) => {
    const [expanded, setExpanded] = useState(false);

    // limit characters shown before truncation
    const MAX_LENGTH = 50;

    if (!reason) return <span>-</span>;

    const isLong = reason.length > MAX_LENGTH;
    const displayText = expanded
      ? reason
      : reason.substring(0, MAX_LENGTH) + (isLong ? "..." : "");

    return (
      <div className="flex flex-col">
        <span className="text-gray-700 whitespace-pre-wrap">{displayText}</span>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 text-xs hover:underline self-start"
          >
            {expanded ? "View Less" : "View More"}
          </button>
        )}
      </div>
    );
  };

  const filteredRequests = adminLeaveRequests.filter((leave) => {
    const lt = (leave.leaveType?.leaveName || "").toLowerCase();
    const en = (leave.employee?.fullName || "").toLowerCase();
    const st = (leave.status || "").toLowerCase();
    const rs = (leave.reason || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    // If search is empty, show everything
    if (search === "") {
      return true;
    }

    // Otherwise, check for a match in any of the fields
    return (
      lt.includes(search) ||
      en.includes(search) ||
      st.includes(search) ||
      rs.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  const selectableRequests = adminLeaveRequests.filter(
    (r) =>
      !["approved", "rejected", "cancelled"].includes(r.status.toLowerCase()),
  );

  // Select all or none
  const handleSelectAll = (checked) => {
    setSelectedRequests(
      checked ? selectableRequests.map((r) => r.leaveId) : [],
    );
    setSelectedResourceId(
      checked ? selectableRequests.map((r) => r.employee.employeeId) : [],
    );
  };

  // Select single
  const handleSelectRequest = (leaveId, checked, resourceId) => {
    if (checked) {
      setSelectedRequests((prev) => [...prev, leaveId]);
      setSelectedResourceId((prev) => [...prev, resourceId]);
    } else {
      setSelectedRequests((prev) => prev.filter((id) => id !== leaveId));
      setSelectedResourceId((prev) => prev.filter((id) => id !== resourceId));
    }
  };

  // Batch approve
  const handleAcceptAll = async () => {
    if (selectedRequests.length === 0) return;
    setLoading(true);
    try {
      // Single batch API call with all selected IDs
      await api.post(
        `${BASE_URL}/api/leave-requests/approve-batch`,
        {
          managerId,
          leaveIds: selectedRequests,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success(`${selectedRequests.length} requests approved.`);
      setSelectedRequests([]);
      selectedResourceId.forEach((empId) => {
        try {
          const res = api.post(
            `${RMS_BASE_URL}/api/availability/recalculate/resource/${empId}`,
            {},
            {
              params: {
                yearMonth: formatted,
              },
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          console.log("Recalculate result: ", res);
        } catch (err) {
          console.error("Error approving leave request:", err);
        }
      });
      setSelectedResourceId([]);
      await fetchData();
    } catch (err) {
      toast.error("Failed to approve selected requests.");
    } finally {
      setLoading(false);
    }
  };

  // Batch reject
  const handleRejectAll = async () => {
    if (selectedRequests.length === 0) return;
    setLoading(true);
    try {
      await api.post(
        `${BASE_URL}/api/leave-requests/reject-batch`,
        {
          managerId,
          leaveIds: selectedRequests,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success(`${selectedRequests.length} requests rejected.`);
      setSelectedRequests([]);
      setSelectedResourceId([]);
      await fetchData();
    } catch (err) {
      toast.error("Error rejecting selected requests.");
    } finally {
      setLoading(false);
    }
  };

  // Approve or Reject single leave, use comment from param or store
  const handleDecision = async ({
    action,
    leaveId,
    commentParam,
    resourceId,
    year,
  }) => {
    const comment = commentParam ?? (comments[leaveId] || "");

    if ((action === "reject" || action === "cancel") && !comment) {
      toast.error(
        action === "reject"
          ? "Manager comment required to reject."
          : "Reason required to cancel approved leave.",
      );
      return;
    }
    console.log("handleDecision", { action, leaveId, comment, managerId });
    setLoading(true);
    try {
      await api.put(
        `${BASE_URL}/api/leave-requests/${action}`,
        {
          managerId,
          leaveId,
          comment,
          year,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success(
        action === "reject"
          ? "Leave rejected successfully."
          : action === "cancel"
            ? "Leave cancelled successfully."
            : "Leave approved successfully.",
      );
      setSelectedRequests((prev) => prev.filter((id) => id !== leaveId));
      setSelectedResourceId((prev) => prev.filter((id) => id !== resourceId));
      await fetchData();
      setConfirmation(null);
      if (action === "approve") {
        try {
          const res = await api.post(
            `${RMS_BASE_URL}/api/availability/recalculate/resource/${resourceId}`,
            {},
            {
              params: {
                yearMonth: formatted,
              },
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          console.log("Recalculated availability result: ", res);
        } catch (err) {
          console.error("Failed to recalculate availability", err);
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update leave (for ActionDropdown editing)
  const handleLeaveUpdate = async (leaveId, updatedData) => {
    setLoading(true);
    try {
      const originalRequest = adminLeaveRequests.find(
        (req) => req.leaveId === leaveId,
      );
      if (!originalRequest) {
        throw new Error("Original request not found.");
      }

      const payload = {
        leaveId: originalRequest.leaveId,
        employeeId: originalRequest.employeeId,
        managerId,
        reason: originalRequest.reason, // Keep original employee reason
        driveLink: originalRequest.driveLink || null,

        // Merge updated data
        ...updatedData,
      };

      await api.put(`${BASE_URL}/api/leave-requests/update`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      toast.success("Leave request updated successfully.");
      setEditingRequest(null); // Close the modal
      await fetchData(); // Refresh data
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Update failed! Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row items-center gap-4 flex-wrap">
          {/* --- SEARCH INPUT --- */}
          {/* No changes needed here, it already matches the new style. */}
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Name or Leave Type"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* --- STATUS DROPDOWN --- */}
          <div className="w-full lg:w-auto lg:min-w-[150px]">
            <FilterListbox
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onChange={setSelectedStatus}
            />
          </div>

          {/* --- YEAR DROPDOWN --- */}
          <div className="w-full lg:w-auto lg:min-w-[150px]">
            <FilterListbox
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          </div>

          {/* --- MONTH DROPDOWN --- */}
          <div className="w-full lg:w-auto lg:min-w-[150px]">
            <FilterListbox
              options={MONTHS}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full rounded-lg shadow-sm">
          <thead className="bg-gray-50 border-gray-200 relative">
            {selectedRequests.length > 0 && (
              <tr>
                <th
                  colSpan={12}
                  className="sticky left-0 z-10 p-0 bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-4 w-1/2 bg-indigo-100 text-indigo-700 px-6 py-2 rounded-t-lg">
                    <span className="font-semibold">
                      {selectedRequests.length} selected
                    </span>

                    {/* ✅ Accept All */}
                    <button
                      onClick={handleAcceptAll} //{canApprove ? handleAcceptAll : undefined}
                      disabled={selectedRequests.length === 0} //{!canApprove || selectedRequests.length === 0}
                      // title={
                      //   canApprove
                      //     ? "Approve all selected leave requests"
                      //     : "You don’t have permission to approve requests"
                      // }
                      title="Approve all selected leave requests"
                      //                 className={`px-3 py-1 rounded-md transition
                      // ${
                      //   canApprove
                      //     ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                      //     : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      // }`}
                      className={`px-3 py-1 rounded-md transition
                      ${"bg-green-600 hover:bg-green-700 text-white cursor-pointer"}`}
                    >
                      Approve
                    </button>

                    {/* ❌ Reject All */}
                    <button
                      onClick={handleRejectAll} //{canReject ? handleRejectAll : undefined}
                      disabled={selectedRequests.length === 0} //{!canReject || selectedRequests.length === 0}
                      // title={
                      //   canReject
                      //     ? "Reject all selected leave requests"
                      //     : "You don’t have permission to reject requests"
                      // }
                      title="Reject all selected leave requests"
                      // className={`px-3 py-1 rounded-md transition
                      // ${
                      //   canReject
                      //     ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                      //     : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      // }`}
                      className={`px-3 py-1 rounded-md transition
                      ${"bg-red-600 hover:bg-red-700 text-white cursor-pointer"}`}
                    >
                      Reject
                    </button>

                    {/* 🧹 Clear Selection */}
                    <button
                      onClick={() => {
                        setSelectedRequests([]);
                        setSelectedResourceId([]);
                      }}
                      className="ml-auto px-2 py-1 text-indigo-600 hover:text-indigo-900 font-semibold transition"
                      title="Clear Selection"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              </tr>
            )}
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-sm">
              <th
                className="px-4 py-3 text-center text-xs sticky left-1 z-20 bg-blue-900 whitespace-nowrap"
                style={{ width: "4%" }}
              >
                <input
                  type="checkbox"
                  checked={
                    selectedRequests.length > 0 &&
                    selectableRequests.length > 0 &&
                    selectedRequests.length === selectableRequests.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={selectableRequests.length === 0}
                />
              </th>
              <th
                className="px-4 py-3 text-center text-xs sticky left-[4.5%] z-20 bg-blue-900 whitespace-nowrap"
                style={{ width: "12%" }}
              >
                Employee
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "12%" }}
              >
                From
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "12%" }}
              >
                To
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "5%" }}
              >
                Days
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "8%" }}
              >
                Requested On
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "10%" }}
              >
                Leave Type
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "16%" }}
              >
                Reason
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "8%" }}
              >
                Status
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "15%" }}
              >
                Last Action By
              </th>
              <th
                className="px-4 py-3 text-center text-xs whitespace-nowrap"
                style={{ width: "8%" }}
              >
                Documents
              </th>
              <th
                className="px-4 py-3 text-center text-xs sticky right-0 z-20 bg-indigo-900 whitespace-nowrap"
                style={{ width: "8%" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-center">
            {/* ✨ START: Conditional Rendering Logic ✨ */}
            {loading ? (
              // State 1: Show spinner while loading
              <tr>
                <td colSpan="13" className="py-8">
                  <LoadingSpinner text="Loading..." />
                </td>
              </tr>
            ) : adminLeaveRequests.length === 0 ? (
              // State 2: Show message if no data is available
              <tr>
                <td colSpan="13" className="text-center text-gray-500 py-12">
                  No leaves to be displayed.
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td className="text-center text-gray-500 py-12" colSpan="13">
                  No leaves found matching {searchTerm}.
                </td>
              </tr>
            ) : (
              // State 3: Render the data rows if data exists
              paginatedRequests.map((request) => {
                console.log("request editing ", request);
                const typeObj =
                  allLeaveTypes.find(
                    (t) => t.leaveName === request.leaveName,
                  ) || request.leaveType;
                return (
                  <tr
                    key={request.leaveId}
                    className="hover:bg-gray-50 transition-colors text-xs"
                  >
                    {/* Your existing <td> elements go here, no changes needed inside the map */}
                    <td className="sticky left-1 z-10 bg-white">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.leaveId)}
                        onChange={(e) =>
                          handleSelectRequest(
                            request.leaveId,
                            e.target.checked,
                            request.employeeId,
                          )
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        disabled={[
                          "approved",
                          "rejected",
                          "cancelled",
                        ].includes(request.status.toLowerCase())}
                      />
                    </td>
                    <td className="cursor-pointer text-blue-600 hover:underline sticky left-[4.5%] z-10 bg-white">
                      <button
                        onClick={() =>
                          setLeaveBalaceModel({
                            employeeId: request.employeeId,
                            employeeName: request.employeeFullName,
                            leaveId: request.leaveId,
                          })
                        }
                      >
                        {request.employeeFullName}
                        {/* <div className="text-gray-500 text-ellipsis whitespace-nowrap overflow-hidden max-w-[100px]">
                          {request.jobTitle}
                        </div> */}
                      </button>
                    </td>
                    {/* ... other <td> cells for your data ... */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 whitespace-nowrap">
                        {request.startDate
                          ? new Date(request.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                          : "-"}
                        <div className="text-gray-500">
                          {request.startSession &&
                            request.startSession !== "none" &&
                            request.startSession !== "fullday" &&
                            ` (${request.startSession})`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 whitespace-nowrap">
                        {request.endDate
                          ? new Date(request.endDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                          : "-"}
                        <div className="text-gray-500">
                          {request.endSession &&
                            request.endSession !== "none" &&
                            request.endSession !== "fullday" &&
                            ` (${request.endSession})`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.daysRequested}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 whitespace-nowrap">
                        {request.requestDate
                          ? new Date(request.requestDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.leaveName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 text-left">
                        <LeaveReasonCell reason={request.reason} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.approvedBy
                            ? request.approvedBy.fullName
                            : "—"}
                        </div>
                        {request.managerComment && (
                          <div className="text-gray-500 mt-1">
                            {request.managerComment}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {request.driveLink && request.driveLink.trim() && (
                        <a
                          href={request.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Documents
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 sticky right-0 z-10 bg-white">
                      <div className="flex items-center gap-2">
                        {request.status.toLowerCase() === "pending" && (
                          <>
                            {/* ✅ Approve Button */}
                            <button
                              // title={
                              //   canApprove
                              //     ? "Approve"
                              //     : "You don't have permission to approve this request"
                              // }
                              title="Approve"
                              // className={`p-1 transition-colors ${
                              //   canApprove
                              //     ? "text-green-600 hover:text-green-800"
                              //     : "text-gray-400 cursor-not-allowed"
                              // } disabled:opacity-50 disabled:cursor-not-allowed`}
                              className={`p-1 transition-colors ${"text-green-600 hover:text-green-800"}`}
                              onClick={() =>
                                //canApprove &&
                                setConfirmation({
                                  action: "approve",
                                  leaveId: request.leaveId,
                                  resourceId: request.employeeId,
                                  year: request.year,
                                })
                              }
                              aria-label="Approve Request"
                              disabled={loading} //{loading || !canApprove}
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            {/* ❌ Reject Button */}
                            <button
                              // title={
                              //   canReject
                              //     ? "Reject"
                              //     : "You don't have permission to reject this request"
                              // }
                              title="Reject"
                              // className={`p-1 transition-colors ${
                              //   canReject
                              //     ? "text-red-600 hover:text-red-800"
                              //     : "text-gray-400 cursor-not-allowed"
                              // } disabled:opacity-50 disabled:cursor-not-allowed`}
                              className="p-1 transition-colors text-red-600 hover:text-red-800"
                              onClick={() =>
                                //canReject &&
                                setConfirmation({
                                  action: "reject",
                                  leaveId: request.leaveId,
                                  resourceId: request.employeeId,
                                  year: request.year,
                                })
                              }
                              aria-label="Reject Request"
                              disabled={loading} //{loading || !canReject}
                            >
                              <X className="w-4 h-4" />
                            </button>

                            {/* ✏️ Edit Button */}
                            <button
                              // title={
                              //   canEdit
                              //     ? "Edit"
                              //     : "You don't have permission to edit this request"
                              // }
                              title="Edit"
                              onClick={() =>
                                //canEdit &&
                                setEditingRequest(request)
                              }
                              aria-label="Edit Request"
                              disabled={loading} //{loading || !canEdit}
                              // className={`p-1 transition-colors ${
                              //   canEdit
                              //     ? "text-blue-600 hover:text-blue-800"
                              //     : "text-gray-400 cursor-not-allowed"
                              // } disabled:opacity-50 disabled:cursor-not-allowed`}
                              className="p-1 transition-colors text-blue-600 hover:text-blue-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {request.status.toLowerCase() === "approved" && (
                          <button
                            title="Cancel Approved Leave"
                            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() =>
                              setConfirmation({
                                action: "cancel",
                                leaveId: request.leaveId,
                              })
                            }
                            aria-label="Cancel Approved Leave"
                            disabled={loading}
                          >
                            <XCircle className="w-6 h-6" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {/* ✨ END: Conditional Rendering Logic ✨ */}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="mb-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              onNext={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages))
              }
            />
          </div>
        )}

        {/* NEW: Render the Edit Modal */}
        {editingRequest && (
          <ManagerEditLeaveRequest
            isOpen={!!editingRequest}
            onClose={() => setEditingRequest(null)}
            onSave={handleLeaveUpdate}
            requestDetails={editingRequest}
          />
        )}

        {leaveBalanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[100vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Analysis for - {leaveBalanceModal.employeeName}
                </h2>
                <Button
                  onClick={() => setLeaveBalaceModel(null)}
                  variant="ghost"
                  size="medium"
                >
                  &times;
                </Button>
              </div>
              <LeaveSection
                employeeId={leaveBalanceModal.employeeId}
                leaveId={leaveBalanceModal.leaveId}
              />
            </div>
          </div>
        )}

        {confirmation && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-[90vw] max-w-[360px] border border-gray-200 animate-fade-in">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${confirmation.action === "approve"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                    }`}
                >
                  {confirmation.action === "approve" ? (
                    <Check className="w-10 h-10" />
                  ) : (
                    <X className="w-10 h-10" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 text-center mb-3">
                  {confirmation.action === "approve"
                    ? "Approve this leave request?"
                    : "Reject this leave request?"}
                </h3>
                {(confirmation.action === "reject" ||
                  confirmation.action === "cancel") && (
                    <input
                      placeholder={
                        confirmation.action === "reject"
                          ? "Manager comment"
                          : "Reason for cancellation"
                      }
                      className="border rounded px-2 py-1 mb-3 text-sm w-full"
                      value={comments[confirmation.leaveId] || ""}
                      onChange={(e) =>
                        setComments((prev) => ({
                          ...prev,
                          [confirmation.leaveId]: e.target.value,
                        }))
                      }
                    />
                  )}

                <div className="flex gap-3 w-full">
                  <Button
                    variant="ghost"
                    size="medium"
                    className="flex-1"
                    onClick={() => setConfirmation(null)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={
                      confirmation.action === "approve" ? "primary" : "danger"
                    }
                    size="medium"
                    className="flex-1"
                    loading={loading}
                    loadingText={
                      confirmation.action === "approve"
                        ? "Approving..."
                        : "Rejecting..."
                    }
                    onClick={() =>
                      handleDecision({
                        action: confirmation.action,
                        leaveId: confirmation.leaveId,
                        resourceId: confirmation.resourceId,
                        year: confirmation.year,
                      })
                    }
                  >
                    Yes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default HandleLeaveRequestAndApprovals;
