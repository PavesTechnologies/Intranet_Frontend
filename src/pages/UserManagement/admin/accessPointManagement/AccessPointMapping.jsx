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
  columnMode: "auto",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "300px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch auto-rows-fr",
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
    if (!searchTerm.trim()) return aps;

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
        prev.filter((ap) => ap.access_uuid !== selectedAccessPointId)
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
        selectedPermission.permission_uuid
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

      <div className="min-h-screen bg-gray-50 -mx-6 -mt-6 p-4 sm:p-6">
        <div className="sticky top-0 z-10 bg-gray-50 pb-4 pt-1">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-700">
                Access Point Mapping
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Assign unmapped permissions to access points.
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <input
                type="text"
                placeholder="Search endpoint or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
          <div className="mt-20 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-gray-500">
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
                className="h-full min-h-[240px] border-gray-200 bg-white"
                renderHeader={() => (
                  <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="truncate text-lg font-semibold text-gray-800"
                        title={ap.endpoint_path}
                      >
                        {ap.endpoint_path || "N/A"}
                      </h3>

                      <p
                        className="mt-1 truncate text-xs text-gray-400"
                        title={ap.access_uuid}
                      >
                        {ap.access_uuid}
                      </p>
                    </div>

                    <div className="dropdown-menu-container relative flex shrink-0 items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewClick(ap.access_uuid);
                        }}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-600 shadow-sm transition-colors hover:bg-blue-100"
                        title="View"
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === ap.access_uuid
                              ? null
                              : ap.access_uuid
                          );
                        }}
                        className="rounded-lg bg-gray-50 p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
                        title="Actions"
                        type="button"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuId === ap.access_uuid && (
                        <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleAddPermission(ap);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                            type="button"
                          >
                            <Plus className="h-4 w-4 shrink-0 text-blue-600" />
                            <span>Add</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDeleteClick(ap.access_uuid);
                            }}
                            className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4 shrink-0 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                renderBody={() => (
                  <div className="min-w-0 space-y-3">
                    <div className="flex min-w-0 items-start gap-2 text-sm text-gray-600">
                      <span className="shrink-0 font-medium">Method:</span>
                      <span
                        className="max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"
                        title={ap.method}
                      >
                        {ap.method || "N/A"}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start gap-2 text-sm text-gray-600">
                      <span className="shrink-0 font-medium">Module:</span>
                      <span
                        className="min-w-0 flex-1 truncate"
                        title={ap.module}
                      >
                        {ap.module || "N/A"}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start gap-2 text-sm text-gray-600">
                      <span className="shrink-0 font-medium">Public:</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ap.is_public
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ap.is_public ? "Yes" : "No"}
                      </span>
                    </div>

                    <div className="min-w-0 text-sm text-gray-600">
                      <span className="font-medium">Permission:</span>
                      <p
                        className="mt-1 line-clamp-2 break-all text-gray-700"
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
          className="!w-full !max-w-md"
        >
          <div className="p-4">
            <p className="mb-6 text-gray-600">
              Please confirm you really want to delete the access point.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                onClick={handleCancelDelete}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                onClick={handleConfirmDelete}
                variant="danger"
                className="w-full sm:w-auto"
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
      className="!w-full !max-w-3xl"
      bodyClassName="p-6"
    >
      {!ap ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="mb-6 flex items-center justify-center gap-2 text-center text-xl font-semibold text-indigo-600 sm:text-2xl">
            <Search className="h-6 w-6" />
            Access Point Details
          </h2>

          <div className="space-y-4 text-gray-800">
            <p className="flex items-start gap-2 break-all">
              <Link className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
              <span className="font-medium text-gray-600">Path:</span>
              {ap.endpoint_path || "N/A"}
            </p>

            <p className="flex items-start gap-2">
              <Settings className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
              <span className="font-medium text-gray-600">Method:</span>
              {ap.method || "N/A"}
            </p>

            <p className="flex items-start gap-2">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
              <span className="font-medium text-gray-600">Module:</span>
              {ap.module || "N/A"}
            </p>

            <p className="flex items-start gap-2">
              <Globe className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
              <span className="font-medium text-gray-600">Public:</span>
              {ap.is_public ? "Yes" : "No"}
            </p>

            <p className="flex items-start gap-2 break-all">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
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
        formatDesc(p).toLowerCase().includes(q)
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
      className="!w-full !max-w-3xl"
      bodyClassName="p-5"
    >
      <div className="mb-3 space-y-2">
        <div className="flex min-w-0 items-start gap-2 text-sm text-gray-600">
          <strong className="shrink-0 font-medium">Endpoint:</strong>
          <span
            className="min-w-0 flex-1 truncate"
            title={selectedAccessPoint?.endpoint_path}
          >
            {selectedAccessPoint?.endpoint_path || "N/A"}
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-600">
          <strong className="shrink-0 font-medium">Method:</strong>
          <span
            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"
            title={selectedAccessPoint?.method}
          >
            {selectedAccessPoint?.method || "N/A"}
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Permission
        </label>

        <div className="relative" ref={dropdownRef}>
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <input
              type="text"
              value={selectedDisplay}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedPermission(null);
              }}
              placeholder="Search permissions..."
              className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={selectedDisplay}
            />

            <Button
              onClick={() => {
                setQuery("");
                setSelectedPermission(null);
              }}
              type="button"
              variant="outline"
              className="shrink-0 px-3 py-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[260px] overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
                  className={`flex min-w-0 cursor-pointer flex-col px-4 py-2.5 transition hover:bg-indigo-50 ${
                    selectedPermission?.permission_uuid ===
                    permission.permission_uuid
                      ? "bg-indigo-100"
                      : ""
                  }`}
                >
                  <div
                    className="truncate text-sm font-semibold text-gray-900"
                    title={formatCode(permission)}
                  >
                    {formatCode(permission)}
                  </div>

                  {formatDesc(permission) && (
                    <div
                      className="line-clamp-1 text-xs text-gray-500"
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

      <div className="sticky bottom-0 mt-5 flex flex-col-reverse gap-2 border-t bg-white pt-4 sm:flex-row sm:justify-end">
        <Button
          onClick={onClose}
          variant="outline"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>

        <Button
          onClick={onAssign}
          disabled={!selectedPermission || loading}
          variant="primary"
          className="w-full sm:w-auto"
        >
          {loading ? "Assigning..." : "Assign"}
        </Button>
      </div>
    </Modal>
  );
};

export default AccessPointMapping;