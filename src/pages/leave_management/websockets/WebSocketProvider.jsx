import React, { createContext, useContext, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { over } from "stompjs";

const WebSocketContext = createContext(null);
export const useWebSocket = () => useContext(WebSocketContext);

export default function WebSocketProvider({ children }) {
  // 🛑 FIX 1: Safe fallback URL
  const BASE_URL =
    window.__APP_CONFIG__.BASE_URL ||
    window.__APP_CONFIG__.API_BASE_URL ||
    "http://localhost:8080";

  const stompClientRef = useRef(null);
  const listeners = useRef({});
  const lastEventTime = useRef(0);

  const subscribe = (event, callback) => {
    if (!listeners.current[event]) listeners.current[event] = [];
    listeners.current[event].push(callback);

    return () => {
      listeners.current[event] = listeners.current[event].filter(
        (cb) => cb !== callback,
      );
    };
  };

  const emitEvent = (event, payload) => {
    const now = Date.now();
    if (now - lastEventTime.current < 500) return; // rate limit

    lastEventTime.current = now;
    (listeners.current[event] || []).forEach((cb) => cb(payload));
  };

  useEffect(() => {
    try {
      // 🛑 FIX 2: Remove double slashes
      const wsUrl = `${BASE_URL.replace(/\/+$/, "")}/ws`;
      // console.log("Connecting WebSocket:", wsUrl);

      const socket = new SockJS(wsUrl);
      const stomp = over(socket);
      stompClientRef.current = stomp;

      stomp.connect(
        {},
        () => {
          // console.log("WS CONNECTED");

          stomp.subscribe("/topic/data-updated", (msg) =>
            emitEvent("data-updated", msg.body),
          );

          stomp.subscribe("/topic/leave-updated", (msg) =>
            emitEvent("leave-updated", msg.body),
          );

          stomp.subscribe("/topic/update-on-leaveRequestStatus", (msg) => {
            emitEvent("update-on-leaveRequestStatus", msg.body);
          });
        },
        (err) => {
          // 🛑 FIX 3: Do not crash React
          console.warn("WS connection failed (non-blocking)", err);
        },
      );
    } catch (err) {
      console.error("WS init error", err);
    }

    return () => {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.disconnect();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
