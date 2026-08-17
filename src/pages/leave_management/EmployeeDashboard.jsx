// // File: src/pages/leave_management/EmployeeDashboard.jsx

// import React, { useState, useRef, useEffect, useCallback } from "react";
// import WeeklyPattern from "./charts/WeeklyPattern";
// import MonthlyStats from "./charts/MonthlyStats";
// import RequestLeaveModal from "./models/RequestLeaveModal";
// import LeaveDashboard from "./charts/LeaveDashboard";
// import LeaveHistory from "./models/LeaveHistory";
// import CustomActiveShapePieChart from "./charts/CustomActiveShapePieChart";
// import PendingLeaveRequests from "./models/PendingLeaveRequests";
// import CompOffPage from "./models/CompOffPage";
// import ActionButtons from "./models/ActionButtons";
// import CompOffRequestModal from "./models/CompOffRequestModal";
// import Button from "../../components/Button/Button";
// import { useNavigate } from "react-router-dom";
// // import Calendar from "./charts/Calendar";
// import UpcomingHolidays from "./charts/UpcomingHolidays";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import axios from "axios";
// // import { over } from "stompjs";
// // import SockJS from "sockjs-client";

// import { useWebSocket } from "./websockets/WebSocketProvider.jsx";
// import { set } from "date-fns";

// import { YearDropdown } from "./models/EmployeeLeaveBalances.jsx";

// // let stompClient = null;

// // This component now holds everything from the "Employee View"
// const EmployeeDashboard = ({ employeeId }) => {
//   const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
//   const [isCompOffModalOpen, setIsCompOffModalOpen] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [refreshKeys, setrefreshKeys] = useState(false);
//   const [pendingRequests, setPendingRequests] = useState([]);
//   const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
//   const onPendingRequestsChange = (newRequests) => {
//     setPendingRequests(newRequests);
//   };
//   const BASE_URL = window.__APP_CONFIG__.BASE_URL;
//   // const token = localStorage.getItem("token");
//   const user = JSON.parse(localStorage.getItem("user"));
//   const userPermissions = user?.permissions || [];
//   const compOffPageRef = useRef();
//   const navigate = useNavigate();
//   const { subscribe } = useWebSocket();

//   // const handleCompOffSubmit = async (modalData) => {
//   //   console.log("Submitting comp-off request from EmployeeDashboard:", modalData);
//   //   setIsLoading(true);
//   //   let success = false;
//   //   if (compOffPageRef.current) {
//   //     success = await compOffPageRef.current.handleCompOffSubmit(modalData);
//   //   }
//   //   setIsLoading(false);
//   //   return success;
//   // };

//   const handleCompOffSubmit = async (payload) => {
//     console.log("Submitting comp-off request from EmployeeDashboard:", payload);
//     setIsLoading(true);
//     try {
//       payload = { ...payload, employeeId };

//       const res = await api.post(`${BASE_URL}/api/compoff/request`, payload, {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//       });
//       if (res.data.success) {
//         toast.success(
//           res?.data?.message || "Comp-Off request submitted successfully!",
//         );
//         setrefreshKeys((prev) => (typeof prev === "number" ? prev + 1 : 1));
//         try {
//           await fetchRequests();
//         } catch (err) {
//           toast.error(err?.message || "Failed to refresh requests.");
//         }
//         return true;
//       } else {
//         toast.error(res.data.message || "Failed to submit comp-off request.");
//         return false;
//       }
//     } catch (err) {
//       toast.error(
//         err?.response?.data?.message || "Failed to submit comp-off request.",
//       );
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // fetchRequests now wrapped in useCallback so it can be used by effects safely
//   const inFlightRef = useRef(false); // prevents concurrent fetches / loops
//   const isMountedRef = useRef(true);

//   const fetchRequests = useCallback(async () => {
//     // guard: don't run if no employeeId, or already fetching
//     if (!employeeId) return;
//     if (inFlightRef.current) return;

//     inFlightRef.current = true;
//     try {
//       const res = await api.get(
//         `${BASE_URL}/api/compoff/employee/${employeeId}`,
//         {
//           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//         },
//       );

//       if (res.data && res.data.success) {
//         const allRequests = Array.isArray(res.data.data) ? res.data.data : [];
//         const pending = allRequests.filter((item) => item.status === "PENDING");

//         if (isMountedRef.current) {
//           setPendingRequests(pending);

//           // Notify parent if callback exists
//           if (onPendingRequestsChange) {
//             onPendingRequestsChange(pending);
//           }
//         }
//       } else {
//         if (isMountedRef.current) {
//           setPendingRequests([]);
//         }
//       }
//     } catch (err) {
//       console.error("Failed to fetch comp-off requests:", err);
//     } finally {
//       // small delay to avoid tight loops when multiple events arrive quickly
//       setTimeout(() => {
//         inFlightRef.current = false;
//       }, 300);
//     }
//   }, [BASE_URL, employeeId]);

//   // Use it in useEffect
//   useEffect(() => {
//     isMountedRef.current = true;
//     fetchRequests();
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, [employeeId, fetchRequests]);

//   // ---------------------------
//   // WEBSOCKET REAL-TIME LISTENER
//   // ---------------------------
//   // useEffect(() => {
//   //   let isMounted = true;

//   //   const socket = new SockJS(`${BASE_URL}/ws`);
//   //   stompClient = over(socket);

//   //   stompClient.connect(
//   //     {},
//   //     () => {
//   //       console.log("Connected to WebSocket (EmployeeDashboard)");

//   //       if (!isMounted) return;

//   //       stompClient.subscribe("/topic/data-updated", () => {
//   //         console.log("Update received → refreshing pending requests");
//   //         fetchRequests(); // works now
//   //       });
//   //     },
//   //     (error) => {
//   //       console.error("WebSocket error:", error);
//   //     }
//   //   );

//   //   return () => {
//   //     isMounted = false;

//   //     if (stompClient && stompClient.connected) {
//   //       stompClient.disconnect(() =>
//   //         console.log("WebSocket disconnected (cleanup)")
//   //       );
//   //     }
//   //   };
//   // }, []);

//   useEffect(() => {
//     if (!subscribe) return;

//     const handleUpdate = (data) => {
//         console.log("WS EVENT received →", data);
//         // ✅ Just increment refreshKeys — this flows down as a prop
//         setrefreshKeys((prev) => prev + 1);
//     };

//     // ✅ Personal update — leave approved/rejected for THIS user
//     const unsub1 = subscribe("data-updated", handleUpdate);
    
//     // ✅ Broadcast update — if manager does something affecting all
//     const unsub2 = subscribe("leave-updated", handleUpdate);

//     return () => {
//         unsub1?.();
//         unsub2?.();
//     };
// }, [subscribe]); // ✅ Remove fetchRequests from deps — not needed here

//   // const holidayData = api.get(`${process.env.REACT_APP_API_URL}/api/holidays/all`)
//   // .then((res)=> res.data).catch((err) => {
//   //   console.error("Error fetching holiday data:", err);
//   // });

//   return (
//     <>
//       <div className="m-6 flex flex-col sm:flex-row sm:justify-end gap-2">
//         <YearDropdown value={currentYear} onChange={setCurrentYear} />
//         <ActionButtons
//           onRequestLeave={() => setIsRequestLeaveModalOpen(true)}
//           onRequestCompOff={() => setIsCompOffModalOpen(true)}
//         />

//         <button
//           onClick={() => navigate(`/leave-policy`)}
//           className="text-white rounded-xl font-semibold bg-indigo-900 hover:bg-indigo-800 text-xs px-3 "
//         >
//           Leave Policy
//         </button>
//       </div>
//       <h2 className="text-small font-semibold m-4">Pending Leave Requests</h2>
//       <div className="flex gap-4 flex-col md:flex-row">
//         {/* Pending Leave Requests */}
//         <div className="bg-white p-6 rounded-lg shadow-sm md:w-full lg:w-[65%]">
//           <PendingLeaveRequests
//             employeeId={employeeId}
//             year={currentYear}
//             refreshKey={refreshKeys}
//           />
//         </div>

//         {/* Upcoming Holidays */}
//         <div className="md:w-full lg:w-[35%]">
//           <UpcomingHolidays year={currentYear} />
//         </div>
//       </div>

//       {/* <h2 className="text-small font-semibold m-4">
//         Pending Comp-Off Requests
//       </h2> */}
//       {pendingRequests.length > 0 && (
//         <>
//           {/* <div className="bg-white rounded-lg shadow p-4 mb-6 w-[60%]"> */}
//           {/* ✅ Only show CompOffPage if there are pending requests */}
//           <CompOffPage
//             ref={compOffPageRef}
//             employeeId={employeeId}
//             onPendingRequestsChange={setPendingRequests}
//             refreshKey={refreshKeys}
//           />

//           {/* ✅ Only show the modal if it’s open
//           {isCompOffModalOpen && (
//             <CompOffRequestModal
//               loading={isLoading}
//               onSubmit={handleCompOffSubmit}
//               onClose={() => setIsCompOffModalOpen(false)}
//             />
//           )} */}
//           {/* </div> */}
//         </>
//       )}

//       {isCompOffModalOpen && (
//         <CompOffRequestModal
//           loading={isLoading}
//           onSubmit={handleCompOffSubmit}
//           // onSuccess={() => setrefreshKeys((prev) => !prev)}
//           onClose={() => setIsCompOffModalOpen(false)}
//         />
//       )}

//       <h2 className="text-small font-semibold m-4">My Leave Stats</h2>
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <WeeklyPattern
//           employeeId={employeeId}
//           year={currentYear}
//           refreshKey={refreshKeys}
//         />
//         <CustomActiveShapePieChart
//           employeeId={employeeId}
//           year={currentYear}
//           refreshKey={refreshKeys}
//         />
//         <MonthlyStats
//           employeeId={employeeId}
//           year={currentYear}
//           refreshKey={refreshKeys}
//         />
//       </div>

//       <h2 className="text-small font-semibold m-4">Leave Balances</h2>
//       <LeaveDashboard
//         employeeId={employeeId}
//         year={currentYear}
//         refreshKey={refreshKeys}
//       />

//       <h2 className="text-small font-semibold m-4">Leave History</h2>
//       <LeaveHistory employeeId={employeeId} refreshKey={refreshKeys} />

//       <RequestLeaveModal
//         isOpen={isRequestLeaveModalOpen}
//         year={currentYear}
//         onClose={() => setIsRequestLeaveModalOpen(false)}
//         employeeId={employeeId}
//         onSuccess={() => setrefreshKeys((prev) => !prev)} // Trigger refresh of pending leaves
//       />

//       {/* <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//         <Calendar />
//       </div> */}

//       {/* <div className="m-6">
//         <LeaveTypeCardExample />
//       </div> */}

//       {/* <div>
//         <UpcomingHolidays />
//       </div> */}
//     </>
//   );
// };

// export default EmployeeDashboard;




import React, { useState, useRef, useEffect, useCallback } from "react";
import WeeklyPattern from "./charts/WeeklyPattern";
import MonthlyStats from "./charts/MonthlyStats";
import RequestLeaveModal from "./models/RequestLeaveModal";
import LeaveDashboard from "./charts/LeaveDashboard";
import LeaveHistory from "./models/LeaveHistory";
import CustomActiveShapePieChart from "./charts/CustomActiveShapePieChart";
import PendingLeaveRequests from "./models/PendingLeaveRequests";
import CompOffPage from "./models/CompOffPage";
import ActionButtons from "./models/ActionButtons";
import CompOffRequestModal from "./models/CompOffRequestModal";
import UpcomingHolidays from "./charts/UpcomingHolidays";
import { YearDropdown } from "./models/EmployeeLeaveBalances.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Button from "../../components/Button/Button.jsx";
import { PageCard, PageCardContent } from "../../components/Cards/PageCard";
import FilterListbox from "../../components/filter/FilterListbox.jsx";

const EmployeeDashboard = ({ employeeId }) => {
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  const [isCompOffModalOpen, setIsCompOffModalOpen]           = useState(false);
  const [isLoading, setIsLoading]                             = useState(false);
  const [pendingRequests, setPendingRequests]                 = useState([]);
  const [currentYear, setCurrentYear]                         = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0); 

  const handleLeaveSuccess = () => {
    fetchRequests();
    setRefreshKey((prev) => prev + 1);
  };

  const BASE_URL      = window.__APP_CONFIG__.BASE_URL;
  const user          = JSON.parse(localStorage.getItem("user"));
  const compOffPageRef = useRef();
  const navigate      = useNavigate();

  // ─── Stable callback — wrapped in useCallback so it never changes reference
  const handlePendingRequestsChange = useCallback((newRequests) => {
    setPendingRequests(newRequests);
  }, []); // no deps → created once → no re-render loops

  // ─── CompOff fetch — only for the CompOffPage section ────────────────
  const inFlightRef  = useRef(false);
  const isMountedRef = useRef(true);

  const fetchRequests = useCallback(async () => {
    if (!employeeId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await api.get(
        `${BASE_URL}/api/compoff/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (res.data?.success && isMountedRef.current) {
        const pending = (res.data.data || []).filter(i => i.status === "PENDING");
        setPendingRequests(pending);
      } else if (isMountedRef.current) {
        setPendingRequests([]);
      }
    } catch (err) {
      console.error("Failed to fetch comp-off requests:", err);
    } finally {
      setTimeout(() => { inFlightRef.current = false; }, 300);
      // console.log("RefreshKey after fetch:", refreshKey);
    }
  }, [BASE_URL, employeeId]); // stable — only changes if employeeId/BASE_URL changes

  useEffect(() => {
    isMountedRef.current = true;
    fetchRequests();
    return () => { isMountedRef.current = false; };
  }, [fetchRequests]);

  // ─── CompOff submit ───────────────────────────────────────────────────
  const handleCompOffSubmit = async (payload) => {
    setIsLoading(true);
    try {
      // If CompOffPage is already mounted, submit through it so its own
      // requests/table state (which the table actually reads) refreshes too.
      if (compOffPageRef.current?.handleCompOffSubmit) {
        return await compOffPageRef.current.handleCompOffSubmit(payload);
      }

      // CompOffPage isn't mounted yet (no pending requests) — submit directly
      // and let fetchRequests() bring it up.
      const res = await api.post(
        `${BASE_URL}/api/compoff/request`,
        { ...payload, employeeId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message || "Comp-Off request submitted!");
        await fetchRequests();
        return true;
      }
      toast.error(res.data.message || "Failed to submit.");
      return false;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // ✅ NO WebSocket logic here at all
  // ✅ NO refreshKeys state
  // ✅ NO subscribe() call
  //
  // Each child component manages its OWN subscription and refresh
  // via the useLeaveWebSocket hook
  // ─────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="m-6 flex flex-col sm:flex-row sm:justify-end gap-2">
        <YearDropdown value={currentYear} onChange={setCurrentYear} />
        <ActionButtons
          onRequestLeave={() => setIsRequestLeaveModalOpen(true)}
          onRequestCompOff={() => setIsCompOffModalOpen(true)}
        />
        <Button
          variant="primary"
          size="small"
          onClick={() => navigate("/leave-policy")}
        >
          Leave Policy
        </Button>
      </div>

      <div className="flex gap-4 flex-col md:flex-row">
        <div className="md:w-full lg:w-[65%]">
          <PageCard title="Pending Leave Requests">
            <PageCardContent className="p-6">
              {/* ✅ No refreshKey prop — PendingLeaveRequests owns its own WS subscription */}
              <PendingLeaveRequests
                employeeId={employeeId}
                year={currentYear}
                onLeaveCancel={() => setRefreshKey(prev => prev + 1)} // child can trigger refresh when a leave is cancelled
                refresh={pendingRequests} // can be used by child to trigger manual refresh if needed
              />
            </PageCardContent>
          </PageCard>
        </div>
        <div className="md:w-full lg:w-[35%]">
          <UpcomingHolidays year={currentYear} />
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <CompOffPage
          ref={compOffPageRef}
          employeeId={employeeId}
          onPendingRequestsChange={handlePendingRequestsChange} // ✅ stable ref
        />
      )}

      {isCompOffModalOpen && (
        <CompOffRequestModal
          loading={isLoading}
          onSubmit={handleCompOffSubmit}
          onClose={() => setIsCompOffModalOpen(false)}
          onSuccess={fetchRequests} // ✅ only refreshes compoff section
        />
      )}

      <h2 className="text-small font-semibold m-4">My Leave Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ✅ No refreshKey — each owns its own WS subscription */}
        <WeeklyPattern employeeId={employeeId} year={currentYear} refreshKey={refreshKey} />
        <CustomActiveShapePieChart employeeId={employeeId} year={currentYear} refreshKey={refreshKey} />
        <MonthlyStats employeeId={employeeId} year={currentYear} refreshKey={refreshKey} />
      </div>

      <h2 className="text-small font-semibold m-4">Leave Balances</h2>
      {/* ✅ No refreshKey — LeaveDashboard subscribes to "employee-update" directly */}
      <LeaveDashboard employeeId={employeeId} year={currentYear} refreshKey={refreshKey} />

      <h2 className="text-small font-semibold m-4">Leave History</h2>
      {/* ✅ No refreshKey — LeaveHistory subscribes to "employee-update" directly */}
      <LeaveHistory employeeId={employeeId} year={currentYear} />

      <RequestLeaveModal
        isOpen={isRequestLeaveModalOpen}
        year={currentYear}
        onClose={() => setIsRequestLeaveModalOpen(false)}
        employeeId={employeeId}
        onSuccess={handleLeaveSuccess} // ✅ only refreshes compoff section
      />
    </>
  );
};

export default EmployeeDashboard;