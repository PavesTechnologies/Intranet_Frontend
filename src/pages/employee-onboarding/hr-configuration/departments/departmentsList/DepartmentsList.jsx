import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");

  /* -------------------- FETCH -------------------- */
  const fetchDepartments = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE}/masters/departments/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch departments");
      }

      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);
  /* -------------------- DELETE -------------------- */
  const deleteDepartment = async (uuid) => {
    if (!window.confirm("Delete department?")) return;

    try {
      const res = await fetch(`${BASE}/masters/departments/${uuid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      setDepartments((prev) => prev.filter((d) => d.department_uuid !== uuid));

      toast.success("Department deleted");
    } catch (error) {
      toast.error("Failed to delete department");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Department Management
          </h1>

          <p className="text-gray-600">
            Manage company departments used in onboarding
          </p>
        </div>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
        >
          + Add Department
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">
            Loading departments...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-center">Department Name</th>

                <th className="px-6 py-3 text-center">Description</th>

                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No departments found
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr
                    key={d.department_uuid}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">{d.department_name}</td>

                    <td className="px-6 py-3">{d.description || "—"}</td>

                    <td className="px-6 py-3 text-center space-x-4">
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
                        onClick={() => deleteDepartment(d.department_uuid)}
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
        <DepartmentModal
          editData={editData}
          onClose={() => setShowModal(false)}
          onSuccess={(savedDept) => {
            setDepartments((prev) => {
              const exists = prev.some(
                (d) => d.department_uuid === savedDept.department_uuid,
              );

              return exists
                ? prev.map((d) =>
                    d.department_uuid === savedDept.department_uuid
                      ? savedDept
                      : d,
                  )
                : [savedDept, ...prev];
            });
          }}
        />
      )}
    </div>
  );
}

/* ======================== MODAL ======================== */

function DepartmentModal({ editData, onClose, onSuccess }) {
  const [name, setName] = useState(editData?.department_name || "");

  const [desc, setDesc] = useState(editData?.description || "");

  const [isActive, setIsActive] = useState(editData?.is_active ?? true);

  const [saving, setSaving] = useState(false);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");

  const save = async () => {
    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        department_name: name,
        description: desc,
        is_active: isActive,
      };

      let res;

      if (editData) {
        res = await fetch(
          `${BASE}/masters/departments/${editData.department_uuid}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        );
      } else {
        res = await fetch(`${BASE}/masters/departments/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        throw new Error("Failed to save department");
      }

      const data = await res.json();

      toast.success(
        `Department ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess({
        department_uuid: editData?.department_uuid || crypto.randomUUID(),
        ...payload,
      });

      onClose();
    } catch {
      toast.error("Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? "Edit" : "Add"} Department
        </h2>

        <label className="block text-sm font-medium mb-1">
          Department Name
        </label>

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

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 rounded-lg transition-all duration-100 ease-in-out
            active:translate-y-[1px]
            disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-all duration-100 ease-in-out
            active:translate-y-[1px]
            disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
