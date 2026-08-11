import { useCallback } from "react";

export const useAllowedDayCheck = (holidaysMap) => {
  const toISO = useCallback((d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const isAllowed = useCallback(
    (d) => {
      const holiday = holidaysMap[toISO(d)];
      const dow = d.getDay(); // 0 = Sunday, 6 = Saturday

      if (
        (dow === 0 || dow === 6) &&
        (!holiday || holiday.submitTimesheet === false)
      )
        return false;
      if (holiday && holiday.submitTimesheet === false) return false;
      return true;
    },
    [holidaysMap, toISO],
  );

  const hasAnyAllowedDay = useCallback(() => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const d = new Date(today);

    while (d >= firstOfMonth) {
      if (isAllowed(d)) return true;
      d.setDate(d.getDate() - 1);
    }
    return false;
  }, [isAllowed]);

  return { hasAnyAllowedDay, isAllowed };
};
