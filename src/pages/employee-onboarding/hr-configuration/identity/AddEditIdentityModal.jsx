import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function AddEditIdentityModal({ onClose, onSuccess, editData }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  useEffect(() => {
    if (editData) {
      setName(editData.identity_type_name);
      setDescription(editData.description || "");
      setIsActive(editData.is_active);
    }
  }, [editData]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Identity name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        identity_type_name: name.trim(),
        description: description?.trim() || "",
        is_active: Boolean(isActive),
        identity_type_uuid: editData?.identity_type_uuid, // Keep UUID for updates
      };

      let savedItem;

      if (editData) {
        await axios.put(
          `${BASE_URL}/identity/${editData.identity_type_uuid}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        toast.success("Identity type updated");
        savedItem = payload;
      } else {
        const res = await axios.post(`${BASE_URL}/identity`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        toast.success("Identity type created");
        savedItem = {
          ...payload,
          identity_type_uuid:
            res.data.identity_type_uuid || crypto.randomUUID(),
        };
      }

      onSuccess(savedItem); // ✅ Update table immediately
      onClose();
    } catch (error) {
      console.error("Save identity failed:", error.response?.data);
      toast.error(
        error.response?.data?.detail || "Failed to save identity type",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? "Edit Identity Type" : "Add Identity Type"}
        </h2>

        <label className="block text-sm font-medium mb-1">Identity Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />

        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => setIsActive(!isActive)}
          />
          Active
        </label>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-2 py-2 bg-gray-200 rounded-lg transition-all duration-100 ease-in-out
            active:translate-y-[1px]
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className={`px-4 py-2 rounded-lg text-white transition-all duration-100 ease-in-out
            active:translate-y-[1px]
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 ${
              saving || !name.trim()
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
