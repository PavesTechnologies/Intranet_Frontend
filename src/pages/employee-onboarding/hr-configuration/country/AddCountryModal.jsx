"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function AddCountryModal({ onClose, onSuccess, BASE_URL, token }) {
  const [callingCode, setCallingCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isValidCallingCode = callingCode.length >= 1 && callingCode.length <= 4;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Create country
      await axios.post(
        `${BASE_URL}/masters/country`,
        null,
        {
          params: { calling_code: callingCode },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Fetch the newly added country
      const countriesRes = await axios.get(`${BASE_URL}/masters/country`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newCountry = countriesRes.data.find(
        (c) => c.calling_code === callingCode
      );

      if (!newCountry) {
        toast.error("Failed to fetch new country");
        return;
      }

      toast.success("Country added successfully");

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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Add Country</h2>

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

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 rounded-lg transition-all duration-100 ease-in-out
            active:translate-y-[1px]
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!isValidCallingCode || saving}
            className={`px-4 py-2 rounded-lg text-white transition-all duration-100 ease-in-out
            active:translate-y-[1px]
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 ${
              !isValidCallingCode || saving
                ? "bg-gray-400 cursor-not-allowed"
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
