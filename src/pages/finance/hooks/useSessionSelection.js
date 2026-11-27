import { useState } from "react";

/**
 * useState that remembers a dropdown value for the browser session, so the
 * Finance dashboard keeps the selected role/period when the user navigates into
 * a module and comes back. Falls back to `fallback` if storage is unavailable or
 * holds a value not in `allowed`.
 */
export function useSessionSelection(key, fallback, allowed) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      return stored && allowed.includes(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  });

  const update = (next) => {
    setValue(next);
    try {
      window.sessionStorage.setItem(key, next);
    } catch {
      /* storage blocked — selection just won't persist */
    }
  };

  return [value, update];
}
