import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

// AIRS backend is plain FastAPI WebSocket upgrade endpoints (one per
// resource: JD my-uploads, one per campaign board, one per resume task) —
// not a STOMP/SockJS broker like the leave-management/expense-management
// providers elsewhere in this repo. Each consumer gets its own small socket
// scoped to the component/hook that needs it, so this hook is intentionally
// not a shared Context provider.
const RECONNECT_DELAYS_MS = [1500, 3000, 6000, 10000];

// Per app/websocket/auth.py + router.py: the JWT is checked at connect time
// (?token=<JWT>), and the server closes an open socket when that token
// expires. Two server-side close codes matter:
//   1008 — auth/authz failure (missing/invalid/expired token, or the
//          connected user's role isn't permitted on this channel).
//          Retrying with the same token fails identically, so this does NOT
//          auto-reconnect - except "Token expired" on a live session when
//          the app has since stored a refreshed token: that one reconnects.
//   1011 — unexpected server error. Safe to retry with backoff, same as a
//          plain network drop.
const AUTH_FAILURE_CLOSE_CODE = 1008;
const TOKEN_EXPIRED_REASON = "Token expired";

const currentToken = () => localStorage.getItem("token") || "";

function buildAirsWsUrl(path) {
  const base = (window.__APP_CONFIG__?.AIRS_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return null;
  const wsBase = base.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));
  return `${wsBase}${path}?token=${encodeURIComponent(currentToken())}`;
}

// path: string | null|undefined — pass null/undefined until the resource id
// (campaign_id/task_id) this socket depends on is known; the hook no-ops.
// onEvent(message) is called with the parsed { event, timestamp, data }.
// onOpen() is called only on a *reconnect* (not the very first connect),
// so consumers can reconcile via their existing REST refetch after a drop.
export default function useAirsSocket(path, { onEvent, onOpen, enabled = true } = {}) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || !path) return undefined;

    let socket = null;
    let retryTimer = null;
    let attempt = 0;
    let closedByEffect = false;
    let authFailureNotified = false;
    let connectedToken = "";

    const connect = () => {
      const url = buildAirsWsUrl(path);
      if (!url) return;

      connectedToken = currentToken();
      socket = new WebSocket(url);

      socket.onopen = () => {
        if (attempt > 0) {
          onOpenRef.current?.();
        }
        attempt = 0;
      };

      socket.onmessage = (evt) => {
        let parsed;
        try {
          parsed = JSON.parse(evt.data);
        } catch {
          return;
        }
        onEventRef.current?.(parsed);
      };

      socket.onerror = () => {
        // Transport-level error; onclose fires right after and drives retry.
      };

      socket.onclose = (event) => {
        if (closedByEffect) return;

        if (event?.code === AUTH_FAILURE_CLOSE_CODE) {
          const tokenRefreshed = currentToken() && currentToken() !== connectedToken;
          if (event.reason === TOKEN_EXPIRED_REASON && tokenRefreshed) {
            attempt += 1; // so onopen runs the consumer's reconcile
            clearTimeout(retryTimer);
            retryTimer = setTimeout(connect, 0);
            return;
          }
          console.warn(`AIRS WS auth/authz failure on ${path} — not retrying.`);
          if (!authFailureNotified) {
            authFailureNotified = true;
            toast.warn("Live updates paused — please re-login to restore your session.");
          }
          return; // do not reconnect with the same (bad) token
        }

        const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
        attempt += 1;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      clearTimeout(retryTimer);
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [path, enabled]);
}
