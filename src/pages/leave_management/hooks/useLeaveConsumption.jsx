import { useCallback, useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import { useLeaveWebSocket } from "../websockets/useLeaveWebSocket";

// ✅ Outside component — stable, never recreated
const BALANCE_AFFECTING_EVENTS = [
  "COMPOFF_APPROVED",
  "COMPOFF_REJECTED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "REVOKE_APPROVED",
  "REVOKE_REJECTED",
];

const useLeaveConsumption = (employeeId, refreshKey, year) => {
  const [leaveData, setLeaveData] = useState({
    regular: [],
    genderBasedLeaveBalances: [],
  });
  const [loading, setLoading] = useState(true);

  const BASE_URL = window.__APP_CONFIG__.BASE_URL;

  // ---------------------------
  // FUNCTION TO FETCH LEAVE DATA
  // ---------------------------
  const fetchLeaveData = () => {
    if (!employeeId) return;

    setLoading(true);
    api
      .get(`${BASE_URL}/api/leave-balance/employee/${employeeId}/${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        // console.log(res.data);
        setLeaveData(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to fetch leave data");
        setLoading(false);
      });
  };

  // ---------------------------
  // FETCH DATA ON MOUNT & WHEN REFRESH KEY CHANGES
  // ---------------------------
  useEffect(() => {
    fetchLeaveData();
  }, [employeeId, refreshKey, year]);

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
  //       console.log("Connected to WebSocket from Leave Consumption Hook");

  //       if (!isMounted) return;

  //       stompClient.subscribe("/topic/data-updated", () => {
  //         console.log("Real-time update received → refreshing leave data");
  //         fetchLeaveData();
  //       });
  //     },
  //     (error) => {
  //       console.error("WebSocket Connection Error:", error);
  //     }
  //   );

  //   return () => {
  //     isMounted = false;

  //     if (stompClient && stompClient.connected) {
  //       stompClient.disconnect(() =>
  //         console.log("WebSocket Disconnected (safe cleanup)")
  //       );
  //     }
  //   };
  // }, []);

  // ---------------------------
  // WEBSOCKET REAL-TIME LISTENER
  // ---------------------------
  // Balances change when a manager approves/rejects a leave or comp-off
  // request, or approves/rejects a revoke — refresh in real time.
  // Channel: "employee-update" (manager sends personal notification to employee)
  useLeaveWebSocket(
    "employee-update",
    BALANCE_AFFECTING_EVENTS,
    fetchLeaveData,
  );

  return { leaveData, loading };
};

export default useLeaveConsumption;
