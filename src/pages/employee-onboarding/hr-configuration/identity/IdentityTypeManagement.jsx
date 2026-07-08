import { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance" ;
import AddEditIdentityModal from "./AddEditIdentityModal";
import { useNavigate } from "react-router-dom";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/Modal/modal";
import StatusBadge from "../../../../components/status/statusbadge";
import { PageCard } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function IdentityTypeManagement() {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [deleteBlocked, setDeleteBlocked] = useState(null);
  const navigate = useNavigate();
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* ---------------- FETCH ALL IDENTITIES ---------------- */
  const fetchIdentities = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE_URL}/identity`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setIdentities(res.data);
    } catch {
      if (window.showError) window.showError("Failed to load identity types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentities();
  }, []);

  /* ---------------- ESC KEY CLOSE (UX IMPROVEMENT) ---------------- */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setDeleteBlocked(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (uuid) => {
    if (!window.confirm("Are you sure you want to delete this identity type?"))
      return;

    try {
      await api.delete(`${BASE_URL}/identity/${uuid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (window.showSuccess) window.showSuccess("Identity type deleted");
      setIdentities((prev) =>
        prev.filter((i) => i.identity_type_uuid !== uuid),
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;

      // 🔥 BUSINESS RULE: used in country mappings
      if (err?.response?.status === 500) {
        setDeleteBlocked({
          message:
            detail?.message ||
            "This identity type is already used in country identity mappings. Please remove it from country mappings first.",
        });
      } else {
        if (window.showError) window.showError("Failed to delete identity type");
      }
    }
  };

  const tableHeaders = ["Name", "Description", "Status", "Actions"];
  const tableColumns = ["identity_type_name", "description", "status_badge", "actions"];
  const tableRows = identities.map((item) => ({
    identity_type_name: item.identity_type_name,
    description: item.description || "—",
    status_badge: <StatusBadge label={item.is_active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center gap-4">
        <Button
          variant="link"
          size="small"
          onClick={() => {
            setEditData(item);
            setShowModal(true);
          }}
        >
          Edit
        </Button>
        <Button
          variant="link"
          size="small"
          className="!text-red-600 hover:!underline"
          onClick={() => handleDelete(item.identity_type_uuid)}
        >
          Delete
        </Button>
      </div>
    ),
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={Fonts.heading3}>
            Identity Type Management
          </h1>
          <p className={Fonts.paragraph}>
            Manage identity documents used in onboarding
          </p>
        </div>

        <Button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          variant="primary"
        >
          + Add Identity Type
        </Button>
      </div>

      {/* Table */}
      <PageCard>
        <GenericTable
          headers={tableHeaders}
          columns={tableColumns}
          rows={tableRows}
          loading={loading}
        />
      </PageCard>

      {/* 🔴 DELETE BLOCKED MODAL */}
      {deleteBlocked && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteBlocked(null)}
          title="Cannot Delete Identity Type"
          size="md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button onClick={() => setDeleteBlocked(null)} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setDeleteBlocked(null);
                  navigate("/employee-onboarding/hr-configuration/mapping");
                }}
                variant="primary"
              >
                Go to Country Mapping
              </Button>
            </div>
          }
        >
          <p className="text-gray-700">{deleteBlocked.message}</p>
        </Modal>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <AddEditIdentityModal
          editData={editData}
          onClose={() => setShowModal(false)}
          onSuccess={(savedItem) => {
            setIdentities((prev) => {
              const exists = prev.some(
                (i) => i.identity_type_uuid === savedItem.identity_type_uuid,
              );
              return exists
                ? prev.map((i) =>
                    i.identity_type_uuid === savedItem.identity_type_uuid
                      ? savedItem
                      : i,
                  )
                : [savedItem, ...prev];
            });
          }}
        />
      )}
    </div>
  );
}
