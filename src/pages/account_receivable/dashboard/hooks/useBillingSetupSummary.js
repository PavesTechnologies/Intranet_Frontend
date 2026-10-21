import { useCallback, useEffect, useRef, useState } from "react";

import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  getBillingConfigurationStats,
  getBillingConfigurationActivity,
  getApiErrorMessage,
} from "../../services/billingConfigService";

/**
 * Live billing-configuration stats and recent activity — the only parts of
 * the AR dashboard backed by real data today.
 */
export function useBillingSetupSummary() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const [statsResult, activityResult] = await Promise.all([
        getBillingConfigurationStats(),
        getBillingConfigurationActivity(),
      ]);
      if (!mounted.current) return;
      setStats(statsResult);
      setActivity(activityResult || []);
      if (manual) showStatusToast("Billing setup data refreshed.", "success");
    } catch (err) {
      if (!mounted.current) return;
      const message = getApiErrorMessage(err, "Couldn’t load billing setup data.");
      setError(message);
      if (manual) showStatusToast(message, "error");
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => load({ manual: true }), [load]);

  return { stats, activity, loading, refreshing, error, refresh };
}
