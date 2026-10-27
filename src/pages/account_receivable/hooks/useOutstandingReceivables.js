import { useEffect, useMemo, useState } from "react";
import { applyLiveAging, getOutstandingReceivables } from "../services/receivableService";
import useBusinessDate from "./useBusinessDate";

/**
 * Live outstanding receivables (existing backend API) for pickers and
 * aging — shared by the payment, note, reminder, collection and ledger
 * screens. Re-aged against today's date and refetched when the date rolls
 * over, so an invoice whose due date passes moves to overdue on its own.
 */
export default function useOutstandingReceivables() {
  const today = useBusinessDate();
  const [rawReceivables, setRawReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getOutstandingReceivables()
      .then((rows) => !cancelled && setRawReceivables(rows))
      .catch((err) => {
        console.error("[AR] Error loading outstanding receivables:", err);
        if (!cancelled) setError("Outstanding receivables could not be loaded.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [today]);

  const receivables = useMemo(() => rawReceivables.map((r) => applyLiveAging(r, today)), [rawReceivables, today]);

  // One entry per client, with the currencies it is billed in.
  const clients = useMemo(() => {
    const map = new Map();
    receivables.forEach((r) => {
      if (!r.clientId) return;
      const entry = map.get(r.clientId) || { clientId: r.clientId, clientName: r.clientName, currencies: new Set() };
      entry.currencies.add(r.currencyCode);
      map.set(r.clientId, entry);
    });
    return [...map.values()]
      .map((c) => ({ ...c, currencies: [...c.currencies].sort() }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [receivables]);

  return { receivables, clients, loading, error, today };
}

/** Option label for a receivable in pickers. */
export const receivableOptionLabel = (r, formatCurrency) =>
  `${r.invoiceNumber} · ${r.clientName} · ${formatCurrency(r.outstandingBalance, r.currencyCode)} due`;
