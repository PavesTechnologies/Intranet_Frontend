import React, { useEffect, useState, useMemo } from "react";
import {
  listAccessPoints,
  deleteAccessPoint,
  getAccessPoint,
  updateAccessPoint,
  listModules,
} from "../../../../services/accessPointService";
import {
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  X,
  Loader2,
  Search,
  Link,
  Settings,
  Package,
  Globe,
  Shield,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { toast } from "react-toastify";

const ACCESS_POINT_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "fixed",
  cardsPerRow: 3,
  cardsPerPage: 6,
  gapClassName: "gap-6",
  gridClassName: "items-stretch",
  paginationWrapperClassName: "mt-6 flex justify-center",
};

const AccessPointList = ({ searchTerm }) => {
  const [aps, setAps] = useState([]);
  const [loadingAccessPoints, setLoadingAccessPoints] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedAccessPointId, setSelectedAccessPointId] = useState(null);
  const [selectedViewAccessPointId, setSelectedViewAccessPointId] =
    useState(null);

  const fetchAccessPoints = () => {
    setLoadingAccessPoints(true);

    listAccessPoints()
      .then((res) => setAps(res.data || []))
      .catch(() => {
        showStatusToast("Failed to fetch access points", "error");
        setAps([]);
      })
      .finally(() => setLoadingAccessPoints(false));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-menu-container")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchAccessPoints();
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

  const handleEditClick = (id) => {
    setSelectedAccessPointId(id);
    setShowEditModal(true);
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

  return (
    <div className="bg-white min-h-screen -mx-6 -mt-6 p-6">
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
            ? `No access points found matching "${searchTerm}".`
            : "No access points found."}
        </div>
      ) : (
        <DynamicCardGrid
          data={filteredAps}
          getKey={(ap) => ap.access_uuid}
          resetPageDependency={searchTerm}
          wrapperClassName="w-full"
          emptyMessage="No access points found."
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
                      <div className="absolute right-0 top-10 w-32 bg-white border rounded-lg shadow-lg z-20 overflow-hidden py-1 animate-in fade-in zoom-in duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleEditClick(ap.access_uuid);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 gap-2 transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Edit</span>
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

      {showEditModal && selectedAccessPointId && (
        <AccessPointEditModal
          accessUuid={selectedAccessPointId}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccessPointId(null);
          }}
          onUpdated={() => {
            setShowEditModal(false);
            setSelectedAccessPointId(null);
            fetchAccessPoints();
          }}
        />
      )}
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

function AccessPointEditModal({ accessUuid, onClose, onUpdated }) {
  const [form, setForm] = useState(null);
  const [modules, setModules] = useState([]);
  const [accessPointData, setAccessPointData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEndpointPath = (path) => {
    const regex = /^\/[a-zA-Z0-9\-_\/{}:]*$/;
    return regex.test(path.trim());
  };

  const validateModuleName = (name) => {
    const regex = /^[A-Za-z\s\-_]+$/;
    return regex.test(name.trim());
  };

  const showUniqueToast = (message, type) => {
    toast.dismiss();
    showStatusToast(message, type, { toastId: "unique-toast" });
  };

  const fetchAccessPointData = async () => {
    try {
      const [modulesRes, accessPointRes] = await Promise.all([
        listModules(),
        getAccessPoint(accessUuid),
      ]);

      setModules(modulesRes.data || []);
      setAccessPointData(accessPointRes.data);

      setForm({
        endpoint_path: accessPointRes.data.endpoint_path || "",
        method: accessPointRes.data.method || "GET",
        module: accessPointRes.data.module || "",
        is_public: !!accessPointRes.data.is_public,
      });
    } catch (error) {
      console.error("Error fetching access point:", error);
      showUniqueToast("Failed to load access point data", "error");
    }
  };

  useEffect(() => {
    fetchAccessPointData();
  }, [accessUuid]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.endpoint_path.trim()) {
      return showUniqueToast("Enter the Endpoint Path", "error");
    }

    if (!form.module.trim()) {
      return showUniqueToast("Enter the Module", "error");
    }

    if (!validateEndpointPath(form.endpoint_path)) {
      return showUniqueToast(
        "Endpoint path must start with '/' and contain only valid URL characters",
        "error",
      );
    }

    if (!validateModuleName(form.module)) {
      return showUniqueToast(
        "Module name can only contain letters, spaces, hyphens, and underscores",
        "error",
      );
    }

    setLoading(true);

    try {
      const formDataToUpdate = {
        ...form,
        endpoint_path: form.endpoint_path.trim(),
        module: form.module.trim(),
      };

      await updateAccessPoint(accessUuid, formDataToUpdate);

      showUniqueToast("Access point updated successfully!", "success");
      onUpdated();
    } catch (error) {
      console.error("Error updating access point:", error);

      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update access point";

      showUniqueToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async () => {
    if (!accessPointData?.permission_uuid) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/access-points/${accessUuid}/unmap-permission/${accessPointData.permission_uuid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const updatedData = await getAccessPoint(accessUuid);
        setAccessPointData(updatedData.data);

        showUniqueToast("Permission unmapped successfully", "success");
      } else {
        const errorData = await response.json();

        const errorMessage =
          errorData?.detail ||
          errorData?.message ||
          "Failed to unmap permission";

        showUniqueToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error unmapping permission:", error);
      showUniqueToast("Error unmapping permission", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="p-5 border-b bg-white">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Access Point
              </h3>

              <p className="text-sm text-gray-500 mt-1 truncate">
                Access UUID:{" "}
                <span className="font-medium text-blue-700" title={accessUuid}>
                  {accessUuid}
                </span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(85vh-90px)]">
          {!form ? (
            <div className="text-center text-gray-500 py-10">
              Loading access point...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Endpoint Path <span className="text-red-500">*</span>
                </label>

                <input
                  name="endpoint_path"
                  value={form.endpoint_path}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500"
                  placeholder="/api/resource"
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  title={form.endpoint_path}
                />

                <p className="text-sm text-gray-500 mt-1">
                  Must start with '/' and contain valid URL characters.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Method <span className="text-red-500">*</span>
                </label>

                <select
                  name="method"
                  value={form.method}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Module <span className="text-red-500">*</span>
                </label>

                <select
                  name="module"
                  value={form.module}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500"
                >
                  <option value="">Select Module</option>
                  {modules.map((mod, idx) => (
                    <option key={idx} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={form.is_public}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  id="is_public_edit_modal"
                />

                <label
                  htmlFor="is_public_edit_modal"
                  className="text-gray-700 font-medium cursor-pointer"
                >
                  Public Access Point
                </label>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <strong>Note:</strong> Public access points don't require
                authentication. Use carefully.
              </div>

              {accessPointData?.permission_code && (
                <div className="border-t pt-4">
                  <label className="block text-gray-700 font-medium mb-1">
                    Mapped Permission
                  </label>

                  <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-0">
                    <span
                      className="font-medium text-gray-800 truncate min-w-0 flex-1"
                      title={accessPointData.permission_code}
                    >
                      {accessPointData.permission_code}
                    </span>

                    <Button
                      type="button"
                      onClick={handleDeletePermission}
                      disabled={isDeleting}
                      variant="danger"
                      size="small"
                      className="shrink-0"
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Unmapping...
                        </span>
                      ) : (
                        "Unmap"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2 rounded-lg text-white ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    "Update Access Point"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccessPointList;