import { useAuth } from "../context/AuthContext";
import UserManagement from "../UserManagement/";

export default function UserManagementEntry() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") || user?.roles?.includes("Super_Admin");

  if (isAdmin) {
    return <UserManagement />;
  }
} 