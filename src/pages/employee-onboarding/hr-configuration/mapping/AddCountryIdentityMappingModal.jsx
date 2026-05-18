import { useEffect, useState } from "react";
import axios from "axios";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";

export default function AddCountryIdentityMappingModal({
  countryUuid,
  onClose,
  onSuccess,
}) {
  const [identities, setIdentities] = useState([]);
  const [identityUuid, setIdentityUuid] = useState("");
  const [mandatory, setMandatory] = useState(true);
  const [saving, setSaving] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  /* -------- LOAD IDENTITIES -------- */
  useEffect(() => {
    const loadIdentities = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/identity`, { headers });
        setIdentities(res.data);
      } catch {
        if (window.showError) window.showError("Failed to load identities");
      }
    };
    loadIdentities();
  }, []);

  /* -------- SAVE -------- */
  const handleSave = async () => {
    if (!identityUuid) {
      if (window.showError) window.showError("Select identity type");
      return;
    }

    try {
      setSaving(true);

      const res = await axios.post(
        `${BASE_URL}/identity/country-mapping`,
        {
          country_uuid: countryUuid,
          identity_type_uuid: identityUuid,
          is_mandatory: mandatory,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      // ✅ Build mapping object for parent (NO reload)
      const identity = identities.find(
        (i) => i.identity_type_uuid === identityUuid,
      );

      const newMapping = {
        mapping_uuid: res.data.mapping_uuid,
        identity_type_uuid: identityUuid,
        identity_type_name: identity?.identity_type_name || "",
        is_mandatory: mandatory,
      };

      if (window.showSuccess) window.showSuccess("Identity mapped successfully");
      onSuccess(newMapping);
      onClose();
    } catch (err) {
      if (window.showError) window.showError(err.response?.data?.detail || "Failed to create mapping");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Identity to Country"
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button onClick={onClose} variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={!identityUuid || saving}
            loading={saving}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Identity Type</label>
          <FilterListbox
            options={[{value:"",label:"Select Identity"}, ...identities.map((i) => ({value: i.identity_type_uuid, label: i.identity_type_name}))]}
            value={identityUuid}
            onChange={setIdentityUuid}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={() => setMandatory(!mandatory)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Mandatory</span>
        </label>
      </div>
    </Modal>
  );
}
