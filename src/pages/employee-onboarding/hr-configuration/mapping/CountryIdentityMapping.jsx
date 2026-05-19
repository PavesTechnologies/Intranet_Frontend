import { useEffect, useState } from "react";
import axios from "axios";
import AddCountryIdentityMappingModal from "./AddCountryIdentityMappingModal";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/Modal/modal";
import { PageCard } from "../../../../components/Cards/PageCard";

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

  /* ---------------- FETCH DATA ---------------- */
  const fetchCountries = async () => {
    const res = await axios.get(`${BASE_URL}/masters/country`, { headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    } });
    setCountries(res.data);
  };

  const fetchIdentityTypes = async () => {
    const res = await axios.get(`${BASE_URL}/identity`, { headers : {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    } });
    setIdentityTypes(res.data);
  };

  const fetchMappings = async (countryUuid) => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${BASE_URL}/identity/country-mapping/identities/${countryUuid}`,
        { headers : {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        } },
      );

      // ✅ handle empty list
      if (!res.data || res.data.length === 0) {
        setMappings([]);
        return;
      }

      setMappings(res.data);
    } catch (err) {
      // ✅ handle "no mappings" from backend (404)
      if (err?.response?.status === 404) {
        setMappings([]);
      } else {
        if (window.showError) window.showError("Failed to load mappings");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ADD / UPDATE ---------------- */
  const submitMapping = async () => {
    if (!identityTypeUuid) {
      if (window.showError) window.showError("Select identity type");
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
          { headers : {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          } },
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

        if (window.showSuccess) window.showSuccess("Mapping updated");
      } else {
        const res = await axios.post(
          `${BASE_URL}/identity/country-mapping`,
          {
            country_uuid: selectedCountry,
            identity_type_uuid: identityTypeUuid,
            is_mandatory: isMandatory,
          },
          { headers : {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          } },
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

        if (window.showSuccess) window.showSuccess("Mapping added");
      }

      resetForm();
    } catch {
      if (window.showError) window.showError("Operation failed");
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
        { headers : {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        } },
      );

      setMappings((prev) =>
        prev.filter((m) => m.mapping_uuid !== confirmDelete.mapping_uuid),
      );

      if (window.showSuccess) window.showSuccess("Mapping removed");
      setConfirmDelete(null);
    } catch (err) {
      const detail = err.response?.data?.detail;

      // 🔥 BUSINESS RULE ERROR FROM BACKEND
      if (err.response?.status === 422 && detail?.employees) {
        setDeleteError(detail);
      } else {
        if (window.showError) window.showError(detail?.message || "Failed to delete mapping");
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
        { headers : {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        } },
      );

      // remove only this document from deleteError
      setDeleteError((prev) => ({
        ...prev,
        employees: prev.employees.filter(
          (e) => e.document_uuid !== document_uuid,
        ),
      }));

      if (window.showSuccess) window.showSuccess("Document deleted");
    } catch {
      if (window.showError) window.showError("Failed to delete document");
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

  const tableHeaders = ["Identity Type", "Mandatory", "Action"];
  const tableColumns = ["identity_type_name", "mandatory", "actions"];
  const tableRows = mappings.map((item) => ({
    identity_type_name: item.identity_type_name,
    mandatory: item.is_mandatory ? "Yes" : "No",
    actions: (
      <div className="flex gap-4">
        <Button
          variant="link"
          size="small"
          onClick={() => {
            setEditingMapping(item);
            setShowForm(true);
          }}
        >
          Edit
        </Button>
        <Button
          variant="link"
          size="small"
          className="!text-red-600 hover:!underline"
          onClick={() => setConfirmDelete(item)}
        >
          Remove
        </Button>
      </div>
    ),
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Country Identity Mapping</h1>
      <p className="text-gray-600 mb-6">
        Configure required identity documents per country
      </p>

      {/* Country Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterListbox
          options={[{value:"",label:"Select Country"}, ...countries.map((c) => ({value: c.country_uuid, label: c.country_name}))]}
          value={selectedCountry}
          onChange={setSelectedCountry}
        />

        {selectedCountry && (
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            variant="primary"
          >
            + Add Identity
          </Button>
        )}
      </div>

      {showForm && (
        <AddCountryIdentityMappingModal
          countryUuid={selectedCountry}
          onClose={() => setShowForm(false)}
          onSuccess={(newMapping) => {
            setMappings((prev) => [...prev, newMapping]);
            setShowForm(false);
          }}
        />
      )}

      {/* TABLE */}
      {selectedCountry && (
        <div className="mt-8">
          <PageCard>
            <GenericTable
              headers={tableHeaders}
              columns={tableColumns}
              rows={tableRows}
              loading={loading}
            />
          </PageCard>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          title="Confirm Delete"
          size="md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button
                onClick={() => setConfirmDelete(null)}
                variant="outline"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteMapping}
                variant="danger"
                disabled={deleteLoading}
                loading={deleteLoading}
              >
                Delete
              </Button>
            </div>
          }
        >
          <p className="text-gray-600">
            Remove <strong>{confirmDelete.identity_type_name}</strong>?
          </p>
        </Modal>
      )}

      {/* 🔴 DELETE ERROR MODAL */}
      {deleteError && (
        <Modal
          isOpen={true}
          onClose={() => {
            setDeleteError(null);
            setConfirmDelete(null);
          }}
          title="Cannot Delete Mapping"
          size="lg"
          footer={
            <div className="flex justify-end w-full">
              <Button
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(null);
                }}
                variant="primary"
              >
                OK
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">{deleteError.message}</p>

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deleteError.employees.map((emp) => (
                    <tr key={emp.document_uuid} className="border-t">
                      <td className="px-3 py-2">
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          onClick={() =>
                            deleteEmployeeDocument(emp.document_uuid)
                          }
                          disabled={deletingDocUuid === emp.document_uuid}
                          variant="danger"
                          size="small"
                          loading={deletingDocUuid === emp.document_uuid}
                        >
                          Delete Document
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
