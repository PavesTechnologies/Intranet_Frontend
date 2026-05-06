import { useState, useMemo } from "react";
import { getPermissionsByRole } from "../../../../services/roleManagementService";
import Pagination from "../../../../components/Pagination/pagination";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import { ShieldCheck, Eye, X, KeyRound } from "lucide-react";

const PermissionManagement = ({ roles }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [permCurrentPage, setPermCurrentPage] = useState(1);
  const permItemsPerPage = 8;

  const filteredRoles = useMemo(() => {
    return roles.filter((role) =>
      role.role_name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [roles, searchTerm]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRoles = filteredRoles.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const filteredPermissions = useMemo(() => {
    return rolePermissions.filter((permission) => {
      const code = permission.code?.toLowerCase() || "";
      const description = permission.description?.toLowerCase() || "";
      const search = permissionSearchTerm.toLowerCase();

      return code.includes(search) || description.includes(search);
    });
  }, [rolePermissions, permissionSearchTerm]);

  const indexOfLastPerm = permCurrentPage * permItemsPerPage;
  const indexOfFirstPerm = indexOfLastPerm - permItemsPerPage;
  const currentPermissions = filteredPermissions.slice(
    indexOfFirstPerm,
    indexOfLastPerm,
  );
  const totalPermPages = Math.ceil(
    filteredPermissions.length / permItemsPerPage,
  );

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setLoading(true);
    setShowModal(true);
    setPermissionSearchTerm("");
    setPermCurrentPage(1);

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
    setPermCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      <div className="bg-gray-100 min-h-screen -mx-6 -mt-6 p-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-700" />
                Permission by Role
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View permissions assigned to each role.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Search role..."
                onSearch={(value) => {
                  setSearchTerm(value || "");
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
                  className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between ${
                    selectedRole?.role_uuid === role.role_uuid
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 break-words">
                        {role.role_name}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Click to view assigned permissions
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Button
                      onClick={() => handleRoleSelect(role)}
                      className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-all flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Permissions
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[88vh] overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Permissions for Role
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Role:{" "}
                    <span className="font-medium text-blue-700">
                      {selectedRole.role_name}
                    </span>
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!loading && rolePermissions.length > 0 && (
                <div className="mt-5">
                  <SearchInput
                    placeholder="Search permission code or description..."
                    onSearch={(value) => {
                      setPermissionSearchTerm(value || "");
                      setPermCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(88vh-170px)]">
              {loading ? (
                <div className="text-center text-gray-500 py-12">
                  Loading permissions...
                </div>
              ) : rolePermissions.length === 0 ? (
                <div className="text-center text-gray-500 py-12 border rounded-xl bg-gray-50">
                  No permissions assigned to this role.
                </div>
              ) : filteredPermissions.length === 0 ? (
                <div className="text-center text-gray-500 py-12 border rounded-xl bg-gray-50">
                  No permissions matched your search.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentPermissions.map((permission, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-xl bg-white hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                            <KeyRound className="w-4 h-4" />
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-800 break-words">
                              {permission.code}
                            </h4>

                            {permission.description ? (
                              <p className="text-sm text-gray-600 mt-1 break-words">
                                {permission.description}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 italic mt-1">
                                No description available.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPermPages > 1 && (
                    <div className="mt-6">
                      <Pagination
                        currentPage={permCurrentPage}
                        totalPages={totalPermPages}
                        onPrevious={() =>
                          setPermCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        onNext={() =>
                          setPermCurrentPage((prev) =>
                            Math.min(prev + 1, totalPermPages),
                          )
                        }
                      />
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

export default PermissionManagement;