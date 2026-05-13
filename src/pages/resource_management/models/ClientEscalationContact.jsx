import React, { useEffect, useState } from "react";
import {
  getClientEscalation,
  updateClientContact,
  deleteClientContact,
} from "../services/clientservice";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Pagination from "../../../components/Pagination/pagination";
import { MoreHorizontalIcon, EditIcon, DeleteIcon } from "@/components/icons";
import Modal from "../../../components/Modal/modal";
import EscalationForm from "./client_configuration/forms/EscalationForm";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { useAuth } from "../../../contexts/AuthContext";
import GenericTable from "../../../components/Table/table";

const ClientEscalationContact = ({ clientId, escalationRefetchKey }) => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const canEditConfig = roles.includes("Admin"); // permissions.includes("EDIT_CLIENT_CONFIG");
  const [contactList, setContactList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openUpdateContact, setOpenUpdateContact] = useState(false);
  const [formData, setFormData] = useState({});
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);

  const ITEMS_PER_PAGE = 3;

  const handleSetFormData = (data) => {
    if (!data) return;
    setFormData({
      client: {
        clientId: clientId,
      },
      contactId: data.contactId,
      contactName: data.contactName,
      contactRole: data.contactRole,
      email: data.email,
      phone: data.phone,
      escalationLevel: data.escalationLevel,
      activeFlag: data.activeFlag ?? true,
    });
  };

  const fetchContact = async () => {
    setLoading(true);
    try {
      const res = await getClientEscalation(clientId);
      const data = res.data || [];

      const normalized = data.map((sla) => ({
        ...sla,
        activeFlag: sla.activeFlag ?? false,
      }));

      setContactList(normalized);
      setCurrentPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch SLA");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    setUpdateLoading(true);
    try {
      const res = await updateClientContact(formData);
      toast.success(res.message || "Contact updated successfully.");
      setOpenUpdateContact(false);
      fetchContact();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update Contact.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteContact = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteClientContact(selectedContactId);
      const updated = res.data;
      setContactList((prev) =>
        prev.map((item) =>
          item.contactId === updated.contactId ? { ...item, ...updated } : item,
        ),
      );
      toast.success(res.message || "Contact deleted successfully.");
      // fetchContact();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete Contact.");
    } finally {
      setDeleteLoading(false);
      setSelectedContactId(null);
      setOpenConfirmModal(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [clientId, escalationRefetchKey]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <LoadingSpinner text="Loading Escalation Information..." />
      </div>
    );
  }

  if (contactList.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">
          Basic Escalation Contacts
        </h2>
        <p className="text-gray-600 italic font-semibold text-sm">
          No Escalation Contacts information available for this client. Add from
          above!
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(contactList.length / ITEMS_PER_PAGE);
  const paginatedData = contactList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-2">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
        <GenericTable
          headers={["Contact Name", "Contact Role", "Email", "Phone", "Escalation Level", "Status", "Actions"]}
          columns={["contactName", "contactRole", "email", "phone", "escalationLevel", "status_info", "actions"]}
          rows={paginatedData.map((item) => ({
            ...item,
            status_info: (
              <span className={`px-2 py-1 text-xs rounded-full ${item.activeFlag ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {item.activeFlag ? "Active" : "Inactive"}
              </span>
            ),
            actions: (
              <div className="flex justify-center items-center gap-4">
                {canEditConfig ? (
                  <>
                    <button
                      onClick={() => {
                        handleSetFormData(item);
                        setOpenUpdateContact(true);
                      }}
                      className="px-2 text-blue-600 hover:text-blue-800 transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedContactId(item.contactId);
                        setOpenConfirmModal(true);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 transition"
                    >
                      <Trash2 size={14} />
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

      {/* Update Contact Modal */}
      <Modal
        title="Update Escalation Contact"
        subtitle="Update Escalation Contact details."
        isOpen={openUpdateContact}
        onClose={() => setOpenUpdateContact(false)}
      >
        <EscalationForm formData={formData} setFormData={setFormData} />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleUpdateContact}
            disabled={updateLoading}
            className={`px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 ${updateLoading && "opacity-50 cursor-not-allowed"}`}
          >
            {updateLoading ? "Updating..." : "Update"}
          </button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmationModal
        title="Delete Escalation Contact"
        message="Are you sure you want to delete this Contact? Action cannot be undone."
        confirmText="Delete"
        isOpen={openConfirmModal}
        onCancel={() => setOpenConfirmModal(false)}
        onConfirm={handleDeleteContact}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default ClientEscalationContact;
