import { useCallback, useEffect, useState } from "react";

// M11-E01-S05-T02/T03: each dashboard section owns its own fetch so a failure
// in one never blanks the page, and each can be retried independently. This
// hook is that unit — one instance per section.
export default function useDashboardSection(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await run());
    } catch (err) {
      console.error("Dashboard section failed to load:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, retry: load };
}
