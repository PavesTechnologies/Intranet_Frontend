import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import Pagination from "../../../../components/Pagination/pagination";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import {
  Pencil,
  Loader2,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  X,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

const GROUP_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
  paginationWrapperClassName: "mt-6 flex justify-center",
};

const PERMISSION_ITEMS_PER_PAGE = 6;

export default function PermissionGroupManagement() {
  const [groups, setGroups] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [groupPermissions, setGroupPermissions] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeAction, setActiveAction] = useState("view");

  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");

  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [selectedGroupUuids, setSelectedGroupUuids] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [bulkDeletingGroups, setBulkDeletingGroups] = useState(false);

  const [permissionCurrentPage, setPermissionCurrentPage] = useState(1);

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState(null);

  const token = localStorage.getItem("token");

  const axiosInstance = axios.create({
    baseURL: `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}`,
    headers: { Authorization: `Bearer ${token}` },
  });

  const showUniqueToast = (message, type) => {
    toast.dismiss();
    showStatusToast(message, type, { toastId: "unique-toast" });
  };

  const validateGroupName = (name) => {
    const regex = /^[A-Za-z\s\-_]+$/;
    return regex.test(name.trim());
  };

  const fetchGroups = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get("/admin/groups");
      setGroups(res.data || []);
    } catch (err) {
      showUniqueToast("Failed to fetch groups: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const res = await axiosInstance.get("/admin/permissions/");
      setAllPermissions(res.data || []);
    } catch (err) {
      showUniqueToast(
        "Failed to fetch all permissions: " + err.message,
        "error",
      );
    }
  };

  const fetchGroupPermissions = async (groupId) => {
    setLoadingPermissions(true);

    try {
      const res = await axiosInstance.get(
        `/admin/groups/${groupId}/permissions`,
      );
      setGroupPermissions(res.data || []);
    } catch (err) {
      showUniqueToast(
        "Failed to fetch group permissions: " + err.message,
        "error",
      );
      setGroupPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchAllPermissions();
  }, []);

  useEffect(() => {
    setSelectedGroupUuids([]);
  }, [groupSearchTerm]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) =>
      group?.group_name?.toLowerCase().includes(groupSearchTerm.toLowerCase()),
    );
  }, [groups, groupSearchTerm]);

  const enrichWithCode = (permissionList) => {
    if (!Array.isArray(permissionList)) return [];

    return permissionList.map((permission) => {
      if (permission.permission_code) return permission;

      const found = allPermissions.find(
        (p) => p.permission_uuid === permission.permission_uuid,
      );

      return {
        ...permission,
        permission_code: found?.permission_code || "Unknown Code",
        description: found?.description || permission.description || "",
      };
    });
  };

  const resetPermissionSelection = () => {
    setPermissionSearchTerm("");
    setSelectedToAdd([]);
    setSelectedToRemove([]);
    setPermissionCurrentPage(1);
  };

  const openPermissionModal = async (group, action = "view") => {
    setSelectedGroup(group);
    setActiveAction(action);
    setShowPermissionModal(true);
    resetPermissionSelection();
    await fetchGroupPermissions(group.group_uuid);
  };

  const handleActionChange = async (action) => {
    if (!selectedGroup) return;

    setActiveAction(action);
    resetPermissionSelection();
    await fetchGroupPermissions(selectedGroup.group_uuid);
  };

  const closePermissionModal = () => {
    setShowPermissionModal(false);
    setSelectedGroup(null);
    setActiveAction("view");
    setGroupPermissions([]);
    resetPermissionSelection();
  };

  const unassignedPermissions = useMemo(() => {
    return allPermissions.filter(
      (permission) =>
        !groupPermissions.some(
          (gp) => gp.permission_uuid === permission.permission_uuid,
        ),
    );
  }, [allPermissions, groupPermissions]);

  const permissionsToDisplay = useMemo(() => {
    let list = [];

    if (activeAction === "add") {
      list = unassignedPermissions.filter(
        (permission) =>
          !selectedToAdd.some(
            (selected) =>
              selected.permission_uuid === permission.permission_uuid,
          ),
      );
    } else if (activeAction === "delete") {
      list = enrichWithCode(groupPermissions).filter(
        (permission) =>
          !selectedToRemove.some(
            (selected) =>
              selected.permission_uuid === permission.permission_uuid,
          ),
      );
    } else {
      list = enrichWithCode(groupPermissions);
    }

    if (!permissionSearchTerm) return list;

    return list.filter(
      (permission) =>
        permission.permission_code
          ?.toLowerCase()
          .includes(permissionSearchTerm.toLowerCase()) ||
        permission.description
          ?.toLowerCase()
          .includes(permissionSearchTerm.toLowerCase()),
    );
  }, [
    activeAction,
    unassignedPermissions,
    groupPermissions,
    selectedToAdd,
    selectedToRemove,
    permissionSearchTerm,
    allPermissions,
  ]);

  const permissionTotalPages = Math.ceil(
    permissionsToDisplay.length / PERMISSION_ITEMS_PER_PAGE,
  );

  const permissionStartIndex =
    (permissionCurrentPage - 1) * PERMISSION_ITEMS_PER_PAGE;

  const currentPermissions = permissionsToDisplay.slice(
    permissionStartIndex,
    permissionStartIndex + PERMISSION_ITEMS_PER_PAGE,
  );

  const selectedPermissions =
    activeAction === "add" ? selectedToAdd : selectedToRemove;

  const handleSelectPermission = (permission) => {
    const permissionUuid = permission.permission_uuid;

    if (activeAction === "add") {
      setSelectedToAdd((prev) =>
        prev.some((item) => item.permission_uuid === permissionUuid)
          ? prev.filter((item) => item.permission_uuid !== permissionUuid)
          : [...prev, permission],
      );
    }

    if (activeAction === "delete") {
      setSelectedToRemove((prev) =>
        prev.some((item) => item.permission_uuid === permissionUuid)
          ? prev.filter((item) => item.permission_uuid !== permissionUuid)
          : [...prev, permission],
      );
    }
  };

  const handleRemoveChip = (permissionUuid) => {
    if (activeAction === "add") {
      setSelectedToAdd((prev) =>
        prev.filter((item) => item.permission_uuid !== permissionUuid),
      );
    } else {
      setSelectedToRemove((prev) =>
        prev.filter((item) => item.permission_uuid !== permissionUuid),
      );
    }
  };

  const handleSubmitPermissions = async () => {
    if (selectedPermissions.length === 0) {
      return showUniqueToast("No permissions selected.", "warning");
    }

    setSubmitLoading(true);

    try {
      const permissionIds = selectedPermissions.map((p) => p.permission_uuid);

      if (activeAction === "add") {
        await axiosInstance.post(
          `/admin/groups/${selectedGroup.group_uuid}/permissions`,
          permissionIds,
        );

        showUniqueToast(
          `${selectedPermissions.length} permission(s) added successfully.`,
          "success",
        );
      } else {
        await axiosInstance.delete(
          `/admin/groups/${selectedGroup.group_uuid}/permissions`,
          { data: permissionIds },
        );

        showUniqueToast(
          `${selectedPermissions.length} permission(s) removed successfully.`,
          "success",
        );
      }

      resetPermissionSelection();
      await fetchGroupPermissions(selectedGroup.group_uuid);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message;

      showUniqueToast("Permission update failed: " + errorMessage, "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      return showUniqueToast("Enter the group name", "error");
    }

    if (!validateGroupName(newGroupName)) {
      return showUniqueToast(
        "Group name can only contain letters, spaces, hyphens, and underscores",
        "error",
      );
    }

    setCreating(true);

    try {
      await axiosInstance.post("/admin/groups", {
        group_name: newGroupName.trim(),
      });

      showUniqueToast("Group created successfully!", "success");
      setNewGroupName("");
      setShowCreateModal(false);
      await fetchGroups();
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
        "error",
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
        : [...prev, groupUuid],
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredUuids = filteredGroups.map((group) => group.group_uuid);

    const allSelected = filteredUuids.every((id) =>
      selectedGroupUuids.includes(id),
    );

    if (allSelected) {
      setSelectedGroupUuids((prev) =>
        prev.filter((id) => !filteredUuids.includes(id)),
      );
    } else {
      setSelectedGroupUuids((prev) => [
        ...new Set([...prev, ...filteredUuids]),
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
        "success",
      );

      setSelectedGroupUuids([]);
      await fetchGroups();
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

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-700" />
                Permission Group Management
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Create permission groups and manage permissions inside each
                group.
              </p>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800">
                Existing Groups
              </h4>
              <p className="text-sm text-gray-500">
                {filteredGroups.length} group(s) found
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {selectedGroupUuids.length > 0 && (
                <Button
                  onClick={confirmBulkDeleteGroups}
                  disabled={bulkDeletingGroups}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  {bulkDeletingGroups ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Selected ({selectedGroupUuids.length})
                    </>
                  )}
                </Button>
              )}

              <div className="w-full sm:w-72">
                <SearchInput
                  placeholder="Search group..."
                  onSearch={(value) => setGroupSearchTerm(value || "")}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <DynamicCardGrid
              data={[]}
              loading
              skeletonCount={GROUP_GRID_CONFIG.cardsPerPage}
              {...GROUP_GRID_CONFIG}
              renderCard={() => null}
              getKey={(_, index) => index}
            />
          ) : groups.length === 0 ? (
            <div className="text-center text-gray-500 py-10 border rounded-xl bg-gray-50">
              No groups found.
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-10 border rounded-xl bg-gray-50">
              No matching groups found.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    filteredGroups.length > 0 &&
                    filteredGroups.every((group) =>
                      selectedGroupUuids.includes(group.group_uuid),
                    )
                  }
                  onChange={handleSelectAllFiltered}
                  className="w-4 h-4"
                />
                <span>Select all filtered groups</span>
              </div>

              <DynamicCardGrid
                data={filteredGroups}
                getKey={(group) => group.group_uuid}
                resetPageDependency={groupSearchTerm}
                emptyMessage="No matching groups found."
                wrapperClassName="w-full"
                {...GROUP_GRID_CONFIG}
                renderCard={(group) => {
                  const isSelected = selectedGroupUuids.includes(
                    group.group_uuid,
                  );

                  return (
                    <AppCard
                      selected={isSelected}
                      variantClassMap={{
                        selected: "border-red-300 bg-red-50",
                      }}
                      className="min-h-[175px]"
                      renderHeader={() => (
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handleGroupCheckboxChange(group.group_uuid)
                              }
                              className="w-4 h-4 mt-3 shrink-0"
                            />

                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4
                                className="text-lg font-semibold text-gray-800 truncate"
                                title={group.group_name}
                              >
                                {group.group_name}
                              </h4>

                              <p className="text-sm text-gray-500 mt-1 truncate">
                                Manage assigned permissions
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleEditClick(group)}
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-900 shrink-0"
                            title={`Edit ${group.group_name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      actions={
                        <Button
                          onClick={() => openPermissionModal(group, "view")}
                          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-all"
                        >
                          Manage Permissions
                        </Button>
                      }
                    />
                  );
                }}
              />
            </>
          )}
        </div>
      </div>

      {showPermissionModal && selectedGroup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b bg-gray-50">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Manage Permissions
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    Group:{" "}
                    <span
                      className="font-medium text-blue-700"
                      title={selectedGroup.group_name}
                    >
                      {selectedGroup.group_name}
                    </span>
                  </p>
                </div>

                <button
                  onClick={closePermissionModal}
                  className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => handleActionChange("view")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeAction === "view"
                      ? "bg-pink-900 text-white"
                      : "bg-white border text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>

                <button
                  onClick={() => handleActionChange("add")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeAction === "add"
                      ? "bg-blue-900 text-white"
                      : "bg-white border text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>

                <button
                  onClick={() => handleActionChange("delete")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeAction === "delete"
                      ? "bg-red-600 text-white"
                      : "bg-white border text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-170px)]">
              {loadingPermissions ? (
                <div className="text-center text-gray-500 py-10">
                  Loading permissions...
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <SearchInput
                      placeholder="Search permission..."
                      onSearch={(value) => {
                        setPermissionSearchTerm(value || "");
                        setPermissionCurrentPage(1);
                      }}
                    />
                  </div>

                  {permissionsToDisplay.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 border rounded-xl bg-gray-50">
                      No permissions found.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {currentPermissions.map((permission) => {
                          const permissionUuid = permission.permission_uuid;

                          const isSelected = selectedPermissions.some(
                            (selected) =>
                              selected.permission_uuid === permissionUuid,
                          );

                          return (
                            <div
                              key={permissionUuid}
                              className={`p-4 rounded-xl border bg-white transition-all ${
                                isSelected
                                  ? activeAction === "delete"
                                    ? "border-red-300 bg-red-50"
                                    : "border-blue-300 bg-blue-50"
                                  : "hover:shadow-sm"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                                    <KeyRound className="w-4 h-4" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h5
                                      className="font-medium text-gray-800 truncate"
                                      title={permission.permission_code}
                                    >
                                      {permission.permission_code}
                                    </h5>

                                    <p
                                      className="text-xs text-gray-500 mt-1 break-words"
                                      title={permission.description}
                                    >
                                      {permission.description ||
                                        "No description available."}
                                    </p>
                                  </div>
                                </div>

                                {activeAction !== "view" && (
                                  <button
                                    onClick={() =>
                                      handleSelectPermission(permission)
                                    }
                                    className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                                      isSelected
                                        ? "bg-green-600 text-white"
                                        : activeAction === "delete"
                                        ? "bg-red-600 text-white hover:bg-red-700"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    {isSelected ? "Selected" : "Select"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {permissionTotalPages > 1 && (
                        <div className="mt-5">
                          <Pagination
                            currentPage={permissionCurrentPage}
                            totalPages={permissionTotalPages}
                            onPrevious={() =>
                              setPermissionCurrentPage((prev) =>
                                Math.max(prev - 1, 1),
                              )
                            }
                            onNext={() =>
                              setPermissionCurrentPage((prev) =>
                                Math.min(prev + 1, permissionTotalPages),
                              )
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {activeAction !== "view" && (
                    <div className="mt-5 border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected permissions
                      </label>

                      {selectedPermissions.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No permissions selected yet.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedPermissions.map((permission) => (
                            <span
                              key={permission.permission_uuid}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium max-w-full ${
                                activeAction === "delete"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              <span
                                className="truncate max-w-[220px]"
                                title={permission.permission_code}
                              >
                                {permission.permission_code}
                              </span>
                              <button
                                onClick={() =>
                                  handleRemoveChip(permission.permission_uuid)
                                }
                                className="font-bold hover:text-red-600 shrink-0"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-5">
                        <Button
                          onClick={closePermissionModal}
                          className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={handleSubmitPermissions}
                          disabled={
                            selectedPermissions.length === 0 || submitLoading
                          }
                          className={`px-5 py-2 text-white rounded-lg font-medium ${
                            selectedPermissions.length && !submitLoading
                              ? activeAction === "add"
                                ? "bg-blue-900 hover:bg-blue-950"
                                : "bg-red-600 hover:bg-red-700"
                              : "bg-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {submitLoading
                            ? activeAction === "add"
                              ? "Adding..."
                              : "Removing..."
                            : activeAction === "add"
                            ? "Add Permissions"
                            : "Remove Permissions"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Create Group</h2>

        <input
          type="text"
          placeholder="Group Name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />

        <div className="flex justify-end gap-3">
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setNewGroupName("");
            }}
            variant="secondary"
          >
            Cancel
          </Button>

          <Button onClick={handleCreate} disabled={creating} variant="primary">
            {creating ? "Creating..." : "Create"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Edit Group</h2>

        <input
          type="text"
          placeholder="Group Name"
          value={editGroupName}
          onChange={(e) => setEditGroupName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
        />

        <div className="flex justify-end gap-3">
          <Button
            onClick={() => {
              setShowEditModal(false);
              setEditingGroup(null);
              setEditGroupName("");
            }}
            variant="secondary"
          >
            Cancel
          </Button>

          <Button onClick={handleUpdate} disabled={updating} variant="primary">
            {updating ? "Saving..." : "Save"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}