import { useState, useMemo } from "react";
import { ShieldCheck, Eye, X, KeyRound } from "lucide-react";

import { getPermissionsByRole } from "../../../../services/roleManagementService";
import { showStatusToast } from "../../../../components/toastfy/toast";

import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";

const ROLE_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "auto",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "240px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
};

const PERMISSION_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "auto",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "230px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
};

const RoleCard = ({ role, isSelected, onSelect }) => (
  <AppCard
    icon={<ShieldCheck className="h-4 w-4" />}
    title={role.role_name}
    subtitle="View assigned permissions"
    selected={isSelected}
    className="h-full min-h-[145px] border-gray-200 p-4 hover:border-[#0A0082]/40"
    actions={
      <Button
        type="button"
        onClick={() => onSelect(role)}
        size="small"
        variant="primary"
        className="w-full sm:w-auto"
      >
        <Eye className="h-4 w-4" />
        View
      </Button>
    }
  />
);

const PermissionCard = ({ permission }) => (
  <AppCard
    icon={<KeyRound className="h-4 w-4" />}
    title={permission.code}
    subtitle={permission.description || "No description available."}
    className="h-full min-h-[120px] border-gray-200 p-4 hover:border-[#0A0082]/40"
  />
);

const PermissionManagement = ({ roles = [] }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const filteredRoles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return roles;

    return roles.filter((role) =>
      role.role_name?.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  const filteredPermissions = useMemo(() => {
    const term = permissionSearchTerm.trim().toLowerCase();

    if (!term) return rolePermissions;

    return rolePermissions.filter((permission) => {
      return (
        permission.code?.toLowerCase().includes(term) ||
        permission.description?.toLowerCase().includes(term)
      );
    });
  }, [rolePermissions, permissionSearchTerm]);

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setLoading(true);
    setShowModal(true);
    setPermissionSearchTerm("");

    try {
      const res = await getPermissionsByRole(role.role_uuid);
      setRolePermissions(res.data || []);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      showStatusToast("Failed to fetch permissions for this role.", "error");
      setRolePermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setRolePermissions([]);
    setPermissionSearchTerm("");
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className={Fonts.heading4}>Permission by Role</h3>
              <p className={Fonts.paragraphMuted}>
                View permissions assigned to each role.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-80">
            <SearchInput
              placeholder="Search role..."
              onSearch={(value) => setSearchTerm(value || "")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            No roles found.
          </div>
        ) : (
          <DynamicCardGrid
            data={filteredRoles}
            getKey={(role) => role.role_uuid}
            resetPageDependency={searchTerm}
            paginationWrapperClassName="mt-5 flex justify-center"
            wrapperClassName="w-full min-w-0"
            emptyMessage="No matching roles found."
            {...ROLE_GRID_CONFIG}
            renderCard={(role) => (
              <RoleCard
                role={role}
                isSelected={selectedRole?.role_uuid === role.role_uuid}
                onSelect={handleRoleSelect}
              />
            )}
          />
        )}
      </div>

      {showModal && selectedRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-3 py-4 sm:px-6">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <KeyRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className={Fonts.heading4}>Permissions for Role</h3>
                    <p className="mt-1 truncate text-sm text-gray-500">
                      Role:{" "}
                      <span
                        className="font-medium text-[#0A0082]"
                        title={selectedRole.role_name}
                      >
                        {selectedRole.role_name}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!loading && rolePermissions.length > 0 && (
                <div className="mt-4">
                  <SearchInput
                    placeholder="Search permission code or description..."
                    onSearch={(value) => setPermissionSearchTerm(value || "")}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-5">
              {loading ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16">
                  <LoadingSpinner text="Loading permissions..." />
                </div>
              ) : rolePermissions.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                  No permissions assigned to this role.
                </div>
              ) : (
                <DynamicCardGrid
                  data={filteredPermissions}
                  getKey={(permission, index) => permission.code || index}
                  resetPageDependency={permissionSearchTerm}
                  paginationWrapperClassName="mt-5 flex justify-center"
                  wrapperClassName="w-full min-w-0"
                  emptyMessage="No permissions matched your search."
                  {...PERMISSION_GRID_CONFIG}
                  renderCard={(permission) => (
                    <PermissionCard permission={permission} />
                  )}
                />
              )}
            </div>

            <div className="shrink-0 border-t bg-white p-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={closeModal}
                  variant="outline"
                  size="medium"
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionManagement;