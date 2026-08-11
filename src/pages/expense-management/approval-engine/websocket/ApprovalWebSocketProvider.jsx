import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Same shape as the existing Leave Management WebSocketProvider
 * (src/pages/leave_management/websockets/WebSocketProvider.jsx) - a separate connection, not a
 * shared one, because the Expense Management Service is its own independent Spring Boot process
 * (its own port in dev, its own /xms path in prod) with its own in-JVM STOMP broker. Two lightweight
 * WebSocket connections per browser tab is normal; there is no shared-broker infrastructure to
 * multiplex them through.
 *
 * Backend: ApprovalWebSocketConfig (STOMP+SockJS at /xms/ws) + ApprovalWebSocketAuthInterceptor
 * (JWT on CONNECT) + ApprovalWebSocketEventListener (pushes ApprovalDomainEvent to
 * /user/queue/report-updates and /user/queue/approval-queue-updates).
 */
const ApprovalWebSocketContext = createContext(null);
export const useApprovalWebSocket = () => useContext(ApprovalWebSocketContext);

export default function ApprovalWebSocketProvider({ children }) {
  const BASE_URL = (window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "http://localhost:8080").replace(/\/+$/, "");

  const clientRef = useRef(null);
  const listeners = useRef({});

  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const updateToken = (newToken) => setToken(newToken);

  const subscribe = useCallback((event, callback) => {
    if (!listeners.current[event]) listeners.current[event] = [];
    listeners.current[event].push(callback);
    return () => {
      listeners.current[event] = listeners.current[event]?.filter((cb) => cb !== callback);
    };
  }, []);

  const emitEvent = useCallback((event, payload) => {
    (listeners.current[event] || []).forEach((cb) => cb(payload));
  }, []);

  const parseBody = (body) => {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  };

  useEffect(() => {
    if (!token) {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      return;
    }

    const client = new Client({
      webSocketFactory: () => {
        const freshToken = localStorage.getItem("token");
        return new SockJS(`${BASE_URL}/xms/ws?token=${freshToken}`);
      },
      connectHeaders: {},
      beforeConnect: () => {
        const freshToken = localStorage.getItem("token");
        if (!freshToken) {
          client.deactivate();
          return;
        }
        client.connectHeaders = { Authorization: `Bearer ${freshToken}` };
      },
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        // Backend: messagingTemplate.convertAndSendToUser(report.getEmployeeId(), "/queue/report-updates", event)
        client.subscribe("/user/queue/report-updates", (msg) => {
          emitEvent("report-update", parseBody(msg.body));
        });
        // Backend: messagingTemplate.convertAndSendToUser(approverId, "/queue/approval-queue-updates", event)
        client.subscribe("/user/queue/approval-queue-updates", (msg) => {
          emitEvent("queue-update", parseBody(msg.body));
        });
      },

      onStompError: (frame) => {
        const msg = frame.headers?.message || "";
        const isAuthFailure = ["expired", "JWT", "Invalid", "Missing", "Unauthenticated"].some((k) => msg.includes(k));
        if (isAuthFailure) {
          client.deactivate();
          updateToken(null);
        }
        // Authorization-only failures (not authentication) are left alone - the session is
        // still valid, this specific destination just wasn't permitted.
      },

      onWebSocketError: () => {
        // Network-level error (server down, CORS) - @stomp/stompjs auto-reconnects via reconnectDelay.
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [token]);

  return (
    <ApprovalWebSocketContext.Provider value={{ subscribe, updateToken }}>
      {children}
    </ApprovalWebSocketContext.Provider>
  );
}
