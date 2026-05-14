import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import FilterListbox from "../../../../components/filter/FilterListbox";

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
        toast.error("Failed to load identities");
      }
    };
    loadIdentities();
  }, []);

  /* -------- SAVE -------- */
  const handleSave = async () => {
    if (!identityUuid) {
      toast.error("Select identity type");
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

      toast.success("Identity mapped successfully");
      onSuccess(newMapping); // ✅ parent updates table instantly
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create mapping");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Identity to Country</h2>

        <label className="block text-sm mb-1">Identity Type</label>
        <FilterListbox
          options={[{value:"",label:"Select Identity"}, ...identities.map((i) => ({value: i.identity_type_uuid, label: i.identity_type_name}))]}
          value={identityUuid}
          onChange={setIdentityUuid}
        />

        <label className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={() => setMandatory(!mandatory)}
          />
          Mandatory
        </label>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg transition-all duration-100 ease-in-out
            active:translate-y-[1px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!identityUuid || saving}
            className={`px-4 py-2 rounded-lg text-white transition-all duration-100 ease-in-out
            active:translate-y-[1px] ${
              saving || !identityUuid
                ? "bg-gray-400"
                : "bg-blue-700 hover:bg-blue-800"
            }`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
