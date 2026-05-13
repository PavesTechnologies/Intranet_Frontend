import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getCompanyContactsByCompanyId,
  updateCompanyContact,
  deleteCompanyContact,
  createCompanyContact,
} from "../services/clientservice";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Pagination from "../../../components/Pagination/pagination";
import { EditIcon, DeleteIcon } from "@/components/icons";
import Modal from "../../../components/Modal/modal";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { useAuth } from "../../../contexts/AuthContext";
import CompanyEscalationContactModal from "./client_configuration/CompanyEscalationModal";
import GenericTable from "../../../components/Table/table";

const CompanyEscalation = () => {
  const { user } = useAuth();
  const { companyId } = useParams();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const canEditConfig = roles.includes("Admin"); // permissions.includes("EDIT_CLIENT_CONFIG");

  const [contactList, setContactList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  // const [selectedContact, setSelectedContact] = useState(null);

  const [openUpdateContact, setOpenUpdateContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);

  const ITEMS_PER_PAGE = 3;

  // const handleSetFormData = (data) => {
  //   if (!data) return;
  //   setFormData({
  //     client: {
  //       clientId: clientId,
  //     },
  //     contactId: data.contactId,
  //     contactName: data.contactName,
  //     contactRole: data.contactRole,
  //     email: data.email,
  //     phone: data.phone,
  //     escalationLevel: data.escalationLevel,
  //     activeFlag: data.activeFlag ?? true,
  //   });
  // };

  const fetchContact = async () => {
    setLoading(true);
    try {
      const res = await getCompanyContactsByCompanyId(companyId);
      const data = res.data || [];

      setContactList(
        data.map((item) => ({
          ...item,
          activeFlag: item.activeFlag ?? false,
        })),
      );

      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch escalation contacts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();

    const refresh = () => fetchContact();
    window.addEventListener("refresh-company-escalation", refresh);

    return () => {
      window.removeEventListener("refresh-company-escalation", refresh);
    };
  }, [companyId]);

  /* ================= UPDATE ================= */

  const handleUpdateContact = async (data) => {
    setUpdateLoading(true);
    try {
      if (selectedContact) {
        const res = await updateCompanyContact(data);
        toast.success(res.message || "Contact updated successfully.");
      } else {
        const res = await createCompanyContact(data);
        toast.success(res.message || "Contact created successfully.");
      }
      setOpenUpdateContact(false);
      setSelectedContact(null);
      fetchContact();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save contact.");
    } finally {
      setUpdateLoading(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDeleteContact = async () => {
    setDeleteLoading(true);
    try {
      await deleteCompanyContact(selectedContactId);
      toast.success("Escalation contact deleted successfully");
      fetchContact();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete escalation contact",
      );
    } finally {
      setDeleteLoading(false);
      setSelectedContactId(null);
      setOpenConfirmModal(false);
    }
  };

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(contactList.length / ITEMS_PER_PAGE);
  const paginatedData = contactList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <LoadingSpinner text="Loading Escalation Contacts..." />
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="p-2">
      {contactList.length === 0 ? (
        <p className="text-gray-600 italic text-sm">
          No escalation contacts available.
        </p>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <GenericTable
            headers={["Name", "Role", "Email", "Phone", "Level", "Status", "Actions"]}
            columns={["contactName", "contactRole", "email", "phone", "escalationLevel", "status_info", "actions"]}
            rows={paginatedData.map((item) => ({
              ...item,
              status_info: (
                <span className={`px-2 py-1 text-xs rounded-full ${item.activeFlag ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {item.activeFlag ? "Active" : "Inactive"}
                </span>
              ),
              actions: (
                <div className="flex justify-center gap-4">
                  {canEditConfig ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedContact(item);
                          setOpenUpdateContact(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContactId(item.contactId);
                          setOpenConfirmModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <DeleteIcon size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400 italic text-xs">No permission</span>
                  )}
                </div>
              )
            }))}
          />
        </div>
      )}

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
        title="Escalation Contact"
        subtitle="Create or update escalation contact."
        isOpen={openUpdateContact}
        onClose={() => {
          setOpenUpdateContact(false);
          setSelectedContact(null);
        }}
      >
        <CompanyEscalationContactModal
          initialData={selectedContact}
          loading={updateLoading}
          onClose={() => {
            setOpenUpdateContact(false);
            setSelectedContact(null);
          }}
          onSave={async (data) => handleUpdateContact(data)}
        />
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmationModal
        title="Delete Escalation Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmText="Delete"
        isOpen={openConfirmModal}
        onCancel={() => setOpenConfirmModal(false)}
        onConfirm={handleDeleteContact}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default CompanyEscalation;

