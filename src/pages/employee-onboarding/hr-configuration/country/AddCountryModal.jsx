"use client";

import { useState } from "react";
import api from "../../../../api/axiosInstance";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";

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

      showStatusToast("Country added successfully", "success");

      // Fetch the newly added country
      const countriesRes = await api.get(`${BASE_URL}/masters/country`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const newCountry = countriesRes.data.find(
        (c) => String(c.calling_code) === String(callingCode)
      );

      onSuccess(newCountry || { calling_code: callingCode });
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
      <label className={`block ${Fonts.label} mb-1`}>
        Country Calling Code
      </label>
      <input
        value={callingCode}
        onChange={(e) => setCallingCode(e.target.value.replace(/\D/g, ""))}
        placeholder="Ex: 91"
        className="w-full border rounded-lg px-3 py-2"
      />

      <p className={`${Fonts.smallText} mt-1`}>
        Enter international calling code without +
      </p>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </Modal>
  );
}
