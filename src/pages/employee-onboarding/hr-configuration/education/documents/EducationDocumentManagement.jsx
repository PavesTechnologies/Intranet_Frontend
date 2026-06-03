import { useEffect, useState } from "react";
import api from "../../../../../api/axiosInstance" ;
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/Modal/modal";
import { PageCard } from "../../../../../components/Cards/PageCard";

export default function EducationDocumentManagement() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* -------------------- FETCH (INITIAL LOAD ONLY) -------------------- */
  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE}/education/education-document`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setDocs(res.data);
    } catch {
      if (window.showError) window.showError("Failed to load education documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  /* -------------------- DELETE (OPTIMISTIC) -------------------- */
  const deleteDoc = async (uuid) => {
    if (!window.confirm("Delete document?")) return;

    try {
      await api.delete(`${BASE}/education/education-document/${uuid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setDocs((prev) => prev.filter((d) => d.education_document_uuid !== uuid));

      if (window.showSuccess) window.showSuccess("Document deleted");
    } catch {
      if (window.showError) window.showError("Failed to delete document");
    }
  };

  const tableHeaders = ["Document Name", "Description", "Action"];
  const tableColumns = ["document_name", "description", "actions"];
  const tableRows = docs.map((d) => ({
    document_name: d.document_name,
    description: d.description || "—",
    actions: (
      <div className="flex justify-end items-center gap-4">
        <Button
          variant="link"
          size="small"
          onClick={() => {
            setEditData(d);
            setShowModal(true);
          }}
        >
          Edit
        </Button>
        <Button
          variant="link"
          size="small"
          className="!text-red-600 hover:!underline"
          onClick={() => deleteDoc(d.education_document_uuid)}
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
          <h1 className="text-2xl font-semibold text-gray-900">
            Education Document Management
          </h1>
          <p className="text-gray-600">
            Manage education documents required during onboarding
          </p>
        </div>

        <Button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          variant="primary"
        >
          + Add Document
        </Button>
      </div>

      {/* Table Card */}
      <PageCard>
        <GenericTable
          headers={tableHeaders}
          columns={tableColumns}
          rows={tableRows}
          loading={loading}
        />
      </PageCard>

      {/* Modal */}
      {showModal && (
        <DocumentModal
          editData={editData}
          onClose={() => setShowModal(false)}
          onSuccess={(savedDoc) => {
            setDocs((prev) => {
              const exists = prev.some(
                (d) =>
                  d.education_document_uuid ===
                  savedDoc.education_document_uuid,
              );

              return exists
                ? prev.map((d) =>
                    d.education_document_uuid ===
                    savedDoc.education_document_uuid
                      ? savedDoc
                      : d,
                  )
                : [savedDoc, ...prev];
            });
          }}
        />
      )}
    </div>
  );
}

/* ======================== MODAL ======================== */

function DocumentModal({ editData, onClose, onSuccess }) {
  const [name, setName] = useState(editData?.document_name || "");
  const [desc, setDesc] = useState(editData?.description || "");
  const [saving, setSaving] = useState(false);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const save = async () => {
    if (!name.trim()) {
      if (window.showError) window.showError("Document name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        document_name: name,
        description: desc,
      };

      let res;

      if (editData) {
        res = await api.put(
          `${BASE}/education/education-document/${editData.education_document_uuid}`,
          payload,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            responseType: "text",
          },
        );
      } else {
        res = await api.post(
          `${BASE}/education/create_education_document`,
          payload,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            responseType: "text",
          },
        );
      }

      if (window.showSuccess) window.showSuccess(
        `Document ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess({
        education_document_uuid:
          editData?.education_document_uuid || crypto.randomUUID(),
        ...payload,
      });

      onClose();
    } catch {
      if (window.showError) window.showError("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${editData ? "Edit" : "Add"} Document`}
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button onClick={onClose} variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            variant="primary"
            disabled={saving}
            loading={saving}
          >
            Save
          </Button>
        </div>
      }
    >
      <label className="block text-sm font-medium mb-1">Document Name</label>
      <input
        className="w-full border rounded-lg px-3 py-2 mb-3"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block text-sm font-medium mb-1">Description</label>
      <textarea
        className="w-full border rounded-lg px-3 py-2"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
    </Modal>
  );
}
