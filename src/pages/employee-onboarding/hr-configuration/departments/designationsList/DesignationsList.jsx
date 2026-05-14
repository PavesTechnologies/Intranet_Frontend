import { useEffect, useState } from "react";
import { Pencil, Trash } from "lucide-react";
import { toast } from "react-toastify";
import Pagination from "../../../../../components/Pagination/pagination";
import FilterListbox from "../../../../../components/filter/FilterListbox";

export default function DesignationManagement() {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* ---------------- FETCH DEPARTMENTS ---------------- */

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${BASE}/masters/departments/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const data = await res.json();
      setDepartments(data);
    } catch {
      toast.error("Failed to load departments");
    }
  };

  /* ---------------- FETCH DESIGNATIONS ---------------- */

  const fetchDesignations = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE}/masters/designations/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const data = await res.json();
      setDesignations(data);
    } catch {
      toast.error("Failed to load designations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchDesignations();
  }, []);

  /* ---------------- DELETE ---------------- */

  const deleteDesignation = async (uuid) => {
    if (!window.confirm("Delete designation?")) return;

    try {
      const res = await fetch(`${BASE}/masters/designations/${uuid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) throw new Error();

      setDesignations((prev) =>
        prev.filter((d) => d.designation_uuid !== uuid),
      );

      toast.success("Designation deleted");
    } catch {
      toast.error("Failed to delete designation");
    }
  };

  const departmentMap = Object.fromEntries(
    departments.map((d) => [d.department_uuid, d.department_name]),
  );

  const filteredDesignations = designations.filter((d) => {
    const matchesSearch =
      d.designation_name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      departmentFilter === "" || d.department_uuid === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const totalPages = Math.ceil(filteredDesignations.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedDesignations = filteredDesignations.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Designation Management
          </h1>

          <p className="text-gray-600">
            Manage designations grouped by departments
          </p>
        </div>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="px-5 py-2 bg-blue-700 text-white rounded-lg"
        >
          + Add Designation
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />

        <FilterListbox
          options={[{value:"",label:"All Departments"}, ...departments.map((d) => ({value: d.department_uuid, label: d.department_name}))]}
          value={departmentFilter}
          onChange={setDepartmentFilter}
        />
      </div>

      {/* TABLE */}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-center">Department</th>
                <th className="px-6 py-3 text-center">Designation</th>
                <th className="px-6 py-3 text-Center">Description</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedDesignations.map((des) => {
                return (
                  <tr
                    key={des.designation_uuid}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-3 text-center">
                      {departmentMap[des.department_uuid] || "—"}
                    </td>

                    <td className="px-6 py-3 text-center">
                      {des.designation_name}
                    </td>

                    <td className="px-6 py-3 text-center">{des.description}</td>

                    <td className="px-6 py-3 text-center">
                      <button
                        className="text-blue-600 mr-3"
                        onClick={() => {
                          setEditData(des);
                          setShowModal(true);
                        }}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className="text-red-600"
                        onClick={() => deleteDesignation(des.designation_uuid)}
                        title="Delete"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((prev) => prev - 1)}
        onNext={() => setCurrentPage((prev) => prev + 1)}
      />

      {/* MODAL */}

      {showModal && (
        <DesignationModal
          editData={editData}
          departments={departments}
          onClose={() => setShowModal(false)}
          onSuccess={(saved) => {
            setDesignations((prev) => {
              const exists = prev.some(
                (d) => d.designation_uuid === saved.designation_uuid,
              );

              return exists
                ? prev.map((d) =>
                    d.designation_uuid === saved.designation_uuid ? saved : d,
                  )
                : [saved, ...prev];
            });
          }}
        />
      )}
    </div>
  );
}

/* ================= MODAL ================= */

function DesignationModal({ editData, departments, onClose, onSuccess }) {
  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const [name, setName] = useState(editData?.designation_name || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [department, setDepartment] = useState(editData?.department_uuid || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !department) {
      toast.error("Name and Department required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        designation_name: name,
        department_uuid: department,
        description,
      };

      let res;

      if (editData) {
        res = await fetch(
          `${BASE}/masters/designations/${editData.designation_uuid}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(payload),
          },
        );
      } else {
        res = await fetch(`${BASE}/masters/designations/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error();

      const data = await res.json();

      toast.success(
        `Designation ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess(data);
      onClose();
    } catch {
      toast.error("Failed to save designation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? "Edit" : "Add"} Designation
        </h2>

        <label className="block mb-1">Department</label>

        <FilterListbox
          options={[{value:"",label:"Select Department"}, ...departments.map((d) => ({value: d.department_uuid, label: d.department_name}))]}
          value={department}
          onChange={setDepartment}
        />

        <label className="block mb-1">Designation Name</label>

        <input
          className="w-full border px-3 py-2 rounded mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block mb-1">Description</label>

        <textarea
          className="w-full border px-3 py-2 rounded mb-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>

          <button
            onClick={save}
            className="px-4 py-2 bg-blue-700 text-white rounded"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
