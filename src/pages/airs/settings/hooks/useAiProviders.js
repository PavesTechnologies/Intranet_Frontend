import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  activateProvider,
  apiErrorMessage,
  deleteProvider,
  getActiveProvider,
  getProviderOptions,
  listProviders,
} from "../services/aiProviderService";

export const PROVIDERS_PAGE_SIZE = 5;

// Table state for Settings -> AI model providers: the paged rows, the
// active-provider banner and the provider options (which ones are still
// free to register). Every action refetches all three so they never drift.
export default function useAiProviders() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(async (targetPage = page) => {
    setLoading(true);
    setLoadError("");
    try {
      const [list, activeProvider, providerOptions] = await Promise.all([
        listProviders({ page: targetPage, pageSize: PROVIDERS_PAGE_SIZE }),
        getActiveProvider(),
        getProviderOptions(),
      ]);
      // Deleting the only row on the last page: step back a page.
      if (list.items.length === 0 && list.total > 0 && targetPage > 1) {
        setPage(targetPage - 1);
        return;
      }
      setRows(list.items);
      setTotal(list.total);
      setActive(activeProvider);
      setOptions(providerOptions);
    } catch (error) {
      setLoadError(apiErrorMessage(error, "Couldn't load the AI providers."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  // refresh is rebuilt whenever page changes, so this runs once per page.
  useEffect(() => {
    refresh(page);
  }, [page, refresh]);

  const runAction = async (row, action, fallback) => {
    setBusyId(row.id);
    try {
      const { message } = await action(row.id);
      toast.success(message);
      await refresh(page);
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, fallback));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const activate = (row) => runAction(row, activateProvider, "Couldn't make this provider active.");
  const remove = (row) => runAction(row, deleteProvider, "Couldn't delete this provider.");

  const totalPages = Math.max(1, Math.ceil(total / PROVIDERS_PAGE_SIZE));
  const unregisteredOptions = options.filter((o) => !o.registered);

  return {
    rows, total, page, totalPages, setPage,
    active, options, unregisteredOptions,
    loading, loadError, busyId,
    refresh: () => refresh(page),
    activate, remove,
  };
}
