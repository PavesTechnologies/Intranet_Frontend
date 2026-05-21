import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export function useSprintBurndown(sprintId) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(() => {
    if (!sprintId) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/burndown`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message ?? "Failed to load burndown data"))
      .finally(() => setLoading(false));
  }, [sprintId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData }; // ← expose refetch
}