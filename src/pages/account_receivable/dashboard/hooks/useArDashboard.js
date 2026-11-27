import { useCallback, useEffect, useRef, useState } from "react";

import { showStatusToast } from "../../../../components/toastfy/toast";
import { getDashboardErrorMessage, getDashboardSummary } from "../services/arDashboardService";

/** Loads the dashboard summary for a period; reloads when the period changes. */
export function useArDashboard(period) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const load = useCallback(
    async ({ manual = false } = {}) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await getDashboardSummary({ period, signal: controller.signal });
        if (controller.signal.aborted) return;
        setSummary(data);
        if (manual) showStatusToast("Dashboard refreshed.", "success");
      } catch (err) {
        if (controller.signal.aborted || err?.name === "CanceledError") return;
        const message = getDashboardErrorMessage(err, "Couldn’t load the receivables dashboard.");
        setError(message);
        if (manual) showStatusToast(message, "error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period]
  );

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const refresh = useCallback(() => load({ manual: true }), [load]);

  return { summary, loading, refreshing, error, refresh };
}
