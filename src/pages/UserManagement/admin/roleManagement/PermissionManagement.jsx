import { useState, useMemo } from "react";
import { getPermissionsByRole } from "../../../../services/roleManagementService";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import { ShieldCheck, Eye, X, KeyRound } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Layout configuration — change these to instantly reshape the entire UI
// without touching render logic.
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_GRID_CONFIG = {
  layoutMode: "grid",      // "grid" | "list" | "masonry"
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "245px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
};

const PERMISSION_GRID_CONFIG = {
  layoutMode: "grid",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "230px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
};

// ─────────────────────────────────────────────────────────────────────────────
// Card renderers — swap these out to change card appearance globally
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a single role card.
 * Receives: role, isSelected, onSelect
 */
const RoleCard = ({ role, isSelected, onSelect }) => (
  <AppCard
    icon={<ShieldCheck className="w-4 h-4" />}
    title={role.role_name}
    subtitle="View assigned permissions"
    selected={isSelected}
    className="min-h-[145px] p-4 border-gray-200 hover:border-blue-200"
    actions={
      <Button
        onClick={() => onSelect(role)}
        className="px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-all flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        View
      </Button>
    }
  />
);

/**
 * Renders a single permission card.
 * Receives: permission
 */
const PermissionCard = ({ permission }) => (
  <AppCard
    icon={<KeyRound className="w-4 h-4" />}
    title={permission.code}
    subtitle={permission.description || "No description available."}
    className="min-h-[120px] p-4 border-gray-200 hover:border-blue-200"
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const PermissionManagement = ({ roles }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const filteredRoles = useMemo(
    () =>
      roles.filter((role) =>
        role.role_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [roles, searchTerm],
  );

  const filteredPermissions = useMemo(
    () =>
      rolePermissions.filter((p) => {
        const search = permissionSearchTerm.toLowerCase();
        return (
          p.code?.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search)
        );
      }),
    [rolePermissions, permissionSearchTerm],
  );

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
      showStatusToast("Failed to fetch permissions for this role", "error");
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
    <div className="min-h-screen bg-white -mx-6 -mt-6 p-5 sm:p-6">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-gray-800">
                Permission by Role
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View permissions assigned to each role.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              placeholder="Search role..."
              onSearch={(v) => setSearchTerm(v || "")}
            />
          </div>
        </div>
      </div>

      {/* ── Role grid ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        {roles.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No roles found.</div>
        ) : (
          <DynamicCardGrid
            data={filteredRoles}
            getKey={(role) => role.role_uuid}
            resetPageDependency={searchTerm}
            paginationWrapperClassName="mt-5 flex justify-center"
            wrapperClassName="w-full"
            emptyMessage="No matching roles found."
            // Spread the layout config — swap ROLE_GRID_CONFIG to change layout
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

      {/* ── Permission modal ───────────────────────────────────────────────── */}
      {showModal && selectedRole && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col border border-gray-200">
            {/* Modal header */}
            <div className="p-5 border-b bg-white shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Permissions for Role
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      Role:{" "}
                      <span
                        className="font-medium text-blue-700"
                        title={selectedRole.role_name}
                      >
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
              {!loading && rolePermissions.length > 0 && (
                <div className="mt-4">
                  <SearchInput
                    placeholder="Search permission code or description..."
                    onSearch={(v) => setPermissionSearchTerm(v || "")}
                  />
                </div>
              )}
            </div>

            {/* Modal body */}
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              {loading ? (
                // Skeleton state — DynamicCardGrid handles this natively
                <DynamicCardGrid
                  data={[]}
                  loading
                  skeletonCount={6}
                  {...PERMISSION_GRID_CONFIG}
                  renderCard={() => null}
                  getKey={(_, i) => i}
                />
              ) : rolePermissions.length === 0 ? (
                <div className="text-center text-gray-500 py-10 border border-gray-200 rounded-xl bg-white">
                  No permissions assigned to this role.
                </div>
              ) : (
                <DynamicCardGrid
                  data={filteredPermissions}
                  getKey={(p, i) => p.code || i}
                  resetPageDependency={permissionSearchTerm}
                  paginationWrapperClassName="mt-5 flex justify-center"
                  wrapperClassName="w-full"
                  emptyMessage="No permissions matched your search."
                  // Swap PERMISSION_GRID_CONFIG to change layout
                  {...PERMISSION_GRID_CONFIG}
                  renderCard={(permission) => (
                    <PermissionCard permission={permission} />
                  )}
                />
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t bg-white shrink-0 flex justify-end">
              <Button
                onClick={closeModal}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionManagement;