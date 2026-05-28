import { useEffect, useState } from "react";
import api from "../../../../../api/axiosInstance" ;
import { useAuth } from "../../../../../contexts/AuthContext";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import { PageCard } from "../../../../../components/Cards/PageCard";

export default function CountryEducationMapping() {
  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const { user } = useAuth();
  const roles = user?.roles?.map(r => r.toUpperCase()) || [];
  const canView = roles.includes("ADMIN") || roles.includes("HR");

  /* ================= STATE ================= */
  const [countries, setCountries] = useState([]);
  const [mappings, setMappings] = useState([]);

  const [levels, setLevels] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [mandatory, setMandatory] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD COUNTRIES ONLY ================= */
  useEffect(() => {
    if (!canView) return;
    axios
      .get(`${BASE}/masters/country`, 
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then((res) => setCountries(res.data || []))
      .catch(() => setError("Failed to load countries"));
  }, [canView]);

  if (!canView) {
    return (
      <div className="p-6 text-center text-red-600">
        You are not authorized to view Country Education Mapping
      </div>
    );
  }

  /* ================= LOAD MAPPINGS ================= */
  const loadMappings = async (countryUuid) => {
    if (!countryUuid) return;

    setLoadingMappings(true);
    setError("");
    setShowAddForm(false);

    try {
      const res = await api.get(
        `${BASE}/education/country-mapping/${countryUuid}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setMappings(res.data || []);
    } catch {
      setMappings([]);
    } finally {
      setLoadingMappings(false);
    }
  };

  /* ================= LOAD LEVELS & DOCUMENTS (ON DEMAND) ================= */
  const loadFormData = async () => {
    setLoadingFormData(true);
    setError("");

    try {
      const [levelsRes, docsRes] = await Promise.all([
        api.get(`${BASE}/masters/education-level`, 
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        ),
        api.get(`${BASE}/education/education-document`, 
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        ),
      ]);

      setLevels(levelsRes.data || []);
      setDocuments(docsRes.data || []);
      setShowAddForm(true);
    } catch {
      setError("Failed to load education levels or documents");
    } finally {
      setLoadingFormData(false);
    }
  };

  /* ================= ADD NEW MAPPING ================= */
  const addMapping = async () => {
    if (!selectedLevel || !selectedDocument || !selectedCountry) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await api.post(
        `${BASE}/masters/${selectedLevel}/${selectedDocument}/${selectedCountry}`,
        null,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      const levelObj = levels.find((l) => l.education_uuid === selectedLevel);

      const docObj = documents.find(
        (d) => d.education_document_uuid === selectedDocument,
      );

      const newMapping = {
        mapping_uuid: res.data.mapping_uuid,
        education_name: levelObj?.education_name,
        document_name: docObj?.document_name,
        is_mandatory: mandatory,
      };

      setMappings((prev) => [...prev, newMapping]);
      if (window.showSuccess) window.showSuccess("Mapping created successfully");

      setSelectedLevel("");
      setSelectedDocument("");
      setMandatory(true);
      setShowAddForm(false);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create mapping");
    } finally {
      setSubmitting(false);
    }
  };

  const tableHeaders = ["Education", "Document", "Mandatory"];
  const tableColumns = ["education", "document", "mandatory"];
  const tableRows = mappings.map((m) => ({
    education: m.education_name,
    document: m.document_name,
    mandatory: m.is_mandatory ? "Yes" : "No",
  }));

  /* ================= UI ================= */
  return (
    <div className="max-w-6xl mx-auto mt-8">
      <h1 className="text-2xl font-semibold mb-1">Education Country Mapping</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configure education document requirements per country
      </p>

      <PageCard className="p-6">
        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

        {/* Country Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Select Country
          </label>
          <FilterListbox
            options={[{value:"",label:"-- Choose Country --"}, ...countries.map((c) => ({value: c.country_uuid, label: c.country_name}))]}
            value={selectedCountry}
            onChange={(val) => { setSelectedCountry(val); loadMappings(val); }}
          />
        </div>

        {/* Existing Mappings */}
        {selectedCountry && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Existing Mappings
              </h2>
              {canView && (
                <Button
                  onClick={loadFormData}
                  variant="primary"
                  disabled={loadingFormData}
                >
                  {loadingFormData ? "Loading..." : "+ Add Mapping"}
                </Button>
              )}
            </div>

            <GenericTable
              headers={tableHeaders}
              columns={tableColumns}
              rows={tableRows}
              loading={loadingMappings}
            />
          </div>
        )}

        {/* Add Mapping Form */}
        {showAddForm && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Add New Mapping</h3>

            <div className="flex items-end gap-6 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Education Level</label>
                <FilterListbox
                  options={[{value:"",label:"Select Level"}, ...levels.map((l) => ({value: l.education_uuid, label: l.education_name}))]}
                  value={selectedLevel}
                  onChange={setSelectedLevel}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Document</label>
                <FilterListbox
                  options={[{value:"",label:"Select Document"}, ...documents.map((d) => ({value: d.education_document_uuid, label: d.document_name}))]}
                  value={selectedDocument}
                  onChange={setSelectedDocument}
                />
              </div>

              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={() => setMandatory(!mandatory)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Mandatory</span>
              </label>

              <Button
                onClick={addMapping}
                disabled={submitting}
                loading={submitting}
                variant="success"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </PageCard>
    </div>
  );
}
