import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { PERIODS } from "../utils/dashboardFormatters";

export const LEDGER_VIEWS = ["ALL", "OVERDUE", "PENDING_APPROVAL", "AWAITING_SEND", "SENT"];
export const LEDGER_SORT_KEYS = ["invoiceNumber", "clientName", "dueDate", "grandTotal", "outstandingBalance"];

const DEFAULTS = {
  period: "MTD",
  view: "ALL",
  q: "",
  sort: "dueDate",
  dir: "asc",
};

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/**
 * Dashboard filter state kept in the URL (?period=&view=&q=&sort=&dir=) so
 * views can be bookmarked, shared and restored on back navigation.
 * Defaults are omitted from the URL to keep it clean.
 */
export function useDashboardFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      period: pick(params.get("period"), PERIODS, DEFAULTS.period),
      view: pick(params.get("view"), LEDGER_VIEWS, DEFAULTS.view),
      q: params.get("q") ?? DEFAULTS.q,
      sort: pick(params.get("sort"), LEDGER_SORT_KEYS, DEFAULTS.sort),
      dir: pick(params.get("dir"), ["asc", "desc"], DEFAULTS.dir),
    }),
    [params]
  );

  const setFilter = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === DEFAULTS[key] || value === "" || value == null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        // Typing in search shouldn't flood history with one entry per key.
        { replace: key === "q" }
      );
    },
    [setParams]
  );

  const toggleSort = useCallback(
    (key) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        const currentSort = prev.get("sort") || DEFAULTS.sort;
        const currentDir = prev.get("dir") || DEFAULTS.dir;
        const dir = currentSort === key && currentDir === "asc" ? "desc" : "asc";
        next.set("sort", key);
        next.set("dir", dir);
        return next;
      });
    },
    [setParams]
  );

  const resetLedgerFilters = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("view");
      next.delete("q");
      return next;
    });
  }, [setParams]);

  return { filters, setFilter, toggleSort, resetLedgerFilters };
}
