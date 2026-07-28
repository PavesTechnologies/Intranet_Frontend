import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getUnknownSkillSuggestions } from "../services/skillOntologyService";

// Lazily fetches each suggestion tab's data the first time it's opened, then
// caches it per tab so revisiting a tab never re-fires the request. A tab
// that failed is deliberately left out of the cache, so calling ensureLoaded
// again (e.g. a Retry button) naturally re-fetches it.
export default function useUnknownSkillSuggestions(unknownSkillId) {
  const [cache, setCache] = useState({});
  const [loadingTab, setLoadingTab] = useState(null);
  const [errorByTab, setErrorByTab] = useState({});
  const inFlightTabs = useRef(new Set());

  const ensureLoaded = useCallback(
    async (tabId) => {
      if (!unknownSkillId || !tabId) return;
      if (cache[tabId] || inFlightTabs.current.has(tabId)) return;

      inFlightTabs.current.add(tabId);
      setLoadingTab(tabId);
      setErrorByTab((prev) => ({ ...prev, [tabId]: null }));

      try {
        const res = await getUnknownSkillSuggestions(unknownSkillId, tabId);
        setCache((prev) => ({ ...prev, [tabId]: res?.data || [] }));
      } catch (err) {
        setErrorByTab((prev) => ({ ...prev, [tabId]: err }));
        toast.error(
          err?.response?.data?.message || err?.response?.data?.detail || "Failed to load suggestions."
        );
      } finally {
        inFlightTabs.current.delete(tabId);
        setLoadingTab((prev) => (prev === tabId ? null : prev));
      }
    },
    [unknownSkillId, cache]
  );

  return {
    dataForTab: (tabId) => cache[tabId] || null,
    isLoadingTab: (tabId) => loadingTab === tabId,
    errorForTab: (tabId) => errorByTab[tabId] || null,
    ensureLoaded,
  };
}
