import React, { useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import { CATALOG_KEYS, SETTING_TYPES } from "./settingsCatalog";

const MAX_LENGTH = 255;
const DATA_TYPE_SUGGESTIONS = [...Object.values(SETTING_TYPES), "BOOLEAN"];

const toForm = (row) => ({
  configKey: row?.configKey || "",
  configValue: row?.configValue || "",
  dataType: row?.dataType || "",
  description: row?.description || "",
});

/** Add/edit dialog for a setting outside the catalog. Mount with a fresh `key` per open. */
export default function CustomSettingModal({ row, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => toForm(row));
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (payload) => {
    const next = {};
    if (!payload.configKey) next.configKey = "Key is required.";
    else if (payload.configKey.length > MAX_LENGTH) next.configKey = `Key must be ${MAX_LENGTH} characters or fewer.`;
    else if (CATALOG_KEYS.has(payload.configKey))
      next.configKey = "This key is managed in the sections above - edit it there.";
    if (payload.dataType && payload.dataType.length > MAX_LENGTH)
      next.dataType = `Data type must be ${MAX_LENGTH} characters or fewer.`;
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      configKey: form.configKey.trim(),
      configValue: form.configValue.trim(),
      dataType: form.dataType.trim() || null,
      description: form.description.trim() || null,
    };
    const next = validate(payload);
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave(row, payload);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={row ? "Edit Setting" : "Add Setting"}
      subtitle={row ? "Update this configuration entry." : "Store an additional configuration entry."}
      size="lg"
      fullScreenMobile
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            form="custom-setting-form"
            variant="primary"
            loading={saving}
            loadingText="Saving..."
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {row ? "Save Changes" : "Add Setting"}
          </Button>
        </div>
      }
    >
      <form id="custom-setting-form" onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
        <FormInput
          label="Key"
          name="configKey"
          placeholder="e.g. feature.some-flag"
          value={form.configKey}
          onChange={handleChange}
          maxLength={MAX_LENGTH}
          requiredMark
          disabled={saving}
          error={errors.configKey}
          autoFocus
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Value"
            name="configValue"
            placeholder="Value"
            value={form.configValue}
            onChange={handleChange}
            disabled={saving}
          />
          <FormInput
            label="Data Type"
            name="dataType"
            placeholder="e.g. STRING"
            value={form.dataType}
            onChange={handleChange}
            maxLength={MAX_LENGTH}
            list="custom-setting-data-types"
            disabled={saving}
            error={errors.dataType}
          />
          <datalist id="custom-setting-data-types">
            {DATA_TYPE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <FormTextArea
          label="Description"
          name="description"
          rows={3}
          placeholder="Optional - what this setting controls"
          value={form.description}
          onChange={handleChange}
          disabled={saving}
        />
      </form>
    </Modal>
  );
}
