"use client";

import { useState } from "react";
import api from "../../../../api/axiosInstance"
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";

export default function AddCountryModal({ onClose, onSuccess, BASE_URL }) {
  const [callingCode, setCallingCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isValidCallingCode = callingCode.length >= 1 && callingCode.length <= 4;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Create country
      await api.post(
        `${BASE_URL}/masters/country`,
        null,
        {
          params: { calling_code: callingCode },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      // Fetch the newly added country
      const countriesRes = await apiget(`${BASE_URL}/masters/country`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const newCountry = countriesRes.data.find(
        (c) => c.calling_code === callingCode
      );

      if (!newCountry) {
        if (window.showError) window.showError("Failed to fetch new country");
        return;
      }

      if (window.showSuccess) window.showSuccess("Country added successfully");

      onSuccess(newCountry); // Add instantly
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to add country. Check calling code."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Country"
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button onClick={onClose} variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={!isValidCallingCode || saving}
            loading={saving}
          >
            Save
          </Button>
        </div>
      }
    >
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Country Calling Code
      </label>
      <input
        value={callingCode}
        onChange={(e) => setCallingCode(e.target.value.replace(/\D/g, ""))}
        placeholder="Ex: 91"
        className="w-full border rounded-lg px-3 py-2"
      />

      <p className="text-xs text-gray-500 mt-1">
        Enter international calling code without +
      </p>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </Modal>
  );
}
