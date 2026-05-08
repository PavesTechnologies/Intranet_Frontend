import { useEffect, useState, useCallback } from "react";
import axios from "axios";

import RoleForm from "./RoleForm";
import PermissionManagement from "./PermissionManagement";
import PermissionGroupManagement from "./PermissionGroupManagement";

import Navbar from "../../../../components/Navbar/Navbar";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState("roles");
  const [loadingRoles, setLoadingRoles] = useState(false);

  const token = localStorage.getItem("token");

  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);

      const res = await axios.get(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/roles`,
        authHeader
      );

      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);

      if (err.response?.status === 401) {
        showStatusToast("Session expired. Please log in again.", "error");
      } else {
        showStatusToast("Failed to fetch roles.", "error");
      }
    } finally {
      setLoadingRoles(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleRoleUpdate = (updatedRoles) => {
    setRoles(updatedRoles);
  };

  const tabs = [
    {
      id: "roles",
      label: "Manage Roles",
    },
    {
      id: "permissions",
      label: "View Permissions",
    },
    {
      id: "groups",
      label: "Permission Groups",
    },
  ];

  const navItems = tabs.map((tab) => ({
    name: tab.label,
    onClick: () => setActiveTab(tab.id),
    isActive: activeTab === tab.id,
  }));

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Navbar logo="Role Management" navItems={navItems} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h2 className={Fonts.heading3}>Role Management</h2>
          <p className={Fonts.paragraphMuted}>
            Manage roles, permissions, and permission groups.
          </p>
        </div>

        <section className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-gray-100 pb-4">
            <h3 className={Fonts.heading4}>{activeTabInfo?.label}</h3>

            {activeTab === "roles" && (
              <p className={Fonts.paragraphMuted}>
                Create, update, and manage system roles.
              </p>
            )}

            {activeTab === "permissions" && (
              <p className={Fonts.paragraphMuted}>
                View permissions assigned to each role.
              </p>
            )}

            {activeTab === "groups" && (
              <p className={Fonts.paragraphMuted}>
                Manage permission groups for roles.
              </p>
            )}
          </div>

          {loadingRoles ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16">
              <LoadingSpinner text="Loading roles..." />
            </div>
          ) : (
            <>
              {activeTab === "roles" && (
                <RoleForm
                  roles={roles}
                  setRoles={setRoles}
                  onRoleUpdate={handleRoleUpdate}
                  refreshRoles={fetchRoles}
                />
              )}

              {activeTab === "permissions" && (
                <PermissionManagement roles={roles} autoDisplayAll={true} />
              )}

              {activeTab === "groups" && (
                <PermissionGroupManagement roles={roles} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}