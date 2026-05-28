import { useEffect, useState } from "react";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/Modal/modal";
import { PageCard } from "../../../../../components/Cards/PageCard";

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* -------------------- FETCH -------------------- */
  const fetchDepartments = async () => {
    try {
      setLoading(true);

      const res = await api.get(`${BASE}/masters/departments/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch departments");
      }

      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      if (window.showError) window.showError("Failed to load departments");
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
      const res = await api.get(`${BASE}/masters/departments/${uuid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      setDepartments((prev) => prev.filter((d) => d.department_uuid !== uuid));

      if (window.showSuccess) window.showSuccess("Department deleted");
    } catch (error) {
      if (window.showError) window.showError("Failed to delete department");
    }
  };

  const tableHeaders = ["Department Name", "Description", "Action"];
  const tableColumns = ["department_name", "description", "actions"];
  const tableRows = departments.map((d) => ({
    department_name: d.department_name,
    description: d.description || "—",
    actions: (
      <div className="flex justify-center items-center gap-4">
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
          onClick={() => deleteDepartment(d.department_uuid)}
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
            Department Management
          </h1>

          <p className="text-gray-600">
            Manage company departments used in onboarding
          </p>
        </div>

        <Button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          variant="primary"
        >
          + Add Department
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

  const save = async () => {
    if (!name.trim()) {
      if (window.showError) window.showError("Department name is required");
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
        res = await api.get(
          `${BASE}/masters/departments/${editData.department_uuid}`,
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
        res = await api.get(`${BASE}/masters/departments/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        throw new Error("Failed to save department");
      }

      const data = await res.json();

      if (window.showSuccess) window.showSuccess(
        `Department ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess({
        department_uuid: editData?.department_uuid || crypto.randomUUID(),
        ...payload,
      });

      onClose();
    } catch {
      if (window.showError) window.showError("Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${editData ? "Edit" : "Add"} Department`}
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
        className="w-full border rounded-lg px-3 py-2"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
    </Modal>
  );
}
