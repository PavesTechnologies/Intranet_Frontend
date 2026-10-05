// src/api/sessionExpiry.js
//
// One-way bridge from the plain axios module into AuthContext. AuthProvider
// registers a handler on mount; the transport layer calls it when a session
// can no longer be renewed.
//
// This file imports nothing on purpose — that makes an import cycle between
// axiosInstance and AuthContext structurally impossible.

let handler = null;
let sessionDead = false;

export const setSessionExpiredHandler = (fn) => {
  handler = typeof fn === "function" ? fn : null;
};

// Called by login() so a fresh session re-arms the latch.
export const resetSessionExpiry = () => {
  sessionDead = false;
};

// Safe to call any number of times — only the first call per session is
// delivered. The latch is a flag rather than a timer because React Query is
// configured `retry: 2` (main.jsx), whose backoff lands a third attempt at
// ~3s — past any short time-based guard, which would fire a second logout.
export const notifySessionExpired = () => {
  if (sessionDead) return;
  sessionDead = true;

  if (handler) {
    handler();
    return;
  }

  // AuthProvider is not mounted (a 401 during the very first render, or after
  // teardown). Fall back to a hard reset onto the login route. basePath is the
  // Router basename, so this stays inside the SPA on a non-root deploy.
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("lastPath");
  localStorage.removeItem("isfirsttlogin");
  window.location.replace(window.__APP_CONFIG__?.basePath || "/");
};
