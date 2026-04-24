import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ roles = [], children }) {
  const { isAuthenticated, hasRole } = useAuth();

  // 🔐 If user not logged in → go to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 🔐 If roles provided and user doesn't have access → unauthorized
  if (roles.length > 0 && !hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Allowed
  return children;
}