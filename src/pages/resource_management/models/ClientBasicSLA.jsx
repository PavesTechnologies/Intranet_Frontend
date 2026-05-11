import React, { useEffect, useState, useRef } from "react";
import {
  getClientSLA,
  updateClientSLA,
  deleteClientSLA,
} from "../services/clientservice";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Pagination from "../../../components/Pagination/pagination";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import SLAForm from "./client_configuration/forms/SLAForm";
import Modal from "../../../components/Modal/modal";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { useAuth } from "../../../contexts/AuthContext";

const ClientBasicSLA = ({ clientId, slaRefetchKey }) => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const canEditConfig = roles.includes("Admin"); // permissions.includes("EDIT_CLIENT_CONFIG");
  const [slaList, setSLAList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const [openUpdateSLA, setOpenUpdateSLA] = useState(false);
  const [formData, setFormData] = useState({});
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [selectedSLAId, setSelectedSLAId] = useState(null);

  const ITEMS_PER_PAGE = 3;

  const getSlaTypeColor = (type) => {
    if (type === "NEW_DEMAND") return "bg-blue-100 text-blue-700";

    if (type === "REPLACEMENT") return "bg-purple-100 text-purple-700";

    return "bg-gray-100 text-gray-700";
  };

  const getWarningColor = (days) => {
    if (days <= 2) return "bg-red-100 text-red-700";
    if (days <= 4) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  const handleSetFormData = (data) => {
    if (!data) return;
    setFormData({
      client: {
        clientId: clientId,
      },
      slaId: data.slaId,
      slaType: data.slaType,
      slaDurationDays: data.slaDurationDays,
      warningThresholdDays: data.warningThresholdDays,
      activeFlag: data.activeFlag ?? true,
    });
  };

  const handleUpdateSLA = async () => {
    setUpdateLoading(true);
    try {
      const res = await updateClientSLA(formData);
      const updated = res.data;
      toast.success(res.message || "SLA updated successfully.");
      setOpenUpdateSLA(false);
      setSLAList((prev) =>
        prev.map((item) =>
          item.slaId === updated.slaId ? { ...item, ...updated } : item,
        ),
      );
      // fetchSLA();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update SLA.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteSLA = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteClientSLA(selectedSLAId);
      toast.success(res.message || "SLA deleted successfully.");
      fetchSLA(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete SLA.");
    } finally {
      setDeleteLoading(false);
      setOpenConfirmModal(false);
      setSelectedSLAId(null);
    }
  };

  const fetchSLA = async () => {
    setLoading(true);
    try {
      const res = await getClientSLA(clientId);
      const data = res.data || [];

      const normalized = data.map((sla) => ({
        ...sla,
        activeFlag: sla.activeFlag ?? false,
      }));

      setSLAList(normalized);
      setCurrentPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch SLA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSLA();
  }, [clientId, slaRefetchKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <LoadingSpinner text="Loading SLA Information..." />
      </div>
    );
  }

  if (slaList.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Basic SLA Information</h2>
        <p className="text-gray-600 italic font-semibold text-sm">
          No SLA information available for this client. Add from above!
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(slaList.length / ITEMS_PER_PAGE);
  const paginatedData = slaList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <p className="text-sm font-semibold text-gray-700">SLA Definitions</p>
        </div> */}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                SLA Type
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Duration
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Warning Threshold
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Actions
              </th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((sla) => (
              <tr
                key={sla.slaId}
                className="hover:bg-gray-50 transition text-center"
              >
                {/* SLA TYPE */}
                <td className="px-6 py-3">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getSlaTypeColor(
                      sla.slaType,
                    )}`}
                  >
                    {sla.slaType.replaceAll("_", " ")}
                  </span>
                </td>

                {/* DURATION */}
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                    {sla.slaDurationDays} days
                  </span>
                </td>

                {/* WARNING */}
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getWarningColor(
                      sla.warningThresholdDays,
                    )}`}
                  >
                    {sla.warningThresholdDays} days
                  </span>
                </td>

                {/* STATUS */}
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${sla.activeFlag ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {sla.activeFlag ? "Active" : "Inactive"}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-4">
                  {canEditConfig ? (
                    <div className="flex justify-center items-center gap-4">
                      <button
                      title="Edit SLA"
                        onClick={() => {
                          handleSetFormData(sla);
                          setOpenUpdateSLA(true);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 transition"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                      title="Delete SLA"
                        onClick={() => {
                          setSelectedSLAId(sla.slaId);
                          setOpenConfirmModal(true);
                        }}
                        className="p-1 text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic text-xs">
                      Don't have permission to take actions
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        />
      )}

      {/* Update SLA Modal */}
      <Modal
        title="Update SLA"
        subtitle="Update SLA details"
        isOpen={openUpdateSLA}
        onClose={() => setOpenUpdateSLA(false)}
      >
        <SLAForm formData={formData} setFormData={setFormData} />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleUpdateSLA}
            disabled={updateLoading}
            className={`px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 ${updateLoading && "opacity-50 cursor-not-allowed"}`}
          >
            {updateLoading ? "Updating..." : "Update"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmationModal
        title="Delete SLA"
        message="Are you sure you want to delete this SLA? Action cannot be undone."
        confirmText="Delete"
        isOpen={openConfirmModal}
        onCancel={() => setOpenConfirmModal(false)}
        onConfirm={handleDeleteSLA}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default ClientBasicSLA;
