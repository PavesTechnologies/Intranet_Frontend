import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import { Fonts } from "../../../../components/Fonts/Fonts";

const ROLES_PER_PAGE = 6;

function EditUserRoleModal({ user_uuId, onClose, axiosInstance, onSaved }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolePage, setRolePage] = useState(1);

  useEffect(() => {
    if (!user_uuId) return;

    let mounted = true;

    const loadData = async () => {
      setLoading(true);

      try {
        const [userRes, rolesRes, assignedRes] = await Promise.all([
          axiosInstance.get(`/admin/users/uuid/${user_uuId}`),
          axiosInstance.get(`/admin/roles`),
          axiosInstance.get(`/admin/users/uuid/${user_uuId}/roles`),
        ]);

        if (!mounted) return;

        setUser(userRes.data);

        const allRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
        setRoles(allRoles);

        let assignedIds = [];

        if (assignedRes.data?.roles && Array.isArray(assignedRes.data.roles)) {
          const roleNameToId = allRoles.reduce((acc, role) => {
            acc[role.role_name] = role.role_uuid;
            return acc;
          }, {});

          assignedIds = assignedRes.data.roles
            .map((roleName) => roleNameToId[roleName])
            .filter(Boolean);
        }

        setSelectedRoleIds(assignedIds);
      } catch (err) {
        console.error("Failed to load roles", err);
        showStatusToast("Unable to fetch user role data.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [user_uuId, axiosInstance]);

  const filteredRoles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return roles;

    return roles.filter((role) =>
      role.role_name?.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  const totalRolePages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ROLES_PER_PAGE)
  );

  const safeRolePage = Math.min(rolePage, totalRolePages);

  const paginatedRoles = filteredRoles.slice(
    (safeRolePage - 1) * ROLES_PER_PAGE,
    safeRolePage * ROLES_PER_PAGE
  );

  useEffect(() => {
    if (rolePage > totalRolePages) {
      setRolePage(totalRolePages);
    }
  }, [rolePage, totalRolePages]);

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    if (!user_uuId) return;

    setSaving(true);

    try {
      const response = await axiosInstance.put(
        `/admin/users/uuid/${user_uuId}/role`,
        { role_ids: selectedRoleIds }
      );

      const updatedRoleNames = roles
        .filter((role) => selectedRoleIds.includes(role.role_uuid))
        .map((role) => role.role_name);

      showStatusToast(
        response?.data?.message || "Roles updated successfully!",
        "success"
      );

      if (typeof onSaved === "function") {
        onSaved(updatedRoleNames);
      }

      onClose();
    } catch (err) {
      console.error("Failed to update roles", err);

      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Update failed.";

      showStatusToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit User Roles"
      subtitle={
        user
          ? `User: ${user.first_name || ""} ${user.last_name || ""}`.trim()
          : "Assign or remove roles for the selected user."
      }
      size="2xl"
      fullScreenMobile
      maxHeight="max-h-[92vh]"
      bodyClassName="p-0 overflow-hidden"
      scrollable={false}
      closeOnBackdrop={!saving}
      footer={
        !loading && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              variant="primary"
              loading={saving}
              loadingText="Saving..."
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Loading role data..." />
        </div>
      ) : (
        <div className="flex max-h-[calc(92vh-190px)] flex-col overflow-hidden">
          <div className="shrink-0 border-b border-gray-100 p-4 sm:p-5">
            <p className="text-sm text-gray-500">
              Select or deselect roles below.
            </p>

            <div className="mt-4">
              <SearchInput
                placeholder="Search roles..."
                onSearch={(val) => {
                  setSearchTerm(val || "");
                  setRolePage(1);
                }}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Showing {paginatedRoles.length} of {filteredRoles.length} role
                {filteredRoles.length !== 1 ? "s" : ""}
              </p>

              {filteredRoles.length > ROLES_PER_PAGE && (
                <p className="text-xs text-gray-400">
                  Page {safeRolePage} of {totalRolePages}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {paginatedRoles.length > 0 ? (
                paginatedRoles.map((role) => (
                  <label
                    key={role.role_uuid}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      selectedRoleIds.includes(role.role_uuid)
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.role_uuid)}
                      onChange={() => toggleRole(role.role_uuid)}
                      className="h-4 w-4 shrink-0 accent-[#0A0082]"
                    />

                    <span className="min-w-0 truncate text-sm font-medium text-gray-700">
                      {role.role_name}
                    </span>
                  </label>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm italic text-gray-400 sm:col-span-2">
                  No roles found.
                </div>
              )}
            </div>

            {filteredRoles.length > ROLES_PER_PAGE && (
              <div className="mt-4 flex justify-center border-t border-gray-100 pt-4">
                <Pagination
                  currentPage={safeRolePage}
                  totalPages={totalRolePages}
                  onPrevious={() =>
                    setRolePage((prev) => Math.max(prev - 1, 1))
                  }
                  onNext={() =>
                    setRolePage((prev) =>
                      Math.min(prev + 1, totalRolePages)
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}