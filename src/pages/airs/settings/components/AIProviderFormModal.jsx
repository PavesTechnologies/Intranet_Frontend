import React from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import useAiProviderForm from "../hooks/useAiProviderForm";
import { USAGE_LABEL, USAGE_OPTIONS } from "../utils/modelSetup";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500";
const labelClass = "text-[10px] uppercase font-bold text-slate-400 block mb-1";

const NO_BACKUP = "";

// One model dropdown - falls back to a text input when there's no list to
// choose from (load failed, or no key entered yet), so the admin can type a
// model ID instead of being blocked.
function ModelPicker({ form, value, onChange, placeholder, optional = false, exclude, ariaLabel }) {
  const options = form.models
    .filter((m) => m.id !== exclude)
    .map((m) => ({ label: m.display_name, value: m.id }));
  // Keep the current model selectable even if the live list doesn't include it.
  if (value && !options.some((o) => o.value === value)) options.unshift({ label: value, value });
  if (optional) options.unshift({ label: "No backup", value: NO_BACKUP });

  if (!form.modelsLoading && form.models.length === 0) {
    return (
      <input
        type="text"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!form.provider}
        placeholder={optional ? "Optional backup model ID" : "Enter the API key to load models, or type a model ID"}
        className={inputClass}
      />
    );
  }
  return (
    <FilterListbox
      options={options}
      value={value}
      onChange={onChange}
      disabled={form.modelsLoading}
      placeholder={placeholder}
    />
  );
}

function ModelAssignmentRow({ form, assignment, index }) {
  const update = (patch) => form.changeAssignment(assignment.id, patch);
  const usageOptions = USAGE_OPTIONS.map((o) => ({ label: `${o.label} — ${o.hint}`, value: o.value }));

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2" data-testid={`model-row-${index}`}>
      <div className="flex items-end gap-2">
        <div className="w-[46%]">
          <label className={labelClass}>Used for</label>
          <FilterListbox options={usageOptions} value={assignment.usage} onChange={(usage) => update({ usage })} />
        </div>
        <div className="flex-1 min-w-0">
          <label className={labelClass}>Model</label>
          <ModelPicker
            form={form}
            value={assignment.modelName}
            onChange={(modelName) => update({ modelName })}
            placeholder="Select a model"
            ariaLabel={`Model ${index + 1}`}
          />
        </div>
        {form.assignments.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 !text-red-500 hover:!text-red-600 shrink-0"
            onClick={() => form.removeAssignment(assignment.id)}
            aria-label={`Remove model ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div>
        <label className={labelClass}>Backup model (optional)</label>
        <ModelPicker
          form={form}
          value={assignment.fallbackModelName}
          onChange={(fallbackModelName) => update({ fallbackModelName })}
          placeholder="No backup"
          optional
          exclude={assignment.modelName}
          ariaLabel={`Backup model ${index + 1}`}
        />
      </div>
    </div>
  );
}

// Register a new AI provider, or edit a registered one (models + optional
// new key). Flow: provider -> key (models load live) -> models -> Check ->
// Save. Save stays disabled until Check passes for the current values.
export default function AIProviderFormModal({ isOpen, mode, row, providerOptions, onClose, onSaved }) {
  const form = useAiProviderForm({
    mode,
    row,
    isOpen,
    defaultProvider: providerOptions.length === 1 ? providerOptions[0].key : "",
  });

  const handleSave = async () => {
    const message = await form.submit();
    if (message) onSaved(message);
  };

  const selectableProviders = form.isEdit
    ? [{ label: row?.provider_label, value: row?.provider }]
    : providerOptions.map((o) => ({ label: o.label, value: o.key }));

  // "Select a model" is already clear from the disabled Check button - only
  // explain setup problems once every row has its model chosen.
  const showSetupError = !!form.setupError && form.assignments.every((a) => a.modelName.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.saving ? () => {} : onClose}
      title={form.isEdit ? `Edit ${row?.provider_label ?? "provider"}` : "Add model provider"}
      width="600px"
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Provider</label>
          <FilterListbox
            options={selectableProviders}
            value={form.provider}
            onChange={form.changeProvider}
            disabled={form.isEdit}
            placeholder="Select a provider"
          />
        </div>

        <div>
          <label className={labelClass}>API key</label>
          <input
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={(e) => form.changeApiKey(e.target.value)}
            onBlur={form.commitApiKey}
            disabled={!form.provider}
            placeholder={
              form.isEdit
                ? `${row?.api_key_masked ?? "Saved key"} (leave blank to keep the saved key)`
                : "Paste the provider API key"
            }
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Models</label>
            {form.modelsLoading && <span className="text-[11px] text-slate-400">Loading models...</span>}
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Use a cheaper model for Extraction (JD and resume parsing) and a stronger one for Evaluation, or one
            model for Both. A backup model on the same key takes over when the main one is unavailable.
          </p>
          <div className="space-y-2">
            {form.assignments.map((assignment, index) => (
              <ModelAssignmentRow key={assignment.id} form={form} assignment={assignment} index={index} />
            ))}
          </div>
          {form.canAddModel && (
            <Button variant="link" size="small" className="mt-2" onClick={form.addAssignment} disabled={!form.provider}>
              <Plus className="h-3.5 w-3.5" /> Add model
            </Button>
          )}
          {form.modelsError && <p className="text-[11px] text-red-600 mt-1">{form.modelsError}</p>}
          {showSetupError && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 mt-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <div>
                <p>{form.setupError}</p>
                {form.missingPurpose && (
                  <div className="flex items-center gap-3 mt-1">
                    {form.canAddModel && (
                      <Button variant="link" size="small" onClick={() => form.addAssignmentFor(form.missingPurpose)}>
                        <Plus className="h-3 w-3" /> Add {USAGE_LABEL[form.missingPurpose]} model
                      </Button>
                    )}
                    {form.assignments.length === 1 && (
                      <Button variant="link" size="small" onClick={form.setOnlyModelToBoth}>
                        Use this model for Both instead
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {form.checkStatus === "passed" && form.checkWarnings.length === 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[12px] text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span><span className="font-semibold">Models verified — you can save.</span> {form.checkMessage}</span>
          </div>
        )}
        {form.checkStatus === "passed" && form.checkWarnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800" role="status">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">You can save, with a warning.</span> {form.checkMessage}
            </span>
          </div>
        )}
        {form.checkStatus === "failed" && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Can't use this setup.</span> {form.checkMessage}
              {form.removedModels.length > 0 && (
                <span className="block mt-1">
                  {form.removedModels.join(", ")} {form.removedModels.length === 1 ? "has" : "have"} been removed from
                  the model list. Pick another model and check again.
                </span>
              )}
              {form.checkCode && (
                <span className="block mt-1 font-mono text-[11px] text-red-500">Error code: {form.checkCode}</span>
              )}
            </span>
          </div>
        )}
        {form.checkResults.length > 0 && (
          <ul className="space-y-0.5 text-[11px]" aria-label="Model check results">
            {form.checkResults.map((r) => (
              <li key={r.model_name}
                className={`flex items-center gap-1.5 ${r.warning ? "text-amber-700" : r.verified ? "text-emerald-700" : "text-red-600"}`}>
                {r.warning ? <AlertTriangle className="h-3 w-3" />
                  : r.verified ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span className="font-mono">{r.model_name}</span>
                <span className="text-slate-500">
                  {r.warning ? "daily limit used up - saved with a warning"
                    : r.verified ? `${r.latency_ms ?? "?"} ms` : r.error_code || "failed"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {form.saveError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span><span className="font-semibold">Couldn't save.</span> {form.saveError}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="small" onClick={onClose} disabled={form.saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={form.check}
            disabled={!form.canCheck}
            loading={form.checkStatus === "checking"}
            loadingText="Checking..."
          >
            Check
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleSave}
            disabled={!form.canSave}
            loading={form.saving}
            loadingText="Saving..."
          >
            {form.isEdit ? "Save changes" : "Register"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
