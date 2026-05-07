import { useState, useMemo } from "react";
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
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  ShieldCheck,
  Layers,
  Plus,
  Trash2,
  Eye,
  X,
  CheckCircle2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Layout config — developers change these to reshape layouts globally
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_GRID_CONFIG = {
  layoutMode: "grid",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "245px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
};

const GROUP_GRID_CONFIG = {
  layoutMode: "grid",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "230px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
  showPagination: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Action tab config — add/remove tabs here without touching JSX
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_TABS = [
  {
    key: "view",
    label: "View",
    icon: Eye,
    activeClass: "bg-pink-900 text-white",
    inactiveClass: "bg-white border text-gray-700 hover:bg-gray-100",
  },
  {
    key: "add",
    label: "Add",
    icon: Plus,
    activeClass: "bg-blue-900 text-white",
    inactiveClass: "bg-white border text-gray-700 hover:bg-gray-100",
  },
  {
    key: "delete",
    label: "Delete",
    icon: Trash2,
    activeClass: "bg-red-600 text-white",
    inactiveClass: "bg-white border text-gray-700 hover:bg-gray-100",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components — swap these independently to change card appearance
// ─────────────────────────────────────────────────────────────────────────────

/** Role card shown on the main listing page */
const RoleCard = ({ role, onManage }) => (
  <AppCard
    icon={<ShieldCheck className="w-4 h-4" />}
    title={role.role_name}
    subtitle="Manage assigned permission groups"
    className="min-h-[145px] p-4 border-gray-200 hover:border-blue-200"
    actions={
      <Button
        onClick={() => onManage(role)}
        className="px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-all flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Manage
      </Button>
    }
  />
);

/** Permission group card shown inside the modal */
const GroupCard = ({ group, isSelected, activeAction, onSelect }) => {
  const selectedClass = isSelected
    ? activeAction === "delete"
      ? "border-red-300 bg-red-50"
      : "border-blue-300 bg-blue-50"
    : "border-gray-200 hover:border-blue-200";

  const selectBtnClass = isSelected
    ? "bg-green-600 text-white"
    : activeAction === "delete"
    ? "bg-red-600 text-white hover:bg-red-700"
    : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <AppCard
      icon={<Layers className="w-4 h-4" />}
      title={group.group_name}
      subtitle={`Module: ${group.module || "General"}`}
      className={`min-h-[120px] p-4 transition-all ${selectedClass}`}
      renderActions={
        activeAction !== "view"
          ? () => (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => onSelect(group)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${selectBtnClass}`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                  {isSelected ? "Selected" : "Select"}
                </button>
              </div>
            )
          : undefined
      }
    />
  );
};

/** Group header rendered above each module section in the grid */
const ModuleGroupHeader = ({ groupKey, items }) => (
  <div className="border rounded-xl bg-gray-50 overflow-hidden mb-1">
    <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-700" />
        <h4 className="font-semibold text-gray-800">{groupKey}</h4>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
        {items.length} group{items.length !== 1 ? "s" : ""}
      </span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const PermissionGroupManagement = ({ roles }) => {
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

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredRoles = useMemo(
    () =>
      roles.filter((role) =>
        role.role_name?.toLowerCase().includes(roleSearchTerm.toLowerCase()),
      ),
    [roles, roleSearchTerm],
  );

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
    const unique = new Set(groupsToDisplay.map((g) => g.module));
    return ["All", ...Array.from(unique)];
  }, [groupsToDisplay]);

  const filteredGroups = useMemo(
    () =>
      groupsToDisplay.filter((group) => {
        const matchesSearch = group.group_name
          ?.toLowerCase()
          .includes(groupSearchTerm.toLowerCase());
        const matchesModule =
          selectedModule === "All" || group.module === selectedModule;
        return matchesSearch && matchesModule;
      }),
    [groupsToDisplay, groupSearchTerm, selectedModule],
  );

  // ── Helpers ─────────────────────────────────────────────────────────────
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
      showStatusToast("Failed to fetch permission groups", "error");
      setAvailablePermissionGroups([]);
      setPermissionGroupsForRole([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
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
      showStatusToast("Select permission group(s)", "error");
      return;
    }
    setSubmitLoading(true);
    try {
      if (activeAction === "add") {
        await addPermissionGroupsToRole(selectedRole.role_uuid, selectedGroupUUIDs);
        showStatusToast("Groups added successfully", "success");
      } else {
        await removePermissionGroupsFromRole(selectedRole.role_uuid, selectedGroupUUIDs);
        showStatusToast("Groups removed successfully", "success");
      }
      setShowModal(false);
      resetSelection();
    } catch (err) {
      console.error("Permission group action failed:", err);
      showStatusToast(
        activeAction === "add" ? "Failed to add groups" : "Failed to remove groups",
        "error",
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

  // ── Submit button label / style ──────────────────────────────────────────
  const submitLabel = submitLoading
    ? activeAction === "add" ? "Adding..." : "Removing..."
    : activeAction === "add" ? "Add Groups" : "Remove Groups";

  const submitClass =
    selectedGroupUUIDs.length && !submitLoading
      ? activeAction === "add"
        ? "bg-blue-900 hover:bg-blue-950"
        : "bg-red-600 hover:bg-red-700"
      : "bg-gray-400 cursor-not-allowed";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white -mx-6 -mt-6 p-5 sm:p-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-gray-800">
                Permission Groups by Role
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage permission groups module-wise for each role.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              placeholder="Search role..."
              onSearch={(value) => setRoleSearchTerm(value || "")}
            />
          </div>
        </div>
      </div>

      {/* ── Role grid ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        {roles.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No roles found.</div>
        ) : (
          <DynamicCardGrid
            data={filteredRoles}
            getKey={(role) => role.role_uuid}
            resetPageDependency={roleSearchTerm}
            paginationWrapperClassName="mt-5 flex justify-center"
            wrapperClassName="w-full"
            emptyMessage="No matching roles found."
            {...ROLE_GRID_CONFIG}
            renderCard={(role) => (
              <RoleCard role={role} onManage={(r) => loadGroups(r, "view")} />
            )}
          />
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {showModal && selectedRole && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col border border-gray-200">

            {/* Modal header */}
            <div className="p-5 border-b bg-white shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Manage Permission Groups
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      Role:{" "}
                      <span className="font-medium text-blue-700" title={selectedRole.role_name}>
                        {selectedRole.role_name}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action tabs */}
              <div className="flex flex-wrap gap-2 mt-4">
                {ACTION_TABS.map(({ key, label, icon: Icon, activeClass, inactiveClass }) => (
                  <button
                    key={key}
                    onClick={() => handleActionChange(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      activeAction === key ? activeClass : inactiveClass
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Filters — shown only when not loading */}
              {!loadingGroups && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <div className="lg:col-span-2">
                    <SearchInput
                      placeholder="Search permission group..."
                      onSearch={(value) => setGroupSearchTerm(value || "")}
                    />
                  </div>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
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

            {/* Modal body */}
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              {loadingGroups ? (
                <DynamicCardGrid
                  data={[]}
                  loading
                  skeletonCount={GROUP_GRID_CONFIG.cardsPerPage}
                  {...GROUP_GRID_CONFIG}
                  renderCard={() => null}
                  getKey={(_, i) => i}
                />
              ) : filteredGroups.length === 0 ? (
                <div className="text-center text-gray-500 py-10 border border-gray-200 rounded-xl bg-white">
                  No permission groups found.
                </div>
              ) : (
                <>
                  <DynamicCardGrid
                    data={filteredGroups}
                    getKey={(g, i) => g.group_uuid || i}
                    resetPageDependency={`${groupSearchTerm}|${selectedModule}`}
                    paginationWrapperClassName="mt-5 flex justify-center"
                    wrapperClassName="w-full"
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

                  {/* Selection summary — add / delete only */}
                  {activeAction !== "view" && (
                    <div className="mt-5 border-t pt-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected groups
                      </label>
                      {selectedGroupNames.length === 0 ? (
                        <p className="text-sm text-gray-500">No groups selected yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedGroupNames.map((name) => (
                            <span
                              key={name}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                activeAction === "delete"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {name}
                              <button
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
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t bg-white shrink-0 flex justify-end gap-3">
              {activeAction !== "view" ? (
                <>
                  <Button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedGroupUUIDs.length || submitLoading}
                    className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition-all ${submitClass}`}
                  >
                    {submitLabel}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionGroupManagement;