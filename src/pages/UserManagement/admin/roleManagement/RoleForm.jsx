import { useEffect, useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import axios from "axios";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import SearchInput from "../../../../components/filter/Searchbar";
import { showStatusToast } from "../../../../components/toastfy/toast";

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

  const [newRoleName, setNewRoleName] = useState("");
  const [editRole, setEditRole] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedRoleUuids, setSelectedRoleUuids] = useState([]);
  const [bulkDeletingRoles, setBulkDeletingRoles] = useState(false);

  const token = localStorage.getItem("token") || "";

  const axiosInstance = axios.create({
    baseURL: `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}`,
    headers: { Authorization: `Bearer ${token}` },
  });

  const mandatoryRoles = ["Admin", "Super Admin", "HR", "General"];

  useEffect(() => {
    setLocalRoles(roles || []);
    setFilteredRoles(roles || []);
  }, [roles]);

  useEffect(() => {
    const filtered = searchTerm
      ? localRoles.filter((role) =>
          role.role_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : localRoles;

    setFilteredRoles(filtered);
    setCurrentPage(1);
    setSelectedRoleUuids([]);
  }, [searchTerm, localRoles]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRoles = filteredRoles.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
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
      const latestRoles = res.data || [];

      syncRoles(latestRoles);

      if (afterDelete) {
        const filteredAfterDelete = searchTerm
          ? latestRoles.filter((role) =>
              role.role_name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : latestRoles;

        const newTotalPages = Math.max(
          1,
          Math.ceil(filteredAfterDelete.length / itemsPerPage)
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
        "error"
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

    if (mandatoryRoles.includes(editRole.original_name)) {
      showToast(
        `Role '${editRole.original_name}' is mandatory and cannot be renamed`,
        "error"
      );
      setEditModalOpen(false);
      return;
    }

    setSaving(true);

    try {
      const res = await axiosInstance.put(
        `/admin/roles/uuid/${editRole.role_uuid}`,
        { role_name: editRole.role_name.trim() }
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
        : [...prev, roleUuid]
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageUuids = paginatedRoles.map((role) => role.role_uuid);

    const allSelected = currentPageUuids.every((id) =>
      selectedRoleUuids.includes(id)
    );

    if (allSelected) {
      setSelectedRoleUuids((prev) =>
        prev.filter((id) => !currentPageUuids.includes(id))
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
      return showToast("Please select at least one role.", "warning");
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
          "warning"
        );
      } else {
        showToast("No roles were deleted.", "error");
      }

      setSelectedRoleUuids([]);
      await fetchRoles({ afterDelete: true });

      if (refreshRoles) refreshRoles();
    } catch (err) {
      console.error("Error bulk deleting roles", err);

      const detail = err?.response?.data?.detail;

      if (typeof detail === "object") {
        showToast(detail.message || "Failed to delete roles", "error");
      } else {
        showToast(
          detail || err?.response?.data?.message || "Failed to delete roles",
          "error"
        );
      }
    } finally {
      setBulkDeletingRoles(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Role Management</h2>
          <p className="text-sm text-gray-600">
            Create, edit, select, and bulk delete roles
          </p>
        </div>

        <Button onClick={() => setAddModalOpen(true)}>Add Role</Button>
      </div>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <h3 className="text-lg font-semibold mb-3">Add New Role</h3>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <FormInput
              label="Role Name"
              name="role_name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Project_Manager"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddRole}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Role"
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setAddModalOpen(false);
                setNewRoleName("");
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold">Existing Roles</h3>
            <p className="text-sm text-gray-500">
              {filteredRoles.length} role(s) found
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {selectedRoleUuids.length > 0 && (
              <Button
                variant="danger"
                size="medium"
                onClick={handleBulkDeleteRoles}
                disabled={bulkDeletingRoles}
                className="flex items-center gap-2 justify-center"
              >
                {bulkDeletingRoles ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>Delete Selected ({selectedRoleUuids.length})</>
                )}
              </Button>
            )}

            <div className="w-full sm:w-[420px]">
              <SearchInput
                onSearch={(value) => setSearchTerm(value || "")}
                delay={300}
                placeholder="Search roles by name..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {selectedRoleUuids.length > 0 && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{selectedRoleUuids.length} role(s) selected for deletion.</span>

            <button
              type="button"
              onClick={clearSelectedRoles}
              className="text-red-700 underline text-left sm:text-right"
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading roles...</p>
        ) : filteredRoles.length === 0 ? (
          <p className="text-gray-500">
            {searchTerm
              ? "No roles found matching your search."
              : "No roles available. Create a new role to get started."}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={
                  paginatedRoles.length > 0 &&
                  paginatedRoles.every((role) =>
                    selectedRoleUuids.includes(role.role_uuid)
                  )
                }
                onChange={handleSelectAllCurrentPage}
                className="w-4 h-4"
              />
              <span>Select all on this page</span>
            </div>

            <ul className="space-y-3">
              {paginatedRoles.map((role) => {
                const isMandatory = mandatoryRoles.includes(role.role_name);

                return (
                  <li
                    key={role.role_uuid}
                    className="flex justify-between items-center border-b pb-3 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedRoleUuids.includes(role.role_uuid)}
                        onChange={() =>
                          handleRoleCheckboxChange(role.role_uuid)
                        }
                        className="w-4 h-4"
                      />

                      <div className="min-w-0">
                        <span className="font-semibold text-gray-800 break-words">
                          {role.role_name}
                        </span>

                        {isMandatory && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Protected
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditRole({
                          ...role,
                          original_name: role.role_name,
                        });
                        setEditModalOpen(true);
                      }}
                      className="p-2 rounded hover:bg-blue-100 text-blue-900"
                      title="Edit"
                      type="button"
                      aria-label={`Edit ${role.role_name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {filteredRoles.length > itemsPerPage && (
              <div className="mt-4">
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

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <h3 className="text-lg font-semibold mb-3">Edit Role</h3>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
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
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleEditRole}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setEditModalOpen(false);
                setEditRole(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}