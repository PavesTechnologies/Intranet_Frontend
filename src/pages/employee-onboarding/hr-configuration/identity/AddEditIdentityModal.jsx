import { useEffect, useState } from "react";
import axios from "axios";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";

export default function AddEditIdentityModal({ onClose, onSuccess, editData }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

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
      if (window.showError) window.showError("Identity name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        identity_type_name: name.trim(),
        description: description?.trim() || "",
        is_active: Boolean(isActive),
        identity_type_uuid: editData?.identity_type_uuid,
      };

      let savedItem;

      if (editData) {
        await axios.put(
          `${BASE_URL}/identity/${editData.identity_type_uuid}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (window.showSuccess) window.showSuccess("Identity type updated");
        savedItem = payload;
      } else {
        const res = await axios.post(`${BASE_URL}/identity`, payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        if (window.showSuccess) window.showSuccess("Identity type created");
        savedItem = {
          ...payload,
          identity_type_uuid:
            res.data.identity_type_uuid || crypto.randomUUID(),
        };
      }

      onSuccess(savedItem);
      onClose();
    } catch (error) {
      console.error("Save identity failed:", error.response?.data);
      if (window.showError) window.showError(
        error.response?.data?.detail || "Failed to save identity type",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={editData ? "Edit Identity Type" : "Add Identity Type"}
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button onClick={onClose} variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={saving || !name.trim()}
            loading={saving}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Identity Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => setIsActive(!isActive)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>
    </Modal>
  );
}
