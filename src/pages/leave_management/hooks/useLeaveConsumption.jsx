import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import SockJS from "sockjs-client";
import { over } from "stompjs";

let stompClient = null;

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
    axios
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

  return { leaveData, loading };
};

export default useLeaveConsumption;
