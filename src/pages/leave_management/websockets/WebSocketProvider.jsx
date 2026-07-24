import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WebSocketContext = createContext(null);
export const useWebSocket = () => useContext(WebSocketContext);

export default function WebSocketProvider({ children }) {
  const BASE_URL = (
    window.__APP_CONFIG__?.BASE_URL ||
    window.__APP_CONFIG__?.API_BASE_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");

  const clientRef = useRef(null);
  const listeners = useRef({});

  // ✅ Token as state — when user logs in/out, this changes
  // and the useEffect re-runs, creating a fresh WebSocket connection
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // ─────────────────────────────────────────────────────────────────────
  // Expose setToken so your login/logout functions can trigger reconnect
  //
  // Usage in your login function:
  //   const { updateToken } = useWebSocket();
  //   updateToken(newToken);   ← call this after localStorage.setItem("token", ...)
  //
  // Usage in your logout function:
  //   updateToken(null);       ← call this after localStorage.removeItem("token")
  // ─────────────────────────────────────────────────────────────────────
  const updateToken = (newToken) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
    setToken(newToken);
  };

  // ─── Subscribe to a named event, returns an unsubscribe function ──────
  // ✅ Wrap in useCallback — stable reference, never causes extra effect runs
  const subscribe = useCallback((event, callback) => {
    if (!listeners.current[event]) listeners.current[event] = [];
    listeners.current[event].push(callback);

    return () => {
      listeners.current[event] = listeners.current[event]?.filter(
        (cb) => cb !== callback,
      );
    };
  }, []); // no deps — never recreated

  const emitEvent = useCallback((event, payload) => {
    (listeners.current[event] || []).forEach((cb) => cb(payload));
  }, []); // no deps — never recreated

  // ─── Safe JSON parse — never throws ──────────────────────────────────
  const parseBody = (body) => {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // MAIN WEBSOCKET EFFECT
  // Runs when token changes:
  //   - New user logs in  → token changes → new WS connection
  //   - User logs out     → token = null  → WS deactivated
  //   - Token refreshed   → token changes → WS reconnects with fresh token
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      console.warn("⚠️ No token — WebSocket will not connect");

      // Clean up any existing connection from previous user
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
        clientRef.current = null;
        console.log("🔌 Previous WebSocket deactivated (no token)");
      }
      return;
    }

    const client = new Client({
      // ✅ webSocketFactory reads fresh token on every connect attempt
      // This covers the initial connect AND every auto-reconnect
      webSocketFactory: () => {
        const freshToken = localStorage.getItem("token");
        return new SockJS(`${BASE_URL}/ws?token=${freshToken}`);
      },

      // Start empty — beforeConnect populates this before each attempt
      connectHeaders: {},

      // ✅ beforeConnect runs before EVERY connect attempt
      // (initial connect + every reconnect after a drop)
      // This is the correct place to inject fresh credentials
      beforeConnect: () => {
        const freshToken = localStorage.getItem("token");

        if (!freshToken) {
          console.warn("⚠️ No token in beforeConnect — stopping reconnect");
          client.deactivate();
          return;
        }

        // ✅ Always fresh — even if token was refreshed between reconnects
        client.connectHeaders = {
          Authorization: `Bearer ${freshToken}`,
        };
      },

      // Auto-reconnect after 5s on network drop
      // beforeConnect ensures fresh token on every attempt
      reconnectDelay: 5000,

      debug: () => {}, // Silence the console flood

      // ─────────────────────────────────────────────────────────────────
      // ON CONNECT — register all subscriptions
      //
      // NOTE: All subscriptions below use the canonical "/user/queue/*"
      // form. Spring rewrites this internally to "/user/{principal}/queue/*",
      // so each client only ever receives messages the server explicitly
      // targeted at them via convertAndSendToUser(...). This means:
      //   - No role-based gating is needed here anymore — a General-role
      //     employee subscribing to /user/queue/leave-requests will simply
      //     never receive anything unless the server sends *to them*
      //     specifically (i.e. they'd only get it if they were someone's
      //     manager and an event was sent to their own user id).
      //   - The old /topic/manager/leave-requests broadcast (which every
      //     connected manager received regardless of whose employee the
      //     event was about) has been replaced with a per-manager queue,
      //     matching backend's sendToUser(managerId, "/queue/leave-requests", event).
      // ─────────────────────────────────────────────────────────────────
      onConnect: () => {
        console.log("✅ WebSocket connected");

        // ── Personal: approve / reject ─────────────────────────────────────
        // Backend: template.convertAndSendToUser(employeeId, "/queue/data-updated", event)
        client.subscribe("/user/queue/data-updated", (msg) => {
          const data = parseBody(msg.body);
          console.log("📩 Personal update:", data.type);
          emitEvent("employee-update", data);
          // ↑ useLeaveWebSocket("employee-update", ["LEAVE_APPROVED","LEAVE_REJECTED"])
          //   in PendingLeaveRequests will now fire correctly
        });

        // ── Manager: apply / cancel / update (per-manager, not broadcast) ──
        // Backend: template.convertAndSendToUser(managerId, "/queue/leave-requests", event)
        // Only the manager the event is actually about receives this —
        // replaces the old /topic/manager/leave-requests broadcast.
        client.subscribe("/user/queue/leave-requests", (msg) => {
          const data = parseBody(msg.body);
          console.log("📢 Manager update:", data.type);
          emitEvent("manager-update", data);
          // ↑ useLeaveWebSocket("manager-update", ["LEAVE_APPLIED","LEAVE_CANCELLED","LEAVE_UPDATED"])
          //   in HandleLeaveRequestAndApprovals will fire correctly
        });

        // ── Manager: comp-off balance requests (per-manager, not broadcast) ─
        // Backend: template.convertAndSendToUser(managerId, "/queue/comp-off-balance", event)
        client.subscribe("/user/queue/comp-off-balance", (msg) => {
          const data = parseBody(msg.body);
          console.log("📢 Manager update:", data.type);
          emitEvent("manager-update", data);
          // ↑ useLeaveWebSocket("manager-update", ["COMPOFF_REQUESTED","COMPOFF_UPDATED","COMPOFF_REQUEST_CANCELLED"])
          //   in HandleLeaveRequestAndApprovals will fire correctly
        });

        // ── Employee: comp-off balance approve / reject ─────────────────────
        // Backend: template.convertAndSendToUser(employeeId, "/queue/comp-off-balance", event)
        client.subscribe("/user/queue/comp-off-balance-updates", (msg) => {
          const data = parseBody(msg.body);
          console.log("📢 Employee update:", data.type);
          emitEvent("employee-update", data);
          // ↑ useLeaveWebSocket("employee-update", ["COMPOFF_APPROVED","COMPOFF_REJECTED"])
          //   in CompOffBalanceRequests will fire correctly
        });

        // client.subscribe("/topic/leave-updated", (msg) => {
        //   const data = parseBody(msg.body);
        //   console.log("📢 Leave updated:", data.type);
        //   emitEvent("leave-updated", data);
        //   // This is a generic channel for any leave changes that might affect multiple views
        // });
      },

      // ─────────────────────────────────────────────────────────────────
      // ON STOMP ERROR — handle auth failures without infinite retry
      //
      // Distinguishes genuine authentication failures (bad/expired/missing
      // token — the session itself is invalid) from authorization failures
      // (valid session, but this particular subscribe/send isn't permitted).
      // Only the former should force logout; the latter should just be
      // logged, since forcing a logout on every authz mismatch would kick
      // users out repeatedly for something that isn't a token problem.
      // ─────────────────────────────────────────────────────────────────
      onStompError: (frame) => {
        const msg = frame.headers?.message || "";
        console.error("❌ STOMP error:", msg);

        const isAuthFailure = [
          "expired",
          "JWT",
          "Invalid",
          "Missing",
          "Unauthenticated",
        ].some((k) => msg.includes(k));

        const isAuthzFailure = [
          "Not authorized",
          "Forbidden destination",
          "restricted to /app/",
        ].some((k) => msg.includes(k));

        if (isAuthFailure) {
          console.error("❌ Auth failure — stopping WebSocket reconnect");
          client.deactivate();

          // Clear bad token — forces re-login
          // Comment this out if you handle token refresh separately
          updateToken(null);
        } else if (isAuthzFailure) {
          console.warn(
            "⚠️ Subscription/send not permitted for this user — leaving session intact:",
            msg,
          );
          // Do NOT deactivate and do NOT clear the token here — the
          // session itself is valid, this specific destination just
          // isn't allowed for this user.
        }
      },

      onDisconnect: () => {
        console.log("🔌 WebSocket disconnected — will auto-reconnect");
      },

      onWebSocketError: (error) => {
        // Network level error (server down, CORS, etc.)
        // @stomp/stompjs will auto-reconnect after reconnectDelay
        console.error("❌ WebSocket transport error:", error);
      },
    });

    clientRef.current = client;
    client.activate();

    // ─── Cleanup when token changes or component unmounts ────────────
    return () => {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
        clientRef.current = null;
        console.log("🔌 WebSocket deactivated (token changed or unmount)");
      }
    };
  }, [token]); // ← Re-runs when token changes = handles user switch correctly

  return (
    <WebSocketContext.Provider value={{ subscribe, updateToken }}>
      {children}
    </WebSocketContext.Provider>
  );
}




// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useRef,
//   useState,
// } from "react";
// import { useCallback } from "react";
// import { Client } from "@stomp/stompjs";
// import SockJS from "sockjs-client";

// const WebSocketContext = createContext(null);
// export const useWebSocket = () => useContext(WebSocketContext);

// export default function WebSocketProvider({ children }) {
//   const BASE_URL = (
//     window.__APP_CONFIG__?.BASE_URL ||
//     window.__APP_CONFIG__?.API_BASE_URL ||
//     "http://localhost:8080"
//   ).replace(/\/+$/, "");

//   const clientRef = useRef(null);
//   const listeners = useRef({});

//   // ✅ Token as state — when user logs in/out, this changes
//   // and the useEffect re-runs, creating a fresh WebSocket connection
//   const [token, setToken] = useState(() => localStorage.getItem("token"));

//   // ─────────────────────────────────────────────────────────────────────
//   // Expose setToken so your login/logout functions can trigger reconnect
//   //
//   // Usage in your login function:
//   //   const { updateToken } = useWebSocket();
//   //   updateToken(newToken);   ← call this after localStorage.setItem("token", ...)
//   //
//   // Usage in your logout function:
//   //   updateToken(null);       ← call this after localStorage.removeItem("token")
//   // ─────────────────────────────────────────────────────────────────────
//   const updateToken = (newToken) => {
//     if (newToken) {
//       localStorage.setItem("token", newToken);
//     } else {
//       localStorage.removeItem("token");
//     }
//     setToken(newToken);
//   };

//   // ─── Subscribe to a named event, returns an unsubscribe function ──────
//   // ✅ Wrap in useCallback — stable reference, never causes extra effect runs
//   const subscribe = useCallback((event, callback) => {
//     if (!listeners.current[event]) listeners.current[event] = [];
//     listeners.current[event].push(callback);

//     return () => {
//       listeners.current[event] = listeners.current[event]?.filter(
//         (cb) => cb !== callback,
//       );
//     };
//   }, []); // no deps — never recreated

//   const emitEvent = useCallback((event, payload) => {
//     (listeners.current[event] || []).forEach((cb) => cb(payload));
//   }, []); // no deps — never recreated

//   // ─── Safe JSON parse — never throws ──────────────────────────────────
//   const parseBody = (body) => {
//     try {
//       return JSON.parse(body);
//     } catch {
//       return body;
//     }
//   };

//   // ─────────────────────────────────────────────────────────────────────
//   // MAIN WEBSOCKET EFFECT
//   // Runs when token changes:
//   //   - New user logs in  → token changes → new WS connection
//   //   - User logs out     → token = null  → WS deactivated
//   //   - Token refreshed   → token changes → WS reconnects with fresh token
//   // ─────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!token) {
//       console.warn("⚠️ No token — WebSocket will not connect");

//       // Clean up any existing connection from previous user
//       if (clientRef.current?.active) {
//         clientRef.current.deactivate();
//         clientRef.current = null;
//         console.log("🔌 Previous WebSocket deactivated (no token)");
//       }
//       return;
//     }

//     const client = new Client({
//       // ✅ webSocketFactory reads fresh token on every connect attempt
//       // This covers the initial connect AND every auto-reconnect
//       webSocketFactory: () => {
//         const freshToken = localStorage.getItem("token");
//         return new SockJS(`${BASE_URL}/ws?token=${freshToken}`);
//       },

//       // Start empty — beforeConnect populates this before each attempt
//       connectHeaders: {},

//       // ✅ beforeConnect runs before EVERY connect attempt
//       // (initial connect + every reconnect after a drop)
//       // This is the correct place to inject fresh credentials
//       beforeConnect: () => {
//         const freshToken = localStorage.getItem("token");

//         if (!freshToken) {
//           console.warn("⚠️ No token in beforeConnect — stopping reconnect");
//           client.deactivate();
//           return;
//         }

//         // ✅ Always fresh — even if token was refreshed between reconnects
//         client.connectHeaders = {
//           Authorization: `Bearer ${freshToken}`,
//         };
//       },

//       // Auto-reconnect after 5s on network drop
//       // beforeConnect ensures fresh token on every attempt
//       reconnectDelay: 5000,

//       debug: () => {}, // Silence the console flood

//       // ─────────────────────────────────────────────────────────────────
//       // ON CONNECT — register all subscriptions
//       // ─────────────────────────────────────────────────────────────────
//       // onConnect: () => {
//       //   console.log("✅ WebSocket connected");

//       //   // ── Personal: approve / reject ─────────────────────────────────────
//       //   // Backend: template.convertAndSendToUser(userId, "/queue/data-updated", event)
//       //   // Confirmed by your STOMP log: destination:/user/queue/data-updated
//       //   client.subscribe("/user/queue/data-updated", (msg) => {
//       //     const data = parseBody(msg.body);
//       //     console.log("📩 Personal update:", data.type);
//       //     emitEvent("employee-update", data);
//       //     // ↑ useLeaveWebSocket("employee-update", ["LEAVE_APPROVED","LEAVE_REJECTED"])
//       //     //   in PendingLeaveRequests will now fire correctly
//       //   });

//       //   // ── Manager broadcast: apply / cancel / update ─────────────────────
//       //   // Backend: template.convertAndSend("/topic/manager/leave-requests", event)
//       //   client.subscribe("/topic/manager/leave-requests", (msg) => {
//       //     const data = parseBody(msg.body);
//       //     console.log("📢 Manager update:", data.type);
//       //     emitEvent("manager-update", data);
//       //     // ↑ useLeaveWebSocket("manager-update", ["LEAVE_APPLIED","LEAVE_CANCELLED","LEAVE_UPDATED"])
//       //     //   in HandleLeaveRequestAndApprovals will fire correctly
//       //   });

//       //   // --- Manager Broadcasr: on the employee compOff Balance
//       //     client.subscribe("/topic/manager/comp-off-balance", (msg) => {
//       //       const data = parseBody(msg.body);
//       //       console.log("📢 Manager update:", data.type);
//       //       emitEvent("manager-update", data);
//       //       // ↑ useLeaveWebSocket("manager-update", ["COMPOFF_REQUESTED","COMPOFF_UPDATED","COMPOFF_REQUEST_CANCELLED"])
//       //       //   in HandleLeaveRequestAndApprovals will fire correctly
//       //     });

//       //     client.subscribe("/user/queue/comp-off-balance", (msg) => {
//       //       const data = parseBody(msg.body);
//       //       console.log("📢 Employee update:", data.type);
//       //       emitEvent("employee-update", data);
//       //       // ↑ useLeaveWebSocket("employee-update", ["COMPOFF_APPROVED","COMPOFF_REJECTED"])
//       //       //   in CompOffBalanceRequests will fire correctly
//       //     });

//       //   // client.subscribe("/topic/leave-updated", (msg) => {
//       //   //   const data = parseBody(msg.body);
//       //   //   console.log("📢 Leave updated:", data.type);
//       //   //   emitEvent("leave-updated", data);
//       //   //   // This is a generic channel for any leave changes that might affect multiple views
//       //   // });
//       // },

//       onConnect: () => {
//   console.log("✅ WebSocket connected");

//   client.subscribe("/user/queue/data-updated", (msg) => { ... });
//   client.subscribe("/user/queue/comp-off-balance", (msg) => { ... });

//   // Decode roles from the current token (or pull from your auth/user context)
//   const payload = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
//   const roles = payload.roles || [];
//   const isManager = roles.some(r =>
//     ["Reporting_Manager", "HR", "Super_Admin"].includes(r)
//   );

//   if (isManager) {
//     client.subscribe("/topic/manager/leave-requests", (msg) => { ... });
//     client.subscribe("/topic/manager/comp-off-balance", (msg) => { ... });
//   }
// },

//       // ─────────────────────────────────────────────────────────────────
//       // ON STOMP ERROR — handle auth failures without infinite retry
//       // ─────────────────────────────────────────────────────────────────
//       onStompError: (frame) => {
//         const msg = frame.headers?.message || "";
//         console.error("❌ STOMP error:", msg);

//         // ✅ Stop reconnecting on auth errors — retrying won't help
//         if (
//           msg.includes("expired") ||
//           msg.includes("JWT") ||
//           msg.includes("Invalid") ||
//           msg.includes("Missing") ||
//           msg.includes("Unauthenticated")||
//           msg.includes("Not authorized") ||
//           msg.includes("Forbidden destination") ||
//           msg.includes("restricted to /app/")
//         ) {
//           console.error("❌ Auth failure — stopping WebSocket reconnect");
//           client.deactivate();

//           // Clear bad token — forces re-login
//           // Comment this out if you handle token refresh separately
//           updateToken(null);
//         }
//       },

//       onDisconnect: () => {
//         console.log("🔌 WebSocket disconnected — will auto-reconnect");
//       },

//       onWebSocketError: (error) => {
//         // Network level error (server down, CORS, etc.)
//         // @stomp/stompjs will auto-reconnect after reconnectDelay
//         console.error("❌ WebSocket transport error:", error);
//       },
//     });

//     clientRef.current = client;
//     client.activate();

//     // ─── Cleanup when token changes or component unmounts ────────────
//     return () => {
//       if (clientRef.current?.active) {
//         clientRef.current.deactivate();
//         clientRef.current = null;
//         console.log("🔌 WebSocket deactivated (token changed or unmount)");
//       }
//     };
//   }, [token]); // ← Re-runs when token changes = handles user switch correctly

//   return (
//     <WebSocketContext.Provider value={{ subscribe, updateToken }}>
//       {children}
//     </WebSocketContext.Provider>
//   );
// }
