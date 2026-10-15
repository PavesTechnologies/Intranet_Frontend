import { useEffect, useState } from "react";
import { toLocalIsoDate } from "../services/receivableService";

/**
 * Today's local date (yyyy-MM-dd) that rolls over on its own — at local
 * midnight, and whenever the user comes back to the tab (timers are throttled
 * in background tabs, and a laptop may sleep through midnight). Anything that
 * ages receivables should depend on this so "due today" becomes "overdue"
 * without a reload.
 */
export default function useBusinessDate() {
  const [today, setToday] = useState(toLocalIsoDate);

  useEffect(() => {
    const sync = () => setToday((prev) => {
      const now = toLocalIsoDate();
      return now === prev ? prev : now;
    });

    const scheduleMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      return setTimeout(() => {
        sync();
        timer = scheduleMidnight();
      }, nextMidnight - now);
    };

    let timer = scheduleMidnight();
    const onVisible = () => document.visibilityState === "visible" && sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return today;
}
