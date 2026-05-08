import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Pencil,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import FormInput from "../../../../components/forms/FormInput";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

const GROUP_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "240px",
  gapClassName: "gap-3",
  gridClassName: "items-stretch",
};

const PERMISSION_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "210px",
  gapClassName: "gap-3",
  gridClassName: "items-stretch",
};

const ACTION_TABS = [
  { key: "view", label: "View", icon: Eye, variant: "secondary" },
  { key: "add", label: "Add", icon: Plus, variant: "primary" },
  { key: "delete", label: "Delete", icon: Trash2, variant: "danger" },
];

const GroupCard = ({
  group,
  isSelected,
  isBulkSelected,
  onManage,
  onEdit,
  onToggleBulkSelect,
}) => (
  <div className="relative h-full min-w-0">
    <input
      type="checkbox"
      checked={isBulkSelected}
      onChange={() => onToggleBulkSelect(group.group_uuid)}
      className="absolute left-3 top-3 z-10 h-4 w-4 rounded accent-[#0A0082]"
    />

    <AppCard
      compact
      icon={<ShieldCheck className="h-4 w-4" />}
      iconSize="w-8 h-8"
      title={group.group_name}
      subtitle="Manage assigned permissions"
      selected={isSelected || isBulkSelected}
      className={`h-full min-h-[110px] min-w-0 border-gray-200 pl-8 hover:border-[#0A0082]/40 ${
        isBulkSelected ? "border-red-300 bg-red-50" : ""
      }`}
      actions={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            onClick={() => onManage(group)}
            size="small"
            variant="primary"
            className="w-full sm:w-auto"
          >
            <Eye className="h-4 w-4" />
            Manage
          </Button>

          <Button
            type="button"
            onClick={() => onEdit(group)}
            size="icon"
            variant="link"
            title="Edit"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
          >
            <Pencil size={17} />
          </Button>
        </div>
      }
    />
  </div>
);

const PermissionCard = ({ permission, activeAction, isSelected, onSelect }) => (
  <AppCard
    compact
    icon={<KeyRound className="h-3.5 w-3.5" />}
    iconSize="w-7 h-7"
    title={permission.permission_code || "Unknown Code"}
    subtitle={permission.description || "No description available."}
    selected={isSelected}
    className={`h-full min-h-[85px] min-w-0 border-gray-200 hover:border-[#0A0082]/40 ${
      isSelected
        ? activeAction === "delete"
          ? "border-red-300 bg-red-50"
          : "border-blue-300 bg-blue-50"
        : ""
    }`}
    headerClassName="gap-2"
    actions={
      activeAction !== "view" && (
        <Button
          type="button"
          onClick={() => onSelect(permission)}
          size="small"
          variant={
            isSelected
              ? "success"
              : activeAction === "delete"
                ? "danger"
                : "primary"
          }
          className="w-full sm:w-auto"
        >
          {isSelected && <CheckCircle2 className="h-3 w-3" />}
          {isSelected ? "Selected" : "Select"}
        </Button>
      )
    }
  />
);

const PermissionChip = ({ permission, activeAction, onRemove }) => (
  <span
    className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
      activeAction === "delete"
        ? "bg-red-100 text-red-800"
        : "bg-blue-100 text-blue-800"
    }`}
  >
    <span
      className="max-w-[180px] truncate"
      title={permission.permission_code}
    >
      {permission.permission_code}
    </span>

    <button
      type="button"
      onClick={() => onRemove(permission.permission_uuid)}
      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
      aria-label={`Remove ${permission.permission_code}`}
    >
      ×
    </button>
  </span>
);

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

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState(null);

  const token = localStorage.getItem("token");

  const axiosInstance = axios.create({
    baseURL: window.__APP_CONFIG__.USER_MANAGEMENT_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const showUniqueToast = (message, type) => {
    toast.dismiss();
    showStatusToast(message, type);
  };

  const validateGroupName = (name) => /^[A-Za-z\s\-_]+$/.test(name.trim());

  const fetchGroups = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get("/admin/groups");
      setGroups(res.data || []);
    } catch (err) {
      showUniqueToast(`Failed to fetch groups: ${err.message}`, "error");
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
        `Failed to fetch all permissions: ${err.message}`,
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
        `Failed to fetch group permissions: ${err.message}`,
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
    const term = groupSearchTerm.trim().toLowerCase();

    if (!term) return groups;

    return groups.filter((group) =>
      group?.group_name?.toLowerCase().includes(term),
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

    const term = permissionSearchTerm.trim().toLowerCase();

    if (!term) return list;

    return list.filter(
      (permission) =>
        permission.permission_code?.toLowerCase().includes(term) ||
        permission.description?.toLowerCase().includes(term),
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

      showUniqueToast(`Permission update failed: ${errorMessage}`, "error");
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
        data: { group_uuids: selectedGroupUuids },
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

      showUniqueToast(`Failed to delete groups: ${errorMessage}`, "error");
    } finally {
      setBulkDeletingGroups(false);
    }
  };

  const permissionModalFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {activeAction !== "view" ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={closePermissionModal}
            disabled={submitLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="small"
            onClick={handleSubmitPermissions}
            disabled={!selectedPermissions.length || submitLoading}
            loading={submitLoading}
            loadingText={activeAction === "add" ? "Adding..." : "Removing..."}
            variant={activeAction === "add" ? "primary" : "danger"}
            className="w-full sm:w-auto"
          >
            {activeAction === "add" ? "Add Permissions" : "Remove Permissions"}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="small"
          onClick={closePermissionModal}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className={Fonts.heading4}>Permission Group Management</h3>
              <p className={Fonts.paragraphMuted}>
                Create permission groups and manage permissions.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            {selectedGroupUuids.length > 0 && (
              <Button
                onClick={confirmBulkDeleteGroups}
                disabled={bulkDeletingGroups}
                loading={bulkDeletingGroups}
                loadingText="Deleting..."
                variant="danger"
                size="small"
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedGroupUuids.length})
              </Button>
            )}

            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="medium"
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className={Fonts.heading4}>Existing Groups</h3>
            <p className={Fonts.paragraphMuted}>
              {filteredGroups.length} group(s) found
            </p>
          </div>

          <div className="w-full lg:w-80">
            <SearchInput
              placeholder="Search group..."
              onSearch={(value) => setGroupSearchTerm(value || "")}
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16">
            <LoadingSpinner text="Loading groups..." />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            No groups found.
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
                className="h-4 w-4 rounded accent-[#0A0082]"
              />
              <span>Select all filtered groups</span>
            </div>

            <DynamicCardGrid
              data={filteredGroups}
              getKey={(group) => group.group_uuid}
              resetPageDependency={groupSearchTerm}
              paginationWrapperClassName="mt-5 flex justify-center"
              wrapperClassName="w-full min-w-0"
              emptyMessage="No matching groups found."
              {...GROUP_GRID_CONFIG}
              renderCard={(group) => (
                <GroupCard
                  group={group}
                  isSelected={selectedGroup?.group_uuid === group.group_uuid}
                  isBulkSelected={selectedGroupUuids.includes(group.group_uuid)}
                  onManage={(g) => openPermissionModal(g, "view")}
                  onEdit={handleEditClick}
                  onToggleBulkSelect={handleGroupCheckboxChange}
                />
              )}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={showPermissionModal && !!selectedGroup}
        onClose={closePermissionModal}
        title="Manage Permissions"
        subtitle={
          selectedGroup
            ? `Group: ${selectedGroup.group_name}`
            : "Manage assigned permissions"
        }
        titleIcon={<KeyRound className="h-5 w-5" />}
        size="5xl"
        fullScreenMobile
        maxHeight="max-h-[86vh]"
        bodyClassName="p-0 overflow-hidden flex flex-col"
        scrollable={false}
        closeOnBackdrop={!loadingPermissions && !submitLoading}
        footerClassName="px-4 py-2 sm:px-4 sm:py-2"
        footer={permissionModalFooter}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-gray-100 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {ACTION_TABS.map(({ key, label, icon: Icon, variant }) => (
                <Button
                  key={key}
                  type="button"
                  size="small"
                  variant={activeAction === key ? variant : "outline"}
                  onClick={() => handleActionChange(key)}
                  className="flex-1 sm:flex-none"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>

            {!loadingPermissions && (
              <div className="mt-4">
                <SearchInput
                  placeholder="Search permission code or description..."
                  onSearch={(value) => setPermissionSearchTerm(value || "")}
                />
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 pb-6">
            {loadingPermissions ? (
              <div className="rounded-xl border border-gray-200 bg-white py-14">
                <LoadingSpinner text="Loading permissions..." />
              </div>
            ) : permissionsToDisplay.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No permissions found.
              </div>
            ) : (
              <DynamicCardGrid
                data={permissionsToDisplay}
                getKey={(permission, index) =>
                  permission.permission_uuid || index
                }
                resetPageDependency={`${permissionSearchTerm}|${activeAction}`}
                paginationWrapperClassName="mt-4 flex justify-center"
                wrapperClassName="w-full min-w-0"
                emptyMessage="No permissions matched your search."
                {...PERMISSION_GRID_CONFIG}
                renderCard={(permission) => {
                  const isSelected = selectedPermissions.some(
                    (selected) =>
                      selected.permission_uuid === permission.permission_uuid,
                  );

                  return (
                    <PermissionCard
                      permission={permission}
                      activeAction={activeAction}
                      isSelected={isSelected}
                      onSelect={handleSelectPermission}
                    />
                  );
                }}
              />
            )}
          </div>

          {activeAction !== "view" && (
            <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className={Fonts.label}>Selected permissions</label>

                <span className="text-xs font-medium text-gray-500">
                  {selectedPermissions.length} selected
                </span>
              </div>

              {selectedPermissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                  No permissions selected yet.
                </div>
              ) : (
                <div className="max-h-20 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedPermissions.map((permission) => (
                      <PermissionChip
                        key={permission.permission_uuid}
                        permission={permission}
                        activeAction={activeAction}
                        onRemove={handleRemoveChip}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Group"
        subtitle="Create a new permission group."
        size="lg"
        maxHeight="max-h-[86vh]"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewGroupName("");
              }}
              variant="outline"
              size="small"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreate}
              disabled={creating}
              loading={creating}
              loadingText="Creating..."
              variant="primary"
              size="small"
              className="w-full sm:w-auto"
            >
              Create
            </Button>
          </div>
        }
      >
        <FormInput
          label="Group Name"
          name="group_name"
          placeholder="Enter group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Group"
        subtitle="Update group details."
        size="lg"
        maxHeight="max-h-[86vh]"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => {
                setShowEditModal(false);
                setEditingGroup(null);
                setEditGroupName("");
              }}
              variant="outline"
              size="small"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              onClick={handleUpdate}
              disabled={updating}
              loading={updating}
              loadingText="Saving..."
              variant="primary"
              size="small"
              className="w-full sm:w-auto"
            >
              Save
            </Button>
          </div>
        }
      >
        <FormInput
          label="Group Name"
          name="edit_group_name"
          placeholder="Enter group name"
          value={editGroupName}
          onChange={(e) => setEditGroupName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
        />
      </Modal>
    </div>
  );
}