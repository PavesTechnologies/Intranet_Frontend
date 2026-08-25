import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Accepts `roles` and `allowedRoles` as equivalent. Both spellings are in use
// across App.jsx; previously only `roles` was read, so every route declaring
// `allowedRoles` silently fell through to an authentication-only check with no
// role enforcement at all.
export default function ProtectedRoute({ roles = [], allowedRoles = [], children }) {
  const { isAuthenticated, hasRole } = useAuth();
  const required = roles.length > 0 ? roles : allowedRoles;

  // Not logged in → login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Logged in but lacking the role → unauthorized
  if (required.length > 0 && !hasRole(required)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}