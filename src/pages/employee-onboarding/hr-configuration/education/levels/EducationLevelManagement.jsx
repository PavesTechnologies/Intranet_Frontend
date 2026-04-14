import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function EducationLevelManagement() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");

  /* -------------------- FETCH -------------------- */
  const fetchLevels = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/masters/education-level`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLevels(res.data);
    } catch {
      toast.error("Failed to load education levels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  /* -------------------- DELETE -------------------- */
  const deleteLevel = async (uuid) => {
    if (!window.confirm("Delete education level?")) return;

    try {
      await axios.delete(`${BASE}/masters/education-level/${uuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLevels((prev) => prev.filter((l) => l.education_uuid !== uuid));
      toast.success("Education level deleted");
    } catch {
      toast.error("Failed to delete education level");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Education Level Management
          </h1>
          <p className="text-gray-600">
            Manage education levels used in onboarding
          </p>
        </div>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
        >
          + Add Education Level
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">
            Loading education levels...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Education Name</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {levels.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No education levels found
                  </td>
                </tr>
              ) : (
                levels.map((l) => (
                  <tr
                    key={l.education_uuid}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">{l.education_name}</td>
                    <td className="px-6 py-3">{l.description || "—"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          l.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {l.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right space-x-4">
                      <button
                        className="text-blue-700 hover:underline"
                        onClick={() => {
                          setEditData(l);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => deleteLevel(l.education_uuid)}
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
        <LevelModal
          editData={editData}
          onClose={() => setShowModal(false)}
          onSuccess={(savedLevel) => {
            setLevels((prev) => {
              const exists = prev.some(
                (l) => l.education_uuid === savedLevel.education_uuid,
              );
              return exists
                ? prev.map((l) =>
                    l.education_uuid === savedLevel.education_uuid
                      ? savedLevel
                      : l,
                  )
                : [savedLevel, ...prev];
            });
          }}
        />
      )}
    </div>
  );
}

/* ======================== MODAL ======================== */

function LevelModal({ editData, onClose, onSuccess }) {
  const [name, setName] = useState(editData?.education_name || "");
  const [desc, setDesc] = useState(editData?.description || "");
  const [isActive, setIsActive] = useState(editData?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");

  const save = async () => {
    if (!name.trim()) {
      toast.error("Education name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        education_name: name,
        description: desc,
        is_active: isActive, // ✅ ALWAYS SENT
      };

      let res;

      if (editData) {
        res = await axios.put(
          `${BASE}/masters/education-level/${editData.education_uuid}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "text",
          },
        );
      } else {
        res = await axios.post(`${BASE}/masters/education-level/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "text",
        });
      }

      toast.success(
        `Education level ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess({
        education_uuid: editData?.education_uuid || crypto.randomUUID(),
        ...payload,
      });

      onClose();
    } catch {
      toast.error("Failed to save education level");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? "Edit" : "Add"} Education Level
        </h2>

        <label className="block text-sm font-medium mb-1">Education Name</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 mb-3"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 rounded-lg transition-all duration-100 ease-in-out
        active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-all duration-100 ease-in-out
        active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
