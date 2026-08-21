import { useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import ToggleSwitch from "./ToggleSwitch";
import { TAX_COMPLIANCE_TOGGLE_FIELDS, TAX_COMPLIANCE_TOGGLES_MOCK } from "../mocks/systemConfigMockData";

export default function TaxComplianceTab() {
  const [savedSettings, setSavedSettings] = useState(TAX_COMPLIANCE_TOGGLES_MOCK);
  const [settings, setSettings] = useState(TAX_COMPLIANCE_TOGGLES_MOCK);

  const isDirty = TAX_COMPLIANCE_TOGGLE_FIELDS.some(
    (field) => settings[field.key] !== savedSettings[field.key]
  );

  const handleToggle = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleDiscard = () => setSettings(savedSettings);

  const handleSave = () => {
    setSavedSettings(settings);
    toast.success("Tax & compliance settings updated.");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Global Validation Switches</h3>
          <p className="mt-1 text-xs text-gray-500">
            Turn tax and compliance checks on or off for invoice processing. Rates, thresholds and
            conditions are configured separately under Tax Rules — these switches only control
            whether each check runs.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {TAX_COMPLIANCE_TOGGLE_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{field.label}</p>
                <p className="text-xs text-gray-500">{field.description}</p>
              </div>
              <ToggleSwitch
                checked={settings[field.key]}
                onChange={(val) => handleToggle(field.key, val)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleDiscard} disabled={!isDirty}>
          Discard Changes
        </Button>
        <Button type="button" variant="primary" onClick={handleSave} disabled={!isDirty}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
