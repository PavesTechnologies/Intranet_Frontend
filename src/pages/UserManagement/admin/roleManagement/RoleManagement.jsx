import { useEffect, useState } from "react";
import axios from "axios";
import RoleForm from "./RoleForm";
import PermissionManagement from "./PermissionManagement";
import PermissionGroupManagement from "./PermissionGroupManagement";
// import { getAllAccessPoints } from "../../../../services/roleManagementService";
import Navbar from "../../../../components/Navbar/Navbar";
import { showStatusToast } from "../../../../components/toastfy/toast";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  // const [accessPoints, setAccessPoints] = useState([]);
  const [activeTab, setActiveTab] = useState("roles");

  const token = localStorage.getItem("token");
  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/roles`,
        authHeader,
      );
      setRoles(res.data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      if (err.response?.status === 401) {
        showStatusToast("Session expired. Please log in again.", "error");
      }
    }
  };

  // const fetchAccessPoints = async () => {
  //   try {
  //     const res = await getAllAccessPoints();
  //     setAccessPoints(res.data);
  //   } catch (err) {
  //     console.error("Failed to fetch access points:", err);
  //   }
  // };

  useEffect(() => {
    fetchRoles();
    // fetchAccessPoints();
  }, []);

  const handleRoleUpdate = (updatedRoles) => {
    setRoles(updatedRoles);
  };

  const tabs = [
    { id: "roles", label: "Manage Roles", icon: "👥" },
    { id: "permissions", label: "View Permissions", icon: "🔐" },
    { id: "groups", label: "Permission Groups", icon: "📋" },
  ];

  const navItems = tabs.map((tab) => ({
    name: tab.label,
    onClick: () => setActiveTab(tab.id),
    isActive: activeTab === tab.id,
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar Section */}
      <div className="sticky top-0 z-30 bg-white shadow">
        <Navbar logo="Role Management" navItems={navItems} />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full mt-4">
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Manage Roles Section */}
          {activeTab === "roles" && (
            <div>
              <div className="mb-4"></div>
              <RoleForm
                roles={roles}
                setRoles={setRoles}
                onRoleUpdate={handleRoleUpdate}
                refreshRoles={fetchRoles}
              />
            </div>
          )}

          {/* Permission Management Section */}
          {activeTab === "permissions" && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Permission Management
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  View permissions assigned to each role
                </p>
              </div>

              {/* ✅ Updated to automatically show all permissions with search & pagination */}
              <PermissionManagement
                roles={roles}
                autoDisplayAll={true} // 👈 added flag for auto-display
              />
            </div>
          )}

          {/* Permission Group Management Section */}
          {activeTab === "groups" && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Permission Group Management
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage permission groups for roles
                </p>
              </div>
              <PermissionGroupManagement roles={roles} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
