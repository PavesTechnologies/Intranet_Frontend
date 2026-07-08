import { useEffect, useState } from "react";
import api from "../../../../../api/axiosInstance";
import { Pencil, Trash } from "lucide-react";
import Pagination from "../../../../../components/Pagination/pagination";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/Modal/modal";
import { PageCard } from "../../../../../components/Cards/PageCard";
import { Fonts } from "../../../../../components/Fonts/Fonts";

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
      const res = await api.get(`${BASE}/masters/departments/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setDepartments(res.data);
    } catch {
      if (window.showError) window.showError("Failed to load departments");
    }
  };

  /* ---------------- FETCH DESIGNATIONS ---------------- */

  const fetchDesignations = async () => {
    try {
      setLoading(true);

      const res = await api.get(`${BASE}/masters/designations/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setDesignations(res.data);
    } catch {
      if (window.showError) window.showError("Failed to load designations");
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
      await api.delete(`${BASE}/masters/designations/${uuid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setDesignations((prev) =>
        prev.filter((d) => d.designation_uuid !== uuid),
      );

      if (window.showSuccess) window.showSuccess("Designation deleted");
    } catch {
      if (window.showError) window.showError("Failed to delete designation");
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

  const tableHeaders = ["Department", "Designation", "Description", "Action"];
  const tableColumns = ["department", "designation", "description", "actions"];
  const tableRows = paginatedDesignations.map((des) => ({
    department: departmentMap[des.department_uuid] || "—",
    designation: des.designation_name,
    description: des.description || "—",
    actions: (
      <div className="flex justify-center items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditData(des);
            setShowModal(true);
          }}
          title="Edit"
        >
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteDesignation(des.designation_uuid)}
          title="Delete"
        >
          <Trash className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={Fonts.heading3}>
            Designation Management
          </h1>

          <p className={Fonts.paragraph}>
            Manage designations grouped by departments
          </p>
        </div>

        <Button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          variant="primary"
        >
          + Add Designation
        </Button>
      </div>

      <div className="flex gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Search designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-lg w-64 text-sm"
        />

        <FilterListbox
          options={[{value:"",label:"All Departments"}, ...departments.map((d) => ({value: d.department_uuid, label: d.department_name}))]}
          value={departmentFilter}
          onChange={setDepartmentFilter}
        />
      </div>

      {/* TABLE */}

      <PageCard>
        <GenericTable
          headers={tableHeaders}
          columns={tableColumns}
          rows={tableRows}
          loading={loading}
        />
      </PageCard>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((prev) => prev - 1)}
          onNext={() => setCurrentPage((prev) => prev + 1)}
        />
      </div>

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
      if (window.showError) window.showError("Name and Department required");
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

      const authHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };

      if (editData) {
        res = await api.put(
          `${BASE}/masters/designations/${editData.designation_uuid}`,
          payload,
          authHeaders,
        );
      } else {
        res = await api.post(`${BASE}/masters/designations/`, payload, authHeaders);
      }

      const data = res.data;

      if (window.showSuccess) window.showSuccess(
        `Designation ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess(data);
      onClose();
    } catch {
      if (window.showError) window.showError("Failed to save designation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${editData ? "Edit" : "Add"} Designation`}
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
      <div className="space-y-4">
        <div>
          <label className={`block ${Fonts.label} mb-1`}>Department</label>
          <FilterListbox
            options={[{value:"",label:"Select Department"}, ...departments.map((d) => ({value: d.department_uuid, label: d.department_name}))]}
            value={department}
            onChange={setDepartment}
          />
        </div>

        <div>
          <label className={`block ${Fonts.label} mb-1`}>Designation Name</label>
          <input
            className="w-full border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className={`block ${Fonts.label} mb-1`}>Description</label>
          <textarea
            className="w-full border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
