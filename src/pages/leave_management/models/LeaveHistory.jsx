// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import Pagination from "../../../components/Pagination/pagination";
// import { Fonts } from "../../../components/Fonts/Fonts";
// import { useAuth } from "../../../contexts/AuthContext";
// import { toast } from "react-toastify";
// import LoadingSpinner from "../../../components/LoadingSpinner";
// import { XCircle } from "lucide-react";
// import CancellationModal from "./CancellationModal";

// const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// const LeaveHistory = ({ employeeId, refreshKey }) => {
//   const [leaves, setLeaves] = useState([]);
//   const [leaveTypeOptions, setLeaveTypeOptions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

//   const currentYear = new Date().getFullYear();
//   const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

//   // const employeeId = useAuth()?.user?.user_id;
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterLeaveType, setFilterLeaveType] = useState("All");
//   const [filterStatus, setFilterStatus] = useState("APPROVED");
//   const [leaveTypes, setLeaveTypes] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 8;
//   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
//   const [selectedLeaveId, setSelectedLeaveId] = useState(null);
//   const [isCancelling, setIsCancelling] = useState(false);

//   // Fetch data
//   useEffect(() => {
//     setLoading(true);
//     Promise.all([
//       axios.get(`${BASE_URL}/api/leave-requests/employee/${employeeId}`, {
//         withCredentials: true,
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//       }),
//       axios.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
//         withCredentials: true,
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//       }),
//     ])
//       .then(([leavesResp, typesResp]) => {
//         const data = leavesResp.data;
//         setLeaves(Array.isArray(data?.data) ? data.data : []);
//         setLeaveTypeOptions(
//           Array.isArray(typesResp.data) ? typesResp.data : []
//         );
//         console.log("leaves", leavesResp.data);
//         console.log("types", typesResp.data);
//         setLoading(false);
//       })
//       .catch(() => {
//         toast.error("Failed to fetch leave history or types.");
//         setLoading(false);
//       });
//   }, [refreshKey, employeeId]);

//   useEffect(() => {
//     const fetchLeaveTypes = async () => {
//       // if (!isOpen) return;
//       try {
//         const res = await axios.get(`${BASE_URL}/api/leave/types`, {
//           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//         });
//         setLeaveTypes(res.data);
//       } catch (err) {
//         toast.error("Failed to load leave type details.");
//       }
//     };

//     fetchLeaveTypes();
//   }, [localStorage.getItem("token")]);

//   // function mapLeaveBalancesToDropdown(balances, leaveTypes) {
//   //   return balances.map((balance) => {
//   //     const leaveTypeId = balance.leaveType.leaveTypeId;
//   //     const originalName = balance.leaveType.leaveName;

//   //     // Find the corresponding type from the fetched list to get its 'label'
//   //     const matchingType = leaveTypes.find(
//   //       (type) => type.name === originalName
//   //     );
//   //     const leaveName = matchingType
//   //       ? matchingType.label
//   //       : originalName.replace(/^L-/, "");

//   //     let availableText;
//   //     let isInfinite = false;

//   //     if (
//   //       leaveTypeId === "L-UP" ||
//   //       leaveName.toLowerCase().includes("unpaid")
//   //     ) {
//   //       availableText = "Infinite balance";
//   //       isInfinite = true;
//   //     } else if (balance.remainingLeaves > 0) {
//   //       availableText =
//   //         (balance.remainingLeaves % 1 === 0
//   //           ? balance.remainingLeaves
//   //           : balance.remainingLeaves.toFixed(1)) + " days available";
//   //     } else {
//   //       availableText = "Not Available";
//   //     }

//   //     return {
//   //       leaveTypeId,
//   //       leaveName, // This will now be the user-friendly label
//   //       availableText,
//   //       availableDays: isInfinite ? Infinity : balance.remainingLeaves,
//   //       isInfinite,
//   //       disabled: !isInfinite && balance.remainingLeaves <= 0,
//   //       allowHalfDay: !!balance.leaveType.allowHalfDay,
//   //       requiresDocumentation: !!balance.leaveType.requiresDocumentation,
//   //     };
//   //   });
//   // }

//   const statusOptions = Array.from(
//     new Set(
//       leaves
//         .filter((l) => l.status?.toUpperCase() !== "PENDING")
//         .map((l) => l.status)
//         .filter(Boolean)
//     )
//   );

//   // Component to handle long reason text with "View More"/"View Less"
//   const LeaveReasonCell = ({ reason }) => {
//     const [expanded, setExpanded] = useState(false);

//     // limit characters shown before truncation
//     const MAX_LENGTH = 50;

//     if (!reason) return <span>-</span>;

//     const isLong = reason.length > MAX_LENGTH;
//     const displayText = expanded
//       ? reason
//       : reason.substring(0, MAX_LENGTH) + (isLong ? "..." : "");

//     return (
//       <div className="flex flex-col">
//         <span className="text-gray-700 whitespace-pre-wrap">{displayText}</span>
//         {isLong && (
//           <button
//             onClick={() => setExpanded(!expanded)}
//             className="text-blue-600 text-xs hover:underline self-start"
//           >
//             {expanded ? "View Less" : "View More"}
//           </button>
//         )}
//       </div>
//     );
//   };

//   console.log("filteredLeaves", leaves);

//   // Filtering
//   const filteredLeaves = leaves
//     .filter((leave) => leave.status?.toUpperCase() !== "PENDING")
//     .filter((leave) => {
//       const lt = (leave.leaveName || "").toLowerCase();
//       const en = (leave.employeeFullName || "").toLowerCase();
//       const st = (leave.status || "").toLowerCase();
//       const rs = (leave.reason || "").toLowerCase();
//       const search = searchTerm.toLowerCase();

//       const searchMatch =
//         search === "" ||
//         lt.includes(search) ||
//         en.includes(search) ||
//         st.includes(search) ||
//         rs.includes(search);

//       // console.log("searchMatch", filterLeaveType);

//       const typeMatch =
//         filterLeaveType === "All" ||
//         leave.leaveName === filterLeaveType;

//       const statusMatch =
//         filterStatus === "All" || leave.status === filterStatus;

//       const leaveYear = leave.startDate
//         ? new Date(leave.startDate).getFullYear()
//         : null;
//       const yearMatch =
//         selectedYear === "" || leaveYear === Number(selectedYear);

//       const leaveMonth = leave.startDate
//         ? new Date(leave.startDate).getMonth() + 1
//         : null;
//       const monthMatch =
//         selectedMonth === "" || leaveMonth === Number(selectedMonth);

//       return searchMatch && typeMatch && statusMatch && yearMatch && monthMatch;
//     });

//   const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
//   const paginatedRequests = filteredLeaves.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   // Helper: map DB leaveName to user-friendly label
//   const getLeaveLabel = (leaveName) => {
//     if (!leaveName) return "-";
//     const match = leaveTypes.find((lt) => lt.name === leaveName);
//     return match ? match.label : leaveName.replace(/^L-/, ""); // fallback to raw or cleaned name
//   };

//   const handleModalOpen = (leaveId) => {
//     setSelectedLeaveId(leaveId);
//     setIsCancelModalOpen(true);
//   }

//   const handleModalClose = () => {
//     setSelectedLeaveId(null);
//     setIsCancelModalOpen(false);
//     setIsCancelling(false);
//   }

//   const handleConfirmCancellation = async (reason) => {
//     if(!reason) {
//       toast.error("Reason is required");
//       return;
//     }
//     setIsCancelling(true);
//     try {
//       const res = await axios.post(`${BASE_URL}/api/leave-revoke/revoke`,
//         {
//           leaveRequestId: selectedLeaveId,
//           reason: reason
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`
//           },
//         }
//       );
//       toast.success(res?.data?.message || "Leave request revoked successfully!");
//       handleModalClose();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Failed to revoke leave request.");
//     } finally {
//       setIsCancelling(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="text-center py-10 text-gray-600 text-lg">
//         <LoadingSpinner text="Loading leave history..."/>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="text-center py-10 text-red-500 font-semibold">
//         {error}
//       </div>
//     );
//   }

//   return (
//     <div className="w-6xl mx-auto h-auto px-6 py-8 bg-white rounded-lg shadow-md">
//       {/* 🔹 Filters should always be visible */}
//       <div className="flex flex-wrap items-center gap-3 mb-5">
//         {/* Search Input - Slightly Wider */}
//         <div className="flex-1 min-w-[220px]">
//           <input
//             type="text"
//             className="border border-gray-300 px-3 py-2.5 rounded-lg text-sm w-full h-10 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 placeholder-gray-400"
//             placeholder="Search by employee, type, or reason…"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>

//         {/* Leave Type Dropdown */}
//         <div className="w-[160px]">
//           <select
//             className="border border-gray-300 px-3 py-2.5 rounded-lg text-sm w-full h-10 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
//             value={filterLeaveType}
//             onChange={(e) => setFilterLeaveType(e.target.value)}
//           >
//             <option value="All">All Leave Types</option>
//             {leaveTypeOptions.map((type) => (
//               <option
//                 key={type.leaveTypeId || type.id || type.leaveName}
//                 value={type.leaveName}
//               >
//                 {getLeaveLabel(type.leaveName)}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Status Dropdown */}
//         <div className="w-[140px]">
//           <select
//             className="border border-gray-300 px-3 py-2.5 rounded-lg text-sm w-full h-10 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//           >
//             <option value="All">All Statuses</option>
//             {statusOptions.map((status) => (
//               <option key={status} value={status}>
//                 {status}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Year Dropdown */}
//         <div className="w-[120px]">
//           <select
//             value={selectedYear}
//             onChange={(e) => setSelectedYear(e.target.value)}
//             className="border border-gray-300 px-3 py-2.5 rounded-lg text-sm w-full h-10 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
//           >
//             <option value="">All Years</option>
//             {years.map((year) => (
//               <option key={year} value={year}>
//                 {year}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Month Dropdown */}
//         <div className="w-[150px]">
//           <select
//             value={selectedMonth}
//             onChange={(e) => setSelectedMonth(e.target.value)}
//             className="border border-gray-300 px-3 py-2.5 rounded-lg text-sm w-full h-10 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
//           >
//             <option value="">All Months</option>
//             {[
//               "January",
//               "February",
//               "March",
//               "April",
//               "May",
//               "June",
//               "July",
//               "August",
//               "September",
//               "October",
//               "November",
//               "December",
//             ].map((month, index) => (
//               <option key={index + 1} value={index + 1}>
//                 {month}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* 🔹 Table or No Data */}
//       {filteredLeaves.length > 0 ? (
//         <div className="overflow-x-auto rounded-lg border border-gray-200">
//           <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
//             <thead className="bg-gray-100 text-xs uppercase text-gray-600">
//               <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-sm text-center">
//                 <th className="px-4 py-3 text-xs">Leave Type</th>
//                 <th className="px-4 py-3 text-xs">Requested by</th>
//                 <th className="px-4 py-3 text-xs">From</th>
//                 <th className="px-4 py-3 text-xs">To</th>
//                 <th className="px-4 py-3 text-xs">Days</th>
//                 <th className="px-4 py-3 text-xs">Status</th>
//                 <th className="px-4 py-3 text-xs">Reason</th>
//                 <th className="px-4 py-3 text-xs">Comment</th>
//                 <th className="px-4 py-3 text-xs">Approved By</th>
//                 <th className="px-4 py-3 text-xs">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {paginatedRequests.map((leave, index) => (
//                 <tr
//                   key={leave.leaveId || index}
//                   className={`${
//                     index % 2 === 0 ? "bg-white" : "bg-gray-50"
//                   } hover:bg-gray-100 transition text-center`}
//                 >
//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     {getLeaveLabel(leave.leaveType?.leaveName)}
//                   </td>

//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     {leave.employee?.fullName || "-"}
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     {leave.startDate
//                       ? new Date(leave.startDate).toLocaleDateString("en-US", {
//                           month: "short",
//                           day: "numeric",
//                           year: "numeric",
//                         })
//                       : "-"}
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     {leave.endDate
//                       ? new Date(leave.endDate).toLocaleDateString("en-US", {
//                           month: "short",
//                           day: "numeric",
//                           year: "numeric",
//                         })
//                       : "-"}
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs text-center">
//                     {leave.daysRequested}
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     <span
//                       className={`px-1.5 py-1 text-xs font-medium rounded-full text-white ${
//                         leave.status === "APPROVED"
//                           ? "bg-green-500"
//                           : leave.status === "REJECTED"
//                           ? "bg-red-500"
//                           : "bg-gray-500"
//                       }`}
//                     >
//                       {leave.status}
//                     </span>
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs whitespace-pre-wrap">
//                     <LeaveReasonCell reason={leave.reason} />
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     {leave.managerComment || "-"}
//                   </td>
//                   <td className="p-3 text-gray-700 font-medium text-xs">
//                     {leave.approvedBy?.fullName || "-"}
//                   </td>
//                   <td className="p-3">
//                     {leave.status === "APPROVED" && (
//                       <button
//                         type="button"
//                         title="Cancel Approved Leave"
//                         onClick={() => handleModalOpen(leave.leaveId)}
//                       >
//                         <XCircle className="text-orange-500 text-sm hover:text-orange-800" />
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {totalPages > 1 && (
//             <div className="mb-4">
//               <Pagination
//                 currentPage={currentPage}
//                 totalPages={totalPages}
//                 onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
//                 onNext={() =>
//                   setCurrentPage((page) => Math.min(page + 1, totalPages))
//                 }
//               />
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="flex h-40 items-center justify-center">
//           <p className={Fonts.caption}>No leave history found.</p>
//         </div>
//       )}
//       <CancellationModal
//         title="Confirm Cancellation"
//         subtitle="Are you sure you want to Cancel this Leave Request?"
//         isOpen={isCancelModalOpen}
//         onCancel={handleModalClose}
//         onConfirm={handleConfirmCancellation}
//         isLoading={isCancelling}
//         confirmText="Confirm"
//         isRevoke={true}
//       />
//     </div>
//   );
// };

// export default LeaveHistory;

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import Pagination from "../../../components/Pagination/pagination";
// import { Fonts } from "../../../components/Fonts/Fonts";
// import { toast } from "react-toastify";
// import LoadingSpinner from "../../../components/LoadingSpinner";
// import { XCircle } from "lucide-react";
// import CancellationModal from "./CancellationModal";

// const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// const LeaveHistory = ({ employeeId, refreshKey }) => {
//   const [leaves, setLeaves] = useState([]);
//   const [leaveTypeOptions, setLeaveTypeOptions] = useState([]);
//   const [leaveTypes, setLeaveTypes] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterLeaveType, setFilterLeaveType] = useState("All");
//   const [filterStatus, setFilterStatus] = useState("All");

//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 8;

//   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
//   const [selectedLeaveId, setSelectedLeaveId] = useState(null);
//   const [isCancelling, setIsCancelling] = useState(false);

//   const currentYear = new Date().getFullYear();
//   const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

//   /* ---------------- FETCH LEAVE DATA ---------------- */

//   useEffect(() => {
//     setLoading(true);

//     Promise.all([
//       axios.get(`${BASE_URL}/api/leave-requests/employee/${employeeId}/${selectedYear}`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//         withCredentials: true,
//       }),
//       axios.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//         withCredentials: true,
//       }),
//     ])
//       .then(([leaveResp, typesResp]) => {
//         const leaveData = leaveResp.data?.data || [];

//         setLeaves(Array.isArray(leaveData) ? leaveData : []);
//         const regularLeaves = typesResp.data?.regular || [];
//         const genderLeaves = typesResp.data?.genderBasedLeaves || [];
//         const mergedLeaves = [...regularLeaves, ...genderLeaves];
//         setLeaveTypeOptions(mergedLeaves || []);
//         setLoading(false);
//       })
//       .catch(() => {
//         toast.error("Failed to fetch leave history.");
//         setLoading(false);
//       });
//   }, [employeeId, refreshKey, selectedYear]);

//   /* ---------------- FETCH LEAVE TYPES ---------------- */

//   useEffect(() => {
//     const fetchLeaveTypes = async () => {
//       try {
//         const res = await axios.get(`${BASE_URL}/api/leave/types`, {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//         });

//         setLeaveTypes(res.data || []);
//       } catch {
//         toast.error("Failed to load leave type details.");
//       }
//     };

//     fetchLeaveTypes();
//   }, []);

//   /* ---------------- STATUS OPTIONS ---------------- */

//   const statusOptions = Array.from(
//     new Set(
//       leaves
//         .filter((l) => l.status?.toUpperCase() !== "PENDING")
//         .map((l) => l.status)
//         .filter(Boolean)
//     )
//   );

//   /* ---------------- LEAVE LABEL HELPER ---------------- */

//   const getLeaveLabel = (leaveName) => {
//     if (!leaveName) return "-";
//     console.log("leave name in getLeaveLabel", leaveName)
//     const match = leaveTypes.find((lt) => lt.name === leaveName);
//     return match ? match.label : leaveName.replace(/^L-/, "");
//   };

//   /* ---------------- REASON CELL ---------------- */

//   const LeaveReasonCell = ({ reason }) => {
//     const [expanded, setExpanded] = useState(false);
//     const MAX_LENGTH = 50;

//     if (!reason) return <span>-</span>;

//     const isLong = reason.length > MAX_LENGTH;

//     const displayText = expanded
//       ? reason
//       : reason.substring(0, MAX_LENGTH) + (isLong ? "..." : "");

//     return (
//       <div className="flex flex-col">
//         <span className="text-gray-700 whitespace-pre-wrap">{displayText}</span>

//         {isLong && (
//           <button
//             onClick={() => setExpanded(!expanded)}
//             className="text-blue-600 text-xs hover:underline"
//           >
//             {expanded ? "View Less" : "View More"}
//           </button>
//         )}
//       </div>
//     );
//   };

//   /* ---------------- FILTERING ---------------- */

//   const filteredLeaves = leaves
//     .filter((leave) => leave.status?.toUpperCase() !== "PENDING")
//     .filter((leave) => {
//       const leaveType = (leave.leaveName || "").toLowerCase();
//       const empName = (
//         leave.employee?.fullName ||
//         leave.employeeFullName ||
//         ""
//       ).toLowerCase();

//       const reason = (leave.reason || "").toLowerCase();
//       const status = (leave.status || "").toLowerCase();
//       const search = searchTerm.toLowerCase();

//       const searchMatch =
//         search === "" ||
//         leaveType.includes(search) ||
//         empName.includes(search) ||
//         reason.includes(search) ||
//         status.includes(search);

//       const typeMatch =
//         filterLeaveType === "All" || leave.leaveName === filterLeaveType;

//       const statusMatch =
//         filterStatus === "All" || leave.status === filterStatus;

//       const leaveYear = leave.startDate
//         ? new Date(leave.startDate).getFullYear()
//         : null;

//       const yearMatch =
//         selectedYear === "" || leaveYear === Number(selectedYear);

//       const leaveMonth = leave.startDate
//         ? new Date(leave.startDate).getMonth() + 1
//         : null;

//       const monthMatch =
//         selectedMonth === "" || leaveMonth === Number(selectedMonth);

//       return searchMatch && typeMatch && statusMatch && yearMatch && monthMatch;
//     });

//   /* ---------------- PAGINATION ---------------- */

//   const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);

//   const paginatedRequests = filteredLeaves.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   /* ---------------- MODAL HANDLERS ---------------- */

//   const handleModalOpen = (leaveId) => {
//     setSelectedLeaveId(leaveId);
//     setIsCancelModalOpen(true);
//   };

//   const handleModalClose = () => {
//     setSelectedLeaveId(null);
//     setIsCancelModalOpen(false);
//     setIsCancelling(false);
//   };

//   const handleConfirmCancellation = async (reason) => {
//     if (!reason) {
//       toast.error("Reason is required");
//       return;
//     }

//     setIsCancelling(true);

//     try {
//       const res = await axios.post(
//         `${BASE_URL}/api/leave-revoke/revoke`,
//         {
//           leaveRequestId: selectedLeaveId,
//           reason: reason,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//         }
//       );

//       toast.success(res?.data?.message || "Leave revoked successfully");

//       handleModalClose();
//     } catch (err) {
//       toast.error(
//         err?.response?.data?.message || "Failed to revoke leave request"
//       );
//     } finally {
//       setIsCancelling(false);
//     }
//   };

//   /* ---------------- LOADING ---------------- */

//   if (loading) {
//     return (
//       <div className="text-center py-10 text-gray-600">
//         <LoadingSpinner text="Loading leave history..." />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="text-center py-10 text-red-500 font-semibold">
//         {error}
//       </div>
//     );
//   }

//   /* ---------------- UI ---------------- */

//   return (
//     <div className="w-6xl mx-auto px-6 py-8 bg-white rounded-lg shadow-md">

//       {/* FILTERS */}

//       <div className="flex flex-wrap gap-3 mb-5">

//         <input
//           type="text"
//           placeholder="Search..."
//           className="border px-3 py-2 rounded-lg text-sm"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//         />

//         <select
//           value={filterLeaveType}
//           onChange={(e) => setFilterLeaveType(e.target.value)}
//           className="border px-4 w-[160px] py-2 rounded-lg text-sm"
//         >
//           <option value="All">All Leave Types</option>

//           {leaveTypeOptions.map((type) => (
//             <option key={type.leaveTypeId} value={type.leaveName}>
//               {getLeaveLabel(type.leaveName)}
//             </option>
//           ))}
//         </select>

//         <select
//           value={filterStatus}
//           onChange={(e) => setFilterStatus(e.target.value)}
//           className="border px-3 w-[120px] py-2 rounded-lg text-sm"
//         >
//           <option value="All">All Status</option>

//           {statusOptions.map((status) => (
//             <option key={status}>{status}</option>
//           ))}
//         </select>

//         <select
//           value={selectedYear}
//           onChange={(e) => setSelectedYear(e.target.value)}
//           className="border px-3 w-[100px] py-2 rounded-lg text-sm"
//         >
//           <option value="">All Years</option>

//           {years.map((year) => (
//             <option key={year}>{year}</option>
//           ))}
//         </select>

//       </div>

//       {/* TABLE */}

//       {filteredLeaves.length > 0 ? (
//         <div className="overflow-x-auto border rounded-lg">

//           <table className="w-full text-sm">

//             <thead className="bg-blue-900 text-white">

//               <tr>
//                 <th className="p-3">Leave Type</th>
//                 <th className="p-3">Requested By</th>
//                 <th className="p-3">From</th>
//                 <th className="p-3">To</th>
//                 <th className="p-3">Days</th>
//                 <th className="p-3">Status</th>
//                 <th className="p-3">Reason</th>
//                 <th className="p-3">Comment</th>
//                 <th className="p-3">Approved By</th>
//                 <th className="p-3">Action</th>
//               </tr>

//             </thead>

//             <tbody>

//               {paginatedRequests.map((leave, index) => (

//                 <tr key={leave.leaveId || index} className="text-center border-b">

//                   <td className="p-3">
//                     {getLeaveLabel(
//                       leave.leaveType?.leaveName || leave.leaveName
//                     )}
//                   </td>

//                   <td className="p-3">
//                     {leave.employee?.fullName ||
//                       leave.employeeFullName ||
//                       "-"}
//                   </td>

//                   <td className="p-3">
//                     {leave.startDate
//                       ? new Date(leave.startDate).toLocaleDateString()
//                       : "-"}
//                   </td>

//                   <td className="p-3">
//                     {leave.endDate
//                       ? new Date(leave.endDate).toLocaleDateString()
//                       : "-"}
//                   </td>

//                   <td className="p-3">{leave.daysRequested}</td>

//                   <td className="p-3">
//                     <span
//                       className={`px-2 py-1 text-white rounded-full text-xs ${
//                         leave.status === "APPROVED"
//                           ? "bg-green-500"
//                           : leave.status === "REJECTED"
//                           ? "bg-red-500"
//                           : "bg-gray-500"
//                       }`}
//                     >
//                       {leave.status}
//                     </span>
//                   </td>

//                   <td className="p-3">
//                     <LeaveReasonCell reason={leave.reason} />
//                   </td>

//                   <td className="p-3">{leave.managerComment || "-"}</td>

//                   <td className="p-3">
//                     {leave.approvedBy || "-"}
//                   </td>

//                   <td className="p-3">

//                     {leave.status === "APPROVED" && (
//                       <button
//                         onClick={() => handleModalOpen(leave.leaveId)}
//                       >
//                         <XCircle className="text-orange-500 hover:text-orange-700" />
//                       </button>
//                     )}

//                   </td>

//                 </tr>

//               ))}

//             </tbody>

//           </table>

//         </div>
//       ) : (
//         <div className="flex justify-center items-center h-40">
//           <p className={Fonts.caption}>No leave history found</p>
//         </div>
//       )}

//       {/* PAGINATION */}

//       {totalPages > 1 && (
//         <Pagination
//           currentPage={currentPage}
//           totalPages={totalPages}
//           onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
//           onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
//         />
//       )}

//       {/* MODAL */}

//       <CancellationModal
//         title="Confirm Cancellation"
//         subtitle="Are you sure you want to cancel this leave?"
//         isOpen={isCancelModalOpen}
//         onCancel={handleModalClose}
//         onConfirm={handleConfirmCancellation}
//         isLoading={isCancelling}
//         confirmText="Confirm"
//         isRevoke={true}
//       />

//     </div>
//   );
// };

// export default LeaveHistory;

import React, { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../../../components/Pagination/pagination";
import { Fonts } from "../../../components/Fonts/Fonts";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { XCircle } from "lucide-react";
import CancellationModal from "./CancellationModal";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const LeaveHistory = ({ employeeId, refreshKey, setRefreshKey }) => {
  const [leaves, setLeaves] = useState([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  /* ---------------- FETCH LEAVE DATA ---------------- */

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [leaveResp, typesResp] = await Promise.all([
          axios.get(
            `${BASE_URL}/api/leave-requests/employee/${employeeId}/${selectedYear}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              withCredentials: true,
            },
          ),
          axios.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            withCredentials: true,
          }),
        ]);

        const leaveData = leaveResp.data?.data || [];
        setLeaves(Array.isArray(leaveData) ? leaveData : []);

        const regularLeaves = typesResp.data?.regular || [];
        const genderLeaves = typesResp.data?.genderBasedLeaves || [];
        setLeaveTypeOptions([...regularLeaves, ...genderLeaves]);
      } catch (err) {
        setError("Failed to fetch leave history.");
        toast.error("Failed to fetch leave history.");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) fetchData();
  }, [employeeId, refreshKey, selectedYear]);

  /* ---------------- FETCH LEAVE TYPES ---------------- */

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/leave/types`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setLeaveTypes(res.data || []);
      } catch {
        toast.error("Failed to load leave types.");
      }
    };

    fetchLeaveTypes();
  }, []);

  /* ---------------- RESET PAGE ON FILTER CHANGE ---------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLeaveType, filterStatus, selectedYear, selectedMonth]);

  /* ---------------- STATUS OPTIONS ---------------- */

  const statusOptions = Array.from(
    new Set(
      leaves
        .filter((l) => l.status?.toUpperCase() !== "PENDING")
        .map((l) => l.status)
        .filter(Boolean),
    ),
  );

  /* ---------------- LABEL HELPER ---------------- */

  const getLeaveLabel = (leaveName) => {
    if (!leaveName) return "-";
    const match = leaveTypes.find((lt) => lt.name === leaveName);
    return match ? match.label : leaveName.replace(/^L-/, "");
  };

  /* ---------------- FILTERING ---------------- */

  const filteredLeaves = leaves
    .filter((leave) => leave.status?.toUpperCase() !== "PENDING")
    .filter((leave) => {
      const leaveType = (leave.leaveName || "").toLowerCase();
      const empName = (
        leave.employee?.fullName ||
        leave.employeeFullName ||
        ""
      ).toLowerCase();
      const reason = (leave.reason || "").toLowerCase();
      const status = (leave.status || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      const searchMatch =
        !search ||
        leaveType.includes(search) ||
        empName.includes(search) ||
        reason.includes(search) ||
        status.includes(search);

      const typeMatch =
        filterLeaveType === "All" || leave.leaveName === filterLeaveType;

      const statusMatch =
        filterStatus === "All" || leave.status === filterStatus;

      const leaveYear = leave.startDate
        ? new Date(leave.startDate).getFullYear()
        : null;

      const yearMatch = !selectedYear || leaveYear === Number(selectedYear);

      const leaveMonth = leave.startDate
        ? new Date(leave.startDate).getMonth() + 1
        : null;

      const monthMatch = !selectedMonth || leaveMonth === Number(selectedMonth);

      return searchMatch && typeMatch && statusMatch && yearMatch && monthMatch;
    });

  /* ---------------- PAGINATION ---------------- */

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);

  const paginatedRequests = filteredLeaves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ---------------- MODAL HANDLERS ---------------- */

  const handleModalOpen = (leaveId) => {
    setSelectedLeaveId(leaveId);
    setIsCancelModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedLeaveId(null);
    setIsCancelModalOpen(false);
    setIsCancelling(false);
  };

  const handleConfirmCancellation = async (reason) => {
    if (!reason) {
      toast.error("Reason is required");
      return;
    }

    setIsCancelling(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/leave-revoke/revoke`,
        {
          leaveRequestId: selectedLeaveId,
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success(res?.data?.message || "Leave revoked successfully");

      handleModalClose();

      // 🔥 IMPORTANT: trigger refresh
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to revoke leave request",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  /* ---------------- UI STATES ---------------- */

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-600">
        <LoadingSpinner text="Loading leave history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500 font-semibold">
        {error}
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="w-6xl mx-auto px-6 py-8 bg-white rounded-lg shadow-md">
      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search..."
          className="border px-3 py-2 rounded-lg text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={filterLeaveType}
          onChange={(e) => setFilterLeaveType(e.target.value)}
          className="border px-4 w-[160px] py-2 rounded-lg text-sm"
        >
          <option value="All">All Leave Types</option>
          {leaveTypeOptions.map((type) => (
            <option key={type.leaveTypeId} value={type.leaveName}>
              {getLeaveLabel(type.leaveName)}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border px-3 w-[120px] py-2 rounded-lg text-sm"
        >
          <option value="All">All Status</option>
          {statusOptions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border px-3 w-[100px] py-2 rounded-lg text-sm"
        >
          <option value="">All Years</option>
          {years.map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border px-3 w-[140px] py-2 rounded-lg text-sm"
        >
          <option value="">All Months</option>

          {[
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ].map((month, index) => (
            <option key={index + 1} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      {filteredLeaves.length > 0 ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-3">Leave Type</th>
                <th className="p-3">Requested By</th>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Days</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Comment</th>
                <th className="p-3">Approved By</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRequests.map((leave, index) => (
                <tr
                  key={leave.leaveId || index}
                  className="text-center border-b"
                >
                  <td className="p-3">
                    {getLeaveLabel(
                      leave.leaveType?.leaveName || leave.leaveName,
                    )}
                  </td>

                  <td className="p-3">
                    {leave.employee?.fullName || leave.employeeFullName || "-"}
                  </td>

                  <td className="p-3">
                    {leave.startDate
                      ? new Date(leave.startDate).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="p-3">
                    {leave.endDate
                      ? new Date(leave.endDate).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="p-3">{leave.daysRequested}</td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-white rounded-full text-xs ${
                        leave.status === "APPROVED"
                          ? "bg-green-500"
                          : leave.status === "REJECTED"
                            ? "bg-red-500"
                            : "bg-gray-500"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </td>

                  <td className="p-3">{leave.reason || "-"}</td>

                  <td className="p-3">{leave.managerComment || "-"}</td>

                  <td className="p-3">{leave.approvedBy?.fullName || "-"}</td>

                  <td className="p-3">
                    {leave.status === "APPROVED" && (
                      <button onClick={() => handleModalOpen(leave.leaveId)}>
                        <XCircle className="text-orange-500 hover:text-orange-700" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex justify-center items-center h-40">
          <p className={Fonts.caption}>No leave history found</p>
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        />
      )}

      {/* MODAL */}
      <CancellationModal
        title="Confirm Cancellation"
        subtitle="Are you sure you want to cancel this leave?"
        isOpen={isCancelModalOpen}
        onCancel={handleModalClose}
        onConfirm={handleConfirmCancellation}
        isLoading={isCancelling}
        confirmText="Confirm"
        isRevoke={true}
      />
    </div>
  );
};

export default LeaveHistory;
