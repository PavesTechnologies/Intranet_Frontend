import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function EducationDocumentManagement() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");

  /* -------------------- FETCH (INITIAL LOAD ONLY) -------------------- */
  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/education/education-document`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(res.data);
    } catch {
      toast.error("Failed to load education documents");
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
      await axios.delete(`${BASE}/education/education-document/${uuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocs((prev) => prev.filter((d) => d.education_document_uuid !== uuid));

      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

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

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
        >
          + Add Document
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">
            Loading documents...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Document Name</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No documents found
                  </td>
                </tr>
              ) : (
                docs.map((d) => (
                  <tr
                    key={d.education_document_uuid}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">{d.document_name}</td>
                    <td className="px-6 py-3">{d.description || "—"}</td>
                    <td className="px-6 py-3 text-right space-x-4">
                      <button
                        className="text-blue-700 hover:underline"
                        onClick={() => {
                          setEditData(d);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => deleteDoc(d.education_document_uuid)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

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
  const token = localStorage.getItem("token");

  const save = async () => {
    if (!name.trim()) {
      toast.error("Document name is required");
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
        res = await axios.put(
          `${BASE}/education/education-document/${editData.education_document_uuid}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "text",
          },
        );
      } else {
        res = await axios.post(
          `${BASE}/education/create_education_document`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "text",
          },
        );
      }

      toast.success(
        `Document ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess({
        education_document_uuid:
          editData?.education_document_uuid || crypto.randomUUID(),
        ...payload,
      });

      onClose();
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? "Edit" : "Add"} Document
        </h2>

        <label className="block text-sm font-medium mb-1">Document Name</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 mb-4"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
