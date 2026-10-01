import { useEffect, useState } from "react";

/** Returns `value` once it has stopped changing for `delay` ms — for search boxes on server-filtered lists. */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
