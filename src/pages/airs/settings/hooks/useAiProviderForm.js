import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiErrorMessage,
  createProvider,
  listModels,
  updateProvider,
  verifyAiProvider,
} from "../services/aiProviderService";

// Form state for the Add / Edit provider modal.
//   create: provider selectable (unregistered ones only), API key required.
//   edit:   provider fixed, API key optional (blank keeps the saved key).
// checkStatus: "idle" | "checking" | "passed" | "failed". Any edit drops it
// back to "idle", so Save is only enabled for exactly the values that were
// just checked. (The backend re-verifies on save regardless.)

// Check results that mean "this model can't be used with this key" - such a
// model is dropped from the dropdown for the rest of the session instead of
// staying there to be picked again. (Rate limits, outages and credit
// problems are about the key/account, not the model, so they don't count.)
const UNUSABLE_MODEL_CODES = new Set(["MODEL_NOT_FOUND", "NO_ACCESS", "BAD_REQUEST", "BAD_OUTPUT", "REFUSED"]);

export default function useAiProviderForm({ mode, row, defaultProvider, isOpen }) {
  const isEdit = mode === "edit";

  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  // Models a Check showed can't be used with this key; hidden from the dropdown.
  const [unavailableModels, setUnavailableModels] = useState([]);
  const [removedModel, setRemovedModel] = useState("");
  const [checkStatus, setCheckStatus] = useState("idle");
  const [checkMessage, setCheckMessage] = useState("");
  // Stable backend code for a failed check (RATE_LIMITED, DAILY_LIMIT, ...).
  const [checkCode, setCheckCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Ignores a slow model-list response that arrives after the admin has
  // already switched provider again.
  const modelsRequestId = useRef(0);

  const resetCheck = () => {
    setCheckStatus("idle");
    setCheckMessage("");
    setCheckCode("");
    setSaveError("");
    setRemovedModel("");
  };

  const loadModels = useCallback(async (p, key) => {
    if (!p) return;
    const requestId = ++modelsRequestId.current;
    setModelsLoading(true);
    setModelsError("");
    try {
      const list = await listModels({ provider: p, apiKey: key.trim() });
      if (requestId !== modelsRequestId.current) return;
      setModels(list);
      // A fresh list (e.g. a different key) may grant access to models that
      // failed before, so start clean.
      setUnavailableModels([]);
    } catch (error) {
      if (requestId !== modelsRequestId.current) return;
      setModels([]);
      setModelsError(apiErrorMessage(error, "Couldn't load models for this provider."));
    } finally {
      if (requestId === modelsRequestId.current) setModelsLoading(false);
    }
  }, []);

  // Fresh state every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    modelsRequestId.current += 1;
    setApiKey("");
    setModels([]);
    setModelsError("");
    setModelsLoading(false);
    setUnavailableModels([]);
    setSaving(false);
    resetCheck();
    if (isEdit && row) {
      setProvider(row.provider);
      setModelName(row.model_name);
      // The saved key is reused server-side, so the list loads without re-typing it.
      loadModels(row.provider, "");
    } else {
      setProvider(defaultProvider || "");
      setModelName("");
    }
  }, [isOpen, isEdit, row, defaultProvider, loadModels]);

  const changeProvider = (p) => {
    setProvider(p);
    setApiKey("");
    setModelName("");
    setModels([]);
    setModelsError("");
    resetCheck();
  };

  const changeApiKey = (key) => {
    setApiKey(key);
    resetCheck();
  };

  // Fetch the live model list once the admin has finished typing the key.
  const commitApiKey = () => {
    if (provider && apiKey.trim()) loadModels(provider, apiKey);
  };

  const changeModel = (m) => {
    setModelName(m);
    resetCheck();
  };

  const check = async () => {
    setCheckStatus("checking");
    setCheckMessage("");
    setCheckCode("");
    setSaveError("");
    try {
      const result = await verifyAiProvider({ provider, modelName: modelName.trim(), apiKey: apiKey.trim() });
      setCheckStatus(result.verified ? "passed" : "failed");
      setCheckMessage(result.message);
      setCheckCode(result.verified ? "" : result.error_code || "");
      if (!result.verified && UNUSABLE_MODEL_CODES.has(result.error_code)) {
        const failedModel = modelName.trim();
        setUnavailableModels((prev) => (prev.includes(failedModel) ? prev : [...prev, failedModel]));
        setRemovedModel(failedModel);
        // Cleared directly (not via changeModel) so the failure message stays visible.
        setModelName("");
      }
    } catch (error) {
      setCheckStatus("failed");
      setCheckMessage(apiErrorMessage(error, "The check couldn't be completed. Please try again."));
    }
  };

  // Returns the backend's success message, or null if saving failed (the
  // reason is then in saveError, shown inside the modal).
  const submit = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const values = { provider, modelName: modelName.trim(), apiKey: apiKey.trim() };
      const { message } = isEdit ? await updateProvider(row.id, values) : await createProvider(values);
      return message || "Saved.";
    } catch (error) {
      setCheckStatus("idle");
      setSaveError(apiErrorMessage(error, "Couldn't save this provider. Please try again."));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const keyReady = isEdit || !!apiKey.trim();

  return {
    isEdit,
    provider, apiKey, modelName, modelsLoading, modelsError, removedModel,
    // Only models not already shown to be unusable with this key.
    models: models.filter((m) => !unavailableModels.includes(m.id)),
    checkStatus, checkMessage, checkCode, saving, saveError,
    canCheck: !!provider && !!modelName.trim() && keyReady && checkStatus !== "checking" && !saving,
    canSave: checkStatus === "passed" && !saving,
    changeProvider, changeApiKey, commitApiKey, changeModel, check, submit,
  };
}
