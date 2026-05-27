import { useEffect, useState } from "react";
import api from "../../../../../api/axiosInstance" ;
import { useAuth } from "../../../../../contexts/AuthContext";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/Modal/modal";
import StatusBadge from "../../../../../components/status/statusbadge";
import { PageCard } from "../../../../../components/Cards/PageCard";

export default function EducationLevelManagement() {
  const { user } = useAuth();
  const roles = user?.roles?.map(r => r.toUpperCase()) || [];
  const canView = roles.includes("ADMIN") || roles.includes("HR");
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* -------------------- FETCH -------------------- */

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE}/masters/education-level`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setLevels(res.data);
    } catch {
      if (window.showError) window.showError("Failed to load education levels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchLevels();
    }
  }, [canView]);

  if (!canView) {
    return (
      <div className="p-6 text-center text-red-600">
        You are not authorized to view Education Levels
      </div>
    );
  }

  /* -------------------- DELETE -------------------- */
  const deleteLevel = async (uuid) => {
    if (!window.confirm("Delete education level?")) return;

    try {
      await api.delete(`${BASE}/masters/education-level/${uuid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setLevels((prev) => prev.filter((l) => l.education_uuid !== uuid));
      if (window.showSuccess) window.showSuccess("Education level deleted");
    } catch {
      if (window.showError) window.showError("Failed to delete education level");
    }
  };

  const tableHeaders = ["Education Name", "Description", "Status", "Action"];
  const tableColumns = ["education_name", "description", "status_badge", "actions"];
  const tableRows = levels.map((l) => ({
    education_name: l.education_name,
    description: l.description || "—",
    status_badge: <StatusBadge label={l.is_active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex justify-end items-center gap-4">
        {(roles.includes("ADMIN") || roles.includes("HR")) && (
          <Button
            variant="link"
            size="small"
            onClick={() => {
              setEditData(l);
              setShowModal(true);
            }}
          >
            Edit
          </Button>
        )}
        {(roles.includes("ADMIN") || roles.includes("HR")) && (
          <Button
            variant="link"
            size="small"
            className="!text-red-600 hover:!underline"
            onClick={() => deleteLevel(l.education_uuid)}
          >
            Delete
          </Button>
        )}
      </div>
    ),
  }));

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
        {(roles.includes("ADMIN") || roles.includes("HR")) && (
          <Button
            onClick={() => {
              setEditData(null);
              setShowModal(true);
            }}
            variant="primary"
          >
            + Add Education Level
          </Button>
        )}
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

  const save = async () => {
    if (!name.trim()) {
      if (window.showError) window.showError("Education name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        education_name: name,
        description: desc,
        is_active: isActive,
      };

      let res;

      if (editData) {
        res = await api.put(
          `${BASE}/masters/education-level/${editData.education_uuid}`,
          payload,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            responseType: "text",
          },
        );
      } else {
        res = await api.post(`${BASE}/masters/education-level/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: "text",
        });
      }

      if (window.showSuccess) window.showSuccess(
        `Education level ${editData ? "updated" : "created"} successfully`,
      );

      onSuccess({
        education_uuid: editData?.education_uuid || crypto.randomUUID(),
        ...payload,
      });

      onClose();
    } catch {
      if (window.showError) window.showError("Failed to save education level");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${editData ? "Edit" : "Add"} Education Level`}
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
          <label className="block text-sm font-medium mb-1">Education Name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>
    </Modal>
  );
}
