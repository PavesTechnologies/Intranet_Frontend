import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import Button from "../../../components/Button/Button";
import useAirsSettings from "./hooks/useAirsSettings";
import SettingsSystemInfo from "./components/SettingsSystemInfo";
import SettingsWeightConfig from "./components/SettingsWeightConfig";
import SettingsToggles from "./components/SettingsToggles";

export default function SettingsPage() {
  const { settings, setWeight, setField, weightTotal, isDirty, save, reset } = useAirsSettings();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <SettingsIcon className="h-5 w-5 text-slate-600" />
            </div>
            AIRS Platform Settings
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-xl">
            Configure canonical mappings, customize weight coefficients, manage OCR engines, and check compliance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="small" onClick={reset}>
            Reset to defaults
          </Button>
          <Button variant="primary" size="small" onClick={save} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>

      <SettingsSystemInfo />

      <div className="grid md:grid-cols-2 gap-5">
        <SettingsWeightConfig weights={settings.weights} onChange={setWeight} total={weightTotal} />
        <SettingsToggles settings={settings} onChange={setField} />
      </div>
    </div>
  );
}
