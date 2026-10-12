import React, { useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import { Fonts } from "@/components/Fonts/Fonts";
import EmployeeSelect from "../../approval-engine/components/EmployeeSelect";
import { SETTING_TYPES, formatSettingValue, isNumericSetting, validateSettingValue } from "./settingsCatalog";

/** Edit dialog for one catalog setting. Mount with `key={setting.key}` so it starts fresh each open. */
export default function CatalogSettingModal({ setting, row, onClose, onSave, saving }) {
  const initial = row?.configValue ?? (setting.defaultValue !== null ? String(setting.defaultValue) : "");
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");

  const inputId = "catalog-setting-value";
  const defaultText =
    setting.defaultValue === null ? setting.defaultLabel : formatSettingValue(setting, setting.defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = validateSettingValue(setting, value);
    setError(message);
    if (message) return;
    onSave(setting, row, String(value).trim());
  };

  const renderInput = () => {
    if (setting.type === SETTING_TYPES.EMPLOYEE) {
      return (
        <div className="space-y-1">
          <label htmlFor={inputId} className={Fonts.label}>
            {setting.label}
            <span className="ml-1 text-red-500">*</span>
          </label>
          <EmployeeSelect
            inputId={inputId}
            value={value}
            onChange={(id) => {
              setValue(id);
              setError("");
            }}
            isDisabled={saving}
          />
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
      );
    }

    const numeric = isNumericSetting(setting);
    return (
      <FormInput
        label={setting.label}
        name={inputId}
        type={numeric ? "number" : "text"}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError("");
        }}
        min={numeric ? setting.min : undefined}
        max={numeric ? setting.max : undefined}
        step={numeric ? setting.step : undefined}
        maxLength={numeric ? undefined : setting.maxLength}
        inputMode={setting.type === SETTING_TYPES.INTEGER ? "numeric" : numeric ? "decimal" : undefined}
        requiredMark
        disabled={saving}
        error={error}
        autoFocus
      />
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Edit ${setting.label}`}
      subtitle={setting.description}
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
            form="catalog-setting-form"
            variant="primary"
            loading={saving}
            loadingText="Saving..."
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Save
          </Button>
        </div>
      }
    >
      <form id="catalog-setting-form" onSubmit={handleSubmit} className="space-y-3 py-2" noValidate>
        {renderInput()}
        <p className="text-xs text-gray-500">
          {setting.hint ? `${setting.hint} ` : ""}
          Built-in default: <span className="font-medium text-gray-700">{defaultText}</span>.
          {row ? " Use “Reset to default” on the settings page to go back to it." : ""}
        </p>
        <p className="font-mono text-[11px] text-gray-400 break-all">{setting.key}</p>
      </form>
    </Modal>
  );
}
