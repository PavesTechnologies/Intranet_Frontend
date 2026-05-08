import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import AddCountryIdentityMappingModal from "./AddCountryIdentityMappingModal";
import FilterListbox from "../../../../components/filter/FilterListbox";

export default function CountryIdentityMapping() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [mappings, setMappings] = useState([]);
  const [identityTypes, setIdentityTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingDocUuid, setDeletingDocUuid] = useState(null);

  // 🔴 NEW: holds backend business error
  const [deleteError, setDeleteError] = useState(null);

  const [identityTypeUuid, setIdentityTypeUuid] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  /* ---------------- FETCH DATA ---------------- */
  const fetchCountries = async () => {
    const res = await axios.get(`${BASE_URL}/masters/country`, { headers });
    setCountries(res.data);
  };

  const fetchIdentityTypes = async () => {
    const res = await axios.get(`${BASE_URL}/identity`, { headers });
    setIdentityTypes(res.data);
  };

  const fetchMappings = async (countryUuid) => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${BASE_URL}/identity/country-mapping/identities/${countryUuid}`,
        { headers },
      );

      // ✅ handle empty list
      if (!res.data || res.data.length === 0) {
        setMappings([]);
        toast.info("No mappings found");
        return;
      }

      setMappings(res.data);
    } catch (err) {
      // ✅ handle "no mappings" from backend (404)
      if (err?.response?.status === 404) {
        setMappings([]);
        toast.info("No mappings found");
      } else {
        toast.error("Failed to load mappings");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ADD / UPDATE ---------------- */
  const submitMapping = async () => {
    if (!identityTypeUuid) {
      toast.error("Select identity type");
      return;
    }

    try {
      setFormLoading(true);

      if (editingMapping) {
        await axios.put(
          `${BASE_URL}/identity/country-mapping/${editingMapping.mapping_uuid}`,
          {
            country_uuid: selectedCountry,
            identity_type_uuid: identityTypeUuid,
            is_mandatory: isMandatory,
          },
          { headers },
        );

        setMappings((prev) =>
          prev.map((m) =>
            m.mapping_uuid === editingMapping.mapping_uuid
              ? {
                  ...m,
                  identity_type_uuid: identityTypeUuid,
                  identity_type_name:
                    identityTypes.find(
                      (i) => i.identity_type_uuid === identityTypeUuid,
                    )?.identity_type_name || m.identity_type_name,
                  is_mandatory: isMandatory,
                }
              : m,
          ),
        );

        toast.success("Mapping updated");
      } else {
        const res = await axios.post(
          `${BASE_URL}/identity/country-mapping`,
          {
            country_uuid: selectedCountry,
            identity_type_uuid: identityTypeUuid,
            is_mandatory: isMandatory,
          },
          { headers },
        );

        setMappings((prev) => [
          ...prev,
          {
            mapping_uuid: res.data.mapping_uuid,
            identity_type_uuid: identityTypeUuid,
            identity_type_name:
              identityTypes.find(
                (i) => i.identity_type_uuid === identityTypeUuid,
              )?.identity_type_name || "",
            is_mandatory: isMandatory,
          },
        ]);

        toast.success("Mapping added");
      }

      resetForm();
    } catch {
      toast.error("Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  /* ---------------- DELETE ---------------- */
  const confirmDeleteMapping = async () => {
    try {
      setDeleteLoading(true);

      await axios.delete(
        `${BASE_URL}/identity/country-mapping/${confirmDelete.mapping_uuid}`,
        { headers },
      );

      setMappings((prev) =>
        prev.filter((m) => m.mapping_uuid !== confirmDelete.mapping_uuid),
      );

      toast.success("Mapping removed");
      setConfirmDelete(null);
    } catch (err) {
      const detail = err.response?.data?.detail;

      // 🔥 BUSINESS RULE ERROR FROM BACKEND
      if (err.response?.status === 422 && detail?.employees) {
        setDeleteError(detail);
      } else {
        toast.error(detail?.message || "Failed to delete mapping");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteEmployeeDocument = async (document_uuid) => {
    try {
      setDeletingDocUuid(document_uuid);

      await axios.delete(
        `${BASE_URL}/employee-details/identity/${document_uuid}`,
        { headers },
      );

      // remove only this document from deleteError
      setDeleteError((prev) => ({
        ...prev,
        employees: prev.employees.filter(
          (e) => e.document_uuid !== document_uuid,
        ),
      }));

      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingDocUuid(null);
    }
  };

  /* ---------------- RESET ---------------- */
  const resetForm = () => {
    setShowForm(false);
    setEditingMapping(null);
    setIdentityTypeUuid("");
    setIsMandatory(true);
  };

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    fetchCountries();
    fetchIdentityTypes();
  }, []);

  useEffect(() => {
    if (selectedCountry) fetchMappings(selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    if (editingMapping) {
      setIdentityTypeUuid(editingMapping.identity_type_uuid);
      setIsMandatory(editingMapping.is_mandatory);
    }
  }, [editingMapping]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Country Identity Mapping</h1>
      <p className="text-gray-600 mb-6">
        Configure required identity documents per country
      </p>

      {/* Country Selector */}
      <FilterListbox
        options={[{value:"",label:"Select Country"}, ...countries.map((c) => ({value: c.country_uuid, label: c.country_name}))]}
        value={selectedCountry}
        onChange={setSelectedCountry}
      />
      {showForm && (
        <AddCountryIdentityMappingModal
          countryUuid={selectedCountry}
          onClose={() => setShowForm(false)}
          onSuccess={(newMapping) => {
            setMappings((prev) => [...prev, newMapping]); // ✅ AUTO UPDATE
            setShowForm(false);
          }}
        />
      )}

      {selectedCountry && (
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="ml-4 px-5 py-2 bg-blue-700 text-white rounded-lg"
        >
          + Add Identity
        </button>
      )}

      {/* TABLE */}
      <div className="mt-8 bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : mappings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No identities mapped
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Identity Type</th>
                <th className="px-6 py-3 text-left">Mandatory</th>
                <th className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((item) => (
                <tr key={item.mapping_uuid} className="border-b">
                  <td className="px-6 py-3">{item.identity_type_name}</td>
                  <td className="px-6 py-3">
                    {item.is_mandatory ? "Yes" : "No"}
                  </td>
                  <td className="px-6 py-3 flex gap-4">
                    <button
                      onClick={() => {
                        setEditingMapping(item);
                        setShowForm(true);
                      }}
                      className="text-blue-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[380px]">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Remove <strong>{confirmDelete.identity_type_name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg transition-all duration-100 ease-in-out
        active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMapping}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-700 text-white rounded-lg transition-all duration-100 ease-in-out
        active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
              >
                {deleteLoading ? "Removing..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 DELETE ERROR MODAL */}
      {deleteError && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[520px]">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Cannot Delete Mapping
            </h3>

            <p className="text-gray-700 mb-4">{deleteError.message}</p>

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-left">Document UUID</th>
                  </tr>
                </thead>
                <tbody>
                  {deleteError.employees.map((emp) => (
                    <tr key={emp.document_uuid} className="border-t">
                      <td className="px-3 py-2">
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() =>
                            deleteEmployeeDocument(emp.document_uuid)
                          }
                          disabled={deletingDocUuid === emp.document_uuid}
                          className="px-3 py-1.5 bg-red-600 text-white rounded text-xs"
                        >
                          {deletingDocUuid === emp.document_uuid
                            ? "Deleting..."
                            : "Delete Document"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg transition-all duration-100 ease-in-out
        active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
