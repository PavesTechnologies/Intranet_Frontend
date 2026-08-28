import { useCallback, useEffect, useRef, useState } from "react";

// Each dashboard section owns its own fetch so a failure in one never blanks
// the page, and each can be retried independently.
export default function useDashboardSection(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Read in the loader without making it a dependency, so a refetch is not
  // re-created every time data changes.
  const hasDataRef = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    // Only blank the section when there is nothing to show yet. A refetch from
    // a filter change keeps the previous rows on screen rather than collapsing
    // to a skeleton on every keystroke.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const result = await run();
      hasDataRef.current = true;
      setData(result);
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
