import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../../../contexts/AuthContext";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import Modal from "../../../../../components/Modal/modal";
import { PageCard } from "../../../../../components/Cards/PageCard";

export default function DegreeMasterManagement() {
  const { user } = useAuth();
  const roles = user?.roles?.map((r) => r.toUpperCase()) || [];
  const canView = roles.includes("ADMIN") || roles.includes("HR");

  const [degrees, setDegrees] = useState([]);
  const [educationLevels, setEducationLevels] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  /* -------------------- FETCH EDUCATION LEVELS -------------------- */
  const fetchEducationLevels = async () => {
    try {
      const res = await axios.get(`${BASE}/masters/education-level`, {
        headers: authHeaders,
      });
      setEducationLevels(res.data);
    } catch {
      if (window.showError) window.showError("Failed to load education levels");
    }
  };

  /* -------------------- FETCH DEGREES -------------------- */
  const fetchDegrees = async (educationUuid = "") => {
    try {
      setLoading(true);
      const url = educationUuid
        ? `${BASE}/education/degree-master/${educationUuid}`
        : `${BASE}/education/degree-master`;
      const res = await axios.get(url, { headers: authHeaders });
      setDegrees(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDegrees([]);
      if (window.showError) window.showError("Failed to load degrees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchEducationLevels();
      fetchDegrees();
    }
  }, [canView]);

  const handleFilterChange = (e) => {
    const uuid = e.target.value;
    setSelectedFilter(uuid);
    fetchDegrees(uuid);
  };

  if (!canView) {
    return (
      <div className="p-6 text-center text-red-600">
        You are not authorized to view Degree Master
      </div>
    );
  }

  /* -------------------- TABLE -------------------- */
  const tableHeaders = ["Degree Name", "Education Level"];
  const tableColumns = ["degree_name", "education_name"];

  const tableRows = degrees.map((d) => ({
    degree_name: d.degree_name,
    education_name: d.education_name || "—",
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Degree Master
          </h1>
          <p className="text-gray-600">
            Manage degree types mapped to education levels
          </p>
        </div>
        {(roles.includes("ADMIN") || roles.includes("HR")) && (
          <Button onClick={() => setShowModal(true)} variant="primary">
            + Add Degree
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">
          Filter by Education Level:
        </label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[220px]"
          value={selectedFilter}
          onChange={handleFilterChange}
        >
          <option value="">All Education Levels</option>
          {educationLevels.map((level) => (
            <option key={level.education_uuid} value={level.education_uuid}>
              {level.education_name}
            </option>
          ))}
        </select>

        {selectedFilter && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => {
              setSelectedFilter("");
              fetchDegrees();
            }}
          >
            Clear filter
          </button>
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
        <AddDegreeModal
          educationLevels={educationLevels}
          onClose={() => setShowModal(false)}
          onSuccess={(newDegree) => {
            if (!selectedFilter || newDegree.education_uuid === selectedFilter) {
              setDegrees((prev) => [newDegree, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}

/* ======================== MODAL ======================== */

function AddDegreeModal({ educationLevels, onClose, onSuccess }) {
  const [degreeName, setDegreeName] = useState("");
  const [educationUuid, setEducationUuid] = useState("");
  const [saving, setSaving] = useState(false);

  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const save = async () => {
    if (!degreeName.trim()) {
      if (window.showError) window.showError("Degree name is required");
      return;
    }
    if (!educationUuid) {
      if (window.showError) window.showError("Please select an education level");
      return;
    }

    try {
      setSaving(true);
      const res = await axios.post(
        `${BASE}/education/degree-master`,
        { degree_name: degreeName.trim(), education_uuid: educationUuid },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (window.showSuccess) window.showSuccess("Degree created successfully");
      onSuccess(res.data);
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg).join(", ")
            : "Failed to create degree";
      if (window.showError) window.showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Degree"
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
            Save Degree
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Degree Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. B.Tech, MBA, Diploma in Civil"
            value={degreeName}
            onChange={(e) => setDegreeName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Education Level <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            value={educationUuid}
            onChange={(e) => setEducationUuid(e.target.value)}
          >
            <option value="">Select education level</option>
            {educationLevels.map((level) => (
              <option key={level.education_uuid} value={level.education_uuid}>
                {level.education_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
