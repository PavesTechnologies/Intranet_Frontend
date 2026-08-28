import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getWeightPresets, createWeightPreset, updateWeightPreset, deleteWeightPreset, formatApiError } from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

const LABEL_CLASS = "text-[10px] uppercase font-bold text-slate-400 block mb-1.5";

// Fixed sentinel ids the backend hardcodes for its 4 built-in system presets
// (Technical/Managerial/Balanced/Entry Level) — never rows in the DB, and
// the backend rejects update/delete on these with a 403. Detecting them
// client-side lets the UI disable those actions up front instead of only
// surfacing the rejection after a failed request.
const SYSTEM_PRESET_IDS = new Set([
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
  "00000000-0000-0000-0000-000000000003",
  "00000000-0000-0000-0000-000000000004",
]);

const EMPTY_FORM = {
  name: "", description: "",
  weight_deterministic: "", weight_semantic: "", weight_ai: "",
  deterministic_threshold: "", semantic_threshold: "", ai_threshold: "",
};

// Apply Campaign Weight Presets. This modal manages presets
// (list/create/update/delete); applying a preset's values onto a specific
// campaign's edit form happens via the picker in EditCampaignModal, which
// reuses getWeightPresets() to populate its own dropdown.
export default function WeightPresetsModal({ isOpen, onClose }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null = list view, "new" = create form, else preset id
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWeightPresets();
      setPresets(unwrap(res) || []);
    } catch {
      toast.error("Failed to load weight presets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setEditingId(null);
    setConfirmDeleteId(null);
    load();
  }, [isOpen]);

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId("new");
  };

  const startEdit = (preset) => {
    setForm({
      name: preset.name,
      description: preset.description || "",
      weight_deterministic: preset.weight_deterministic,
      weight_semantic: preset.weight_semantic,
      weight_ai: preset.weight_ai,
      deterministic_threshold: preset.deterministic_threshold,
      semantic_threshold: preset.semantic_threshold,
      ai_threshold: preset.ai_threshold,
    });
    setEditingId(preset.id);
  };

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return toast.error("Preset name cannot be empty.");

    const sum = Number(form.weight_deterministic) + Number(form.weight_semantic) + Number(form.weight_ai);
    if (Math.abs(sum - 100) > 0.01) return toast.error("Weights must sum to 100.");

    const payload = {
      name,
      description: form.description.trim() || null,
      weight_deterministic: Number(form.weight_deterministic),
      weight_semantic: Number(form.weight_semantic),
      weight_ai: Number(form.weight_ai),
      deterministic_threshold: Number(form.deterministic_threshold),
      semantic_threshold: Number(form.semantic_threshold),
      ai_threshold: Number(form.ai_threshold),
    };

    setSubmitting(true);
    try {
      if (editingId === "new") {
        await createWeightPreset(payload);
        toast.success("Preset created successfully.");
      } else {
        await updateWeightPreset(editingId, payload);
        toast.success("Preset updated successfully.");
      }
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err, "Failed to save preset."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (presetId) => {
    setSubmitting(true);
    try {
      await deleteWeightPreset(presetId);
      toast.success("Preset deleted successfully.");
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err, "Failed to delete preset."));
    } finally {
      setSubmitting(false);
    }
  };

  const isForm = editingId !== null;

  return (<Modal isOpen={isOpen} onClose={onClose} title="Default Scoring Weight Presets" width="640px" height="90vh">
      {loading ? (<div className="py-8 flex justify-center"><LoadingSpinner text="Loading presets..." /></div>
      ) : isForm ? (<div className="space-y-4">
          <FormInput label="Preset Name" name="name" value={form.name} onChange={change} maxLength={100} requiredMark labelClassName={LABEL_CLASS} />
          <FormInput label="Description" name="description" value={form.description} onChange={change} maxLength={255} labelClassName={LABEL_CLASS} />

          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Requirements Wt" name="weight_deterministic" type="number" value={form.weight_deterministic} onChange={change} labelClassName={LABEL_CLASS} />
            <FormInput label="Relevance Wt" name="weight_semantic" type="number" value={form.weight_semantic} onChange={change} labelClassName={LABEL_CLASS} />
            <FormInput label="AI Review Wt" name="weight_ai" type="number" value={form.weight_ai} onChange={change} labelClassName={LABEL_CLASS} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Requirements Threshold" name="deterministic_threshold" type="number" value={form.deterministic_threshold} onChange={change} labelClassName={LABEL_CLASS} />
            <FormInput label="Relevance Threshold" name="semantic_threshold" type="number" step="0.01" min="0" max="1" value={form.semantic_threshold} onChange={change} labelClassName={LABEL_CLASS} />
            <FormInput label="AI Threshold" name="ai_threshold" type="number" value={form.ai_threshold} onChange={change} labelClassName={LABEL_CLASS} />
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t pt-4">
            <Button variant="outline" size="small" onClick={() => setEditingId(null)} disabled={submitting}>
              Back
            </Button>
            <Button variant="primary" size="small" onClick={handleSave} loading={submitting} loadingText="Saving...">
              Save Preset
            </Button>
          </div>
        </div>
      ) : (<div className="space-y-4">
          <div className="flex justify-end">
            {/* <Button variant="primary" size="small" onClick={startCreate}>
              <Plus className="h-4 w-4" /> New Preset
            </Button> */}
          </div>

          <div className="space-y-2">
            {presets.map((preset) => {
              const isSystem = SYSTEM_PRESET_IDS.has(String(preset.id));
              return (<div key={preset.id} className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-slate-900 truncate">{preset.name}</span>
                        {isSystem && (<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            <Lock className="h-2.5 w-2.5" /> System
                          </span>
                        )}
                      </div>
                      {preset.description && (<p className="text-[11px] text-slate-400 mt-0.5">{preset.description}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {preset.weight_deterministic}% / {preset.weight_semantic}% / {preset.weight_ai}%
                        {" "}(deterministic / semantic / AI)
                      </p>
                    </div>
                    {!isSystem && (<div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(preset)}
                          title="Edit preset"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {confirmDeleteId === preset.id ? (<div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(preset.id)}
                              disabled={submitting}
                              className="text-[10px] font-bold text-rose-600 hover:underline px-1"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] font-bold text-slate-400 hover:underline px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (<button
                            onClick={() => setConfirmDeleteId(preset.id)}
                            title="Delete preset"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {presets.length === 0 && (<p className="text-xs text-slate-400 text-center py-8">No presets found.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
