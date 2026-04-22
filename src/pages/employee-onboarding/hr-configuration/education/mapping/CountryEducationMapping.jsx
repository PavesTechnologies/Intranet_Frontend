import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../../../contexts/AuthContext";




export default function CountryEducationMapping() {
  const BASE = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");
  const { user } = useAuth();
  const roles = user?.roles?.map(r => r.toUpperCase()) || [];
  const canView = roles.includes("ADMIN") || roles.includes("HR");

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

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
      .get(`${BASE}/masters/country`, axiosConfig)
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
      const res = await axios.get(
        `${BASE}/education/country-mapping/${countryUuid}`,
        axiosConfig
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
        axios.get(`${BASE}/masters/education-level`, axiosConfig),
        axios.get(`${BASE}/education/education-document`, axiosConfig),
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
    const res = await axios.post(
      `${BASE}/masters/${selectedLevel}/${selectedDocument}/${selectedCountry}`,
      null,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const levelObj = levels.find(
      (l) => l.education_uuid === selectedLevel
    );

    const docObj = documents.find(
      (d) => d.education_document_uuid === selectedDocument
    );

    const newMapping = {
      mapping_uuid: res.data.mapping_uuid,
      education_name: levelObj?.education_name,
      document_name: docObj?.document_name,
      is_mandatory: mandatory,
    };

    setMappings((prev) => [...prev, newMapping]);

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
  /* ================= UI ================= */
  return (
    <div className="max-w-6xl mx-auto mt-8">
      <h1 className="text-2xl font-semibold mb-1">
        Education Country Mapping
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Configure education document requirements per country
      </p>

      <div className="bg-white shadow rounded p-6">
        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}

        {/* Country Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Select Country
          </label>
          <select
            className="border rounded px-3 py-2 w-80"
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              loadMappings(e.target.value);
            }}
          >
            <option value="">-- Choose Country --</option>
            {countries.map((c) => (
              <option key={c.country_uuid} value={c.country_uuid}>
                {c.country_name}
              </option>
            ))}
          </select>
        </div>

        {/* Existing Mappings */}
        {selectedCountry && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium">
                Existing Mappings
              </h2>
              {canView && (
              <button
                onClick={loadFormData}
                className="bg-blue-600 text-white px-4 py-2 rounded"
                disabled={loadingFormData}
              >
                {loadingFormData ? "Loading..." : "+ Add Mapping"}
              </button>
              )}
            </div>

            {loadingMappings ? (
              <div className="text-gray-500 py-4">
                Loading mappings...
              </div>
            ) : (
              <table className="w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Education</th>
                    <th className="p-3 text-left">Document</th>
                    <th className="p-3 text-left">Mandatory</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="text-center p-4 text-gray-500"
                      >
                        No mappings found
                      </td>
                    </tr>
                  ) : (
                    mappings.map((m) => (
                      <tr key={m.mapping_uuid} className="border-t">
                        <td className="p-3">{m.education_name}</td>
                        <td className="p-3">{m.document_name}</td>
                        <td className="p-3">
                          {m.is_mandatory ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Add Mapping Form */}
        {showAddForm && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-medium mb-4">
              Add New Mapping
            </h3>

            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm mb-1">
                  Education Level
                </label>
                <select
                  className="border rounded px-3 py-2"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  <option value="">Select Level</option>
                  {levels.map((l) => (
                    <option
                      key={l.education_uuid}
                      value={l.education_uuid}
                    >
                      {l.education_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Document
                </label>
                <select
                  className="border rounded px-3 py-2"
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                >
                  <option value="">Select Document</option>
                  {documents.map((d) => (
                    <option
                      key={d.education_document_uuid}
                      value={d.education_document_uuid}
                    >
                      {d.document_name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={() => setMandatory(!mandatory)}
                />
                Mandatory
              </label>

              <button
                onClick={addMapping}
                disabled={submitting}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
