import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  listAccessPointsumapped,
  deleteAccessPoint,
  getUnmappedPermissions,
  assignPermissionToAccessPoint,
  getAccessPoint,
} from "../../../../services/accessPointService";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye,
  Plus,
  Trash2,
  X,
  Search,
  MoreVertical,
  Link,
  Settings,
  Package,
  Globe,
  Shield,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import Navbar from "../../../../components/Navbar/Navbar";
import Modal from "../../../../components/Modal/modal";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import { showStatusToast } from "../../../../components/toastfy/toast";

const ACCESS_POINT_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  gapClassName: "gap-6",
  gridClassName: "items-stretch",
  paginationWrapperClassName: "mt-6 flex justify-center",
};

const AccessPointMapping = () => {
  const [aps, setAps] = useState([]);
  const [unmappedPermissions, setUnmappedPermissions] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedAccessPoint, setSelectedAccessPoint] = useState(null);
  const [selectedAccessPointId, setSelectedAccessPointId] = useState(null);
  const [selectedViewAccessPointId, setSelectedViewAccessPointId] =
    useState(null);
  const [selectedPermission, setSelectedPermission] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingAccessPoints, setLoadingAccessPoints] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      name: "Access Points",
      onClick: () => navigate("/user-management/access-points"),
      isActive: location.pathname === "/user-management/access-points",
    },
    {
      name: "Add New",
      onClick: () => navigate("/user-management/access-points/create"),
      isActive: location.pathname === "/user-management/access-points/create",
    },
    {
      name: "Permission Mapping",
      onClick: () =>
        navigate("/user-management/access-points/admin/access-point-mapping"),
      isActive:
        location.pathname ===
        "/user-management/access-points/admin/access-point-mapping",
    },
    {
      name: "Access Point Create Bulk",
      onClick: () => navigate("/user-management/access-points/create-bulk"),
      isActive:
        location.pathname === "/user-management/access-points/create-bulk",
    },
    {
      name: "Access Permission Mapping Bulk",
      onClick: () =>
        navigate("/user-management/access-point-map-permission-bulk"),
      isActive:
        location.pathname ===
        "/user-management/access-point-map-permission-bulk",
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-menu-container")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = () => {
    setLoadingAccessPoints(true);

    listAccessPointsumapped()
      .then((res) => {
        setAps(res.data || []);
      })
      .catch(() => {
        showStatusToast("Failed to fetch unmapped access points", "error");
        setAps([]);
      })
      .finally(() => setLoadingAccessPoints(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAps = useMemo(() => {
    if (!searchTerm) return aps;

    const lowerCaseSearch = searchTerm.toLowerCase();

    return aps.filter((ap) => {
      const endpointPath = ap.endpoint_path?.toLowerCase() || "";
      const module = ap.module?.toLowerCase() || "";
      const method = ap.method?.toLowerCase() || "";
      const permissionCode = ap.permission_code?.toLowerCase() || "";

      return (
        endpointPath.includes(lowerCaseSearch) ||
        module.includes(lowerCaseSearch) ||
        method.includes(lowerCaseSearch) ||
        permissionCode.includes(lowerCaseSearch)
      );
    });
  }, [aps, searchTerm]);

  const handleViewClick = (id) => {
    setSelectedViewAccessPointId(id);
    setShowViewModal(true);
  };

  const handleDeleteClick = (id) => {
    setSelectedAccessPointId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteAccessPoint(selectedAccessPointId);

      setAps((prev) =>
        prev.filter((ap) => ap.access_uuid !== selectedAccessPointId),
      );

      showStatusToast("Access Point successfully deleted", "success");
    } catch (err) {
      console.error("Failed to delete access point:", err);
      showStatusToast("Failed to delete access point", "error");
    } finally {
      setShowDeleteModal(false);
      setSelectedAccessPointId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedAccessPointId(null);
  };

  const handleAddPermission = async (accessPoint) => {
    setSelectedAccessPoint(accessPoint);
    setSelectedPermission(null);
    setLoading(true);

    try {
      const response = await getUnmappedPermissions();
      setUnmappedPermissions(response.data || []);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching unmapped permissions:", error);
      showStatusToast("Failed to load permissions", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPermission = async () => {
    if (!selectedPermission) {
      showStatusToast("Please select a permission", "error");
      return;
    }

    setLoading(true);

    try {
      await assignPermissionToAccessPoint(
        selectedAccessPoint.access_uuid,
        selectedPermission.permission_uuid,
      );

      showStatusToast("Permission assigned successfully!", "success");
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error assigning permission:", error);
      showStatusToast("Failed to assign permission", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar logo="Access Points" navItems={navItems} />

      <div className="bg-white min-h-screen -mx-6 -mt-6 p-6">
        <div className="sticky top-0 z-10 bg-white pb-4 pt-1">
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-gray-700">
                Access Point Mapping
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Assign unmapped permissions to access points.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder="Search endpoint or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
        </div>

        {loadingAccessPoints ? (
          <DynamicCardGrid
            data={[]}
            loading
            skeletonCount={ACCESS_POINT_GRID_CONFIG.cardsPerPage}
            {...ACCESS_POINT_GRID_CONFIG}
            renderCard={() => null}
            getKey={(_, index) => index}
          />
        ) : filteredAps.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            {searchTerm
              ? `No unmapped access points found matching "${searchTerm}".`
              : "No unmapped access points found."}
          </div>
        ) : (
          <DynamicCardGrid
            data={filteredAps}
            getKey={(ap) => ap.access_uuid}
            resetPageDependency={searchTerm}
            wrapperClassName="w-full"
            emptyMessage="No unmapped access points found."
            {...ACCESS_POINT_GRID_CONFIG}
            renderCard={(ap) => (
              <AppCard
                className="min-h-[260px]"
                renderHeader={() => (
                  <div className="flex justify-between items-start gap-3 mb-4 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-lg font-semibold text-gray-800 truncate"
                        title={ap.endpoint_path}
                      >
                        {ap.endpoint_path || "N/A"}
                      </h3>

                      <p
                        className="text-xs text-gray-400 mt-1 truncate"
                        title={ap.access_uuid}
                      >
                        {ap.access_uuid}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0 relative dropdown-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewClick(ap.access_uuid);
                        }}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === ap.access_uuid
                              ? null
                              : ap.access_uuid,
                          );
                        }}
                        className="p-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === ap.access_uuid && (
                        <div className="absolute right-0 top-10 w-36 bg-white border rounded-lg shadow-lg z-20 overflow-hidden py-1 animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleAddPermission(ap);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 gap-2 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Add</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDeleteClick(ap.access_uuid);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 gap-2 transition-colors border-t border-gray-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                renderBody={() => (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
                      <span className="font-medium shrink-0">Method:</span>
                      <span
                        className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold truncate max-w-full"
                        title={ap.method}
                      >
                        {ap.method || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
                      <span className="font-medium shrink-0">Module:</span>
                      <span
                        className="truncate min-w-0 flex-1"
                        title={ap.module}
                      >
                        {ap.module || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
                      <span className="font-medium shrink-0">Public:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          ap.is_public
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ap.is_public ? "Yes" : "No"}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 min-w-0">
                      <span className="font-medium">Permission:</span>
                      <p
                        className="mt-1 text-gray-700 break-all line-clamp-2"
                        title={ap.permission_code || "N/A"}
                      >
                        {ap.permission_code || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              />
            )}
          />
        )}

        {showModal && (
          <PermissionModal
            isOpen={showModal}
            unmappedPermissions={unmappedPermissions}
            selectedAccessPoint={selectedAccessPoint}
            selectedPermission={selectedPermission}
            setSelectedPermission={setSelectedPermission}
            onClose={() => setShowModal(false)}
            onAssign={handleAssignPermission}
            loading={loading}
          />
        )}

        {showViewModal && selectedViewAccessPointId && (
          <AccessPointViewModal
            isOpen={showViewModal}
            accessUuid={selectedViewAccessPointId}
            onClose={() => {
              setShowViewModal(false);
              setSelectedViewAccessPointId(null);
            }}
          />
        )}

        <Modal
          isOpen={showDeleteModal}
          onClose={handleCancelDelete}
          title="Confirm Deletion"
        >
          <div className="p-4">
            <p className="text-gray-600 mb-6">
              Please confirm you really want to delete the access point.
            </p>

            <div className="flex justify-end space-x-4">
              <Button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </Button>

              <Button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

function AccessPointViewModal({ isOpen, accessUuid, onClose }) {
  const [ap, setAp] = useState(null);

  useEffect(() => {
    if (!accessUuid) return;

    setAp(null);

    getAccessPoint(accessUuid)
      .then((res) => setAp(res.data))
      .catch(() => {
        showStatusToast("Failed to load access point details", "error");
        setAp(null);
      });
  }, [accessUuid]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Access Point Details"
      subtitle={`Access UUID: ${accessUuid}`}
      className="max-w-2xl"
      bodyClassName="p-6"
    >
      {!ap ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-500 text-lg">Loading...</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-6 text-center flex items-center justify-center gap-2">
            <Search className="w-6 h-6" />
            Access Point Details
          </h2>

          <div className="space-y-4 text-gray-800">
            <p className="flex items-center gap-2 break-all">
              <Link className="w-5 h-5 text-gray-600 shrink-0" />
              <span className="font-medium text-gray-600">Path:</span>
              {ap.endpoint_path || "N/A"}
            </p>

            <p className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600 shrink-0" />
              <span className="font-medium text-gray-600">Method:</span>
              {ap.method || "N/A"}
            </p>

            <p className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-600 shrink-0" />
              <span className="font-medium text-gray-600">Module:</span>
              {ap.module || "N/A"}
            </p>

            <p className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-600 shrink-0" />
              <span className="font-medium text-gray-600">Public:</span>
              {ap.is_public ? "Yes" : "No"}
            </p>

            <p className="flex items-center gap-2 break-all">
              <Shield className="w-5 h-5 text-gray-600 shrink-0" />
              <span className="font-medium text-gray-600">Permission:</span>
              {ap.permission_code || "N/A"}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

const formatCode = (p) => p?.code ?? p?.permission_code ?? "(no code)";
const formatDesc = (p) => p?.description ?? p?.permission_description ?? "";

const PermissionModal = ({
  isOpen,
  unmappedPermissions,
  selectedAccessPoint,
  selectedPermission,
  setSelectedPermission,
  onClose,
  onAssign,
  loading,
}) => {
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return unmappedPermissions;

    const q = query.toLowerCase();

    return unmappedPermissions.filter(
      (p) =>
        formatCode(p).toLowerCase().includes(q) ||
        formatDesc(p).toLowerCase().includes(q),
    );
  }, [unmappedPermissions, query]);

  const selectedDisplay = selectedPermission
    ? formatCode(selectedPermission)
    : query;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Permission"
      subtitle={`Access Point: ${selectedAccessPoint?.endpoint_path || "N/A"}`}
      className="max-w-2xl"
      bodyClassName="p-5"
    >
      <div className="mb-3 space-y-2">
        <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
          <strong className="font-medium shrink-0">Endpoint:</strong>
          <span
            className="truncate min-w-0 flex-1"
            title={selectedAccessPoint?.endpoint_path}
          >
            {selectedAccessPoint?.endpoint_path || "N/A"}
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-600">
          <strong className="font-medium shrink-0">Method:</strong>
          <span
            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold"
            title={selectedAccessPoint?.method}
          >
            {selectedAccessPoint?.method || "N/A"}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Permission
        </label>

        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <input
              type="text"
              value={selectedDisplay}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedPermission(null);
              }}
              placeholder="Search permissions..."
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
              title={selectedDisplay}
            />

            <Button
              onClick={() => {
                setQuery("");
                setSelectedPermission(null);
              }}
              type="button"
              className="px-3 py-2 text-gray-500 hover:text-gray-700 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="border border-gray-200 rounded-lg max-h-[220px] overflow-auto bg-white shadow-sm">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No matching permissions
              </div>
            ) : (
              filtered.map((permission) => (
                <div
                  key={permission.permission_uuid}
                  onClick={() => {
                    setSelectedPermission(permission);
                    setQuery("");
                  }}
                  className={`cursor-pointer px-4 py-2.5 hover:bg-indigo-50 flex flex-col transition min-w-0 ${
                    selectedPermission?.permission_uuid ===
                    permission.permission_uuid
                      ? "bg-indigo-100"
                      : ""
                  }`}
                >
                  <div
                    className="font-semibold text-sm truncate text-gray-900"
                    title={formatCode(permission)}
                  >
                    {formatCode(permission)}
                  </div>

                  {formatDesc(permission) && (
                    <div
                      className="text-xs text-gray-500 line-clamp-1"
                      title={formatDesc(permission)}
                    >
                      {formatDesc(permission)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 pt-4 mt-4 border-t bg-white flex justify-end gap-2">
        <Button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          onClick={onAssign}
          disabled={!selectedPermission || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Assign"}
        </Button>
      </div>
    </Modal>
  );
};

export default AccessPointMapping;