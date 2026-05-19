import React, { useEffect, useState, useRef } from "react";
import {
  getClientCompliance,
  updateClientCompliance,
  deleteClientCompliance,
} from "../services/clientservice";
import { notify } from "../utils/notify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Pagination from "../../../components/Pagination/pagination";
import { EditIcon, DeleteIcon } from "@/components/icons";
import Modal from "../../../components/Modal/modal";
import ComplianceForm from "./client_configuration/forms/ComplianceForm";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { useAuth } from "../../../contexts/AuthContext";
import GenericTable from "../../../components/Table/table";

const ClientBasicCompliance = ({ clientId, complianceRefetchKey }) => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const canEditConfig = roles.includes("Admin"); // permissions.includes("EDIT_CLIENT_CONFIG");
  const [complianceList, setComplianceList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const [formData, setFormData] = useState({});
  const [openUpdateCompliance, setOpenUpdateCompliance] = useState(false);
  const [openComfirmModal, setOpenConfirmModal] = useState(false);
  const [selectedComplianceId, setSelectedComplianceId] = useState(null);

  const ITEMS_PER_PAGE = 3;

  const handleSetFormData = (data) => {
    if (!data) return;

    const formattedData = {
      client: {
        clientId: clientId,
      },
      complianceId: data.complianceId,
      requirementType: data.requirementType,
      requirementName: data.requirementName,
      mandatoryFlag: data.mandatoryFlag ?? false,
      activeFlag: data.activeFlag ?? true,
    };

    if (data.requirementType === "SKILL") {
      formattedData.skill = { id: data.skill?.id || null };
    } else if (data.requirementType === "CERTIFICATION") {
      formattedData.certificate = {
        certificateId: data.certificate?.certificateId || null,
      };
    }

    setFormData(formattedData);
  };

  const handleUpdateCompliance = async () => {
    setUpdateLoading(true);
    try {
      const res = await updateClientCompliance(formData);
      const updated = res.data;
      setOpenUpdateCompliance(false);
      // fetchCompliance();
      setComplianceList((prev) =>
        prev.map((item) =>
          item.complianceId === updated.complianceId
            ? { ...item, ...updated }
            : item,
        ),
      );
      notify.success(res.message || "Pre-requisite updated successfully");
    } catch (error) {
      notify.error(
        error.response?.data?.message || "Failed to update Pre-requisite.",
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteCompliance = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteClientCompliance(selectedComplianceId);
      notify.success(res.message || "Pre-requisite deleted successfully.");
      setOpenConfirmModal(false);
      setSelectedComplianceId(null);
      fetchCompliance();
    } catch (error) {
      notify.error(
        error.response?.data?.message || "Failed to delete Pre-requisite.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchCompliance = async () => {
    setLoading(true);
    try {
      const res = await getClientCompliance(clientId);
      const data = res.data || [];

      const normalized = data.map((compliance) => ({
        ...compliance,
        activeFlag: compliance.activeFlag ?? false,
      }));

      setComplianceList(normalized);
      setCurrentPage(1);
    } catch (error) {
      notify.error(error, "Failed to fetch SLA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, [clientId, complianceRefetchKey]);

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (menuRef.current && !menuRef.current.contains(event.target)) {
  //       setOpenMenu(false);
  //     }
  //   };

  //   document.addEventListener("mousedown", handleClickOutside);
  //   return () => document.removeEventListener("mousedown", handleClickOutside);
  // }, []);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <LoadingSpinner text="Loading Compliance Information..." />
      </div>
    );
  }

  if (complianceList.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">
          Basic Compliance Information
        </h2>
        <p className="text-gray-600 italic font-semibold text-sm">
          No Compliance information available for this client. Add from above!
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(complianceList.length / ITEMS_PER_PAGE);
  const paginatedData = complianceList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-2">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
        <GenericTable
          headers={["Requirement", "Type", "Mandatory", "Status", "Actions"]}
          columns={["requirementName", "requirementType", "mandatory_info", "status_info", "actions"]}
          rows={paginatedData.map((item) => ({
            ...item,
            mandatory_info: (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${item.mandatoryFlag ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                {item.mandatoryFlag ? "Mandatory" : "Optional"}
              </span>
            ),
            status_info: (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${item.activeFlag ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {item.activeFlag ? "Active" : "Inactive"}
              </span>
            ),
            actions: (
              <div className="flex justify-center items-center gap-4">
                {canEditConfig ? (
                  <>
                    <button
                      title="Edit Compliance"
                      onClick={() => {
                        handleSetFormData(item);
                        setOpenUpdateCompliance(true);
                      }}
                      className="px-2 text-blue-600 hover:text-blue-800 transition"
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      title="Delete Compliance"
                      onClick={() => {
                        setSelectedComplianceId(item.complianceId);
                        setOpenConfirmModal(true);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 transition"
                    >
                      <DeleteIcon size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500 italic text-xs">
                    Don't have permission to take actions
                  </span>
                )}
              </div>
            )
          }))}
        />
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        />
      )}

      {/* Update Compliance Modal */}
      <Modal
        title="Update Compliance"
        subtitle="Update Compliance details for the client."
        isOpen={openUpdateCompliance}
        onClose={() => setOpenUpdateCompliance(false)}
        bodyClassName="p-5 overflow-y-auto max-h-[60vh]"
        scrollable={true}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setOpenUpdateCompliance(false)}
              className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95 text-[12px] uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateCompliance}
              disabled={updateLoading}
              className={`px-8 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md ${
                updateLoading ? "opacity-50 cursor-not-allowed" : "active:scale-95"
              } text-[12px] uppercase tracking-wider`}
            >
              {updateLoading ? "Updating..." : "Update"}
            </button>
          </div>
        }
      >
        <ComplianceForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* Delete Compliance Modal */}
      <ConfirmationModal
        isOpen={openComfirmModal}
        title="Delete Compliance"
        message="Are you sure you want to delete this Compliance? This Action cannot be undone."
        onConfirm={handleDeleteCompliance}
        onCancel={() => {
          setOpenConfirmModal(false);
          setSelectedComplianceId(null);
        }}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default ClientBasicCompliance;
