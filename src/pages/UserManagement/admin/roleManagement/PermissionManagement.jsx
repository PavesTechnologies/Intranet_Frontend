import { useState, useMemo } from "react";
import { ShieldCheck, Eye, KeyRound } from "lucide-react";

import { getPermissionsByRole } from "../../../../services/roleManagementService";
import { showStatusToast } from "../../../../components/toastfy/toast";

import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Modal from "../../../../components/Modal/modal";
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

const PERMISSION_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "auto",
  cardsPerRow: 4,
  cardsPerPage: 8,
  minCardWidth: "180px",
  gapClassName: "gap-3",
  gridClassName: "items-stretch",
};

const RoleCard = ({ role, isSelected, onSelect }) => (
  <AppCard
    compact
    icon={<ShieldCheck className="h-4 w-4" />}
    title={role.role_name}
    subtitle="View assigned permissions"
    selected={isSelected}
    className="h-full min-h-[110px] border-gray-200 hover:border-[#0A0082]/40"
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
    compact
    icon={<KeyRound className="h-3.5 w-3.5" />}
    iconSize="w-7 h-7"
    title={permission.code}
    subtitle={permission.description || "No description available."}
    className="h-full min-h-[78px] border-gray-200 hover:border-[#0A0082]/40"
    headerClassName="gap-2"
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
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className={Fonts.heading4}>Permission by Role</h3>
              <p className={Fonts.paragraphMuted}>
                View permissions assigned to each role.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-72">
            <SearchInput
              placeholder="Search role..."
              onSearch={(value) => setSearchTerm(value || "")}
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
            resetPageDependency={searchTerm}
            paginationWrapperClassName="mt-4 flex justify-center"
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

      <Modal
        isOpen={showModal && !!selectedRole}
        onClose={closeModal}
        title="Permissions for Role"
        subtitle={
          selectedRole
            ? `Role: ${selectedRole.role_name}`
            : "Assigned permissions"
        }
        titleIcon={<KeyRound className="h-5 w-5" />}
        size="5xl"
        fullScreenMobile
        maxHeight="max-h-[86vh]"
        bodyClassName="p-0 overflow-hidden"
        scrollable={false}
        closeOnBackdrop={!loading}
        footer={
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
        }
      >
        <div className="flex max-h-[calc(86vh-150px)] flex-col overflow-hidden">
          {!loading && rolePermissions.length > 0 && (
            <div className="shrink-0 border-b border-gray-100 bg-white p-4">
              <SearchInput
                placeholder="Search permission code or description..."
                onSearch={(value) => setPermissionSearchTerm(value || "")}
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">
            {loading ? (
              <div className="rounded-xl border border-gray-200 bg-white py-14">
                <LoadingSpinner text="Loading permissions..." />
              </div>
            ) : rolePermissions.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No permissions assigned to this role.
              </div>
            ) : (
              <DynamicCardGrid
                data={filteredPermissions}
                getKey={(permission, index) => permission.code || index}
                resetPageDependency={permissionSearchTerm}
                paginationWrapperClassName="mt-4 flex justify-center"
                wrapperClassName="w-full min-w-0"
                emptyMessage="No permissions matched your search."
                {...PERMISSION_GRID_CONFIG}
                renderCard={(permission) => (
                  <PermissionCard permission={permission} />
                )}
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PermissionManagement;