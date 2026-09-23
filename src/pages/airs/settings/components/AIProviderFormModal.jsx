import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import useAiProviderForm from "../hooks/useAiProviderForm";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500";

// Register a new AI provider, or edit a registered one (model + optional
// new key). Flow: provider -> key (models load live) -> model -> Check ->
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

  const modelOptions = form.models.map((m) => ({ label: m.display_name, value: m.id }));
  // Keep the current model selectable even if the live list doesn't include it.
  if (form.modelName && !modelOptions.some((o) => o.value === form.modelName)) {
    modelOptions.unshift({ label: form.modelName, value: form.modelName });
  }
  // No list to choose from (load failed, or no key entered yet): let the
  // admin type a model ID directly instead of blocking them.
  const typeModelManually = !form.modelsLoading && form.models.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.saving ? () => {} : onClose}
      title={form.isEdit ? `Edit ${row?.provider_label ?? "provider"}` : "Add model provider"}
      width="520px"
    >
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Provider</label>
          <FilterListbox
            options={selectableProviders}
            value={form.provider}
            onChange={form.changeProvider}
            disabled={form.isEdit}
            placeholder="Select a provider"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">API key</label>
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
            <label className="text-[10px] uppercase font-bold text-slate-400">Model</label>
            {form.modelsLoading && <span className="text-[11px] text-slate-400">Loading models...</span>}
          </div>
          {typeModelManually ? (
            <input
              type="text"
              value={form.modelName}
              onChange={(e) => form.changeModel(e.target.value)}
              disabled={!form.provider}
              placeholder="Enter the API key to load models, or type a model ID"
              className={inputClass}
            />
          ) : (
            <FilterListbox
              options={modelOptions}
              value={form.modelName}
              onChange={form.changeModel}
              disabled={form.modelsLoading}
              placeholder="Select a model"
            />
          )}
          {form.modelsError && <p className="text-[11px] text-red-600 mt-1">{form.modelsError}</p>}
        </div>

        {form.checkStatus === "passed" && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[12px] text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span><span className="font-semibold">Model verified — you can save.</span> {form.checkMessage}</span>
          </div>
        )}
        {form.checkStatus === "failed" && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span><span className="font-semibold">Can't use this model.</span> {form.checkMessage}</span>
          </div>
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
