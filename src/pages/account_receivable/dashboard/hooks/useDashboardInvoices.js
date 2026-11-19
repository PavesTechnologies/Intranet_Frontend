import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboardErrorMessage, getDashboardInvoices } from "../services/arDashboardService";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Ledger rows for a view and search term. Filtering happens on the server;
 * search is debounced so typing doesn't fire a request per keystroke.
 * `reloadKey` forces a reload (e.g. after the page-level Refresh).
 */
export function useDashboardInvoices(view, q, reloadKey) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const controllerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const data = await getDashboardInvoices({ view, q, signal: controller.signal });
        if (!controller.signal.aborted) setRows(data);
      } catch (err) {
        if (controller.signal.aborted || err?.name === "CanceledError") return;
        setError(getDashboardErrorMessage(err, "Couldn’t load invoices."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, q ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timer);
      controllerRef.current?.abort();
    };
  }, [view, q, reloadKey, retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  return { rows, loading, error, retry };
}
