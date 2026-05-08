import React, { useEffect, useMemo, useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
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
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { toast } from "react-toastify";

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
    if (!searchTerm?.trim()) return aps;

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

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
          {searchTerm
            ? `No access points found matching "${searchTerm}".`
            : "No access points found."}
        </div>
      ) : (
        <DynamicCardGrid
          data={filteredAps}
          getKey={(ap) => ap.access_uuid}
          resetPageDependency={searchTerm}
          wrapperClassName="w-full min-w-0"
          emptyMessage="No access points found."
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
                            handleEditClick(ap.access_uuid);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                          type="button"
                        >
                          <Pencil className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>Edit</span>
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
      className="!w-full !max-w-3xl"
      bodyClassName="p-6"
    >
      {!ap ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner text="Loading access point details..." />
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
        "error"
      );
    }

    if (!validateModuleName(form.module)) {
      return showUniqueToast(
        "Module name can only contain letters, spaces, hyphens, and underscores",
        "error"
      );
    }

    setLoading(true);

    try {
      await updateAccessPoint(accessUuid, {
        ...form,
        endpoint_path: form.endpoint_path.trim(),
        module: form.module.trim(),
      });

      showUniqueToast("Access point updated successfully!", "success");
      onUpdated();
    } catch (error) {
      console.error("Error updating access point:", error);

      showUniqueToast(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update access point",
        "error"
      );
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
        }
      );

      if (response.ok) {
        const updatedData = await getAccessPoint(accessUuid);
        setAccessPointData(updatedData.data);
        showUniqueToast("Permission unmapped successfully", "success");
      } else {
        const errorData = await response.json();

        showUniqueToast(
          errorData?.detail ||
            errorData?.message ||
            "Failed to unmap permission",
          "error"
        );
      }
    } catch (error) {
      console.error("Error unmapping permission:", error);
      showUniqueToast("Error unmapping permission", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const methodOptions = [
    { label: "GET", value: "GET" },
    { label: "POST", value: "POST" },
    { label: "PUT", value: "PUT" },
    { label: "DELETE", value: "DELETE" },
    { label: "PATCH", value: "PATCH" },
  ];

  const moduleOptions = [
    { label: "Select Module", value: "" },
    ...modules.map((mod) => ({ label: mod, value: mod })),
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-3 py-4 sm:px-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className={Fonts.heading4}>Edit Access Point</h3>

              <p className="mt-1 truncate text-sm text-gray-500">
                Access UUID:{" "}
                <span className="font-medium text-[#0A0082]" title={accessUuid}>
                  {accessUuid}
                </span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              type="button"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-5">
          {!form ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16">
              <LoadingSpinner text="Loading access point..." />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Endpoint Path"
                name="endpoint_path"
                value={form.endpoint_path}
                onChange={handleChange}
                placeholder="/api/resource"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />

              <p className="-mt-2 text-sm text-gray-500">
                Must start with '/' and contain valid URL characters.
              </p>

              <FormSelect
                label="Method"
                name="method"
                value={form.method}
                onChange={handleChange}
                options={methodOptions}
              />

              <FormSelect
                label="Module"
                name="module"
                value={form.module}
                onChange={handleChange}
                options={moduleOptions}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={form.is_public}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  id="is_public_edit_modal"
                />

                <label
                  htmlFor="is_public_edit_modal"
                  className="cursor-pointer text-sm font-medium text-gray-700"
                >
                  Public Access Point
                </label>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                <strong>Note:</strong> Public access points don't require
                authentication. Use carefully.
              </div>

              {accessPointData?.permission_code && (
                <div className="border-t pt-4">
                  <label className={Fonts.label}>Mapped Permission</label>

                  <div className="mt-2 flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className="min-w-0 flex-1 truncate font-medium text-gray-800"
                      title={accessPointData.permission_code}
                    >
                      {accessPointData.permission_code}
                    </span>

                    <Button
                      type="button"
                      onClick={handleDeletePermission}
                      disabled={isDeleting}
                      loading={isDeleting}
                      loadingText="Unmapping..."
                      variant="danger"
                      size="small"
                      className="w-full sm:w-auto"
                    >
                      Unmap
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="shrink-0 border-t bg-white p-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !form}
              loading={loading}
              loadingText="Updating..."
              variant="primary"
              className="w-full sm:w-auto"
            >
              Update Access Point
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccessPointList;