import React, { useEffect, useState, useMemo } from "react";
import {
  listAccessPoints,
  deleteAccessPoint,
} from "../../../../services/accessPointService";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, MoreVertical } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";

const AccessPointList = ({ searchTerm }) => {
  const [aps, setAps] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedAccessPointId, setSelectedAccessPointId] = useState(null);

  const itemsPerPage = 6;
  const navigate = useNavigate();

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
    listAccessPoints()
      .then((res) => setAps(res.data || []))
      .catch(() => {
        showStatusToast("Failed to fetch access points", "error");
        setAps([]);
      });
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const totalPages = Math.ceil(filteredAps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedAps = filteredAps.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="bg-gray-100 min-h-screen -mx-6 -mt-6 p-6">
      {filteredAps.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          {searchTerm
            ? `No access points found matching "${searchTerm}".`
            : "Loading..."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {paginatedAps.map((ap) => (
              <div
                key={ap.access_uuid}
                className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all border flex flex-col min-w-0 overflow-hidden"
              >
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
                        navigate(
                          `/user-management/access-points/${ap.access_uuid}`,
                        );
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
                          openMenuId === ap.access_uuid ? null : ap.access_uuid,
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
                            navigate(
                              `/user-management/access-points/edit/${ap.access_uuid}`,
                            );
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

                <div className="flex-grow space-y-3 min-w-0">
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
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={handlePrevious}
                onNext={handleNext}
              />
            </div>
          )}
        </>
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
  );
};

export default AccessPointList;