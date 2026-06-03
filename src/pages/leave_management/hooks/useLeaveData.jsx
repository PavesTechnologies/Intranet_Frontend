import { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import SockJS from "sockjs-client";
import { over } from "stompjs";

let stompClient = null;

const useLeaveData = (employeeId, refreshKey, year) => {
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = window.__APP_CONFIG__.BASE_URL;

  // ---------------------------
  // SHARED FUNCTION (used by both effects)
  // ---------------------------
  const fetchLeaveData = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `${BASE_URL}/api/leave-requests/employee/${employeeId}/${year}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const allLeaves = response.data?.data || [];
      const approvedLeaves = allLeaves.filter(
        (leave) => leave.status === "APPROVED" || leave.status === "PENDING",
      );

      setLeaveData(approvedLeaves);
      setError(null);
    } catch (err) {
      toast.error("Failed to fetch leave data");
      setError("Failed to fetch leave data");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // FETCH DATA INITIALLY + WHEN refreshKey CHANGES
  // ---------------------------
  useEffect(() => {
    if (employeeId) {
      fetchLeaveData();
    }
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
  //       console.log("Connected to WebSocket from Leave Data Hook");

  //       if (!isMounted) return;

  //       stompClient.subscribe("/topic/data-updated", () => {
  //         console.log("Real-time update received → refreshing leave data");
  //         fetchLeaveData(); // 🔥 Now works!
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

  return { leaveData, loading, error };
};

export default useLeaveData;
