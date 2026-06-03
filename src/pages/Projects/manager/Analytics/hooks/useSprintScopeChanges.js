import { useState, useEffect } from "react";
import api from "../../../../../api/axiosInstance";
import { computeScopeSummary } from "../utils/scopeChangeHelpers";

export function useSprintScopeChanges(sprintId) {
  const [changes, setChanges] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);

    api
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/scope-changes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const raw = res.data;
        setChanges(raw);
        setSummary(computeScopeSummary(raw));
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Failed to load scope changes"))
      .finally(() => setLoading(false));
  }, [sprintId, token]);

  return { changes, summary, loading, error };
}