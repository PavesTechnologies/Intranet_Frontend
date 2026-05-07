import { useState, useMemo } from "react";
import {
  getPermissionGroupsByRole,
  getAvailablePermissionGroupsForRole,
  addPermissionGroupsToRole,
  removePermissionGroupsFromRole,
} from "../../../../services/roleManagementService";

import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import Pagination from "../../../../components/Pagination/pagination";
import { showStatusToast } from "../../../../components/toastfy/toast";

import {
  ShieldCheck,
  Layers,
  Plus,
  Trash2,
  Eye,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";

const ITEMS_PER_PAGE = 6;
const GROUP_ITEMS_PER_PAGE = 8;

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

  const [currentPage, setCurrentPage] = useState(1);
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);

  const filteredRoles = useMemo(() => {
    return roles.filter((role) =>
      role.role_name?.toLowerCase().includes(roleSearchTerm.toLowerCase()),
    );
  }, [roles, roleSearchTerm]);

  const totalPages = Math.ceil(filteredRoles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentRoles = filteredRoles.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const resetSelection = () => {
    setSelectedGroupNames([]);
    setSelectedGroupUUIDs([]);
    setGroupSearchTerm("");
    setSelectedModule("All");
    setGroupCurrentPage(1);
  };

  const normalizeGroup = (group) => ({
    ...group,
    module:
      group.module ||
      group.access_module ||
      group.module_name ||
      group.accessPointModule ||
      "General",
  });

  const loadGroups = async (role, action = "view") => {
    setSelectedRole(role);
    setActiveAction(action);
    setShowModal(true);
    resetSelection();
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

  const handleActionChange = async (action) => {
    if (!selectedRole) return;

    setActiveAction(action);
    resetSelection();
    setLoadingGroups(true);

    try {
      if (action === "add") {
        const res = await getAvailablePermissionGroupsForRole(
          selectedRole.role_uuid,
        );
        setAvailablePermissionGroups((res.data || []).map(normalizeGroup));
      } else {
        const res = await getPermissionGroupsByRole(selectedRole.role_uuid);
        setPermissionGroupsForRole((res.data || []).map(normalizeGroup));
      }
    } catch (err) {
      console.error("Failed to fetch permission groups:", err);
      showStatusToast("Failed to fetch permission groups", "error");
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSelectGroup = (group) => {
    const uuidStr = group.group_uuid?.toString();

    if (!uuidStr) return;

    if (selectedGroupUUIDs.includes(uuidStr)) {
      const index = selectedGroupUUIDs.indexOf(uuidStr);
      setSelectedGroupUUIDs((prev) => prev.filter((id) => id !== uuidStr));
      setSelectedGroupNames((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    setSelectedGroupUUIDs((prev) => [...prev, uuidStr]);
    setSelectedGroupNames((prev) => [...prev, group.group_name]);
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
        await addPermissionGroupsToRole(
          selectedRole.role_uuid,
          selectedGroupUUIDs,
        );
        showStatusToast("Groups added successfully", "success");
      } else {
        await removePermissionGroupsFromRole(
          selectedRole.role_uuid,
          selectedGroupUUIDs,
        );
        showStatusToast("Groups removed successfully", "success");
      }

      setShowModal(false);
      resetSelection();
    } catch (err) {
      console.error("Permission group action failed:", err);
      showStatusToast(
        activeAction === "add"
          ? "Failed to add groups"
          : "Failed to remove groups",
        "error",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const groupsToDisplay =
    activeAction === "add" ? availablePermissionGroups : permissionGroupsForRole;

  const modules = useMemo(() => {
    const uniqueModules = new Set(groupsToDisplay.map((group) => group.module));
    return ["All", ...Array.from(uniqueModules)];
  }, [groupsToDisplay]);

  const filteredGroups = useMemo(() => {
    return groupsToDisplay.filter((group) => {
      const matchesSearch = group.group_name
        ?.toLowerCase()
        .includes(groupSearchTerm.toLowerCase());

      const matchesModule =
        selectedModule === "All" || group.module === selectedModule;

      return matchesSearch && matchesModule;
    });
  }, [groupsToDisplay, groupSearchTerm, selectedModule]);

  const groupTotalPages = Math.ceil(
    filteredGroups.length / GROUP_ITEMS_PER_PAGE,
  );

  const groupStartIndex = (groupCurrentPage - 1) * GROUP_ITEMS_PER_PAGE;

  const currentGroups = filteredGroups.slice(
    groupStartIndex,
    groupStartIndex + GROUP_ITEMS_PER_PAGE,
  );

  const groupedCurrentGroups = useMemo(() => {
    return currentGroups.reduce((acc, group) => {
      const moduleName = group.module || "General";
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(group);
      return acc;
    }, {});
  }, [currentGroups]);

  return (
    <div className="space-y-8">
      <div className="bg-gray-100 min-h-screen -mx-6 -mt-6 p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-700" />
                Permission Groups by Role
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage permission groups module-wise for each role.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Search role..."
                onSearch={(value) => {
                  setRoleSearchTerm(value || "");
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">No roles found.</div>
        ) : filteredRoles.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            No matching roles found.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentRoles.map((role) => (
                <div
                  key={role.role_uuid}
                  className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-gray-800 break-words">
                            {role.role_name}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Manage assigned permission groups
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Button
                      onClick={() => loadGroups(role, "view")}
                      className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-all"
                    >
                      Manage Groups
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
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

      {showModal && selectedRole && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[88vh] overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Manage Permission Groups
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Role:{" "}
                    <span className="font-medium text-blue-700">
                      {selectedRole.role_name}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRole(null);
                    resetSelection();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                <button
                  onClick={() => handleActionChange("view")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
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

            <div className="p-6 overflow-y-auto max-h-[calc(88vh-190px)]">
              {loadingGroups ? (
                <div className="text-center text-gray-500 py-12">
                  Loading permission groups...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-2">
                      <SearchInput
                        placeholder="Search permission group..."
                        onSearch={(value) => {
                          setGroupSearchTerm(value || "");
                          setGroupCurrentPage(1);
                        }}
                      />
                    </div>

                    <select
                      value={selectedModule}
                      onChange={(e) => {
                        setSelectedModule(e.target.value);
                        setGroupCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {modules.map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredGroups.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 border rounded-xl bg-gray-50">
                      No permission groups found.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {Object.entries(groupedCurrentGroups).map(
                          ([moduleName, groups]) => (
                            <div
                              key={moduleName}
                              className="border rounded-xl bg-gray-50 overflow-hidden"
                            >
                              <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-blue-700" />
                                  <h4 className="font-semibold text-gray-800">
                                    {moduleName}
                                  </h4>
                                </div>

                                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                                  {groups.length} group
                                  {groups.length > 1 ? "s" : ""}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                                {groups.map((group) => {
                                  const groupUuid =
                                    group.group_uuid?.toString();

                                  const isSelected =
                                    selectedGroupUUIDs.includes(groupUuid);

                                  return (
                                    <div
                                      key={group.group_uuid}
                                      className={`p-4 rounded-xl border bg-white transition-all ${
                                        isSelected
                                          ? activeAction === "delete"
                                            ? "border-red-300 bg-red-50"
                                            : "border-blue-300 bg-blue-50"
                                          : "hover:shadow-sm"
                                      }`}
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div>
                                          <h5 className="font-medium text-gray-800 break-words">
                                            {group.group_name}
                                          </h5>

                                          <p className="text-xs text-gray-500 mt-1">
                                            Module: {group.module || "General"}
                                          </p>
                                        </div>

                                        {activeAction !== "view" && (
                                          <button
                                            onClick={() =>
                                              handleSelectGroup(group)
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
                            </div>
                          ),
                        )}
                      </div>

                      {groupTotalPages > 1 && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={groupCurrentPage}
                            totalPages={groupTotalPages}
                            onPrevious={() =>
                              setGroupCurrentPage((prev) =>
                                Math.max(prev - 1, 1),
                              )
                            }
                            onNext={() =>
                              setGroupCurrentPage((prev) =>
                                Math.min(prev + 1, groupTotalPages),
                              )
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {activeAction !== "view" && (
                    <div className="mt-6 border-t pt-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected groups
                      </label>

                      {selectedGroupNames.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No groups selected yet.
                        </p>
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

                      <div className="flex justify-end gap-3 mt-6">
                        <Button
                          onClick={() => {
                            setShowModal(false);
                            setSelectedRole(null);
                            resetSelection();
                          }}
                          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={handleSubmit}
                          disabled={!selectedGroupUUIDs.length || submitLoading}
                          className={`px-6 py-2 text-white rounded-lg font-medium ${
                            selectedGroupUUIDs.length && !submitLoading
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
                            ? "Add Groups"
                            : "Remove Groups"}
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
    </div>
  );
};

export default PermissionGroupManagement;