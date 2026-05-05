import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import Pagination from "../../../../components/Pagination/pagination";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Navbar from "../../../../components/Navbar/Navbar";
import { Pencil, Loader2 } from "lucide-react";

function PermissionList({
  permissions,
  showAdd = false,
  showDelete = false,
  onAdd,
  onDelete,
  processingItemId = null,
}) {
  if (permissions.length === 0) {
    return <div className="text-gray-500 p-2">No permissions found.</div>;
  }

  return (
    <div className="border p-4 rounded bg-gray-50 max-h-60 overflow-y-auto space-y-2">
      {permissions.map((perm) => (
        <div
          key={perm.permission_uuid}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center border p-2 rounded"
        >
          <div className="mb-2 sm:mb-0">
            <p className="font-medium">{perm.permission_code}</p>
            <p className="text-sm text-gray-600">{perm.description}</p>
          </div>

          {(showAdd || showDelete) && (
            <div className="flex gap-2 flex-wrap">
              {showAdd && (
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => onAdd && onAdd(perm.permission_uuid)}
                  type="button"
                  className="w-full sm:w-auto flex items-center gap-2 justify-center"
                  disabled={processingItemId === perm.permission_uuid}
                >
                  {processingItemId === perm.permission_uuid ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding
                    </>
                  ) : (
                    "Add"
                  )}
                </Button>
              )}

              {showDelete && (
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => onDelete && onDelete(perm.permission_uuid)}
                  type="button"
                  className="w-full sm:w-auto flex items-center gap-2 justify-center"
                  disabled={processingItemId === perm.permission_uuid}
                >
                  {processingItemId === perm.permission_uuid ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Selecting
                    </>
                  ) : (
                    "Select"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PermissionChips({ permissions, onRemove, variant = "add" }) {
  if (permissions.length === 0) {
    return <div className="text-gray-500 p-2">No permissions selected.</div>;
  }

  const chipColor =
    variant === "add"
      ? "bg-blue-100 text-blue-800 border-blue-300"
      : "bg-red-100 text-red-800 border-red-300";

  return (
    <div className="border p-4 rounded bg-gray-50 max-h-96 overflow-y-auto">
      <div className="flex flex-wrap gap-2">
        {permissions.map((perm) => (
          <div
            key={perm.permission_uuid}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${chipColor} text-sm font-medium`}
          >
            <span>{perm.permission_code}</span>
            <button
              onClick={() => onRemove(perm.permission_uuid)}
              className="hover:opacity-70 transition-opacity font-bold"
              type="button"
              aria-label="Remove permission"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PermissionGroupManagement() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [showPermissionActions, setShowPermissionActions] = useState(false);

  const [allPermissions, setAllPermissions] = useState([]);
  const [groupPermissions, setGroupPermissions] = useState([]);

  const [showPermissionList, setShowPermissionList] = useState(false);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [showViewList, setShowViewList] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(false);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  const [bulkRemoveLoading, setBulkRemoveLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [processingItemId, setProcessingItemId] = useState(null);

  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);

  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedGroupUuids, setSelectedGroupUuids] = useState([]);
  const [bulkDeletingGroups, setBulkDeletingGroups] = useState(false);

  const permissionSectionRef = useRef(null);

  const token = localStorage.getItem("token");

  const axiosInstance = axios.create({
    baseURL: `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}`,
    headers: { Authorization: `Bearer ${token}` },
  });

  const validateGroupName = (name) => {
    const regex = /^[A-Za-z\s\-_]+$/;
    return regex.test(name.trim());
  };

  const showUniqueToast = (message, type) => {
    toast.dismiss();
    showStatusToast(message, type, { toastId: "unique-toast" });
  };

  const filteredGroups = groups.filter((group) =>
    group?.group_name?.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / ITEMS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentGroups = filteredGroups.slice(startIndex, endIndex);

  const fetchGroups = async (options = {}) => {
    const { afterDelete = false } = options;

    setLoading(true);

    try {
      const res = await axiosInstance.get("/admin/groups");
      const latestGroups = res.data || [];

      setGroups(latestGroups);

      if (afterDelete) {
        const filteredAfterDelete = latestGroups.filter((group) =>
          group?.group_name
            ?.toLowerCase()
            .includes(groupSearchTerm.toLowerCase())
        );

        const newTotalPages = Math.max(
          1,
          Math.ceil(filteredAfterDelete.length / ITEMS_PER_PAGE)
        );

        setCurrentPage((prevPage) => Math.min(prevPage, newTotalPages));
      }
    } catch (err) {
      showUniqueToast("Failed to fetch groups: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const res = await axiosInstance.get("/admin/permissions/");
      setAllPermissions(res.data);
    } catch (err) {
      showUniqueToast(
        "Failed to fetch all permissions: " + err.message,
        "error"
      );
    }
  };

  const fetchGroupPermissions = async (groupId) => {
    try {
      const res = await axiosInstance.get(
        `/admin/groups/${groupId}/permissions`
      );
      setGroupPermissions(res.data);
    } catch (err) {
      showUniqueToast(
        "Failed to fetch group permissions: " + err.message,
        "error"
      );
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchAllPermissions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedGroupUuids([]);
  }, [groupSearchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      return showUniqueToast("Enter the group name", "error");
    }

    if (!validateGroupName(newGroupName)) {
      return showUniqueToast(
        "Group name can only contain letters, spaces, hyphens, and underscores",
        "error"
      );
    }

    setCreating(true);

    try {
      await axiosInstance.post("/admin/groups", {
        group_name: newGroupName.trim(),
      });

      showUniqueToast("Group created successfully!", "success");
      setNewGroupName("");
      await fetchGroups();
      setShowCreateModal(false);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message;

      showUniqueToast(errorMessage, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.group_name);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editGroupName.trim()) {
      return showUniqueToast("Enter the group name", "error");
    }

    if (!validateGroupName(editGroupName)) {
      return showUniqueToast(
        "Group name can only contain letters, spaces, hyphens, and underscores",
        "error"
      );
    }

    setUpdating(true);

    try {
      await axiosInstance.put(`/admin/groups/${editingGroup.group_uuid}`, {
        group_name: editGroupName.trim(),
      });

      showUniqueToast("Group updated successfully!", "success");
      setShowEditModal(false);
      setEditingGroup(null);
      setEditGroupName("");
      await fetchGroups();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message;

      showUniqueToast(errorMessage, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleGroupCheckboxChange = (groupUuid) => {
    setSelectedGroupUuids((prev) =>
      prev.includes(groupUuid)
        ? prev.filter((id) => id !== groupUuid)
        : [...prev, groupUuid]
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageUuids = currentGroups.map((group) => group.group_uuid);

    const allSelected = currentPageUuids.every((id) =>
      selectedGroupUuids.includes(id)
    );

    if (allSelected) {
      setSelectedGroupUuids((prev) =>
        prev.filter((id) => !currentPageUuids.includes(id))
      );
    } else {
      setSelectedGroupUuids((prev) => [
        ...new Set([...prev, ...currentPageUuids]),
      ]);
    }
  };

  const confirmBulkDeleteGroups = async () => {
    if (selectedGroupUuids.length === 0) {
      return showUniqueToast("Please select at least one group.", "warning");
    }

    setBulkDeletingGroups(true);

    try {
      await axiosInstance.delete("/admin/groups/bulk-delete", {
        data: {
          group_uuids: selectedGroupUuids,
        },
      });

      showUniqueToast(
        `${selectedGroupUuids.length} group(s) deleted successfully.`,
        "success"
      );

      if (selectedGroupUuids.includes(selectedGroupId)) {
        handleCloseActions();
      }

      setSelectedGroupUuids([]);
      await fetchGroups({ afterDelete: true });
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message;

      showUniqueToast("Failed to delete groups: " + errorMessage, "error");
    } finally {
      setBulkDeletingGroups(false);
    }
  };

  const clearSelectedGroups = () => {
    setSelectedGroupUuids([]);
  };

  const handleGroupSelect = async (groupId) => {
    if (!groupId) {
      setShowPermissionActions(false);
      setShowPermissionList(false);
      setShowDeleteList(false);
      setShowViewList(false);
      setSearchTerm("");
      setSearchTrigger(false);
      setSelectedToAdd([]);
      setSelectedToRemove([]);
      return;
    }

    setSelectedGroupId(groupId);
    setShowPermissionActions(true);
    setShowPermissionList(false);
    setShowDeleteList(false);
    setShowViewList(false);
    setSearchTerm("");
    setSearchTrigger(false);
    setSelectedToAdd([]);
    setSelectedToRemove([]);

    await fetchGroupPermissions(groupId);
  };

  const scrollToPermissionSection = () => {
    setTimeout(() => {
      permissionSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const handleAddClick = () => {
    if (!selectedGroupId) {
      return showUniqueToast("Please select a group first.", "warning");
    }

    setShowPermissionList(true);
    setShowDeleteList(false);
    setShowViewList(false);
    setSearchTerm("");
    setSearchTrigger(false);
    setSelectedToAdd([]);
    setSelectedToRemove([]);
    scrollToPermissionSection();
  };

  const handleDeleteClickPermission = () => {
    if (!selectedGroupId) {
      return showUniqueToast("Please select a group first.", "warning");
    }

    setShowDeleteList(true);
    setShowPermissionList(false);
    setShowViewList(false);
    setSearchTerm("");
    setSearchTrigger(false);
    setSelectedToAdd([]);
    setSelectedToRemove([]);
    scrollToPermissionSection();
  };

  const handleViewClick = () => {
    if (!selectedGroupId) {
      return showUniqueToast("Please select a group first.", "warning");
    }

    setShowViewList(true);
    setShowPermissionList(false);
    setShowDeleteList(false);
    setSearchTerm("");
    setSearchTrigger(false);
    setSelectedToAdd([]);
    setSelectedToRemove([]);
    scrollToPermissionSection();
  };

  const handleCloseActions = () => {
    setShowPermissionActions(false);
    setShowPermissionList(false);
    setShowDeleteList(false);
    setShowViewList(false);
    setSelectedGroupId("");
    setSearchTerm("");
    setSearchTrigger(false);
    setSelectedToAdd([]);
    setSelectedToRemove([]);
  };

  const handleSelectToAdd = async (permission_uuid) => {
    setProcessingItemId(permission_uuid);

    try {
      const perm = allPermissions.find(
        (p) => p.permission_uuid === permission_uuid
      );

      if (
        perm &&
        !selectedToAdd.some((p) => p.permission_uuid === permission_uuid)
      ) {
        setSelectedToAdd((prev) => [...prev, perm]);
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleUnselectToAdd = (permission_uuid) => {
    setSelectedToAdd((prev) =>
      prev.filter((p) => p.permission_uuid !== permission_uuid)
    );
  };

  const handleSelectToRemove = async (permission_uuid) => {
    setProcessingItemId(permission_uuid);

    try {
      const perm = enrichWithCode(groupPermissions).find(
        (p) => p.permission_uuid === permission_uuid
      );

      if (
        perm &&
        !selectedToRemove.some((p) => p.permission_uuid === permission_uuid)
      ) {
        setSelectedToRemove((prev) => [...prev, perm]);
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleUnselectToRemove = (permission_uuid) => {
    setSelectedToRemove((prev) =>
      prev.filter((p) => p.permission_uuid !== permission_uuid)
    );
  };

  const handleBulkAddPermissions = async () => {
    if (selectedToAdd.length === 0) {
      return showUniqueToast("No permissions selected to add.", "warning");
    }

    setBulkAddLoading(true);

    try {
      const permissionIds = selectedToAdd.map((p) => p.permission_uuid);

      await axiosInstance.post(
        `/admin/groups/${selectedGroupId}/permissions`,
        permissionIds
      );

      showUniqueToast(
        `${selectedToAdd.length} permission(s) added successfully.`,
        "success"
      );

      setSelectedToAdd([]);
      await fetchGroupPermissions(selectedGroupId);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message;

      showUniqueToast("Failed to add permissions: " + errorMessage, "error");
    } finally {
      setBulkAddLoading(false);
    }
  };

  const handleBulkRemovePermissions = async () => {
    if (selectedToRemove.length === 0) {
      return showUniqueToast("No permissions selected to remove.", "warning");
    }

    setBulkRemoveLoading(true);

    try {
      const permissionIds = selectedToRemove.map((p) => p.permission_uuid);

      await axiosInstance.delete(
        `/admin/groups/${selectedGroupId}/permissions`,
        { data: permissionIds }
      );

      showUniqueToast(
        `${selectedToRemove.length} permission(s) removed successfully.`,
        "success"
      );

      setSelectedToRemove([]);
      await fetchGroupPermissions(selectedGroupId);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message;

      showUniqueToast("Failed to remove permissions: " + errorMessage, "error");
    } finally {
      setBulkRemoveLoading(false);
    }
  };

  const unassignedPermissions = allPermissions.filter(
    (perm) =>
      !groupPermissions.some(
        (gp) => gp.permission_uuid === perm.permission_uuid
      )
  );

  const filterPermissions = (list) => {
    if (!searchTrigger || !searchTerm) return list;

    return list.filter(
      (perm) =>
        (perm.permission_code?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (perm.description?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        )
    );
  };

  function enrichWithCode(permissionList) {
    if (!Array.isArray(permissionList)) {
      console.error(
        "enrichWithCode expected an array, but received:",
        permissionList
      );
      return [];
    }

    return permissionList.map((perm) => {
      if (!perm || typeof perm !== "object") {
        console.error("Invalid item in permissionList:", perm);
        return { permission_uuid: "invalid", permission_code: "Invalid Item" };
      }

      if (perm.permission_code) return perm;

      const found = allPermissions.find(
        (p) => p && p.permission_uuid === perm.permission_uuid
      );

      return {
        ...perm,
        permission_code: found ? found.permission_code : "Unknown Code",
      };
    });
  }

  const availableToAdd = filterPermissions(unassignedPermissions).filter(
    (perm) =>
      !selectedToAdd.some((s) => s.permission_uuid === perm.permission_uuid)
  );

  const availableToRemove = filterPermissions(
    enrichWithCode(groupPermissions)
  ).filter(
    (perm) =>
      !selectedToRemove.some((s) => s.permission_uuid === perm.permission_uuid)
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center sm:text-left">
        Permission Group Management
      </h2>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex-grow">
          <Navbar
            logo="Permission Groups"
            navItems={[
              {
                name: "Manage Groups",
                onClick: handleCloseActions,
                isActive: !showPermissionActions,
              },
              {
                name: "Group Permissions",
                onClick: () => {
                  setShowPermissionActions(true);
                  setShowPermissionList(false);
                  setShowDeleteList(false);
                  setShowViewList(false);
                  setSelectedToAdd([]);
                  setSelectedToRemove([]);
                  setSearchTerm("");
                },
                isActive: showPermissionActions,
              },
            ]}
          />
        </div>

        {!showPermissionActions && (
          <div className="ml-4">
            <Button
              size="medium"
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              type="button"
              className="whitespace-nowrap"
            >
              Create Group
            </Button>
          </div>
        )}
      </div>

      {!showPermissionActions && (
        <div className="bg-white p-4 rounded shadow mb-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold">Existing Groups</h3>
              <p className="text-sm text-gray-500">
                {filteredGroups.length} group(s) found
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {selectedGroupUuids.length > 0 && (
                <Button
                  size="medium"
                  variant="danger"
                  onClick={confirmBulkDeleteGroups}
                  type="button"
                  className="flex items-center gap-2 justify-center"
                  disabled={bulkDeletingGroups}
                >
                  {bulkDeletingGroups ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>Delete Selected ({selectedGroupUuids.length})</>
                  )}
                </Button>
              )}

              <div className="max-w-xs w-full sm:w-80">
                <SearchInput
                  placeholder="Search existing groups..."
                  onSearch={(q) => setGroupSearchTerm(q)}
                />
              </div>
            </div>
          </div>

          {selectedGroupUuids.length > 0 && (
            <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                {selectedGroupUuids.length} group(s) selected for deletion.
              </span>

              <button
                type="button"
                onClick={clearSelectedGroups}
                className="text-red-700 underline text-left sm:text-right"
              >
                Clear selection
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Loading groups...</p>
          ) : currentGroups.length === 0 ? (
            <p className="text-gray-500">
              {groupSearchTerm
                ? "No groups found matching your search."
                : "No groups available. Create a new permission group to get started."}
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    currentGroups.length > 0 &&
                    currentGroups.every((group) =>
                      selectedGroupUuids.includes(group.group_uuid)
                    )
                  }
                  onChange={handleSelectAllCurrentPage}
                  className="w-4 h-4"
                />
                <span>Select all on this page</span>
              </div>

              <ul className="space-y-2">
                {currentGroups.map((group) => (
                  <li
                    key={group?.group_uuid}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedGroupUuids.includes(group.group_uuid)}
                        onChange={() =>
                          handleGroupCheckboxChange(group.group_uuid)
                        }
                        className="w-4 h-4"
                      />

                      <span className="font-medium">{group?.group_name}</span>
                    </div>

                    <button
                      onClick={() => handleEditClick(group)}
                      className="p-2 rounded hover:bg-blue-100 text-blue-900"
                      title={`Edit ${group?.group_name}`}
                      type="button"
                      aria-label={`Edit ${group?.group_name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>

              {filteredGroups.length > ITEMS_PER_PAGE && (
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
      )}

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Edit Group</h2>

        <input
          type="text"
          placeholder="Group Name (letters, spaces, hyphens, underscores only)"
          value={editGroupName}
          onChange={(e) => setEditGroupName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          onKeyPress={(e) => e.key === "Enter" && handleUpdate()}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleUpdate}
            variant="primary"
            size="medium"
            className="w-full sm:w-auto flex items-center gap-2 justify-center"
            disabled={updating}
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>

          <Button
            onClick={async () => {
              setCanceling(true);
              await new Promise((r) => setTimeout(r, 200));
              setShowEditModal(false);
              setEditingGroup(null);
              setEditGroupName("");
              setCanceling(false);
            }}
            variant="secondary"
            size="medium"
            className="w-full sm:w-auto"
            disabled={updating || canceling}
          >
            {canceling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cancelling...
              </>
            ) : (
              "Cancel"
            )}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Create Group</h2>

        <input
          type="text"
          placeholder="Group Name (letters, spaces, hyphens, underscores only)"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          onKeyPress={(e) => e.key === "Enter" && handleCreate()}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleCreate}
            variant="primary"
            size="medium"
            className="w-full sm:w-auto flex items-center gap-2 justify-center"
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>

          <Button
            onClick={async () => {
              setCanceling(true);
              await new Promise((r) => setTimeout(r, 250));
              setShowCreateModal(false);
              setNewGroupName("");
              setCanceling(false);
            }}
            variant="secondary"
            size="medium"
            className="w-full sm:w-auto"
            disabled={creating || canceling}
          >
            {canceling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cancelling...
              </>
            ) : (
              "Cancel"
            )}
          </Button>
        </div>
      </Modal>

      {showPermissionActions && (
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Group Permissions</h3>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <select
              value={selectedGroupId}
              onChange={(e) => handleGroupSelect(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select the group</option>
              {groups.map((group) => (
                <option key={group.group_uuid} value={group.group_uuid}>
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>

          {selectedGroupId && (
            <div className="flex justify-around items-center mb-4">
              <Button
                onClick={handleAddClick}
                className="px-3 py-2 bg-blue-900 text-white rounded hover:bg-blue-950 transition-colors font-medium"
              >
                Add
              </Button>

              <Button
                onClick={handleDeleteClickPermission}
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </Button>

              <Button
                onClick={handleViewClick}
                className="px-3 py-2 bg-pink-900 text-white rounded hover:bg-pink-950 transition-colors font-medium"
              >
                View
              </Button>
            </div>
          )}

          <div ref={permissionSectionRef}>
            {(showPermissionList || showDeleteList || showViewList) && (
              <div className="mb-4 mt-6 border-t pt-6">
                {showPermissionList && (
                  <div>
                    <h5 className="text-md font-medium mb-2">
                      Available Permissions to Add:
                    </h5>

                    <div className="mb-4">
                      <SearchInput
                        placeholder="Search permissions..."
                        onSearch={(value) => {
                          setSearchTerm(value);
                          setSearchTrigger(true);
                        }}
                      />
                    </div>

                    <PermissionList
                      permissions={availableToAdd}
                      showAdd={true}
                      showDelete={false}
                      onAdd={handleSelectToAdd}
                      processingItemId={processingItemId}
                    />

                    <div className="mt-4">
                      <h5 className="text-md font-medium mb-2">
                        Selected Permission Names:
                      </h5>

                      <PermissionChips
                        permissions={selectedToAdd}
                        onRemove={handleUnselectToAdd}
                        variant="add"
                      />

                      {selectedToAdd.length > 0 && (
                        <div className="mt-4">
                          <Button
                            size="medium"
                            variant="primary"
                            onClick={handleBulkAddPermissions}
                            type="button"
                            className="flex items-center gap-2"
                            disabled={bulkAddLoading}
                          >
                            {bulkAddLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>Confirm Add ({selectedToAdd.length})</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showDeleteList && (
                  <div>
                    <h5 className="text-md font-medium mb-2">
                      Current Group Permissions Select to Remove:
                    </h5>

                    <div className="mb-4">
                      <SearchInput
                        placeholder="Search permissions..."
                        onSearch={(value) => {
                          setSearchTerm(value);
                          setSearchTrigger(true);
                        }}
                      />
                    </div>

                    <PermissionList
                      permissions={availableToRemove}
                      showAdd={false}
                      showDelete={true}
                      onDelete={handleSelectToRemove}
                      processingItemId={processingItemId}
                    />

                    <div className="mt-4">
                      <PermissionChips
                        permissions={selectedToRemove}
                        onRemove={handleUnselectToRemove}
                        variant="remove"
                      />

                      {selectedToRemove.length > 0 && (
                        <div className="mt-4">
                          <Button
                            size="medium"
                            variant="danger"
                            onClick={handleBulkRemovePermissions}
                            type="button"
                            className="flex items-center gap-2"
                            disabled={bulkRemoveLoading}
                          >
                            {bulkRemoveLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              <>Confirm Remove ({selectedToRemove.length})</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showViewList && (
                  <div>
                    <h5 className="text-md font-medium mb-2">
                      Current Group Permissions:
                    </h5>

                    <div className="mb-4">
                      <SearchInput
                        placeholder="Search permissions..."
                        onSearch={(value) => {
                          setSearchTerm(value);
                          setSearchTrigger(true);
                        }}
                      />
                    </div>

                    <PermissionList
                      permissions={filterPermissions(
                        enrichWithCode(groupPermissions)
                      )}
                      showAdd={false}
                      showDelete={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}