import { useCallback, useEffect, useRef, useState } from "react";
import { getArApiErrorMessage, isEndpointUnavailable } from "../utils/apiAvailability";

/**
 * Loads a list from an AR endpoint that may not be released yet.
 *
 * Returns { data, loading, error, unavailable, reload }:
 *  - unavailable: the endpoint does not exist yet → render ARFeaturePending
 *  - error: a real failure message (shown inline)
 * `fetcher` should be stable (wrap in useCallback) — it re-runs when it changes.
 */
export default function useContractList(fetcher) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetcher();
      if (id !== requestId.current) return;
      setData(Array.isArray(rows) ? rows : []);
      setUnavailable(false);
    } catch (err) {
      if (id !== requestId.current) return;
      setData([]);
      if (isEndpointUnavailable(err)) {
        setUnavailable(true);
      } else {
        console.error("[AR] List request failed:", err);
        setError(getArApiErrorMessage(err, "Records could not be loaded. Please try again."));
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, unavailable, reload };
}
