import { useEffect, useMemo, useState, useCallback } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import axios from "axios";

import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import SearchInput from "../../../../components/filter/Searchbar";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { Fonts } from "../../../../components/Fonts/Fonts";

const ITEMS_PER_PAGE = 5;
const MANDATORY_ROLES = ["Admin", "Super Admin", "HR", "General"];

export default function RoleForm({
  roles,
  setRoles,
  onRoleUpdate,
  refreshRoles,
}) {
  const [localRoles, setLocalRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [editRole, setEditRole] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedRoleUuids, setSelectedRoleUuids] = useState([]);
  const [bulkDeletingRoles, setBulkDeletingRoles] = useState(false);

  const token = localStorage.getItem("token") || "";

  const axiosInstance = useMemo(() => {
    return axios.create({
      baseURL: window.__APP_CONFIG__.USER_MANAGEMENT_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }, [token]);

  useEffect(() => {
    setLocalRoles(roles || []);
    setFilteredRoles(roles || []);
  }, [roles]);

  useEffect(() => {
    const filtered = searchTerm
      ? localRoles.filter((role) =>
          role.role_name?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : localRoles;

    setFilteredRoles(filtered);
    setCurrentPage(1);
    setSelectedRoleUuids([]);
  }, [searchTerm, localRoles]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ITEMS_PER_PAGE),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRoles = filteredRoles.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const showToast = (message, type) => {
    showStatusToast(message, type);
  };

  const syncRoles = (latestRoles) => {
    setLocalRoles(latestRoles);
    setFilteredRoles(latestRoles);

    if (setRoles) setRoles(latestRoles);
    if (onRoleUpdate) onRoleUpdate(latestRoles);
  };

  const fetchRoles = async (options = {}) => {
    const { afterDelete = false } = options;

    setLoading(true);

    try {
      const res = await axiosInstance.get("/admin/roles");
      const latestRoles = Array.isArray(res.data) ? res.data : [];

      syncRoles(latestRoles);

      if (afterDelete) {
        const filteredAfterDelete = searchTerm
          ? latestRoles.filter((role) =>
              role.role_name?.toLowerCase().includes(searchTerm.toLowerCase()),
            )
          : latestRoles;

        const newTotalPages = Math.max(
          1,
          Math.ceil(filteredAfterDelete.length / ITEMS_PER_PAGE),
        );

        setCurrentPage((prev) => Math.min(prev, newTotalPages));
      }
    } catch (err) {
      console.error("Error fetching roles", err);
      showToast("Failed to load roles", "error");
    } finally {
      setLoading(false);
    }
  };

  const validateRoleName = (roleName) => {
    if (!roleName.trim()) {
      showToast("Role name cannot be empty", "error");
      return false;
    }

    const regex = /^[A-Za-z\s\-_]+$/;

    if (!regex.test(roleName.trim())) {
      showToast(
        "Role name can only contain letters, spaces, hyphens, and underscores",
        "error",
      );
      return false;
    }

    return true;
  };

  const handleAddRole = async () => {
    if (!validateRoleName(newRoleName)) return;

    setSaving(true);

    try {
      const res = await axiosInstance.post("/admin/roles", {
        role_name: newRoleName.trim(),
      });

      if (res.status === 201 || res.status === 200) {
        showToast("Role created successfully!", "success");
        setAddModalOpen(false);
        setNewRoleName("");
        await fetchRoles();
        if (refreshRoles) refreshRoles();
      }
    } catch (err) {
      console.error("Error creating role", err);

      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to create role";

      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = async () => {
    if (!validateRoleName(editRole?.role_name || "")) return;

    if (MANDATORY_ROLES.includes(editRole.original_name)) {
      showToast(
        `Role '${editRole.original_name}' is mandatory and cannot be renamed`,
        "error",
      );
      setEditModalOpen(false);
      return;
    }

    setSaving(true);

    try {
      const res = await axiosInstance.put(
        `/admin/roles/uuid/${editRole.role_uuid}`,
        { role_name: editRole.role_name.trim() },
      );

      if (res.status === 200) {
        showToast("Role updated successfully!", "success");
        setEditModalOpen(false);
        setEditRole(null);
        await fetchRoles();
        if (refreshRoles) refreshRoles();
      }
    } catch (err) {
      console.error("Error updating role", err);

      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to update role";

      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleCheckboxChange = (roleUuid) => {
    setSelectedRoleUuids((prev) =>
      prev.includes(roleUuid)
        ? prev.filter((id) => id !== roleUuid)
        : [...prev, roleUuid],
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageUuids = paginatedRoles.map((role) => role.role_uuid);

    const allSelected = currentPageUuids.every((id) =>
      selectedRoleUuids.includes(id),
    );

    if (allSelected) {
      setSelectedRoleUuids((prev) =>
        prev.filter((id) => !currentPageUuids.includes(id)),
      );
    } else {
      setSelectedRoleUuids((prev) => [
        ...new Set([...prev, ...currentPageUuids]),
      ]);
    }
  };

  const clearSelectedRoles = () => {
    setSelectedRoleUuids([]);
  };

  const handleBulkDeleteRoles = async () => {
    if (selectedRoleUuids.length === 0) {
      showToast("Please select at least one role.", "warning");
      return false;
    }

    setBulkDeletingRoles(true);

    try {
      const res = await axiosInstance.delete("/admin/roles/bulk-delete", {
        data: {
          role_uuids: selectedRoleUuids,
        },
      });

      const deletedCount = res?.data?.deleted_count || 0;
      const failedRoles = res?.data?.failed_roles || [];

      if (deletedCount > 0 && failedRoles.length === 0) {
        showToast(`${deletedCount} role(s) deleted successfully.`, "success");
      } else if (deletedCount > 0 && failedRoles.length > 0) {
        showToast(
          `${deletedCount} role(s) deleted. ${failedRoles.length} failed.`,
          "warning",
        );
      } else {
        showToast("No roles were deleted.", "error");
      }

      setSelectedRoleUuids([]);
      await fetchRoles({ afterDelete: true });

      if (refreshRoles) refreshRoles();

      return true;
    } catch (err) {
      console.error("Error bulk deleting roles", err);

      const detail = err?.response?.data?.detail;

      if (typeof detail === "object") {
        showToast(detail.message || "Failed to delete roles", "error");
      } else {
        showToast(
          detail || err?.response?.data?.message || "Failed to delete roles",
          "error",
        );
      }

      return false;
    } finally {
      setBulkDeletingRoles(false);
    }
  };

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
  }, []);

  const isCurrentPageFullySelected =
    paginatedRoles.length > 0 &&
    paginatedRoles.every((role) => selectedRoleUuids.includes(role.role_uuid));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={Fonts.heading3}>Role Management</h2>
          <p className={Fonts.paragraphMuted}>
            Create, edit, select, and bulk delete roles.
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          variant="primary"
          size="medium"
          className="w-full sm:w-auto"
        >
          <Plus size={16} />
          Add Role
        </Button>
      </div>

      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setNewRoleName("");
        }}
        title="Add New Role"
        subtitle="Create a new role using letters, spaces, hyphens, or underscores."
        className="!mt-16 !max-h-[calc(100vh-8rem)] overflow-y-auto"
      >
        <div className="space-y-5">
          <FormInput
            label="Role Name"
            name="role_name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="e.g., Project_Manager"
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAddModalOpen(false);
                setNewRoleName("");
              }}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              onClick={handleAddRole}
              loading={saving}
              loadingText="Saving..."
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Add Role
            </Button>
          </div>
        </div>
      </Modal>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className={Fonts.heading4}>Existing Roles</h3>
            <p className={Fonts.paragraphMuted}>
              {filteredRoles.length} role(s) found.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
            {selectedRoleUuids.length > 0 && (
              <Button
                variant="danger"
                size="medium"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={bulkDeletingRoles}
                className="w-full justify-center sm:w-auto"
              >
                <Trash2 size={16} />
                Delete Selected ({selectedRoleUuids.length})
              </Button>
            )}

            <div className="w-full sm:min-w-[320px] lg:w-[420px]">
              <SearchInput
                onSearch={handleSearch}
                delay={300}
                placeholder="Search roles by name..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {selectedRoleUuids.length > 0 && (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {selectedRoleUuids.length} role(s) selected for deletion.
            </span>

            <button
              type="button"
              onClick={clearSelectedRoles}
              className="inline-flex items-center gap-1 text-left font-medium text-red-700 underline sm:text-right"
            >
              <X size={14} />
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12">
            <LoadingSpinner text="Loading roles..." />
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm text-gray-500">
              {searchTerm
                ? "No roles found matching your search."
                : "No roles available. Create a new role to get started."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isCurrentPageFullySelected}
                onChange={handleSelectAllCurrentPage}
                className="h-4 w-4 rounded accent-[#0A0082]"
              />
              <span>Select all on this page</span>
            </div>

            <ul className="space-y-3">
              {paginatedRoles.map((role) => {
                const isMandatory = MANDATORY_ROLES.includes(role.role_name);

                return (
                  <li
                    key={role.role_uuid}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3 sm:items-center">
                      <input
                        type="checkbox"
                        checked={selectedRoleUuids.includes(role.role_uuid)}
                        onChange={() =>
                          handleRoleCheckboxChange(role.role_uuid)
                        }
                        className="mt-1 h-4 w-4 shrink-0 rounded accent-[#0A0082] sm:mt-0"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-words font-semibold text-gray-800">
                            {role.role_name}
                          </span>

                          {isMandatory && (
                            <StatusBadge label="Protected" size="sm" />
                          )}
                        </div>

                        <p className="mt-1 text-xs text-gray-400">
                          UUID: {role.role_uuid}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="link"
                      size="icon"
                      onClick={() => {
                        setEditRole({
                          ...role,
                          original_name: role.role_name,
                        });
                        setEditModalOpen(true);
                      }}
                      title="Edit"
                      className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <Pencil size={17} />
                    </Button>
                  </li>
                );
              })}
            </ul>

            {filteredRoles.length > ITEMS_PER_PAGE && (
              <div className="mt-5">
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  onPrevious={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  onNext={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditRole(null);
        }}
        title="Edit Role"
        subtitle="Update the selected role name."
        className="!mt-16 !max-h-[calc(100vh-8rem)] overflow-y-auto"
      >
        <div className="space-y-5">
          <FormInput
            label="Role Name"
            name="edit_role_name"
            value={editRole?.role_name || ""}
            onChange={(e) =>
              setEditRole((prev) => ({
                ...prev,
                role_name: e.target.value,
              }))
            }
            placeholder="e.g., Manager"
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditRole(null);
              }}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              onClick={handleEditRole}
              loading={saving}
              loadingText="Updating..."
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Selected Roles"
        message={`Are you sure you want to delete ${selectedRoleUuids.length} selected role(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={bulkDeletingRoles}
        onCancel={() => {
          if (!bulkDeletingRoles) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={async () => {
          const success = await handleBulkDeleteRoles();

          if (success) {
            setShowDeleteConfirm(false);
          }
        }}
      />
    </div>
  );
}