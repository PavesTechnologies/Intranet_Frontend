import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Layers,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
} from "lucide-react";

import {
  getPermissionGroupsByRole,
  getAvailablePermissionGroupsForRole,
  addPermissionGroupsToRole,
  removePermissionGroupsFromRole,
} from "../../../../services/roleManagementService";

import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { Fonts } from "../../../../components/Fonts/Fonts";

const ROLE_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "210px",
  gapClassName: "gap-3",
  gridClassName: "items-stretch",
};

const GROUP_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "180px",
  gapClassName: "gap-3",
  gridClassName: "items-stretch",
  showPagination: true,
};

const ACTION_TABS = [
  { key: "view", label: "View", icon: Eye, variant: "secondary" },
  { key: "add", label: "Add", icon: Plus, variant: "primary" },
  { key: "delete", label: "Delete", icon: Trash2, variant: "danger" },
];

const RoleCard = ({ role, onManage }) => (
  <AppCard
    compact
    icon={<ShieldCheck className="h-4 w-4" />}
    title={role.role_name}
    subtitle="Manage assigned permission groups"
    className="h-full min-h-[110px] border-gray-200 hover:border-[#0A0082]/40"
    actions={
      <Button
        type="button"
        onClick={() => onManage(role)}
        variant="primary"
        size="small"
        className="w-full sm:w-auto"
      >
        <Eye className="h-4 w-4" />
        Manage
      </Button>
    }
  />
);

const GroupCard = ({ group, isSelected, activeAction, onSelect }) => {
  const selectedClass = isSelected
    ? activeAction === "delete"
      ? "border-red-300 bg-red-50"
      : "border-blue-300 bg-blue-50"
    : "border-gray-200 hover:border-[#0A0082]/40";

  return (
    <AppCard
      compact
      icon={<Layers className="h-3.5 w-3.5" />}
      iconSize="w-7 h-7"
      title={group.group_name}
      subtitle={`Module: ${group.module || "General"}`}
      className={`h-full min-h-[85px] transition-all ${selectedClass}`}
      headerClassName="gap-2"
      renderActions={
        activeAction !== "view"
          ? () => (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="small"
                  variant={
                    isSelected
                      ? "success"
                      : activeAction === "delete"
                      ? "danger"
                      : "primary"
                  }
                  onClick={() => onSelect(group)}
                  className="w-full sm:w-auto"
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  {isSelected ? "Selected" : "Select"}
                </Button>
              </div>
            )
          : undefined
      }
    />
  );
};

const ModuleGroupHeader = ({ groupKey, items }) => (
  <div className="mb-1 overflow-hidden rounded-xl border bg-gray-50">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-700" />
        <h4 className="text-sm font-semibold text-gray-800">{groupKey}</h4>
      </div>

      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
        {items.length} group{items.length !== 1 ? "s" : ""}
      </span>
    </div>
  </div>
);

const PermissionGroupManagement = ({ roles = [] }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [activeAction, setActiveAction] = useState("view");

  const [availablePermissionGroups, setAvailablePermissionGroups] = useState([]);
  const [permissionGroupsForRole, setPermissionGroupsForRole] = useState([]);

  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("All");

  const [selectedGroupNames, setSelectedGroupNames] = useState([]);
  const [selectedGroupUUIDs, setSelectedGroupUUIDs] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const filteredRoles = useMemo(() => {
    const term = roleSearchTerm.trim().toLowerCase();

    if (!term) return roles;

    return roles.filter((role) =>
      role.role_name?.toLowerCase().includes(term)
    );
  }, [roles, roleSearchTerm]);

  const normalizeGroup = (group) => ({
    ...group,
    module:
      group.module ||
      group.access_module ||
      group.module_name ||
      group.accessPointModule ||
      "General",
  });

  const groupsToDisplay =
    activeAction === "add" ? availablePermissionGroups : permissionGroupsForRole;

  const modules = useMemo(() => {
    const unique = new Set(groupsToDisplay.map((group) => group.module));
    return ["All", ...Array.from(unique)];
  }, [groupsToDisplay]);

  const filteredGroups = useMemo(() => {
    const term = groupSearchTerm.trim().toLowerCase();

    return groupsToDisplay.filter((group) => {
      const matchesSearch = group.group_name?.toLowerCase().includes(term);
      const matchesModule =
        selectedModule === "All" || group.module === selectedModule;

      return matchesSearch && matchesModule;
    });
  }, [groupsToDisplay, groupSearchTerm, selectedModule]);

  const resetSelection = () => {
    setSelectedGroupNames([]);
    setSelectedGroupUUIDs([]);
    setGroupSearchTerm("");
    setSelectedModule("All");
  };

  const fetchGroups = async (role, action) => {
    setLoadingGroups(true);

    try {
      if (action === "add") {
        const res = await getAvailablePermissionGroupsForRole(role.role_uuid);
        setAvailablePermissionGroups((res.data || []).map(normalizeGroup));
      } else {
        const res = await getPermissionGroupsByRole(role.role_uuid);
        setPermissionGroupsForRole((res.data || []).map(normalizeGroup));
      }
    } catch (err) {
      console.error("Failed to fetch permission groups:", err);
      showStatusToast("Failed to fetch permission groups.", "error");
      setAvailablePermissionGroups([]);
      setPermissionGroupsForRole([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadGroups = async (role, action = "view") => {
    setSelectedRole(role);
    setActiveAction(action);
    setShowModal(true);
    resetSelection();
    await fetchGroups(role, action);
  };

  const handleActionChange = async (action) => {
    if (!selectedRole) return;

    setActiveAction(action);
    resetSelection();
    await fetchGroups(selectedRole, action);
  };

  const handleSelectGroup = (group) => {
    const uuidStr = group.group_uuid?.toString();

    if (!uuidStr) return;

    if (selectedGroupUUIDs.includes(uuidStr)) {
      const index = selectedGroupUUIDs.indexOf(uuidStr);

      setSelectedGroupUUIDs((prev) => prev.filter((id) => id !== uuidStr));
      setSelectedGroupNames((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedGroupUUIDs((prev) => [...prev, uuidStr]);
      setSelectedGroupNames((prev) => [...prev, group.group_name]);
    }
  };

  const handleRemoveGroup = (name) => {
    const index = selectedGroupNames.indexOf(name);

    if (index !== -1) {
      setSelectedGroupNames((prev) => prev.filter((n) => n !== name));
      setSelectedGroupUUIDs((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!selectedGroupUUIDs.length) {
      showStatusToast("Select permission group(s).", "error");
      return;
    }

    setSubmitLoading(true);

    try {
      if (activeAction === "add") {
        await addPermissionGroupsToRole(
          selectedRole.role_uuid,
          selectedGroupUUIDs
        );
        showStatusToast("Groups added successfully.", "success");
      } else {
        await removePermissionGroupsFromRole(
          selectedRole.role_uuid,
          selectedGroupUUIDs
        );
        showStatusToast("Groups removed successfully.", "success");
      }

      setShowModal(false);
      resetSelection();
    } catch (err) {
      console.error("Permission group action failed:", err);
      showStatusToast(
        activeAction === "add"
          ? "Failed to add groups."
          : "Failed to remove groups.",
        "error"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    resetSelection();
  };

  const submitLabel = activeAction === "add" ? "Add Groups" : "Remove Groups";

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className={Fonts.heading4}>Permission Groups by Role</h3>
              <p className={Fonts.paragraphMuted}>
                Manage permission groups module-wise for each role.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-72">
            <SearchInput
              placeholder="Search role..."
              onSearch={(value) => setRoleSearchTerm(value || "")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            No roles found.
          </div>
        ) : (
          <DynamicCardGrid
            data={filteredRoles}
            getKey={(role) => role.role_uuid}
            resetPageDependency={roleSearchTerm}
            paginationWrapperClassName="mt-4 flex justify-center"
            wrapperClassName="w-full min-w-0"
            emptyMessage="No matching roles found."
            {...ROLE_GRID_CONFIG}
            renderCard={(role) => (
              <RoleCard role={role} onManage={(r) => loadGroups(r, "view")} />
            )}
          />
        )}
      </div>

      <Modal
        isOpen={showModal && !!selectedRole}
        onClose={closeModal}
        title="Manage Permission Groups"
        subtitle={
          selectedRole
            ? `Role: ${selectedRole.role_name}`
            : "Manage assigned permission groups"
        }
        titleIcon={<Layers className="h-5 w-5" />}
        size="5xl"
        fullScreenMobile
        maxHeight="max-h-[86vh]"
        bodyClassName="p-0 overflow-hidden"
        scrollable={false}
        closeOnBackdrop={!loadingGroups && !submitLoading}
        footerClassName="px-4 py-2 sm:px-4 sm:py-2"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {activeAction !== "view" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={closeModal}
                  disabled={submitLoading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="small"
                  onClick={handleSubmit}
                  disabled={!selectedGroupUUIDs.length || submitLoading}
                  loading={submitLoading}
                  loadingText={
                    activeAction === "add" ? "Adding..." : "Removing..."
                  }
                  variant={activeAction === "add" ? "primary" : "danger"}
                  className="w-full sm:w-auto"
                >
                  {submitLabel}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="small"
                onClick={closeModal}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            )}
          </div>
        }
      >
        <div className="flex max-h-[calc(86vh-230px)] flex-col overflow-hidden">
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

            {!loadingGroups && (
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SearchInput
                    placeholder="Search permission group..."
                    onSearch={(value) => setGroupSearchTerm(value || "")}
                  />
                </div>

                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
                >
                  {modules.map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">
            {loadingGroups ? (
              <div className="rounded-xl border border-gray-200 bg-white py-14">
                <LoadingSpinner text="Loading permission groups..." />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No permission groups found.
              </div>
            ) : (
              <DynamicCardGrid
                data={filteredGroups}
                getKey={(group, index) => group.group_uuid || index}
                resetPageDependency={`${groupSearchTerm}|${selectedModule}|${activeAction}`}
                paginationWrapperClassName="mt-4 flex justify-center"
                wrapperClassName="w-full min-w-0"
                emptyMessage="No permission groups matched your search."
                groupBy={(group) => group.module || "General"}
                renderGroupHeader={(groupKey, items) => (
                  <ModuleGroupHeader groupKey={groupKey} items={items} />
                )}
                {...GROUP_GRID_CONFIG}
                renderCard={(group) => {
                  const uuidStr = group.group_uuid?.toString();
                  const isSelected = selectedGroupUUIDs.includes(uuidStr);

                  return (
                    <GroupCard
                      group={group}
                      isSelected={isSelected}
                      activeAction={activeAction}
                      onSelect={handleSelectGroup}
                    />
                  );
                }}
              />
            )}
          </div>
        </div>

        {activeAction !== "view" && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
            <label className={Fonts.label}>Selected groups</label>

            {selectedGroupNames.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">
                No groups selected yet.
              </p>
            ) : (
              <div className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto pr-1">
                {selectedGroupNames.map((name) => (
                  <span
                    key={name}
                    className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                      activeAction === "delete"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    <span className="max-w-[180px] truncate">{name}</span>

                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(name)}
                      className="font-bold hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PermissionGroupManagement;