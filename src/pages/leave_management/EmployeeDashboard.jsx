// File: src/pages/leave_management/EmployeeDashboard.jsx

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
import Button from "../../components/Button/Button";
import { useNavigate } from "react-router-dom";
// import Calendar from "./charts/Calendar";
import UpcomingHolidays from "./charts/UpcomingHolidays";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
// import { over } from "stompjs";
// import SockJS from "sockjs-client";

import { useWebSocket } from "./websockets/WebSocketProvider.jsx";
import { set } from "date-fns";

import { YearDropdown } from "./models/EmployeeLeaveBalances.jsx";

// let stompClient = null;

// This component now holds everything from the "Employee View"
const EmployeeDashboard = ({ employeeId }) => {
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  const [isCompOffModalOpen, setIsCompOffModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKeys, setrefreshKeys] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const onPendingRequestsChange = (newRequests) => {
    setPendingRequests(newRequests);
  };
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  // const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const userPermissions = user?.permissions || [];
  const compOffPageRef = useRef();
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  // const handleCompOffSubmit = async (modalData) => {
  //   console.log("Submitting comp-off request from EmployeeDashboard:", modalData);
  //   setIsLoading(true);
  //   let success = false;
  //   if (compOffPageRef.current) {
  //     success = await compOffPageRef.current.handleCompOffSubmit(modalData);
  //   }
  //   setIsLoading(false);
  //   return success;
  // };

  const handleCompOffSubmit = async (payload) => {
    console.log("Submitting comp-off request from EmployeeDashboard:", payload);
    setIsLoading(true);
    try {
      payload = { ...payload, employeeId };

      const res = await axios.post(`${BASE_URL}/api/compoff/request`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data.success) {
        toast.success(
          res?.data?.message || "Comp-Off request submitted successfully!"
        );
        setrefreshKeys((prev) => (typeof prev === "number" ? prev + 1 : 1));
        try {
          await fetchRequests();
        } catch (err) {
          toast.error(err?.message || "Failed to refresh requests.");
        }
        return true;
      } else {
        toast.error(res.data.message || "Failed to submit comp-off request.");
        return false;
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to submit comp-off request."
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // fetchRequests now wrapped in useCallback so it can be used by effects safely
  const inFlightRef = useRef(false); // prevents concurrent fetches / loops
  const isMountedRef = useRef(true);

  const fetchRequests = useCallback(async () => {
    // guard: don't run if no employeeId, or already fetching
    if (!employeeId) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      const res = await axios.get(
        `${BASE_URL}/api/compoff/employee/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (res.data && res.data.success) {
        const allRequests = Array.isArray(res.data.data) ? res.data.data : [];
        const pending = allRequests.filter((item) => item.status === "PENDING");

        if (isMountedRef.current) {
          setPendingRequests(pending);

          // Notify parent if callback exists
          if (onPendingRequestsChange) {
            onPendingRequestsChange(pending);
          }
        }
      } else {
        if (isMountedRef.current) {
          setPendingRequests([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch comp-off requests:", err);
    } finally {
      // small delay to avoid tight loops when multiple events arrive quickly
      setTimeout(() => {
        inFlightRef.current = false;
      }, 300);
    }
  }, [BASE_URL, employeeId]);

  // Use it in useEffect
  useEffect(() => {
    isMountedRef.current = true;
    fetchRequests();
    return () => {
      isMountedRef.current = false;
    };
  }, [employeeId, fetchRequests]);

  // ---------------------------
  // WEBSOCKET REAL-TIME LISTENER
  // ---------------------------
  // useEffect(() => {
  //   let isMounted = true;

  //   const socket = new SockJS(`${BASE_URL}/ws`);
  //   stompClient = over(socket);

  //   stompClient.connect(
  //     {},
  //     () => {
  //       console.log("Connected to WebSocket (EmployeeDashboard)");

  //       if (!isMounted) return;

  //       stompClient.subscribe("/topic/data-updated", () => {
  //         console.log("Update received → refreshing pending requests");
  //         fetchRequests(); // works now
  //       });
  //     },
  //     (error) => {
  //       console.error("WebSocket error:", error);
  //     }
  //   );

  //   return () => {
  //     isMounted = false;

  //     if (stompClient && stompClient.connected) {
  //       stompClient.disconnect(() =>
  //         console.log("WebSocket disconnected (cleanup)")
  //       );
  //     }
  //   };
  // }, []);

  useEffect(() => {
    if (!subscribe) return; // safety

    // Prevent multiple refresh calls
    const handleUpdate = () => {
      console.log("WS EVENT → refreshing pending requests");
      // setrefreshKeys((prev) => prev + 1);
      if (!inFlightRef.current) return; // already running → ignore

      if (!inFlightRef.current) {
        inFlightRef.current = true;

        fetchRequests().finally(() => {
          setTimeout(() => {
            inFlightRef.current = false;
          }, 800);
        });
      }
    };

    // subscribe for both events
    const unsub1 = subscribe("data-updated", handleUpdate);
    const unsub2 = subscribe("leave-update", handleUpdate);

    return () => {
      if (typeof unsub1 === "function") unsub1();
      if (typeof unsub2 === "function") unsub2();
    };
  }, [subscribe, fetchRequests, currentYear]);

  // const holidayData = axios.get(`${process.env.REACT_APP_API_URL}/api/holidays/all`)
  // .then((res)=> res.data).catch((err) => {
  //   console.error("Error fetching holiday data:", err);
  // });

  return (
    <>
      <div className="m-6 flex flex-col sm:flex-row sm:justify-end gap-2">
        <YearDropdown value={currentYear} onChange={setCurrentYear} />
        <ActionButtons
          onRequestLeave={() => setIsRequestLeaveModalOpen(true)}
          onRequestCompOff={() => setIsCompOffModalOpen(true)}
        />

        <button
          onClick={() => navigate(`/leave-policy`)}
          className="text-white rounded-xl font-semibold bg-indigo-900 hover:bg-indigo-800 text-xs px-3 "
        >
          Leave Policy
        </button>
      </div>
      <h2 className="text-small font-semibold m-4">Pending Leave Requests</h2>
      <div className="flex gap-4 flex-col md:flex-row">
        {/* Pending Leave Requests */}
        <div className="bg-white p-6 rounded-lg shadow-sm md:w-full lg:w-[65%]">
          <PendingLeaveRequests
            employeeId={employeeId}
            year={currentYear}
            refreshKey={refreshKeys}
          />
        </div>

        {/* Upcoming Holidays */}
        <div className="md:w-full lg:w-[35%]">
          <UpcomingHolidays 
            year={currentYear}
          />
        </div>
      </div>

      {/* <h2 className="text-small font-semibold m-4">
        Pending Comp-Off Requests
      </h2> */}
      {pendingRequests.length > 0 && (
        <>
          {/* <div className="bg-white rounded-lg shadow p-4 mb-6 w-[60%]"> */}
          {/* ✅ Only show CompOffPage if there are pending requests */}
          <CompOffPage
            ref={compOffPageRef}
            employeeId={employeeId}
            onPendingRequestsChange={setPendingRequests}
            refreshKey={refreshKeys}
          />

          {/* ✅ Only show the modal if it’s open
          {isCompOffModalOpen && (
            <CompOffRequestModal
              loading={isLoading}
              onSubmit={handleCompOffSubmit}
              onClose={() => setIsCompOffModalOpen(false)}
            />
          )} */}
          {/* </div> */}
        </>
      )}

      {isCompOffModalOpen && (
        <CompOffRequestModal
          loading={isLoading}
          onSubmit={handleCompOffSubmit}
          // onSuccess={() => setrefreshKeys((prev) => !prev)}
          onClose={() => setIsCompOffModalOpen(false)}
        />
      )}

      <h2 className="text-small font-semibold m-4">My Leave Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WeeklyPattern employeeId={employeeId} year={currentYear} refreshKey={refreshKeys} />
        <CustomActiveShapePieChart
          employeeId={employeeId}
          year={currentYear}
          refreshKey={refreshKeys}
        />
        <MonthlyStats employeeId={employeeId} year={currentYear} refreshKey={refreshKeys} />
      </div>

      <h2 className="text-small font-semibold m-4">Leave Balances</h2>
      <LeaveDashboard employeeId={employeeId} year={currentYear} refreshKey={refreshKeys} />

      <h2 className="text-small font-semibold m-4">Leave History</h2>
      <LeaveHistory employeeId={employeeId} refreshKey={refreshKeys} />

      <RequestLeaveModal
        isOpen={isRequestLeaveModalOpen}
        year={currentYear}
        onClose={() => setIsRequestLeaveModalOpen(false)}
        employeeId={employeeId}
        onSuccess={() => setrefreshKeys((prev) => !prev)} // Trigger refresh of pending leaves
      />

      {/* <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Calendar />
      </div> */}

      {/* <div className="m-6">
        <LeaveTypeCardExample />
      </div> */}

      {/* <div>
        <UpcomingHolidays />
      </div> */}
    </>
  );
};

export default EmployeeDashboard;