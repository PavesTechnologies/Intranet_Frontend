import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import { Pencil, Loader2 } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import SearchInput from "../../../../components/filter/Searchbar";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { showStatusToast } from "../../../../components/toastfy/toast";

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);

  const [newPermission, setNewPermission] = useState("");
  const [description, setNewDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [editingPermission, setEditingPermission] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGroup, setEditGroup] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [addPermissionModal, setAddPermissionModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [adding, setAdding] = useState(false);
  const [creatingPermission, setCreatingPermission] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [selectedPermissionUuids, setSelectedPermissionUuids] = useState([]);

  const token = localStorage.getItem("token");

  const axiosInstance = axios.create({
    baseURL: `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}`,
    headers: { Authorization: `Bearer ${token}` },
  });

  const showSingleToast = (msg, type) => {
    toast.dismiss();
    showStatusToast(msg, type);
  };

  const filteredPermissions = permissions.filter((perm) =>
    perm?.permission_code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPermissions.length / itemsPerPage),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPermissions = filteredPermissions.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );

  useEffect(() => {
    fetchPermissions();
    fetchGroups();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPermissionUuids([]);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fetchPermissions = async (options = {}) => {
    const { afterDelete = false } = options;

    try {
      const res = await axiosInstance.get("/admin/permissions/");
      const latestPermissions = res.data || [];

      setPermissions(latestPermissions);

      if (afterDelete) {
        const filteredAfterDelete = latestPermissions.filter((perm) =>
          perm?.permission_code
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
        );

        const newTotalPages = Math.max(
          1,
          Math.ceil(filteredAfterDelete.length / itemsPerPage),
        );

        setCurrentPage((prev) => Math.min(prev, newTotalPages));
      }
    } catch (err) {
      console.error("Failed to fetch permissions", err);
      showSingleToast("Failed to fetch permissions", "error");
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axiosInstance.get("/admin/groups");
      setGroups(res.data || []);
    } catch (err) {
      console.error("Failed to fetch groups", err);
      showSingleToast("Failed to fetch groups", "error");
    }
  };

  const validatePermissionCode = (code) => {
    if (!code.trim()) {
      showSingleToast("Enter the permission", "error");
      return false;
    }

    const permissionCodePattern = /^[A-Z]+(_[A-Z]+)*$/;

    if (!permissionCodePattern.test(code.trim())) {
      showSingleToast(
        "Invalid format. Use uppercase letters and underscores only. Example: VIEW_USER_PUBLIC",
        "error",
      );
      return false;
    }

    return true;
  };

  const validateDescription = (desc) => {
    if (!desc.trim()) {
      showSingleToast("Description shouldn't be empty", "error");
      return false;
    }

    const textOnlyRegex = /^[A-Za-z0-9\s.,!?'"()_-]+$/;

    if (!textOnlyRegex.test(desc)) {
      showSingleToast(
        "Description should contain only valid text format",
        "error",
      );
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setNewPermission("");
    setNewDescription("");
    setSelectedGroup("");
  };

  const handleCreate = async () => {
    if (!validatePermissionCode(newPermission)) return;
    if (!validateDescription(description)) return;

    setCreatingPermission(true);

    try {
      await axiosInstance.post("/admin/permissions/group", {
        permission_code: newPermission.trim(),
        description: description.trim(),
        group_uuid: selectedGroup || null,
      });

      showSingleToast("Permission created successfully!", "success");
      resetForm();
      setAddPermissionModal(false);
      await fetchPermissions();
    } catch (err) {
      console.error("Error creating permission", err);

      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to create permission";

      showSingleToast(detail, "error");
    } finally {
      setCreatingPermission(false);
    }
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    setEditCode(permission.permission_code);
    setEditDescription(permission.description || "");
    setEditGroup(permission.group_uuid || "");
    setShowModal(true);
  };

  const handleUpdate = async () => {
    if (!validatePermissionCode(editCode)) return;
    if (!validateDescription(editDescription)) return;

    setUpdating(true);

    try {
      await axiosInstance.put(
        `/admin/permissions/${editingPermission.permission_uuid}`,
        {
          permission_code: editCode.trim(),
          description: editDescription.trim(),
        },
      );

      if (editGroup) {
        await axiosInstance.put(
          `/admin/permissions/${editingPermission.permission_uuid}/group`,
          {
            group_uuid: editGroup,
          },
        );
      }

      showSingleToast("Permission updated successfully!", "success");
      setShowModal(false);
      setEditingPermission(null);
      setEditCode("");
      setEditDescription("");
      setEditGroup("");
      await fetchPermissions();
    } catch (err) {
      console.error("Error updating permission", err);

      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to update permission";

      showSingleToast(detail, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handlePermissionChange = (e) => {
    const value = e.target.value.toUpperCase();

    if (/^[A-Z_]*$/.test(value)) {
      setNewPermission(value);
    }
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;

    if (/^[A-Za-z0-9\s.,!?'"()_-]*$/.test(value)) {
      setNewDescription(value);
    }
  };

  const handleEditPermissionChange = (e) => {
    const value = e.target.value.toUpperCase();

    if (/^[A-Z_]*$/.test(value)) {
      setEditCode(value);
    }
  };

  const handleEditDescriptionChange = (e) => {
    const value = e.target.value;

    if (/^[A-Za-z0-9\s.,!?'"()_-]*$/.test(value)) {
      setEditDescription(value);
    }
  };

  const handlePermissionCheckboxChange = (permissionUuid) => {
    setSelectedPermissionUuids((prev) =>
      prev.includes(permissionUuid)
        ? prev.filter((id) => id !== permissionUuid)
        : [...prev, permissionUuid],
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageUuids = paginatedPermissions.map(
      (perm) => perm.permission_uuid,
    );

    const allSelected = currentPageUuids.every((id) =>
      selectedPermissionUuids.includes(id),
    );

    if (allSelected) {
      setSelectedPermissionUuids((prev) =>
        prev.filter((id) => !currentPageUuids.includes(id)),
      );
    } else {
      setSelectedPermissionUuids((prev) => [
        ...new Set([...prev, ...currentPageUuids]),
      ]);
    }
  };

  const clearSelectedPermissions = () => {
    setSelectedPermissionUuids([]);
  };

  const handleBulkDeletePermissions = async () => {
    if (selectedPermissionUuids.length === 0) {
      return showSingleToast(
        "Please select at least one permission.",
        "warning",
      );
    }

    setBulkDeleting(true);

    try {
      const res = await axiosInstance.delete("/admin/permissions/bulk-delete", {
        data: {
          permission_uuids: selectedPermissionUuids,
        },
      });

      const data = res?.data || {};
      const deletedCount = data.deleted_count ?? selectedPermissionUuids.length;
      const failedPermissions = data.failed_permissions || [];

      if (deletedCount > 0 && failedPermissions.length === 0) {
        showSingleToast(
          `${deletedCount} permission(s) deleted successfully.`,
          "success",
        );
      } else if (deletedCount > 0 && failedPermissions.length > 0) {
        showSingleToast(
          `${deletedCount} permission(s) deleted. ${failedPermissions.length} failed.`,
          "warning",
        );
      } else {
        showSingleToast("No permissions were deleted.", "error");
      }

      setSelectedPermissionUuids([]);
      await fetchPermissions({ afterDelete: true });
    } catch (err) {
      console.error("Failed to delete permissions", err);

      const detail = err?.response?.data?.detail;

      if (typeof detail === "object") {
        showSingleToast(
          detail.message || "Failed to delete permissions",
          "error",
        );
      } else {
        showSingleToast(
          detail ||
            err?.response?.data?.message ||
            "Failed to delete permissions",
          "error",
        );
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleAddPermission = async () => {
    setAdding(true);

    try {
      setAddPermissionModal(true);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Permission Management</h2>
          <p className="text-sm text-gray-500">
            Create, update, search, and bulk delete permissions.
          </p>
        </div>

        <Button
          onClick={handleAddPermission}
          disabled={adding}
          className={`px-6 py-2 text-white rounded transition-colors font-medium ${
            adding
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-900 hover:bg-blue-950"
          }`}
        >
          {adding ? "Opening..." : "Add Permission"}
        </Button>
      </div>

      <Modal
        isOpen={addPermissionModal}
        onClose={() => {
          setAddPermissionModal(false);
          resetForm();
        }}
      >
        <div className="flex flex-col gap-[8px] bg-white p-4 rounded shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Add New Permission</h3>

          <FormInput
            label="Permission Code"
            name="permission_code"
            value={newPermission}
            onChange={handlePermissionChange}
            placeholder="Example: READ_USER"
            className="mb-3"
          />

          <FormInput
            type="text"
            label="Description"
            padding="medium"
            placeholder="Enter description"
            value={description}
            onChange={handleDescriptionChange}
            className="w-full p-2 border rounded mb-3"
          />

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(String(e.target.value))}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="">Default Group</option>
            {groups.map((g) => (
              <option key={g.group_uuid} value={g.group_uuid}>
                {g.group_name}
              </option>
            ))}
          </select>

          <div className="flex gap-3 mt-3">
            <Button
              onClick={handleCreate}
              variant="primary"
              size="medium"
              disabled={creatingPermission}
              className="flex items-center gap-2"
            >
              {creatingPermission ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Permission"
              )}
            </Button>

            <Button
              onClick={() => {
                setAddPermissionModal(false);
                resetForm();
              }}
              variant="secondary"
              size="medium"
              disabled={creatingPermission}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold">Existing Permissions</h3>
            <p className="text-sm text-gray-500">
              {filteredPermissions.length} permission(s) found
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {selectedPermissionUuids.length > 0 && (
              <Button
                size="medium"
                variant="danger"
                onClick={handleBulkDeletePermissions}
                type="button"
                className="flex items-center gap-2 justify-center"
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>Delete Selected ({selectedPermissionUuids.length})</>
                )}
              </Button>
            )}

            <div className="w-full sm:w-80 md:w-96">
              <SearchInput
                onSearch={(value) => setSearchTerm(value)}
                delay={500}
                placeholder="Search permissions by code..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {selectedPermissionUuids.length > 0 && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>
              {selectedPermissionUuids.length} permission(s) selected for
              deletion.
            </span>

            <button
              type="button"
              onClick={clearSelectedPermissions}
              className="text-red-700 underline text-left sm:text-right"
            >
              Clear selection
            </button>
          </div>
        )}

        {paginatedPermissions.length === 0 ? (
          <p className="text-gray-500">
            {searchTerm
              ? "No permissions found matching your search."
              : "No permissions available. Create a new permission to get started."}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={
                  paginatedPermissions.length > 0 &&
                  paginatedPermissions.every((perm) =>
                    selectedPermissionUuids.includes(perm.permission_uuid),
                  )
                }
                onChange={handleSelectAllCurrentPage}
                className="w-4 h-4"
              />
              <span>Select all on this page</span>
            </div>

            <ul className="space-y-3">
              {paginatedPermissions.map((perm) => (
                <li
                  key={perm.permission_uuid}
                  className="flex justify-between items-start border-b pb-3 gap-3"
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedPermissionUuids.includes(
                        perm.permission_uuid,
                      )}
                      onChange={() =>
                        handlePermissionCheckboxChange(perm.permission_uuid)
                      }
                      className="w-4 h-4 mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <span className="font-semibold break-words text-gray-800">
                        {perm.permission_code}
                      </span>
                      <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1 leading-relaxed">
                        {perm.description || "No description available."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEdit(perm)}
                    className="p-2 rounded hover:bg-blue-100 text-blue-900 flex-shrink-0"
                    title="Edit"
                    type="button"
                    aria-label={`Edit ${perm.permission_code}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            {filteredPermissions.length > itemsPerPage && (
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Edit Permission</h2>

        <FormInput
          label="Permission Code"
          name="edit_permission_code"
          value={editCode}
          onChange={handleEditPermissionChange}
          placeholder="Example: READ_USER"
          className="mb-3"
        />

        <FormInput
          type="text"
          label="Description"
          placeholder="Enter description"
          value={editDescription}
          onChange={handleEditDescriptionChange}
          className="w-full p-2 border rounded mb-3"
        />

        <select
          value={editGroup}
          onChange={(e) => setEditGroup(String(e.target.value))}
          className="w-full p-2 border rounded mb-3"
        >
          <option value="">Keep current / Default Group</option>
          {groups.map((g) => (
            <option key={g.group_uuid} value={g.group_uuid}>
              {g.group_name}
            </option>
          ))}
        </select>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className={`px-6 py-2 text-white rounded transition-colors font-medium flex items-center gap-2 ${
              updating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update"
            )}
          </Button>

          <Button
            onClick={() => setShowModal(false)}
            variant="secondary"
            size="medium"
            disabled={updating}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
