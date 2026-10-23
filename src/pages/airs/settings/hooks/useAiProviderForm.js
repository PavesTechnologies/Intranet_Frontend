import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiErrorMessage,
  createProvider,
  listModels,
  updateProvider,
  verifyAiProvider,
} from "../services/aiProviderService";
import {
  MAX_MODELS,
  USAGE,
  assignmentsFromRow,
  emptyAssignment,
  missingPurpose,
  nextUsage,
  toRequestModels,
  validateModelSetup,
} from "../utils/modelSetup";

// Form state for the Add / Edit provider modal.
//   create: provider selectable (unregistered ones only), API key required.
//   edit:   provider fixed, API key optional (blank keeps the saved key).
// The provider's models are a list of assignments - what each model is used
// for (Extraction / Evaluation / Both) plus an optional backup model.
// checkStatus: "idle" | "checking" | "passed" | "failed". Any edit drops it
// back to "idle", so Save is only enabled for exactly the values that were
// just checked. (The backend re-verifies on save regardless.)

// Check results that mean "this model can't be used with this key" - such a
// model is dropped from the dropdowns for the rest of the session instead of
// staying there to be picked again. (Rate limits, outages and credit
// problems are about the key/account, not the model, so they don't count.)
const UNUSABLE_MODEL_CODES = new Set(["MODEL_NOT_FOUND", "NO_ACCESS", "BAD_REQUEST", "BAD_OUTPUT", "REFUSED"]);

const sameModel = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export default function useAiProviderForm({ mode, row, defaultProvider, isOpen }) {
  const isEdit = mode === "edit";

  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [assignments, setAssignments] = useState(() => [emptyAssignment()]);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  // Models a Check showed can't be used with this key; hidden from the dropdowns.
  const [unavailableModels, setUnavailableModels] = useState([]);
  const [removedModels, setRemovedModels] = useState([]);
  const [checkStatus, setCheckStatus] = useState("idle");
  const [checkMessage, setCheckMessage] = useState("");
  // Stable backend code for a failed check (RATE_LIMITED, DAILY_LIMIT, ...).
  const [checkCode, setCheckCode] = useState("");
  // Per-model results, kept only when the setup has more than one model.
  const [checkResults, setCheckResults] = useState([]);
  // Models that passed only with a warning (their daily limit is used up) - saving is still allowed.
  const [checkWarnings, setCheckWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Ignores a slow model-list response that arrives after the admin has
  // already switched provider again.
  const modelsRequestId = useRef(0);

  const resetCheck = () => {
    setCheckStatus("idle");
    setCheckMessage("");
    setCheckWarnings([]);
    setCheckCode("");
    setCheckResults([]);
    setSaveError("");
    setRemovedModels([]);
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
      const saved = assignmentsFromRow(row);
      setAssignments(saved.length ? saved : [emptyAssignment()]);
      // The saved key is reused server-side, so the list loads without re-typing it.
      loadModels(row.provider, "");
    } else {
      setProvider(defaultProvider || "");
      setAssignments([emptyAssignment()]);
    }
  }, [isOpen, isEdit, row, defaultProvider, loadModels]);

  const changeProvider = (p) => {
    setProvider(p);
    setApiKey("");
    setAssignments([emptyAssignment()]);
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

  const changeAssignment = (id, patch) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    resetCheck();
  };

  const addAssignment = () => {
    setAssignments((prev) => (prev.length >= MAX_MODELS ? prev : [...prev, emptyAssignment(nextUsage(prev))]));
    resetCheck();
  };

  // One-click fixes offered next to the "Nothing handles ..." message.
  const addAssignmentFor = (usage) => {
    setAssignments((prev) => (prev.length >= MAX_MODELS ? prev : [...prev, emptyAssignment(usage)]));
    resetCheck();
  };

  const setOnlyModelToBoth = () => {
    setAssignments((prev) => (prev.length === 1 ? [{ ...prev[0], usage: USAGE.BOTH }] : prev));
    resetCheck();
  };

  const removeAssignment = (id) => {
    setAssignments((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)));
    resetCheck();
  };

  const setupError = validateModelSetup(assignments);

  const check = async () => {
    setCheckStatus("checking");
    setCheckMessage("");
    setCheckCode("");
    setCheckResults([]);
    setSaveError("");
    try {
      const result = await verifyAiProvider({
        provider, models: toRequestModels(assignments), apiKey: apiKey.trim(),
      });
      setCheckStatus(result.verified ? "passed" : "failed");
      setCheckMessage(result.message);
      setCheckWarnings(result.verified ? result.warnings || [] : []);
      setCheckCode(result.verified ? "" : result.error_code || "");
      const results = result.results || [];
      setCheckResults(results.length > 1 ? results : []);

      const unusable = results
        .filter((r) => !r.verified && UNUSABLE_MODEL_CODES.has(r.error_code))
        .map((r) => r.model_name);
      if (unusable.length) {
        setUnavailableModels((prev) => [...prev, ...unusable.filter((m) => !prev.includes(m))]);
        setRemovedModels(unusable);
        // Cleared directly (not via changeAssignment) so the failure message stays visible.
        setAssignments((prev) =>
          prev.map((a) => ({
            ...a,
            modelName: unusable.some((m) => sameModel(m, a.modelName)) ? "" : a.modelName,
            fallbackModelName: unusable.some((m) => sameModel(m, a.fallbackModelName)) ? "" : a.fallbackModelName,
          })),
        );
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
      const values = { provider, models: toRequestModels(assignments), apiKey: apiKey.trim() };
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
    provider, apiKey, assignments, modelsLoading, modelsError, removedModels,
    // Only models not already shown to be unusable with this key.
    models: models.filter((m) => !unavailableModels.includes(m.id)),
    setupError,
    missingPurpose: missingPurpose(assignments),
    checkStatus, checkMessage, checkCode, checkResults, checkWarnings, saving, saveError,
    canAddModel: assignments.length < MAX_MODELS,
    canCheck: !!provider && keyReady && !setupError && checkStatus !== "checking" && !saving,
    canSave: checkStatus === "passed" && !saving,
    changeProvider, changeApiKey, commitApiKey,
    changeAssignment, addAssignment, addAssignmentFor, setOnlyModelToBoth, removeAssignment,
    check, submit,
  };
}
