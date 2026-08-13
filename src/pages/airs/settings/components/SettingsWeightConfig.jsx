import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getPlatformScoringDefaults, updatePlatformDefaultWeights } from "../../campaigns/services/campaignservice";

const FIELDS = [
  { key: "weight_deterministic", label: "Deterministic weight", suffix: "%" },
  { key: "weight_semantic", label: "Semantic weight", suffix: "%" },
  { key: "weight_ai", label: "AI weight", suffix: "%" },
];

const THRESHOLD_FIELDS = [
  { key: "semantic_threshold", label: "Semantic threshold", min: 0, max: 1, step: 0.01 },
  { key: "ai_threshold", label: "AI threshold", min: 0, max: 100, step: 1 },
];

const EMPTY = { weight_deterministic: 30, weight_semantic: 40, weight_ai: 30, semantic_threshold: 0.65, ai_threshold: 50 };

// E02-S05-T02 — org-wide scoring defaults used by new campaigns and the
// "Reset to Defaults" option on an existing campaign's scoring config.
// Wired to GET/PUT /campaigns/platform-defaults/scoring. If the fetch
// fails, the form starts from the same static defaults
// CampaignCreateRequest itself falls back to and is disclosed as such.
export default function SettingsWeightConfig() {
  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const defaults = await getPlatformScoringDefaults();
    if (defaults) {
      setValues(defaults);
      setSeeded(true);
    } else {
      setValues(EMPTY);
      setSeeded(false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  const total = Number(values.weight_deterministic) + Number(values.weight_semantic) + Number(values.weight_ai);

  const handleSave = async () => {
    if (Math.abs(total - 100) > 0.01) {
      return toast.error("Requirements + Relevance + AI Review weights must sum to 100.");
    }
    setSaving(true);
    try {
      await updatePlatformDefaultWeights({
        weight_deterministic: Number(values.weight_deterministic),
        weight_semantic: Number(values.weight_semantic),
        weight_ai: Number(values.weight_ai),
        semantic_threshold: Number(values.semantic_threshold),
        ai_threshold: Number(values.ai_threshold),
      });
      toast.success("Platform default scoring weights updated. New campaigns will use these values.");
      setSeeded(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to update platform defaults.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex justify-center py-10">
        <LoadingSpinner text="Loading platform defaults..." />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="font-bold text-[14px] text-slate-900">Campaign scoring defaults</div>
        <span className={`text-[12px] font-semibold ${total === 100 ? "text-emerald-600" : "text-amber-600"}`}>
          Total: {total}% {total !== 100 && "(should equal 100%)"}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mb-4">
        {seeded
          ? "Applies to new campaigns and the \"Reset to Defaults\" scoring action. Existing campaigns are not affected."
          : "No existing campaign to read current defaults from yet — showing the platform's built-in fallback values."}
      </p>

      {FIELDS.map(({ key, label, suffix }) => (
        <div key={key} className="mb-4">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="text-slate-900">{label}</span>
            <span className="font-semibold text-slate-500">{values[key]}{suffix}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={values[key]}
            onChange={(e) => change(key, Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {THRESHOLD_FIELDS.map(({ key, label, min, max, step }) => (
          <div key={key}>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={(e) => change(key, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="small" onClick={load} disabled={saving}>
          <RotateCcw className="h-3.5 w-3.5" /> Reload
        </Button>
        <Button variant="primary" size="small" onClick={handleSave} loading={saving} loadingText="Saving...">
          Save Defaults
        </Button>
      </div>
    </div>
  );
}
