import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  apiErrorMessage,
  getAiProviderConfig,
  getProviders,
  listModels,
  resetAiProviderConfig,
  saveAiProviderConfig,
  verifyAiProvider,
} from "../services/aiProviderService";

// checkStatus: "idle" | "checking" | "passed" | "failed". Any edit to
// provider / key / model drops it back to "idle", so Save is only ever
// enabled for exactly the values that were just checked. (The backend
// re-verifies on save regardless - this is UX, not the safety net.)
export default function useAiProviderConfig() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [current, setCurrent] = useState(null);

  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");

  const [checkStatus, setCheckStatus] = useState("idle");
  const [checkMessage, setCheckMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Ignores a slow model-list response that arrives after the admin has
  // already switched provider again.
  const modelsRequestId = useRef(0);

  // A blank key can only reuse the saved one for the provider it belongs to.
  const hasSavedKeyFor = (p) => current?.source === "database" && current?.provider === p;
  const canUseKey = (p, key) => !!key.trim() || hasSavedKeyFor(p);

  const loadModels = useCallback(async (p, key, preferredModel = "") => {
    if (!p) return;
    const requestId = ++modelsRequestId.current;
    setModelsLoading(true);
    setModelsError("");
    try {
      const list = await listModels({ provider: p, apiKey: key.trim() });
      if (requestId !== modelsRequestId.current) return;
      setModels(list);
      if (preferredModel) setModelName(preferredModel);
    } catch (error) {
      if (requestId !== modelsRequestId.current) return;
      setModels([]);
      setModelsError(apiErrorMessage(error, "Couldn't load models for this provider."));
    } finally {
      if (requestId === modelsRequestId.current) setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [providerList, config] = await Promise.all([getProviders(), getAiProviderConfig()]);
        setProviders(providerList);
        setCurrent(config);
        setProvider(config.provider);
        setModelName(config.model_name);
        // Only the saved (database) key can be reused server-side; the .env
        // fallback key is never exposed to this form.
        if (config.source === "database") {
          loadModels(config.provider, "", config.model_name);
        }
      } catch (error) {
        toast.error(apiErrorMessage(error, "Couldn't load the AI model settings."));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadModels]);

  const resetCheck = () => {
    setCheckStatus("idle");
    setCheckMessage("");
  };

  const changeProvider = (p) => {
    setProvider(p);
    setApiKey("");
    setModelName("");
    setModels([]);
    setModelsError("");
    resetCheck();
    if (hasSavedKeyFor(p)) loadModels(p, "", current.model_name);
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
    try {
      const result = await verifyAiProvider({ provider, modelName, apiKey: apiKey.trim() });
      setCheckStatus(result.verified ? "passed" : "failed");
      setCheckMessage(result.message);
    } catch (error) {
      setCheckStatus("failed");
      setCheckMessage(apiErrorMessage(error, "The check couldn't be completed."));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveAiProviderConfig({ provider, modelName, apiKey: apiKey.trim() });
      setCurrent(saved);
      setApiKey("");
      resetCheck();
      toast.success(`Saved. New processing jobs will use ${saved.provider_label} · ${saved.model_name}.`);
    } catch (error) {
      // 422 = the server-side re-check failed (e.g. the key was revoked in between).
      setCheckStatus("failed");
      setCheckMessage(apiErrorMessage(error, "Couldn't save the AI model settings."));
      toast.error(apiErrorMessage(error, "Couldn't save the AI model settings."));
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    setResetting(true);
    try {
      const config = await resetAiProviderConfig();
      setCurrent(config);
      setProvider(config.provider);
      setModelName(config.model_name);
      setApiKey("");
      setModels([]);
      setModelsError("");
      resetCheck();
      toast.info("Reset to the built-in default model.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't reset the AI model settings."));
    } finally {
      setResetting(false);
    }
  };

  return {
    loading, providers, current,
    provider, apiKey, modelName, models, modelsLoading, modelsError,
    checkStatus, checkMessage, saving, resetting,
    hasSavedKey: hasSavedKeyFor(provider),
    canCheck: !!provider && !!modelName.trim() && canUseKey(provider, apiKey) && checkStatus !== "checking",
    canSave: checkStatus === "passed" && !saving,
    changeProvider, changeApiKey, commitApiKey, changeModel, check, save, resetToDefault,
  };
}
