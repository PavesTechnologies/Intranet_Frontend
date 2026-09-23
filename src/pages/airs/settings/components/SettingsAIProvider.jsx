import React, { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import FilterListbox from "../../../../components/filter/FilterListbox";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import useAiProviderConfig from "../hooks/useAiProviderConfig";

// The LLM every AI step uses (JD parsing, resume parsing, AI evaluation).
// Flow: pick provider -> enter key (models load live) -> pick model ->
// Check -> Save. Save stays disabled until Check passes for exactly the
// current values; the backend re-verifies on save as well.
export default function SettingsAIProvider() {
  const {
    loading, providers, current,
    provider, apiKey, modelName, models, modelsLoading, modelsError,
    checkStatus, checkMessage, saving, resetting, hasSavedKey,
    canCheck, canSave,
    changeProvider, changeApiKey, commitApiKey, changeModel, check, save, resetToDefault,
  } = useAiProviderConfig();
  const [confirmReset, setConfirmReset] = useState(false);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex justify-center py-10">
        <LoadingSpinner text="Loading AI model settings..." />
      </div>
    );
  }

  const providerOptions = providers.map((p) => ({ label: p.label, value: p.key }));
  const modelOptions = models.map((m) => ({ label: m.display_name, value: m.id }));
  // Keep the saved model selectable even if the live list doesn't include it.
  if (modelName && !modelOptions.some((o) => o.value === modelName)) {
    modelOptions.unshift({ label: modelName, value: modelName });
  }
  // No list to choose from (load failed, or no key entered yet): let the
  // admin type a model ID directly instead of blocking them.
  const typeModelManually = !modelsLoading && models.length === 0;

  const isDefault = current?.source === "env_fallback";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="font-bold text-[14px] text-slate-900">AI model provider</div>
        {!isDefault && (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3 w-3" /> Reset to default
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        Used for JD parsing, resume parsing and AI evaluation. Changes apply to new processing jobs.
      </p>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 mb-4 text-[12px]">
        <ShieldCheck className={`h-4 w-4 shrink-0 ${isDefault ? "text-slate-400" : "text-emerald-600"}`} />
        {isDefault ? (
          <span className="text-slate-600">
            Using the built-in default: <span className="font-semibold">{current?.provider_label} · {current?.model_name}</span>
          </span>
        ) : (
          <span className="text-slate-600">
            Active: <span className="font-semibold">{current?.provider_label} · {current?.model_name}</span>
            <span className="text-emerald-600 font-semibold"> · Verified</span>
          </span>
        )}
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Provider</label>
          <FilterListbox
            options={providerOptions}
            value={provider}
            onChange={changeProvider}
            placeholder="Select a provider"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">API key</label>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => changeApiKey(e.target.value)}
            onBlur={commitApiKey}
            placeholder={hasSavedKey ? `${current.api_key_masked} (leave blank to keep the saved key)` : "Paste the provider API key"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Model</label>
            {modelsLoading && <span className="text-[11px] text-slate-400">Loading models...</span>}
          </div>
          {typeModelManually ? (
            <input
              type="text"
              value={modelName}
              onChange={(e) => changeModel(e.target.value)}
              placeholder="Enter the API key to load models, or type a model ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <FilterListbox
              options={modelOptions}
              value={modelName}
              onChange={changeModel}
              disabled={modelsLoading}
              placeholder="Select a model"
            />
          )}
          {modelsError && <p className="text-[11px] text-red-600 mt-1">{modelsError}</p>}
        </div>
      </div>

      {checkStatus === "passed" && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 mb-4 text-[12px] text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Model verified — you can save. {checkMessage}</span>
        </div>
      )}
      {checkStatus === "failed" && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-4 text-[12px] text-red-700">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><span className="font-semibold">Can't use this model.</span> {checkMessage}</span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="small"
          onClick={check}
          disabled={!canCheck}
          loading={checkStatus === "checking"}
          loadingText="Checking..."
        >
          Check
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={save}
          disabled={!canSave}
          loading={saving}
          loadingText="Saving..."
        >
          Save
        </Button>
      </div>

      <ConfirmationModal
        isOpen={confirmReset}
        title="Reset AI model?"
        message="Processing will go back to the built-in default model. The saved API key will no longer be used."
        confirmText="Reset"
        isLoading={resetting}
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          await resetToDefault();
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
