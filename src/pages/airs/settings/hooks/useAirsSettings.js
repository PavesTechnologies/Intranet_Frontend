import { useState } from "react";
import { toast } from "react-toastify";
import { DEFAULT_SETTINGS } from "../mock/settingsMockData";

const STORAGE_KEY = "airs_platform_settings";

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export default function useAirsSettings() {
  const [settings, setSettings] = useState(readStored);
  const [savedSettings, setSavedSettings] = useState(readStored);

  const setField = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors.
    }
    setSavedSettings(settings);
    toast.success("Settings saved successfully.");
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.info("Settings reset to defaults.");
  };

  return { settings, setField, isDirty, save, reset };
}
