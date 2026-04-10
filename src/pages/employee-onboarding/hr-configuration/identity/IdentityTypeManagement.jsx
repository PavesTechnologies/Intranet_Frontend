import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import AddEditIdentityModal from "./AddEditIdentityModal";
import { useNavigate } from "react-router-dom";

export default function IdentityTypeManagement() {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [deleteBlocked, setDeleteBlocked] = useState(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* ---------------- FETCH ALL IDENTITIES ---------------- */
  const fetchIdentities = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/identity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIdentities(res.data);
    } catch {
      toast.error("Failed to load identity types");
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
      await axios.delete(`${BASE_URL}/identity/${uuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Identity type deleted");
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
        toast.error("Failed to delete identity type");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Identity Type Management
          </h1>
          <p className="text-gray-600">
            Manage identity documents used in onboarding
          </p>
        </div>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
        >
          + Add Identity Type
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-center">Description</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {identities.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No identity types found
                  </td>
                </tr>
              ) : (
                identities.map((item) => (
                  <tr
                    key={item.identity_type_uuid}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-3 font-medium">
                      {item.identity_type_name}
                    </td>
                    <td className="px-6 py-3">{item.description || "—"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          item.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 flex gap-3">
                      <button
                        onClick={() => {
                          setEditData(item);
                          setShowModal(true);
                        }}
                        className="text-blue-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.identity_type_uuid)}
                        className="text-red-700 hover:underline"
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

      {/* 🔴 DELETE BLOCKED MODAL */}
      {deleteBlocked && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[440px]">
            <h3 className="text-lg font-semibold text-red-600 mb-3">
              Cannot Delete Identity Type
            </h3>

            <p className="text-gray-700 mb-6">{deleteBlocked.message}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteBlocked(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setDeleteBlocked(null);
                  navigate("/employee-onboarding/hr-configuration/mapping");
                }}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg"
              >
                Go to Country Mapping
              </button>
            </div>
          </div>
        </div>
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
