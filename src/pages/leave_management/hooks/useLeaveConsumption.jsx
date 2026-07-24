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
  "LEAVE_CANCELLED",
  "COMPOFF_CANCELLED",
  "REVOKE_CANCELLED",
  "LEAVE_UPDATED",
  "COMPOFF_UPDATED",
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
  // ✅ Wrapped in useCallback — stable reference for useLeaveWebSocket
  const fetchLeaveData = useCallback(() => {
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
  }, [BASE_URL, employeeId, year]);
  // ↑ stable — only changes if employeeId/year/BASE_URL change

  // ---------------------------
  // FETCH DATA ON MOUNT & WHEN REFRESH KEY CHANGES
  // ---------------------------
  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData, refreshKey]);

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
