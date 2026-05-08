import { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import SearchInput from "../../../../components/filter/Searchbar";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
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

  const [adding, setAdding] = useState(false);
  const [creatingPermission, setCreatingPermission] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedPermissionUuids, setSelectedPermissionUuids] = useState([]);

  const itemsPerPage = 5;
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
    perm?.permission_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPermissions.length / itemsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPermissions = filteredPermissions.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  useEffect(() => {
    initialize();
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

  const initialize = async () => {
    setLoading(true);

    try {
      await Promise.all([fetchPermissions(), fetchGroups()]);
    } finally {
      setLoading(false);
    }
  };

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
            .includes(searchTerm.toLowerCase())
        );

        const newTotalPages = Math.max(
          1,
          Math.ceil(filteredAfterDelete.length / itemsPerPage)
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
        "Invalid format. Use uppercase letters and underscores only.",
        "error"
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
        "error"
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

  const resetEditForm = () => {
    setEditingPermission(null);
    setEditCode("");
    setEditDescription("");
    setEditGroup("");
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
        }
      );

      if (editGroup) {
        await axiosInstance.put(
          `/admin/permissions/${editingPermission.permission_uuid}/group`,
          {
            group_uuid: editGroup,
          }
        );
      }

      showSingleToast("Permission updated successfully!", "success");

      setShowModal(false);
      resetEditForm();

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
        : [...prev, permissionUuid]
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageUuids = paginatedPermissions.map(
      (perm) => perm.permission_uuid
    );

    const allSelected = currentPageUuids.every((id) =>
      selectedPermissionUuids.includes(id)
    );

    if (allSelected) {
      setSelectedPermissionUuids((prev) =>
        prev.filter((id) => !currentPageUuids.includes(id))
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
        "warning"
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
          "success"
        );
      } else if (deletedCount > 0 && failedPermissions.length > 0) {
        showSingleToast(
          `${deletedCount} permission(s) deleted. ${failedPermissions.length} failed.`,
          "warning"
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
          "error"
        );
      } else {
        showSingleToast(
          detail ||
          err?.response?.data?.message ||
          "Failed to delete permissions",
          "error"
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
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A0082]/10 text-[#0A0082]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className={Fonts.heading3}>Permission Management</h2>

              <p className={Fonts.paragraphMuted}>
                Create, update, search, and bulk delete permissions.
              </p>
            </div>
          </div>

          <Button
            onClick={handleAddPermission}
            disabled={adding}
            variant="primary"
            size="medium"
            className="w-full sm:w-auto"
          >
            {adding ? "Opening..." : "Add Permission"}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={addPermissionModal}
        onClose={() => {
          setAddPermissionModal(false);
          resetForm();
        }}
        title="Add New Permission"
        subtitle="Create a new permission and assign it to a group."
        className="!w-full !max-w-2xl"
      >
        <FormInput
          label="Permission Code"
          name="permission_code"
          value={newPermission}
          onChange={handlePermissionChange}
          placeholder="Example: READ_USER"
        />

        <FormInput
          type="text"
          label="Description"
          placeholder="Enter description"
          value={description}
          onChange={handleDescriptionChange}
        />

        <div className="space-y-1">
          <label className={Fonts.label}>Permission Group</label>

          <FilterListbox
            options={[
              { value: "", label: "Default Group" },
              ...groups.map((g) => ({ value: g.group_uuid, label: g.group_name })),
            ]}
            value={selectedGroup}
            onChange={setSelectedGroup}
          />

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
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreate}
              variant="primary"
              size="medium"
              disabled={creatingPermission}
              loading={creatingPermission}
              loadingText="Creating..."
              className="w-full sm:w-auto"
            >
              Add Permission
            </Button>
          </div>
        </div>
      </Modal>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className={Fonts.heading4}>Existing Permissions</h3>

            <p className={Fonts.paragraphMuted}>
              {filteredPermissions.length} permission(s) found
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            {selectedPermissionUuids.length > 0 && (
              <Button
                size="medium"
                variant="danger"
                onClick={handleBulkDeletePermissions}
                type="button"
                disabled={bulkDeleting}
                className="w-full lg:w-auto"
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>Delete Selected ({selectedPermissionUuids.length})</>
                )}
              </Button>
            )}

            <div className="w-full lg:w-96">
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
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {selectedPermissionUuids.length} permission(s) selected for
              deletion.
            </span>

            <Button
              type="button"
              variant="link"
              size="small"
              onClick={clearSelectedPermissions}
              className="text-left text-red-700 underline sm:text-right"
            >
              Clear selection
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-14">
            <LoadingSpinner text="Loading permissions..." />
          </div>
        ) : paginatedPermissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-gray-500">
            {searchTerm
              ? "No permissions found matching your search."
              : "No permissions available. Create a new permission to get started."}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={
                  paginatedPermissions.length > 0 &&
                  paginatedPermissions.every((perm) =>
                    selectedPermissionUuids.includes(perm.permission_uuid)
                  )
                }
                onChange={handleSelectAllCurrentPage}
                className="h-4 w-4"
              />

              <span>Select all on this page</span>
            </div>

            <ul className="space-y-3">
              {paginatedPermissions.map((perm) => (
                <li
                  key={perm.permission_uuid}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 transition hover:border-[#0A0082]/30 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPermissionUuids.includes(
                        perm.permission_uuid
                      )}
                      onChange={() =>
                        handlePermissionCheckboxChange(perm.permission_uuid)
                      }
                      className="mt-1 h-4 w-4 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <h4 className="break-words font-semibold text-gray-800">
                        {perm.permission_code}
                      </h4>

                      <p className="mt-1 break-words whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                        {perm.description || "No description available."}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end sm:justify-start">
                    <Button
                      type="button"
                      size="icon"
                      variant="icon"
                      title="Edit"
                      aria-label={`Edit ${perm.permission_code}`}
                      className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                      onClick={() => handleEdit(perm)}
                    >
                      <Pencil size={17} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {filteredPermissions.length > itemsPerPage && (
              <div className="mt-6">
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
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetEditForm();
        }}
        title="Edit Permission"
        subtitle="Update permission details and group mapping."
        className="!w-full !max-w-2xl"
      >
        <div className="space-y-4">
          <FormInput
            label="Permission Code"
            name="edit_permission_code"
            value={editCode}
            onChange={handleEditPermissionChange}
            placeholder="Example: READ_USER"
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

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => {
                setShowModal(false);
                resetEditForm();
              }}
              variant="secondary"
              size="medium"
              disabled={updating}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              onClick={handleUpdate}
              disabled={updating}
              variant="success"
              size="medium"
              loading={updating}
              loadingText="Updating..."
              className="w-full sm:w-auto"
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}